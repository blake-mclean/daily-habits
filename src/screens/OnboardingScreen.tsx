import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabits } from '../context/HabitsContext';
import { scheduleHabitNotifications } from '../utils/notifications';
import { COLORS, RADIUS, SPACING, TYPE, CARD_STYLE } from '../theme';

const SLIDES = [
  {
    emoji: '✨',
    title: 'Track what matters',
    body: 'Log daily habits, build streaks, and watch consistency compound into results.',
  },
  {
    emoji: '🏆',
    title: 'Earn rewards',
    body: 'Complete challenges, collect badges, and feel the satisfaction of a full day done.',
  },
  {
    emoji: '🚀',
    title: "Let's begin",
    body: "We'll start you with a 3-day challenge and three starter habits. Finish it and earn your first badge.",
  },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { completeOnboarding } = useHabits();
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isLast = slide === SLIDES.length - 1;
  const s = SLIDES[slide];

  const transition = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setSlide(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handleStart = async () => {
    completeOnboarding(name.trim() || 'Friend');
    await scheduleHabitNotifications();
    onComplete();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === slide && styles.dotActive]}
            />
          ))}
        </View>

        {/* Slide content */}
        <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
          <Text style={styles.slideEmoji}>{s.emoji}</Text>
          <Text style={styles.slideTitle}>{s.title}</Text>
          <Text style={styles.slideBody}>{s.body}</Text>
        </Animated.View>

        {/* Name input on last slide */}
        {isLast && (
          <View style={styles.nameSection}>
            <Text style={styles.nameLabel}>What should we call you?</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Your name (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={handleStart}
              maxLength={30}
              autoFocus
            />
          </View>
        )}

        {/* Starter habits preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Starter habits</Text>
          {[
            { emoji: '💧', name: 'Drink 8 glasses of water', tag: 'Volume' },
            { emoji: '🏃', name: 'Exercise 30 minutes', tag: 'Daily' },
            { emoji: '🧘', name: 'Meditate', tag: 'Daily' },
          ].map((h, i) => (
            <View key={i} style={styles.previewRow}>
              <Text style={styles.previewEmoji}>{h.emoji}</Text>
              <Text style={styles.previewName}>{h.name}</Text>
              <View style={styles.previewTag}>
                <Text style={styles.previewTagText}>{h.tag}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.btnSection}>
          {isLast ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStart} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Start my 3-day challenge 🚀</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => transition(slide + 1)}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    gap: SPACING.lg,
    justifyContent: 'space-between',
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderHard,
  },
  dotActive: { backgroundColor: COLORS.primary, width: 18 },
  slideContent: { gap: SPACING.sm },
  slideEmoji: { fontSize: 52 },
  slideTitle: { ...TYPE.titleLg, color: COLORS.text },
  slideBody: { ...TYPE.body, color: COLORS.textMuted, lineHeight: 24 },
  nameSection: { gap: SPACING.xs },
  nameLabel: { ...TYPE.footnote, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  nameInput: {
    ...CARD_STYLE,
    ...TYPE.body,
    color: COLORS.text,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  previewCard: {
    ...CARD_STYLE,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  previewLabel: {
    ...TYPE.caption,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  previewEmoji: { fontSize: 18, width: 26, textAlign: 'center' },
  previewName: { flex: 1, ...TYPE.subhead, color: COLORS.text },
  previewTag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderHard,
  },
  previewTagText: { ...TYPE.captionSm, color: COLORS.textMuted },
  btnSection: {},
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { ...TYPE.headline, color: '#fff' },
});
