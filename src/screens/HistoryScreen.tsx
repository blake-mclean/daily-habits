import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHabits } from '../context/HabitsContext';
import { CARD_STYLE, COLORS, RADIUS, SPACING, TYPE } from '../theme';
import { formatDisplayDate, getCalendarDaysForMonth, today, todayAsDate } from '../utils/dateHelpers';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDE_PAD = SPACING.lg * 2;
const LABEL_W = 28;
const GAP = 4;
const CELL_SIZE = Math.floor((SCREEN_W - SIDE_PAD - LABEL_W - GAP * 6) / 7);
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

type CellState = 'future' | 'empty' | 'partial' | 'complete';

const CELL_COLOR: Record<CellState, string> = {
  future:   COLORS.background,
  empty:    COLORS.divider,
  partial:  '#a8cef5',        // light Action Blue
  complete: COLORS.primary,
};
const CUBE_EDGE: Record<CellState, string> = {
  future:   COLORS.borderHard,
  empty:    COLORS.borderHard,
  partial:  '#5ba3e8',
  complete: '#004fa3',
};

function Cell({
  dateStr, state, selected, onPress,
}: {
  dateStr: string | null; state: CellState | null; selected: boolean; onPress: () => void;
}) {
  if (!dateStr || !state) return <View style={[styles.cell, { backgroundColor: 'transparent' }]} />;
  return (
    <TouchableOpacity
      style={[
        styles.cell,
        { backgroundColor: CELL_COLOR[state], borderBottomColor: CUBE_EDGE[state], borderRightColor: CUBE_EDGE[state] },
        selected && styles.cellSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    />
  );
}

export default function HistoryScreen() {
  const { habits, isHabitComplete, getAllCompleteForDate } = useHabits();
  const now = todayAsDate();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const todayStr = today();

  const navigate = (delta: number) => {
    setSelected(null);
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  const weeks = getCalendarDaysForMonth(year, month);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const getCellState = (d: string): CellState => {
    if (d > todayStr) return 'future';
    if (habits.length === 0) return 'empty';
    const done = habits.filter(h => isHabitComplete(h, d)).length;
    if (done === 0) return 'empty';
    return done === habits.length ? 'complete' : 'partial';
  };

  const pastDays = weeks.flat().filter(d => d && d <= todayStr) as string[];
  const completeDays = pastDays.filter(d => getAllCompleteForDate(d));
  const pct = pastDays.length ? Math.round((completeDays.length / pastDays.length) * 100) : 0;

  const selectedHabits = selected ? habits.map(h => ({ h, done: isHabitComplete(h, selected) })) : [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.sub}>Habit calendar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigate(-1)}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
            onPress={() => navigate(1)}
            disabled={isCurrentMonth}
          >
            <Ionicons name="chevron-forward" size={18} color={isCurrentMonth ? COLORS.borderHard : COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Month stat */}
        {pastDays.length > 0 && (
          <View style={styles.statRow}>
            <Text style={styles.statText}>
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{completeDays.length}</Text>
              {' '}of {pastDays.length} days complete —{' '}
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>{pct}%</Text>
            </Text>
          </View>
        )}

        {/* Calendar grid */}
        <View style={[CARD_STYLE, styles.calendarWrap]}>
          {/* DOW header */}
          <View style={styles.dowRow}>
            <View style={{ width: LABEL_W }} />
            {DOW.map((d, i) => <Text key={i} style={styles.dowLabel}>{d}</Text>)}
          </View>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              <View style={{ width: LABEL_W }}>
                {week.find(Boolean) && (
                  <Text style={styles.weekNum}>
                    {new Date((week.find(Boolean) as string) + 'T12:00:00').getDate()}
                  </Text>
                )}
              </View>
              {week.map((d, di) => (
                <Cell
                  key={di}
                  dateStr={d}
                  state={d ? getCellState(d) : null}
                  selected={selected === d}
                  onPress={() => {
                    if (d && d <= todayStr) setSelected(p => p === d ? null : d);
                  }}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {([['empty','Nothing done'],['partial','Partial'],['complete','All complete']] as [CellState, string][]).map(([s, label]) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendCube, { backgroundColor: CELL_COLOR[s], borderBottomColor: CUBE_EDGE[s], borderRightColor: CUBE_EDGE[s] }]} />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Detail panel */}
        {selected && (
          <View style={[CARD_STYLE, styles.detailCard]}>
            <Text style={styles.detailDate}>{formatDisplayDate(selected)}</Text>
            <Text style={styles.detailSub}>
              {selectedHabits.filter(x => x.done).length}/{habits.length} habits complete
            </Text>
            {selectedHabits.map(({ h, done }) => (
              <View key={h.id} style={styles.detailRow}>
                <Text style={styles.detailEmoji}>{h.emoji}</Text>
                <Text style={[styles.detailName, !done && { opacity: 0.35 }]}>{h.name}</Text>
                <Text>{done ? '✅' : '⭕'}</Text>
              </View>
            ))}
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
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.borderHard,
  },
  title: { ...TYPE.display, color: COLORS.text },
  sub: { ...TYPE.footnote, color: COLORS.textMuted, marginTop: 2 },
  body: { padding: SPACING.lg, gap: SPACING.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { backgroundColor: COLORS.divider },
  monthLabel: { ...TYPE.title, color: COLORS.text },
  statRow: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderHard, alignItems: 'center',
  },
  statText: { ...TYPE.subhead, color: COLORS.text },
  calendarWrap: { padding: SPACING.md, gap: GAP },
  dowRow: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  dowLabel: { width: CELL_SIZE, textAlign: 'center', ...TYPE.captionSm, color: COLORS.textMuted, fontWeight: '600' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: GAP },
  weekNum: { ...TYPE.captionSm, color: COLORS.textMuted },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE, borderRadius: 5,
    borderBottomWidth: 2.5, borderRightWidth: 1.5,
  },
  cellSelected: { borderWidth: 2, borderColor: COLORS.text, borderBottomWidth: 2, borderRightWidth: 2 },
  legend: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center', flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendCube: { width: 14, height: 14, borderRadius: 3, borderBottomWidth: 2.5, borderRightWidth: 1.5 },
  legendText: { ...TYPE.caption, color: COLORS.textMuted },
  detailCard: { padding: SPACING.md, gap: SPACING.sm },
  detailDate: { ...TYPE.headline, color: COLORS.text },
  detailSub: { ...TYPE.footnote, color: COLORS.textMuted, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  detailEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  detailName: { flex: 1, ...TYPE.subhead, color: COLORS.text },
});
