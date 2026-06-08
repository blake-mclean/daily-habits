import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { fetchCoachingMessage } from '../lib/aiCoaching';
import { scheduleAICoachingNotification } from '../utils/notifications';
import { CARD_STYLE, COLORS, RADIUS, SPACING, TYPE } from '../theme';

type Status = 'loading' | 'ready' | 'error';

interface Props {
  userName: string;
}

export default function AICoachCard({ userName }: Props) {
  const { session } = useAuth();
  const isAuthenticated = !!session?.user;
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasMessage = useRef(false);

  const load = useCallback(async (forceRefresh: boolean) => {
    if (!hasMessage.current || forceRefresh) setStatus('loading');

    try {
      const result = await fetchCoachingMessage(forceRefresh);
      if (result) {
        hasMessage.current = true;
        setMessage(result);
        setStatus('ready');
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        // Schedule a 3 PM push notification with the fresh message
        scheduleAICoachingNotification(userName, result).catch(() => {});
      } else if (!hasMessage.current) {
        setStatus('error');
      }
    } catch {
      if (!hasMessage.current) setStatus('error');
    }
  }, [userName]);

  useEffect(() => {
    if (!isAuthenticated) return;

    load(false);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        load(false); // cache guards against unnecessary Claude calls
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, [isAuthenticated, load]);

  if (!isAuthenticated) return null;

  return (
    <View style={[CARD_STYLE, styles.card]}>
      {/* Header */}
      <View style={styles.labelRow}>
        <View style={styles.iconBadge}>
          <Text style={styles.badgeEmoji}>✨</Text>
        </View>
        <Text style={styles.label}>AI Coach</Text>
      </View>

      {/* Body */}
      {status === 'loading' && !message && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.loadingText}>Getting your coaching message…</Text>
        </View>
      )}

      {message && (
        <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
          {message}
        </Animated.Text>
      )}

      {status === 'error' && !message && (
        <Text style={styles.errorText}>Unable to load coaching message</Text>
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
    backgroundColor: COLORS.primaryLight,
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
