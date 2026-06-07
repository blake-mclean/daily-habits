import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const PIECE_COLORS = ['#6C63FF', '#FF6584', '#14B8A6', '#F59E0B', '#22C55E', '#EC4899', '#A78BFA', '#38BDF8'];
const N = 40;

interface Piece {
  y: Animated.Value;
  x: Animated.Value;
  rot: Animated.Value;
  opacity: Animated.Value;
  startX: number;
  color: string;
  size: number;
  isCircle: boolean;
}

export default function ConfettiEffect({ visible }: { visible: boolean }) {
  const pieces = useRef<Piece[]>(
    Array.from({ length: N }, (_, i) => ({
      y: new Animated.Value(-60),
      x: new Animated.Value(0),
      rot: new Animated.Value(0),
      opacity: new Animated.Value(0),
      startX: (i / N) * W + (Math.random() - 0.5) * (W / N) * 2,
      color: PIECE_COLORS[i % PIECE_COLORS.length],
      size: 7 + Math.random() * 7,
      isCircle: Math.random() > 0.5,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    pieces.forEach((p, i) => {
      const delay = i * 45;
      const duration = 2000 + Math.random() * 1200;
      const drift = (Math.random() - 0.5) * 260;

      p.y.setValue(-60);
      p.x.setValue(0);
      p.rot.setValue(0);
      p.opacity.setValue(1);

      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(p.y, { toValue: H + 80, duration, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(p.x, { toValue: drift, duration, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(p.rot, { toValue: i % 2 === 0 ? 12 : -12, duration, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(delay + duration - 600),
          Animated.timing(p.opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => {
        const rotate = p.rot.interpolate({
          inputRange: [-12, 0, 12],
          outputRange: ['-1080deg', '0deg', '1080deg'],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.startX,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: p.isCircle ? p.size / 2 : p.size / 5,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [{ translateY: p.y }, { translateX: p.x }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
