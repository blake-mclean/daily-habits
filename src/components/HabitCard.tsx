import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Habit, useHabits } from '../context/HabitsContext';
import { useSound } from '../hooks/useSound';
import { CARD_STYLE, COLORS, RADIUS, SPACING, TYPE } from '../theme';
import { today } from '../utils/dateHelpers';
import HabitReminderModal from './HabitReminderModal';

interface Props {
  habit: Habit;
}

export default function HabitCard({ habit }: Props) {
  const { logHabit, unlogHabit, getCountForDate, isHabitComplete, deleteHabit } = useHabits();
  const { playChime } = useSound();
  const scale = useRef(new Animated.Value(1)).current;
  const swipeRef = useRef<Swipeable>(null);
  const [showReminder, setShowReminder] = useState(false);

  const count = getCountForDate(habit.id, today());
  const complete = isHabitComplete(habit, today());
  const hasReminder = !!habit.reminder;

  // "+10 XP" popup on incomplete → complete transition
  const prevCompleteRef = useRef(complete);
  const xpAnim = useRef(new Animated.Value(0)).current;
  const [xpVisible, setXpVisible] = useState(false);

  useEffect(() => {
    if (!prevCompleteRef.current && complete) {
      setXpVisible(true);
      xpAnim.setValue(0);
      Animated.sequence([
        Animated.timing(xpAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(xpAnim, { toValue: 2, duration: 300, useNativeDriver: true }),
      ]).start(() => setXpVisible(false));
    }
    prevCompleteRef.current = complete;
  }, [complete]);

  const xpOpacity = xpAnim.interpolate({
    inputRange: [0, 0.4, 1, 1.8, 2],
    outputRange: [0, 1, 1, 1, 0],
  });
  const xpTranslateY = xpAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [4, 0, -18],
  });

  const bounce = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 120, bounciness: 4 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 8 }),
    ]).start();
  };

  const handlePress = () => {
    if (habit.type === 'daily') {
      if (complete) {
        unlogHabit(habit.id);
      } else {
        logHabit(habit.id);
        bounce();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        playChime();
      }
    } else {
      if (complete) {
        for (let i = 0; i < count; i++) unlogHabit(habit.id);
      } else {
        logHabit(habit.id);
        bounce();
        Haptics.impactAsync(
          count + 1 >= habit.targetCount
            ? Haptics.ImpactFeedbackStyle.Heavy
            : Haptics.ImpactFeedbackStyle.Light
        );
        playChime();
      }
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Delete "${habit.name}"?`,
      'This will remove the habit and all its tracked data.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => swipeRef.current?.close() },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
      ]
    );
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [90, 0] });
    return (
      <Animated.View style={[styles.deleteWrap, { transform: [{ translateX }] }]}>
        <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const progress = habit.type === 'volume' ? Math.min(count / habit.targetCount, 1) : 0;

  return (
    <>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        rightThreshold={50}
        friction={2}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity
            style={[styles.card, complete && styles.cardComplete]}
            onPress={handlePress}
            activeOpacity={0.88}
          >
            <Text style={styles.emoji}>{habit.emoji}</Text>

            <View style={styles.info}>
              <Text
                style={[styles.name, complete && styles.nameDone]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
              {habit.type === 'volume' && (
                <View style={styles.volumeRow}>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${progress * 100}%` as any, backgroundColor: habit.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.countLabel, { color: habit.color }]}>
                    {count}/{habit.targetCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Bell icon */}
            <TouchableOpacity
              style={styles.bellWrap}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowReminder(true);
              }}
              hitSlop={10}
            >
              <Ionicons
                name={hasReminder ? 'alarm' : 'alarm-outline'}
                size={17}
                color={hasReminder ? COLORS.primary : COLORS.borderHard}
              />
            </TouchableOpacity>

            {/* Completion circle */}
            <View
              style={[
                styles.circle,
                complete && { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
              ]}
            >
              {complete && <Text style={styles.check}>✓</Text>}
            </View>

            {/* +10 XP popup */}
            {xpVisible && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.xpPopup,
                  { opacity: xpOpacity, transform: [{ translateY: xpTranslateY }] },
                ]}
              >
                <Text style={styles.xpPopupText}>+10 XP</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Swipeable>

      <HabitReminderModal
        visible={showReminder}
        habit={habit}
        onClose={() => setShowReminder(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  deleteWrap: { width: 88, justifyContent: 'center' },
  deleteAction: {
    flex: 1,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: RADIUS.lg,
    marginLeft: 8,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  card: {
    ...CARD_STYLE,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: 12,
  },
  cardComplete: {
    backgroundColor: COLORS.primaryLight,
    borderColor: 'rgba(0,102,204,0.15)',
  },
  emoji: { fontSize: 22, width: 32, textAlign: 'center' },
  info: { flex: 1, gap: 5 },
  name: { ...TYPE.body, color: COLORS.text },
  nameDone: {
    color: COLORS.primary,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: COLORS.divider, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2 },
  countLabel: { ...TYPE.caption, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  bellWrap: { padding: 3 },
  circle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.borderHard,
    alignItems: 'center', justifyContent: 'center',
  },
  check: { color: '#fff', fontSize: 12, fontWeight: '700' },
  xpPopup: {
    position: 'absolute',
    top: 6,
    right: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  xpPopupText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
