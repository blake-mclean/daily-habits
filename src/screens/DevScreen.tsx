import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMockDateOffset, setMockDateOffset, today } from '../utils/dateHelpers';
import { useHabits } from '../context/HabitsContext';
import { COLORS, RADIUS, SPACING } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function DevScreen({ visible, onClose }: Props) {
  const { resetData, logHabit, habits, markChallengeDay, challenges } = useHabits();
  const [offset, setOffset] = useState(getMockDateOffset());

  const updateOffset = (delta: number) => {
    const next = offset + delta;
    setOffset(next);
    setMockDateOffset(next);
  };

  const resetToToday = () => {
    setOffset(0);
    setMockDateOffset(0);
  };

  const simulateAllComplete = () => {
    const d = today();
    habits.forEach(h => {
      for (let i = 0; i < h.targetCount; i++) {
        logHabit(h.id, d);
      }
    });
    const activeChallenge = challenges.find(c => !c.completed);
    if (activeChallenge) markChallengeDay(activeChallenge.id, d);
    Alert.alert('Done', `Marked all habits complete for ${d}`);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all habits, logs, and challenge progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            resetToToday();
            await resetData();
            onClose();
          },
        },
      ]
    );
  };

  const realDate = new Date();
  const mockDate = new Date();
  mockDate.setDate(mockDate.getDate() + offset);
  const mockDateStr = mockDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Developer Tools</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Warning banner */}
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ These tools are for development and testing only. Changes made here affect real app data.
            </Text>
          </View>

          {/* Date control */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date Override</Text>
            <Text style={styles.sectionDesc}>
              Simulate a different day to test time-based features like challenges and streaks.
            </Text>

            <View style={styles.dateDisplay}>
              <Text style={styles.dateLabel}>App Date</Text>
              <Text style={styles.dateValue}>{mockDateStr}</Text>
              {offset !== 0 && (
                <View style={styles.offsetBadge}>
                  <Text style={styles.offsetText}>
                    {offset > 0 ? `+${offset}` : offset} day{Math.abs(offset) !== 1 ? 's' : ''} from today
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.dayBtnRow}>
              <TouchableOpacity style={styles.dayBtn} onPress={() => updateOffset(-7)}>
                <Text style={styles.dayBtnText}>−7 days</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dayBtn} onPress={() => updateOffset(-1)}>
                <Text style={styles.dayBtnText}>−1 day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dayBtn} onPress={() => updateOffset(1)}>
                <Text style={styles.dayBtnText}>+1 day</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dayBtn} onPress={() => updateOffset(7)}>
                <Text style={styles.dayBtnText}>+7 days</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, offset === 0 && styles.actionBtnDisabled]}
              onPress={resetToToday}
              disabled={offset === 0}
            >
              <Text style={[styles.actionBtnText, offset === 0 && { color: COLORS.textMuted }]}>
                Reset to Real Today
              </Text>
            </TouchableOpacity>
          </View>

          {/* Simulate completion */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Simulate Completion</Text>
            <Text style={styles.sectionDesc}>
              Mark all habits as complete for the current app date. Useful for testing challenge progress and the reward screen.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, habits.length === 0 && styles.actionBtnDisabled]}
              onPress={simulateAllComplete}
              disabled={habits.length === 0}
            >
              <Text style={styles.actionBtnText}>
                {habits.length === 0 ? 'No habits to complete' : `Complete all ${habits.length} habits for ${today()}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Danger zone */}
          <View style={[styles.section, styles.dangerSection]}>
            <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>Danger Zone</Text>
            <Text style={styles.sectionDesc}>
              Permanently deletes all habits, logs, and challenge data. Resets to first-launch state.
            </Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
              <Text style={styles.dangerBtnText}>Reset All App Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  backBtn: { fontSize: 16, color: COLORS.primary, fontWeight: '600', width: 60 },
  body: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.gold,
  },
  warningText: { fontSize: 13, color: '#92400E', fontWeight: '500', lineHeight: 18 },
  section: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dangerSection: { borderWidth: 1.5, borderColor: '#FECACA' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  dateDisplay: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
    alignItems: 'center',
  },
  dateLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  dateValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  offsetBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  offsetText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  dayBtnRow: { flexDirection: 'row', gap: 8 },
  dayBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dayBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  actionBtn: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  dangerBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
});
