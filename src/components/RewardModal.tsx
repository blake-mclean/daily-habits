import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiEffect from './ConfettiEffect';
import { useHabits } from '../context/HabitsContext';
import { useSound } from '../hooks/useSound';
import { CARD_STYLE, COLORS, MODAL_SHADOW, RADIUS, SPACING, TYPE } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RewardModal({ visible, onClose }: Props) {
  const { userName, getCurrentStreak } = useHabits();
  const { playCelebrate } = useSound();
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const streak = getCurrentStreak();

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.88);
      cardOpacity.setValue(0);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playCelebrate();
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ConfettiEffect visible={visible} />
        <Animated.View
          style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
        >
          <Text style={styles.bigEmoji}>🎉</Text>
          <Text style={styles.title}>All done today!</Text>
          <Text style={styles.subtitle}>
            {userName ? `Amazing work, ${userName}!` : 'You crushed it!'}
          </Text>

          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>
                🔥 {streak} day streak
              </Text>
            </View>
          )}

          <Text style={styles.message}>
            Every habit you track is a vote for the person you're becoming.
          </Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.88}>
            <Text style={styles.btnText}>Keep going 💪</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    ...CARD_STYLE,
    ...MODAL_SHADOW,
    width: '80%',
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bigEmoji: { fontSize: 60 },
  title: { ...TYPE.titleLg, color: COLORS.text, textAlign: 'center' },
  subtitle: { ...TYPE.body, color: COLORS.textMuted, textAlign: 'center' },
  streakBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  streakText: { ...TYPE.headline, color: COLORS.warning },
  message: {
    ...TYPE.footnote,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 11,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  btnText: { ...TYPE.headline, color: '#fff' },
});
