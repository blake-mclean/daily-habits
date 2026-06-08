import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { fetchReflection } from '../lib/aiCoaching';
import { CARD_STYLE, COLORS, RADIUS, SPACING, TYPE } from '../theme';

type Period = 'weekly' | 'monthly';
type Status = 'loading' | 'ready' | 'error';

export default function AIReflectionCard() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasMessage = useRef(false);

  const load = useCallback(async (p: Period, forceRefresh: boolean) => {
    if (!hasMessage.current || forceRefresh) setStatus('loading');

    try {
      const result = await fetchReflection(p, forceRefresh);
      if (result) {
        hasMessage.current = true;
        setMessage(result);
        setStatus('ready');
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      } else if (!hasMessage.current) {
        setStatus('error');
      }
    } catch {
      if (!hasMessage.current) setStatus('error');
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setIsAuthenticated(true);
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    load(period, false);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        load(period, false);
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [isAuthenticated, load]);

  // Reload when period tab changes
  useEffect(() => {
    if (!isAuthenticated) return;
    hasMessage.current = false;
    setMessage(null);
    fadeAnim.setValue(0);
    load(period, false);
  }, [period]);

  if (!isAuthenticated) return null;

  return (
    <View style={[CARD_STYLE, styles.card]}>
      {/* Header */}
      <View style={styles.labelRow}>
        <View style={styles.iconBadge}>
          <Text style={styles.badgeEmoji}>📊</Text>
        </View>
        <Text style={styles.label}>AI Reflection</Text>
      </View>

      {/* Period toggle */}
      <View style={styles.toggleRow}>
        {(['weekly', 'monthly'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.togglePill, period === p && styles.togglePillActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.75}
          >
            <Text style={[styles.toggleText, period === p && styles.toggleTextActive]}>
              {p === 'weekly' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Body */}
      {status === 'loading' && !message && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Generating your reflection…</Text>
        </View>
      )}

      {message && (
        <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
          {message}
        </Animated.Text>
      )}

      {status === 'error' && !message && (
        <Text style={styles.errorText}>Unable to load reflection</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.sm,
    backgroundColor: '#edf4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 14 },
  label: {
    ...TYPE.footnote,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  togglePill: {
    paddingVertical: 5,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.divider,
  },
  togglePillActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    ...TYPE.caption,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  toggleTextActive: {
    color: '#fff',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 4,
  },
  loadingText: {
    ...TYPE.footnote,
    color: COLORS.textMuted,
  },
  message: {
    ...TYPE.subhead,
    color: COLORS.text,
    lineHeight: 22,
  },
  errorText: {
    ...TYPE.footnote,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
