import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHabits } from '../context/HabitsContext';
import { NotificationPref, scheduleHabitNotifications, formatPrefTime } from '../utils/notifications';
import { COLORS, RADIUS, SPACING } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const PREF_ICONS: Record<string, string> = {
  morning: '🌅',
  midday: '☀️',
  evening: '🌙',
};

function cycleMins(m: number, delta: number): number {
  const opts = [0, 15, 30, 45];
  const idx = opts.indexOf(m);
  const next = (idx + delta + opts.length) % opts.length;
  return opts[next];
}

function cycleHour(h: number, delta: number): number {
  return ((h + delta + 24) % 24);
}

export default function NotificationSettingsScreen({ visible, onClose }: Props) {
  const { notifPrefs, updateNotifPrefs } = useHabits();
  const [localPrefs, setLocalPrefs] = useState<NotificationPref[]>(notifPrefs);

  const updatePref = (id: string, patch: Partial<NotificationPref>) => {
    setLocalPrefs(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleSave = async () => {
    updateNotifPrefs(localPrefs);
    await scheduleHabitNotifications(localPrefs);
    const activeCount = localPrefs.filter(p => p.enabled).length;
    Alert.alert(
      'Saved',
      activeCount > 0
        ? `${activeCount} reminder${activeCount !== 1 ? 's' : ''} scheduled.`
        : 'All reminders turned off.'
    );
    onClose();
  };

  const format12h = (hour: number, minute: number) => {
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notification Schedule</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={12}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.desc}>
            Set when you'd like daily reminders. Minutes snap to 0, 15, 30, or 45.
          </Text>

          {localPrefs.map(pref => (
            <View key={pref.id} style={[styles.card, !pref.enabled && styles.cardDisabled]}>
              {/* Header row */}
              <View style={styles.cardHeader}>
                <View style={styles.cardLabelRow}>
                  <Text style={styles.prefIcon}>{PREF_ICONS[pref.id]}</Text>
                  <Text style={styles.prefLabel}>{pref.label}</Text>
                </View>
                <Switch
                  value={pref.enabled}
                  onValueChange={v => updatePref(pref.id, { enabled: v })}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#fff"
                />
              </View>

              {/* Time picker */}
              {pref.enabled && (
                <>
                  <View style={styles.timePicker}>
                    {/* Hour column */}
                    <View style={styles.timeCol}>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => updatePref(pref.id, { hour: cycleHour(pref.hour, 1) })}
                      >
                        <Ionicons name="chevron-up" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                      <Text style={styles.timeNum}>
                        {pref.hour % 12 === 0 ? 12 : pref.hour % 12}
                      </Text>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => updatePref(pref.id, { hour: cycleHour(pref.hour, -1) })}
                      >
                        <Ionicons name="chevron-down" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.timeSep}>:</Text>

                    {/* Minute column */}
                    <View style={styles.timeCol}>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => updatePref(pref.id, { minute: cycleMins(pref.minute, 1) })}
                      >
                        <Ionicons name="chevron-up" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                      <Text style={styles.timeNum}>
                        {pref.minute.toString().padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        style={styles.arrowBtn}
                        onPress={() => updatePref(pref.id, { minute: cycleMins(pref.minute, -1) })}
                      >
                        <Ionicons name="chevron-down" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    {/* AM/PM toggle */}
                    <TouchableOpacity
                      style={styles.ampmBtn}
                      onPress={() =>
                        updatePref(pref.id, {
                          hour: pref.hour < 12 ? pref.hour + 12 : pref.hour - 12,
                        })
                      }
                    >
                      <Text style={styles.ampmText}>
                        {pref.hour < 12 ? 'AM' : 'PM'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.previewRow}>
                    <Ionicons name="notifications-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.previewText}>
                      Fires daily at {format12h(pref.hour, pref.minute)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          ))}
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
  cancelText: { fontSize: 16, color: COLORS.textMuted, width: 60 },
  saveText: { fontSize: 16, fontWeight: '700', color: COLORS.primary, width: 60, textAlign: 'right' },
  body: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  desc: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
  card: {
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
  cardDisabled: { opacity: 0.55 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  prefIcon: { fontSize: 20 },
  prefLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  timeCol: { alignItems: 'center', gap: 4 },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeNum: { fontSize: 36, fontWeight: '700', color: COLORS.text, minWidth: 52, textAlign: 'center' },
  timeSep: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  ampmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    minWidth: 56,
  },
  ampmText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: 8,
  },
  previewText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
});
