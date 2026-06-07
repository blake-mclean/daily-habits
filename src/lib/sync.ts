import { supabase } from './supabase';
import type { Habit, HabitLog, Challenge } from '../context/HabitsContext';
import type { NotificationPref } from '../utils/notifications';

export interface SyncState {
  habits: Habit[];
  logs: HabitLog[];
  challenges: Challenge[];
  userName: string;
  hasOnboarded: boolean;
  lastRewardDate: string;
  notifPrefs: NotificationPref[];
  momentumScore: number;
  momentumSettled: number;
  momentumTrend: string;
  lastMomentumDate: string;
  momentumHistory: unknown[];
  identityXpSnapshot: Record<string, number>;
  lastKnownChapter: number;
  futureSelfText: string;
  futureSelfCategory: string;
  futureSelfVariantIdx: Record<string, number>;
  futureSelfNudgesEnabled: boolean;
  daysSinceLastCheckIn: number;
  reengagementScheduledDate: string;
}

export async function pushToSupabase(userId: string, state: SyncState): Promise<void> {
  const now = new Date().toISOString();

  await Promise.all([
    supabase.from('habits').upsert(
      state.habits.map(h => ({
        id: h.id,
        user_id: userId,
        name: h.name,
        emoji: h.emoji,
        type: h.type,
        target_count: h.targetCount,
        color: h.color,
        identity_type: h.identityType ?? null,
        reminder: h.reminder ?? null,
        created_at: h.createdAt,
        updated_at: now,
      })),
      { onConflict: 'id' }
    ),

    // Full replace for logs to handle deletions correctly
    state.logs.length > 0
      ? supabase.from('habit_logs')
          .delete()
          .eq('user_id', userId)
          .then(() =>
            supabase.from('habit_logs').insert(
              state.logs.map(l => ({
                habit_id: l.habitId,
                user_id: userId,
                date: l.date,
                count: l.count,
              }))
            )
          )
      : supabase.from('habit_logs').delete().eq('user_id', userId),

    supabase.from('challenges').upsert(
      state.challenges.map(c => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        description: c.description,
        duration_days: c.durationDays,
        start_date: c.startDate,
        completed_days: c.completedDays,
        completed: c.completed,
        reward_shown: c.rewardShown,
        updated_at: now,
      })),
      { onConflict: 'id' }
    ),

    supabase.from('user_settings').upsert(
      {
        user_id: userId,
        settings: {
          userName: state.userName,
          hasOnboarded: state.hasOnboarded,
          lastRewardDate: state.lastRewardDate,
          notifPrefs: state.notifPrefs,
          momentumScore: state.momentumScore,
          momentumSettled: state.momentumSettled,
          momentumTrend: state.momentumTrend,
          lastMomentumDate: state.lastMomentumDate,
          momentumHistory: state.momentumHistory,
          identityXpSnapshot: state.identityXpSnapshot,
          lastKnownChapter: state.lastKnownChapter,
          futureSelfText: state.futureSelfText,
          futureSelfCategory: state.futureSelfCategory,
          futureSelfVariantIdx: state.futureSelfVariantIdx,
          futureSelfNudgesEnabled: state.futureSelfNudgesEnabled,
          daysSinceLastCheckIn: state.daysSinceLastCheckIn,
          reengagementScheduledDate: state.reengagementScheduledDate,
        },
        updated_at: now,
      },
      { onConflict: 'user_id' }
    ),
  ]);
}

export async function pullFromSupabase(userId: string): Promise<Partial<SyncState> | null> {
  const [habitsRes, logsRes, challengesRes, settingsRes] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', userId).eq('deleted', false),
    supabase.from('habit_logs').select('*').eq('user_id', userId),
    supabase.from('challenges').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('settings').eq('user_id', userId).single(),
  ]);

  // No data yet for this user
  if (!habitsRes.data && !settingsRes.data) return null;

  const habits: Habit[] = (habitsRes.data ?? []).map((h: Record<string, unknown>) => ({
    id: h.id as string,
    name: h.name as string,
    emoji: h.emoji as string,
    type: h.type as 'daily' | 'volume',
    targetCount: h.target_count as number,
    color: h.color as string,
    createdAt: h.created_at as string,
    identityType: h.identity_type as Habit['identityType'] ?? undefined,
    reminder: h.reminder as Habit['reminder'] ?? undefined,
  }));

  const logs: HabitLog[] = (logsRes.data ?? []).map((l: Record<string, unknown>) => ({
    habitId: l.habit_id as string,
    date: l.date as string,
    count: l.count as number,
  }));

  const challenges: Challenge[] = (challengesRes.data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    description: c.description as string,
    durationDays: c.duration_days as number,
    startDate: c.start_date as string,
    completedDays: (c.completed_days as string[]) ?? [],
    completed: c.completed as boolean,
    rewardShown: c.reward_shown as boolean,
  }));

  const settings = (settingsRes.data?.settings ?? {}) as Partial<SyncState>;

  return {
    habits,
    logs,
    challenges,
    ...settings,
  };
}

export async function deleteHabitFromSupabase(userId: string, habitId: string): Promise<void> {
  await Promise.all([
    supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId),
    supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('user_id', userId),
  ]);
}
