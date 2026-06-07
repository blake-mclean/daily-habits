import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useHabits } from '../context/HabitsContext';
import { CARD_STYLE, COLORS, RADIUS, SPACING, TYPE } from '../theme';
import {
  chapterFromXp, xpForChapter, xpToNextChapter, IDENTITY_META, IDENTITY_TYPES,
  computeIdentityXp, identityLevelName, IdentityType,
} from '../retention/identity';

const TREND_GLYPH = { rising: '↑', stable: '→', falling: '↓' } as const;
const TREND_COLOR = {
  rising: COLORS.success,
  stable: COLORS.textMuted,
  falling: COLORS.warning,
} as const;

function scoreLabel(score: number): string {
  if (score >= 85) return 'Peak momentum';
  if (score >= 70) return 'Strong momentum';
  if (score >= 55) return 'Building momentum';
  if (score >= 40) return 'Recovering';
  return 'Starting fresh';
}

function computeTypeData(xp: number) {
  const chapter = chapterFromXp(xp);
  const neededForNext = xpToNextChapter(chapter);
  const xpAtStart = xpForChapter(chapter);
  const xpIntoChapter = Math.max(0, xp - xpAtStart);
  const xpProgress = neededForNext > 0 ? Math.min(1, xpIntoChapter / neededForNext) : 1;
  return { chapter, neededForNext, xpIntoChapter, xpProgress };
}

export default function RetentionDashboard() {
  const {
    momentumScore,
    momentumTrend,
    futureSelfText,
    futureSelfNudgesEnabled,
    habits,
    logs,
    daysSinceLastCheckIn,
  } = useHabits();

  const identityXp = computeIdentityXp(habits, logs);

  // Only show types the user has at least one habit for
  const activeTypes = IDENTITY_TYPES.filter(type =>
    habits.some(h => h.identityType === type)
  );

  // Per-type computed data
  const typeData = Object.fromEntries(
    IDENTITY_TYPES.map(type => [type, computeTypeData(identityXp[type] ?? 0)])
  ) as Record<IdentityType, ReturnType<typeof computeTypeData>>;

  // One Animated.Value per type — fixed set, safe to put in useRef
  const xpBarAnims = useRef(
    Object.fromEntries(
      IDENTITY_TYPES.map(t => [t, new Animated.Value(typeData[t].xpProgress)])
    ) as Record<IdentityType, Animated.Value>
  ).current;

  // Stable key: only fires spring when XP values actually change
  const xpKey = IDENTITY_TYPES.map(t => typeData[t].xpProgress.toFixed(4)).join(',');
  useEffect(() => {
    IDENTITY_TYPES.forEach(type => {
      Animated.spring(xpBarAnims[type], {
        toValue: typeData[type].xpProgress,
        useNativeDriver: false,
        tension: 60,
        friction: 8,
      }).start();
    });
  }, [xpKey]);

  const momentumBarAnim = useRef(new Animated.Value(momentumScore / 100)).current;
  useEffect(() => {
    Animated.spring(momentumBarAnim, {
      toValue: momentumScore / 100,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start();
  }, [momentumScore]);

  const momentumBarWidth = momentumBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const trendGlyph = TREND_GLYPH[momentumTrend];
  const trendColor = TREND_COLOR[momentumTrend];

  if (habits.length === 0) return null;

  return (
    <View style={styles.root}>
      {/* ── Future Self message ──────────────────────── */}
      {futureSelfNudgesEnabled && futureSelfText ? (
        <View style={[styles.card, styles.messageCard]}>
          <Text style={styles.messageText}>"{futureSelfText}"</Text>
        </View>
      ) : null}

      {/* ── Identity block — all active types ────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Identity</Text>

        {activeTypes.length === 0 ? (
          <Text style={styles.emptyText}>Complete habits to build your identity</Text>
        ) : (
          activeTypes.map((type, index) => {
            const { chapter, xpIntoChapter, neededForNext } = typeData[type];
            const barWidth = xpBarAnims[type].interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            });
            return (
              <View
                key={type}
                style={[styles.identityRow, index > 0 && styles.identityRowBorder]}
              >
                <Text style={styles.typeEmoji}>{IDENTITY_META[type].emoji}</Text>
                <View style={styles.typeInfo}>
                  <View style={styles.typeNameRow}>
                    <Text style={styles.typeName} numberOfLines={1}>
                      {identityLevelName(type, chapter)}
                    </Text>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>Lvl {chapter}</Text>
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[styles.progressFill, { width: barWidth, backgroundColor: COLORS.primary }]}
                    />
                  </View>
                  <Text style={styles.xpText}>{xpIntoChapter} / {neededForNext} XP</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Momentum (compact) ───────────────────────── */}
      <View style={styles.card}>
        <View style={styles.momentumRow}>
          <View>
            <Text style={styles.sectionLabel}>Momentum</Text>
            <Text style={styles.scoreDesc}>{scoreLabel(momentumScore)}</Text>
          </View>
          <View style={styles.scoreRight}>
            <Text style={styles.scoreNumber}>{momentumScore}</Text>
            <Text style={[styles.trendGlyph, { color: trendColor }]}>{trendGlyph}</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: momentumBarWidth, backgroundColor: trendColor }]}
          />
        </View>
      </View>

      {/* ── Re-engagement banner ──────────────────────── */}
      {daysSinceLastCheckIn >= 3 && futureSelfNudgesEnabled && (
        <View style={styles.reengageBanner}>
          <Text style={styles.reengageText}>
            {daysSinceLastCheckIn >= 6
              ? `${daysSinceLastCheckIn} days since your last check-in. Your future self is waiting.`
              : 'A few days have passed. One habit today brings everything back.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: SPACING.xs },

  card: {
    ...CARD_STYLE,
    padding: SPACING.md,
  },

  messageCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    ...TYPE.body,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 24,
  },

  sectionLabel: {
    ...TYPE.caption,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.xs,
  },

  emptyText: {
    ...TYPE.footnote,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Identity rows
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.sm,
  },
  identityRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
  },
  typeEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  typeInfo: { flex: 1, gap: 4 },
  typeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.2,
    flex: 1,
  },
  levelBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: {
    ...TYPE.captionSm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  xpText: { ...TYPE.captionSm, color: COLORS.textMuted },

  // Momentum block
  momentumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  scoreRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreNumber: { fontSize: 28, fontWeight: '600', color: COLORS.text, letterSpacing: -0.5 },
  trendGlyph: { fontSize: 18, fontWeight: '600' },
  scoreDesc: { ...TYPE.footnote, color: COLORS.textMuted, marginTop: 1 },

  // Re-engagement
  reengageBanner: {
    ...CARD_STYLE,
    padding: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    borderColor: 'rgba(255,159,10,0.25)',
  },
  reengageText: {
    ...TYPE.footnote,
    color: '#92400E',
    fontWeight: '500',
    textAlign: 'center',
  },
});
