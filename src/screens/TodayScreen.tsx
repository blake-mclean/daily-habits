import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import HabitCard from '../components/HabitCard';
import AddHabitModal from '../components/AddHabitModal';
import RewardModal from '../components/RewardModal';
import LevelUpModal from '../components/LevelUpModal';
import RetentionDashboard from '../components/RetentionDashboard';
import SettingsScreen from './SettingsScreen';
import { useHabits } from '../context/HabitsContext';
import { COLORS, RADIUS, SPACING, TYPE } from '../theme';
import { today, formatFullDate, getGreeting } from '../utils/dateHelpers';

export default function TodayScreen() {
  const {
    habits, userName,
    isHabitComplete, getAllCompleteForDate,
    markChallengeDay, challenges, lastRewardDate, markRewardShown,
    pendingLevelUp, clearLevelUp,
  } = useHabits();

  const [showAdd, setShowAdd] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  const todayStr = today();
  const completedCount = habits.filter(h => isHabitComplete(h, todayStr)).length;
  const total = habits.length;
  const progress = total > 0 ? completedCount / total : 0;
  const allComplete = getAllCompleteForDate(todayStr);

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, useNativeDriver: false, speed: 14, bounciness: 2 }).start();
  }, [progress]);

  useEffect(() => {
    if (allComplete && lastRewardDate !== todayStr) {
      setShowReward(true);
      markRewardShown();
      const activeChallenge = challenges.find(c => !c.completed);
      if (activeChallenge) markChallengeDay(activeChallenge.id);
    }
  }, [allComplete]);

  const animateFab = () => {
    Animated.sequence([
      Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, speed: 80 }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, speed: 80 }),
    ]).start();
    setShowAdd(true);
  };

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{getGreeting(userName)}</Text>
          <Text style={styles.date}>{formatFullDate(todayStr)}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowSettings(true)} hitSlop={12}>
          <Ionicons name="settings-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress */}
      {total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width: barWidth as any }]} />
            </View>
            <Text style={styles.progressLabel}>
              {completedCount}/{total}
            </Text>
          </View>
          {allComplete && (
            <Text style={styles.allDoneLabel}>All habits done today ✓</Text>
          )}
        </View>
      )}

      {/* Habit list */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Retention system dashboard */}
        <RetentionDashboard />

        {habits.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptyBody}>
              Tap + to add your first habit and start building momentum.
            </Text>
          </View>
        ) : (
          <>
            {habits.map(habit => <HabitCard key={habit.id} habit={habit} />)}
            <Text style={styles.swipeHint}>Swipe left on a habit to delete it</Text>
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity style={styles.fab} onPress={animateFab} activeOpacity={0.88}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <AddHabitModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <RewardModal visible={showReward} onClose={() => setShowReward(false)} />
      <LevelUpModal
        visible={pendingLevelUp !== null}
        identityType={pendingLevelUp?.identityType ?? null}
        newChapter={pendingLevelUp?.newChapter ?? 2}
        onClose={clearLevelUp}
      />
      <SettingsScreen visible={showSettings} onClose={() => setShowSettings(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderHard,
  },
  greeting: { ...TYPE.title, color: COLORS.text },
  date: { ...TYPE.footnote, color: COLORS.textMuted, marginTop: 2 },
  progressSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderHard,
    gap: 4,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  track: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: COLORS.divider, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
  progressLabel: { ...TYPE.caption, fontWeight: '600', color: COLORS.primary, minWidth: 36, textAlign: 'right' },
  allDoneLabel: { ...TYPE.caption, color: COLORS.primary, fontWeight: '600' },
  list: { padding: SPACING.md, gap: SPACING.xs },
  empty: {
    alignItems: 'center', paddingTop: 64,
    paddingHorizontal: SPACING.xxl, gap: SPACING.sm,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { ...TYPE.title, color: COLORS.text, textAlign: 'center' },
  emptyBody: { ...TYPE.body, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24 },
  swipeHint: { ...TYPE.caption, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.sm, fontStyle: 'italic' },
  fabWrap: { position: 'absolute', bottom: 28, right: SPACING.lg },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
