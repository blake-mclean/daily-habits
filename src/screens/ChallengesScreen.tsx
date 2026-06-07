import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ConfettiEffect from '../components/ConfettiEffect';
import { useHabits } from '../context/HabitsContext';
import { useSound } from '../hooks/useSound';
import { COLORS, RADIUS, SPACING } from '../theme';
import { formatDisplayDate, today } from '../utils/dateHelpers';
import { CHALLENGE_TEMPLATES, getTemplate, ChallengeTemplate } from '../data/challengeTemplates';

// ─── Badge strip ────────────────────────────────────────────────────────────

function BadgeCard({ template, earnedDate }: { template: ChallengeTemplate; earnedDate?: string }) {
  return (
    <View style={styles.badgeCard}>
      <Text style={styles.badgeEmoji}>{template.badgeEmoji}</Text>
      <Text style={styles.badgeName}>{template.badgeName}</Text>
      <Text style={styles.badgeChallenge} numberOfLines={1}>{template.name}</Text>
      {earnedDate && (
        <Text style={styles.badgeDate}>{formatDisplayDate(earnedDate)}</Text>
      )}
    </View>
  );
}

// ─── Single challenge card ───────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  template,
  onMarkDay,
}: {
  challenge: { id: string; completedDays: string[]; completed: boolean; startDate: string; durationDays: number };
  template: ChallengeTemplate;
  onMarkDay: () => void;
}) {
  const { getAllCompleteForDate } = useHabits();
  const todayStr = today();
  const completedSet = new Set(challenge.completedDays);
  const progress = challenge.completedDays.length / challenge.durationDays;

  const daysArray = Array.from({ length: challenge.durationDays }, (_, i) => {
    const d = new Date(challenge.startDate + 'T12:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const todayIdx = daysArray.indexOf(todayStr);
  const allDoneToday = getAllCompleteForDate(todayStr);

  return (
    <View style={styles.challengeCard}>
      <View style={styles.cardTop}>
        <View style={[styles.badgeIconWrap, { backgroundColor: challenge.completed ? COLORS.successLight : COLORS.goldLight }]}>
          <Text style={styles.cardEmoji}>{challenge.completed ? template.badgeEmoji : template.emoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.challengeName}>{template.name}</Text>
          <Text style={styles.challengeDesc} numberOfLines={2}>{template.description}</Text>
        </View>
        {challenge.completed && (
          <View style={styles.completedPill}>
            <Text style={styles.completedPillText}>Done ✓</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%` as any,
                backgroundColor: challenge.completed ? COLORS.success : COLORS.gold,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {challenge.completedDays.length}/{challenge.durationDays} days
        </Text>
      </View>

      {/* Day dots (show up to 10, then summarize) */}
      {challenge.durationDays <= 10 ? (
        <View style={styles.timeline}>
          {daysArray.map((dateStr, i) => {
            const done = completedSet.has(dateStr);
            const isCurrentDay = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            return (
              <View key={dateStr} style={styles.dayWrap}>
                <View
                  style={[
                    styles.dayCircle,
                    done && styles.dayCircleDone,
                    isCurrentDay && !done && styles.dayCircleCurrent,
                    isFuture && !isCurrentDay && styles.dayCircleFuture,
                  ]}
                >
                  {done ? (
                    <Text style={styles.dayCheck}>✓</Text>
                  ) : (
                    <Text style={[styles.dayNum, (isFuture && !isCurrentDay) && { color: COLORS.textMuted }]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {daysArray.length <= 7 && (
                  <Text style={styles.dayDate}>
                    {formatDisplayDate(dateStr).split(',')[0]}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.longProgressRow}>
          {daysArray.map((dateStr, i) => {
            const done = completedSet.has(dateStr);
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  done && { backgroundColor: COLORS.success },
                  isToday && !done && { backgroundColor: COLORS.gold },
                  isFuture && !isToday && { backgroundColor: COLORS.border },
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Today hint */}
      {!challenge.completed && todayIdx >= 0 && !completedSet.has(todayStr) && (
        <View style={[styles.hint, allDoneToday && styles.hintReady]}>
          <Text style={[styles.hintText, allDoneToday && { color: COLORS.success }]}>
            {allDoneToday
              ? `✅ All done for today — Day ${todayIdx + 1} is complete!`
              : `🎯 Complete all habits today to log Day ${todayIdx + 1}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ChallengesScreen() {
  const { challenges, habits, markChallengeRewardShown, startChallenge } = useHabits();
  const { playCelebrate } = useSound();

  const pendingReward = challenges.find(c => c.completed && !c.rewardShown);
  const cardScale = useRef(new Animated.Value(0.7)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pendingReward) {
      cardScale.setValue(0.7);
      cardOpacity.setValue(0);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playCelebrate();
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 14 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [pendingReward?.id]);

  // Derive challenge states
  const completedChallenges = challenges.filter(c => c.completed);
  const activeChallenges = challenges.filter(c => !c.completed);
  const startedIds = new Set(challenges.map(c => c.id));
  const completedIds = new Set(completedChallenges.map(c => c.id));

  const availableTemplates = CHALLENGE_TEMPLATES.filter(t => {
    if (startedIds.has(t.id)) return false; // already started
    if (!t.prerequisiteId) return true;
    return completedIds.has(t.prerequisiteId);
  });

  const lockedTemplates = CHALLENGE_TEMPLATES.filter(t => {
    if (startedIds.has(t.id)) return false;
    if (!t.prerequisiteId) return false;
    return !completedIds.has(t.prerequisiteId);
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.sub}>Stay on mission</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── Badges ── */}
        {completedChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎖️ Your Badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.badgeRow}>
                {completedChallenges.map(c => {
                  const template = getTemplate(c.id);
                  if (!template) return null;
                  const lastDay = c.completedDays[c.completedDays.length - 1];
                  return (
                    <BadgeCard key={c.id} template={template} earnedDate={lastDay} />
                  );
                })}
                {/* Locked future badges */}
                {lockedTemplates.map(t => (
                  <View key={t.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                    <Text style={[styles.badgeEmoji, { opacity: 0.2 }]}>{t.badgeEmoji}</Text>
                    <Text style={[styles.badgeName, { opacity: 0.3 }]}>{t.badgeName}</Text>
                    <Text style={styles.badgeLock}>🔒</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── Active challenges ── */}
        {activeChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ In Progress</Text>
            {activeChallenges.map(c => {
              const template = getTemplate(c.id);
              if (!template) return null;
              return (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  template={template}
                  onMarkDay={() => {}}
                />
              );
            })}
          </View>
        )}

        {/* ── Available ── */}
        {availableTemplates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🟢 Ready to Start</Text>
            {availableTemplates.map(t => (
              <View key={t.id} style={styles.availableCard}>
                <View style={styles.cardTop}>
                  <View style={[styles.badgeIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                    <Text style={styles.cardEmoji}>{t.emoji}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.challengeName}>{t.name}</Text>
                    <Text style={styles.challengeDesc}>{t.description}</Text>
                    <Text style={styles.durationLabel}>{t.durationDays} days · Badge: {t.badgeEmoji} {t.badgeName}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.startBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    startChallenge(t.id);
                  }}
                >
                  <Text style={styles.startBtnText}>Start Challenge →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ── Locked ── */}
        {lockedTemplates.length > 0 && completedChallenges.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Locked</Text>
            {lockedTemplates.map(t => {
              const prereq = getTemplate(t.prerequisiteId!);
              return (
                <View key={t.id} style={[styles.availableCard, styles.lockedCard]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.badgeIconWrap, { backgroundColor: COLORS.border }]}>
                      <Text style={[styles.cardEmoji, { opacity: 0.3 }]}>{t.emoji}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.challengeName, { opacity: 0.4 }]}>{t.name}</Text>
                      <Text style={[styles.challengeDesc, { opacity: 0.5 }]}>{t.description}</Text>
                      {prereq && (
                        <Text style={styles.unlockHint}>Complete "{prereq.name}" to unlock</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {challenges.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏁</Text>
            <Text style={styles.emptyTitle}>No active challenge</Text>
            <Text style={styles.emptyBody}>
              Complete onboarding to unlock your 3-Day Kickstart challenge.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Challenge completion reward modal ── */}
      {pendingReward && (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => markChallengeRewardShown(pendingReward.id)}
        >
          <View style={styles.modalBackdrop}>
            <ConfettiEffect visible />
            <Animated.View
              style={[
                styles.rewardCard,
                { opacity: cardOpacity, transform: [{ scale: cardScale }] },
              ]}
            >
              {(() => {
                const t = getTemplate(pendingReward.id);
                return (
                  <>
                    <Text style={styles.rewardTrophy}>{t?.badgeEmoji ?? '🏆'}</Text>
                    <Text style={styles.rewardTitle}>Challenge Complete!</Text>
                    <Text style={styles.rewardSubtitle}>{pendingReward.name}</Text>
                    <View style={styles.newBadgePill}>
                      <Text style={styles.newBadgeText}>
                        New badge unlocked: {t?.badgeName}
                      </Text>
                    </View>
                    <Text style={styles.rewardMessage}>
                      You showed up every single day. That's what building habits looks like.
                    </Text>
                    <TouchableOpacity
                      style={styles.rewardBtn}
                      onPress={() => markChallengeRewardShown(pendingReward.id)}
                    >
                      <Text style={styles.rewardBtnText}>Claim Badge 🎖️</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </Animated.View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  body: { padding: SPACING.md, gap: SPACING.lg, paddingBottom: 32 },
  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  // Badge strip
  badgeRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: 4 },
  badgeCard: {
    width: 90,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  badgeCardLocked: { borderColor: COLORS.border, opacity: 0.6 },
  badgeEmoji: { fontSize: 32 },
  badgeName: { fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  badgeChallenge: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  badgeDate: { fontSize: 9, color: COLORS.textMuted },
  badgeLock: { fontSize: 16 },
  // Challenge cards
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  availableCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  lockedCard: { borderColor: COLORS.border, opacity: 0.7 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: { fontSize: 24 },
  cardInfo: { flex: 1, gap: 3 },
  challengeName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  challengeDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  durationLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  completedPill: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  completedPillText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, minWidth: 48, textAlign: 'right' },
  timeline: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 6 },
  dayWrap: { alignItems: 'center', gap: 4 },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dayCircleDone: { borderColor: COLORS.success, backgroundColor: COLORS.success },
  dayCircleCurrent: { borderColor: COLORS.gold, backgroundColor: COLORS.goldLight },
  dayCircleFuture: { opacity: 0.4 },
  dayCheck: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dayNum: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dayDate: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  longProgressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  hint: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  hintReady: { backgroundColor: COLORS.successLight },
  hintText: { fontSize: 13, color: COLORS.primary, fontWeight: '600', textAlign: 'center' },
  startBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  unlockHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  emptyBody: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '82%',
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  rewardTrophy: { fontSize: 72 },
  rewardTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  rewardSubtitle: { fontSize: 16, fontWeight: '600', color: COLORS.gold },
  newBadgePill: {
    backgroundColor: COLORS.goldLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  newBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.gold },
  rewardMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  rewardBtn: {
    marginTop: 8,
    backgroundColor: COLORS.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADIUS.full,
  },
  rewardBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
