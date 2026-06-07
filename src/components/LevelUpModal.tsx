import React, { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiEffect from './ConfettiEffect';
import { useSound } from '../hooks/useSound';
import { IDENTITY_META, identityLevelName, IdentityType } from '../retention/identity';
import { CARD_STYLE, COLORS, MODAL_SHADOW, RADIUS, SPACING, TYPE } from '../theme';

interface Props {
  visible: boolean;
  identityType: IdentityType | null;
  newChapter: number;
  onClose: () => void;
}

export default function LevelUpModal({ visible, identityType, newChapter, onClose }: Props) {
  const { playCelebrate } = useSound();
  const cardScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  const meta = identityType ? IDENTITY_META[identityType] : null;
  const levelName = identityType ? identityLevelName(identityType, newChapter) : '';

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.85);
      cardOpacity.setValue(0);
      emojiScale.setValue(0);
      badgeOpacity.setValue(0);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playCelebrate();

    // Card fades + scales in
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 10 }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      // Emoji bounces in after card settles
      Animated.spring(emojiScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 20 }).start();
      Animated.timing(badgeOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });

    const t = setTimeout(onClose, 5500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ConfettiEffect visible={visible} />

        <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>

          {/* Gold level badge */}
          <Animated.View style={[styles.badge, { opacity: badgeOpacity }]}>
            <Text style={styles.badgeText}>★  LEVEL UP  ★</Text>
          </Animated.View>

          {/* Identity emoji */}
          <Animated.Text style={[styles.bigEmoji, { transform: [{ scale: emojiScale }] }]}>
            {meta?.emoji ?? '⭐'}
          </Animated.Text>

          {/* Chapter number */}
          <Text style={styles.chapterNum}>Chapter {newChapter}</Text>

          {/* Level name — the headline */}
          <Text style={styles.levelName}>{levelName}</Text>

          {/* Identity type label */}
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{meta?.label ?? ''}</Text>
          </View>

          <Text style={styles.message}>
            Every day you show up, you're writing proof of who you're becoming.
          </Text>

          <TouchableOpacity style={styles.btn} onPress={onClose} activeOpacity={0.88}>
            <Text style={styles.btnText}>Let's keep going 🚀</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    ...CARD_STYLE,
    ...MODAL_SHADOW,
    width: '82%',
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 0,
  },
  badge: {
    backgroundColor: COLORS.goldLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  bigEmoji: {
    fontSize: 72,
    lineHeight: 80,
    marginVertical: 4,
  },
  chapterNum: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  levelName: {
    ...TYPE.titleLg,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 2,
  },
  typePill: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 2,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  message: {
    ...TYPE.footnote,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.full,
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  btnText: {
    ...TYPE.headline,
    color: '#fff',
  },
});
