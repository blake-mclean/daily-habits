import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHabits, HabitType } from '../context/HabitsContext';
import { COLORS, RADIUS, SPACING } from '../theme';
import { IdentityType, IDENTITY_TYPES, IDENTITY_META, inferIdentityType } from '../retention/identity';

const EMOJI_OPTIONS = ['💧', '🏃', '🧘', '📚', '😴', '🥗', '💪', '🚶', '🎯', '✍️', '🎵', '🌿', '☀️', '🧴', '🏋️'];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddHabitModal({ visible, onClose }: Props) {
  const { addHabit } = useHabits();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [type, setType] = useState<HabitType>('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [identityType, setIdentityType] = useState<IdentityType>('disciplined');
  const [identityManuallySet, setIdentityManuallySet] = useState(false);

  // Auto-infer identity type from name unless user has manually chosen
  useEffect(() => {
    if (!identityManuallySet && name.trim()) {
      setIdentityType(inferIdentityType(name));
    }
  }, [name, identityManuallySet]);

  const reset = () => {
    setName('');
    setEmoji('🎯');
    setType('daily');
    setTargetCount(1);
    setIdentityType('disciplined');
    setIdentityManuallySet(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    addHabit({
      name: name.trim(),
      emoji,
      type,
      targetCount: type === 'daily' ? 1 : Math.max(1, targetCount),
      color: COLORS.primary,
      identityType,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={12}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Habit</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={12}>
            <Text style={[styles.saveBtn, !name.trim() && { opacity: 0.3 }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Emoji picker */}
          <Text style={styles.label}>Choose an emoji</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Name input */}
          <Text style={styles.label}>Habit name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Drink water, Read, Meditate…"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={50}
            returnKeyType="done"
          />

          {/* Habit type */}
          <Text style={styles.label}>Habit type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'daily' && styles.typeBtnActive]}
              onPress={() => setType('daily')}
            >
              <Text style={[styles.typeBtnText, type === 'daily' && styles.typeBtnTextActive]}>
                Daily (once)
              </Text>
              <Text style={styles.typeDesc}>Check off once per day</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'volume' && styles.typeBtnActive]}
              onPress={() => setType('volume')}
            >
              <Text style={[styles.typeBtnText, type === 'volume' && styles.typeBtnTextActive]}>
                Volume
              </Text>
              <Text style={styles.typeDesc}>Track multiple times/day</Text>
            </TouchableOpacity>
          </View>

          {/* Target count for volume habits */}
          {type === 'volume' && (
            <>
              <Text style={styles.label}>Daily target</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTargetCount(Math.max(2, targetCount - 1))}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{targetCount}×</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTargetCount(Math.min(20, targetCount + 1))}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Identity type */}
          <Text style={styles.label}>Builds identity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
            {IDENTITY_TYPES.map(t => {
              const meta = IDENTITY_META[t];
              const active = identityType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.identityChip, active && styles.identityChipActive]}
                  onPress={() => { setIdentityType(t); setIdentityManuallySet(true); }}
                >
                  <Text style={styles.identityChipEmoji}>{meta.emoji}</Text>
                  <Text style={[styles.identityChipText, active && { color: COLORS.primary, fontWeight: '600' }]}>
                    {meta.label.replace('The ', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Preview */}
          <View style={[styles.preview, { borderLeftColor: COLORS.primary }]}>
            <Text style={styles.previewEmoji}>{emoji}</Text>
            <Text style={styles.previewName}>{name || 'Your habit name'}</Text>
            {type === 'volume' && (
              <Text style={styles.previewSub}>0 / {targetCount} today</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  cancelBtn: { fontSize: 17, color: COLORS.textMuted },
  saveBtn: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  body: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  emojiRow: { flexDirection: 'row' },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  emojiBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  emojiText: { fontSize: 24 },
  identityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: COLORS.borderHard,
    marginRight: 8,
  },
  identityChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  identityChipEmoji: { fontSize: 16 },
  identityChipText: { fontSize: 13, color: COLORS.textMuted },
  input: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  typeRow: { flexDirection: 'row', gap: SPACING.sm },
  typeBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 4,
  },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.textMuted },
  typeBtnTextActive: { color: COLORS.primary },
  typeDesc: { fontSize: 12, color: COLORS.textMuted },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: { fontSize: 22, fontWeight: '600', color: COLORS.primary },
  counterValue: { fontSize: 24, fontWeight: '700', color: COLORS.text, minWidth: 60, textAlign: 'center' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  previewEmoji: { fontSize: 24 },
  previewName: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.text },
  previewSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
});
