import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const COACHING_CACHE_KEY = '@ai_coaching_v4';
const REFLECTION_WEEKLY_KEY = '@ai_reflection_weekly_v4';
const REFLECTION_MONTHLY_KEY = '@ai_reflection_monthly_v4';

const COACHING_TTL_MS = 60 * 60 * 1000;        // 1 hour — refresh each app session
const REFLECTION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedResult {
  value: string;
  fetchedAt: number;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')   // **bold**
    .replace(/\*(.+?)\*/gs, '$1')         // *italic*
    .replace(/__(.+?)__/gs, '$1')         // __bold__
    .replace(/_(.+?)_/gs, '$1')           // _italic_
    .replace(/^#{1,6}\s+/gm, '')          // # headings
    .replace(/^\s*[-*+]\s+/gm, '• ')     // - bullet lists → •
    .replace(/`([^`]+)`/g, '$1')          // `inline code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')  // [links](url)
    .replace(/\s*—\s*/g, ', ')            // em-dashes → comma
    .trim();
}

async function readCache(key: string, ttlMs: number): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const cached: CachedResult = JSON.parse(raw);
    if (Date.now() - cached.fetchedAt > ttlMs) return null;
    return cached.value;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ value, fetchedAt: Date.now() } satisfies CachedResult));
  } catch {
    // non-fatal
  }
}

export async function fetchCoachingMessage(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const cached = await readCache(COACHING_CACHE_KEY, COACHING_TTL_MS);
    if (cached) return cached;
  }

  const { data, error } = await supabase.functions.invoke('ai-coaching', { body: {} });

  if (error || !data?.message) return null;

  const message = stripMarkdown(data.message as string);
  await writeCache(COACHING_CACHE_KEY, message);
  return message;
}

export async function fetchReflection(
  period: 'weekly' | 'monthly',
  forceRefresh = false
): Promise<string | null> {
  const key = period === 'weekly' ? REFLECTION_WEEKLY_KEY : REFLECTION_MONTHLY_KEY;

  if (!forceRefresh) {
    const cached = await readCache(key, REFLECTION_TTL_MS);
    if (cached) return cached;
  }

  const { data, error } = await supabase.functions.invoke('ai-reflection', { body: { period } });

  if (error || !data?.summary) return null;

  const summary = stripMarkdown(data.summary as string);
  await writeCache(key, summary);
  return summary;
}

export async function clearAICache(): Promise<void> {
  await Promise.allSettled([
    AsyncStorage.removeItem(COACHING_CACHE_KEY),
    AsyncStorage.removeItem(REFLECTION_WEEKLY_KEY),
    AsyncStorage.removeItem(REFLECTION_MONTHLY_KEY),
  ]);
}
