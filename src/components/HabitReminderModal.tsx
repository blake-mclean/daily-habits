import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Habit, useHabits } from '../context/HabitsContext';
import {
  scheduleHabitReminder,
  cancelHabitReminder,
} from '../utils/notifications';
import { COLORS, RADIUS, SPACING } from '../theme';

interface Props {
  visible: boolean;
  habit: Habit;
  onClose: () => void;
}

function cycleMins(m: number, delta: number): number {
  const opts = [0, 15, 30, 45];
  const idx = opts.indexOf(m);
  return opts[((idx + delta) + opts.length) % opts.length];
}

export default function HabitReminderModal({ visible, habit, onClose }: Props) {
  const { setHabitReminder } = useHabits();

  const existing = habit.reminder;
  const [enabled, setEnabled] = useState(!!existing);
  const [hour, setHour] = useState(existing?.hour ?? 9);
  const [minute, setMinute] = useState(existing?.minute ?? 0);

  const handleSave = async () => {
    if (enabled) {
      await scheduleHabitReminder(habit.id, habit.name, habit.emoji, hour, minute);
      setHabitReminder(habit.id, { hour, minute });
    } else {
      await cancelHabitReminder(habit.id);
      setHabitReminder(habit.id, undefined);
    }
    onClose();
  };

  const display12h = () => {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{habit.emoji}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{habit.name}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} hitSlop={12}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <Ionicons name="alarm-outline" size={22} color={enabled ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.toggleLabel, enabled && { color: COLORS.primary }]}>
                Daily reminder
              </Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
            {existing && !enabled && (
              <Text style={styles.toggleSub}>Reminder will be cancelled</Text>
            )}
          </View>

          {/* Time picker */}
          {enabled && (
            <View style={styles.pickerCard}>
              <Text style={styles.pickerLabel}>Remind me daily at</Text>

              <View style={styles.timePicker}>
                {/* Hour */}
                <View style={styles.timeCol}>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => setHour(h => (h + 1) % 24)}
                  >
                    <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeNum}>
                    {hour % 12 === 0 ? 12 : hour % 12}
                  </Text>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => setHour(h => (h + 23) % 24)}
                  >
                    <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeSep}>:</Text>

                {/* Minute */}
                <View style={styles.timeCol}>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => setMinute(m => cycleMins(m, 1))}
                  >
                    <Ionicons name="chevron-up" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeNum}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.arrowBtn}
                    onPress={() => setMinute(m => cycleMins(m, -1))}
                  >
                    <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* AM/PM */}
                <TouchableOpacity
                  style={styles.ampmBtn}
                  onPress={() => setHour(h => h < 12 ? h + 12 : h - 12)}
                >
                  <Text style={styles.ampmText}>{hour < 12 ? 'AM' : 'PM'}</Text>
                </TouchableOpacity>
              </View>

              {/* Preview */}
              <View style={styles.previewBubble}>
                <Text style={styles.previewTitle}>
                  {habit.emoji} Habit reminder
                </Text>
                <Text style={styles.previewBody}>
                  Time for: {habit.name}
                </Text>
                <Text style={styles.previewTime}>Fires daily at {display12h()}</Text>
              </View>
            </View>
          )}
        </View>
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
  cancelText: { fontSize: 16, color: COLORS.textMuted, width: 56 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  saveText: { fontSize: 16, fontWeight: '700', color: COLORS.primary, width: 56, textAlign: 'right' },
  body: { padding: SPACING.md, gap: SPACING.md },
  toggleCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  toggleSub: { fontSize: 12, color: '#DC2626', fontWeight: '500' },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timeCol: { alignItems: 'center', gap: 6 },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeNum: { fontSize: 44, fontWeight: '700', color: COLORS.text, minWidth: 60, textAlign: 'center' },
  timeSep: { fontSize: 38, fontWeight: '700', color: COLORS.text, paddingBottom: 6 },
  ampmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    minWidth: 60,
    alignItems: 'center',
  },
  ampmText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  previewBubble: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 3,
  },
  previewTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  previewBody: { fontSize: 13, color: COLORS.textMuted },
  previewTime: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
});
