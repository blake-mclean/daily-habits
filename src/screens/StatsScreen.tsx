import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabits } from '../context/HabitsContext';
import { CARD_STYLE, COLORS, SPACING, TYPE, RADIUS } from '../theme';
import { getLast14Days } from '../utils/dateHelpers';

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function StatsScreen() {
  const { habits, isHabitComplete, getAllCompleteForDate, getCurrentStreak, getBestStreak, getCompletionRate } = useHabits();
  const days = getLast14Days();
  const currentStreak = getCurrentStreak();
  const bestStreak = getBestStreak();

  const dayPcts = days.map(date => {
    if (habits.length === 0) return 0;
    return habits.filter(h => isHabitComplete(h, date)).length / habits.length;
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.sub}>Your progress over time</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Streak cards */}
        <View style={styles.streakRow}>
          <View style={[styles.streakCard, { backgroundColor: COLORS.warning }]}>
            <Text style={styles.streakNum}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>Current{'\n'}Streak 🔥</Text>
          </View>
          <View style={[styles.streakCard, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.streakNum}>{bestStreak}</Text>
            <Text style={styles.streakLabel}>Best{'\n'}Streak 🏆</Text>
          </View>
        </View>

        {/* 14-day chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 14 Days</Text>
          {habits.length === 0 ? (
            <Text style={styles.noData}>Add habits to see your chart</Text>
          ) : (
            <View style={styles.chart}>
              {dayPcts.map((pct, i) => {
                const allDone = getAllCompleteForDate(days[i]);
                const barH = Math.max(3, Math.round(pct * BAR_H));
                return (
                  <View key={days[i]} style={styles.barGroup}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: barH,
                            backgroundColor: allDone
                              ? COLORS.success
                              : pct > 0
                              ? COLORS.primary
                              : COLORS.divider,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {DAY_ABBR[new Date(days[i] + 'T12:00:00').getDay()]}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.legend}>
            {[
              { color: COLORS.success, label: 'All complete' },
              { color: COLORS.primary, label: 'Partial' },
              { color: COLORS.divider, label: 'None' },
            ].map(item => (
              <View key={item.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Per-habit */}
        {habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habit Breakdown</Text>
            {habits.map(habit => {
              const rate = getCompletionRate(habit.id);
              return (
                <View key={habit.id} style={styles.habitRow}>
                  <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                    <View style={styles.rateTrack}>
                      <View style={[styles.rateFill, { width: `${rate}%` as any, backgroundColor: COLORS.primary }]} />
                    </View>
                  </View>
                  <Text style={[styles.rateLabel, { color: COLORS.primary }]}>{rate}%</Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderHard,
  },
  title: { ...TYPE.display, color: COLORS.text },
  sub: { ...TYPE.footnote, color: COLORS.textMuted, marginTop: 2 },
  body: { padding: SPACING.md, gap: SPACING.md },
  streakRow: { flexDirection: 'row', gap: SPACING.md },
  streakCard: {
    flex: 1, borderRadius: RADIUS.lg,
    padding: SPACING.lg, gap: 4, alignItems: 'center',
  },
  streakNum: { fontSize: 44, fontWeight: '700', color: '#fff', lineHeight: 50 },
  streakLabel: { ...TYPE.footnote, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  section: {
    ...CARD_STYLE,
    padding: SPACING.md, gap: SPACING.md,
  },
  sectionTitle: { ...TYPE.headline, color: COLORS.text },
  noData: { ...TYPE.body, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.lg },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 92, gap: 3,
  },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barContainer: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
  bar: { width: '75%', borderRadius: 3, minHeight: 3 },
  barLabel: { ...TYPE.captionSm, color: COLORS.textMuted, textAlign: 'center' },
  legend: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { ...TYPE.caption, color: COLORS.textMuted },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  habitEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  habitInfo: { flex: 1, gap: 4 },
  habitName: { ...TYPE.subhead, color: COLORS.text },
  rateTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.divider, overflow: 'hidden' },
  rateFill: { height: '100%', borderRadius: 2 },
  rateLabel: { ...TYPE.caption, fontWeight: '700', minWidth: 36, textAlign: 'right' },
});

const BAR_H = 72;
