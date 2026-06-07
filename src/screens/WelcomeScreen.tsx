import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPE } from '../theme';

interface Props {
  onGetStarted: () => void;
}

const FEATURES = [
  { emoji: '🎯', text: 'Create habits and track them every day' },
  { emoji: '🏆', text: 'Take on challenges and earn badges' },
  { emoji: '🔥', text: 'Build streaks and stay accountable' },
];

export default function WelcomeScreen({ onGetStarted }: Props) {
  const headingOpacity = useRef(new Animated.Value(0)).current;
  const headingY = useRef(new Animated.Value(24)).current;
  const featureOpacity = useRef(new Animated.Value(0)).current;
  const featureY = useRef(new Animated.Value(16)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headingOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(headingY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(featureOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(featureY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(ctaOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.inner} edges={['top', 'bottom']}>
        {/* Top: Wordmark + headline */}
        <Animated.View
          style={[styles.headingSection, { opacity: headingOpacity, transform: [{ translateY: headingY }] }]}
        >
          <Text style={styles.eyebrow}>Daily Habits</Text>
          <Text style={styles.headline}>
            Small steps.{'\n'}Big change.
          </Text>
          <Text style={styles.tagline}>
            Build the habits that define you.
          </Text>
        </Animated.View>

        {/* Middle: Feature list */}
        <Animated.View
          style={[styles.featureSection, { opacity: featureOpacity, transform: [{ translateY: featureY }] }]}
        >
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Bottom: CTA */}
        <Animated.View style={[styles.ctaSection, { opacity: ctaOpacity }]}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={onGetStarted}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
          <Text style={styles.footnote}>Free · No account required</Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.surfaceDark,
  },
  inner: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    paddingTop: SPACING.section,
    paddingBottom: SPACING.xl,
  },
  headingSection: { gap: SPACING.sm },
  eyebrow: {
    ...TYPE.footnote,
    color: COLORS.primaryOnDark,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headline: {
    fontSize: 48,
    fontWeight: '600',
    color: COLORS.textOnDark,
    letterSpacing: -0.5,
    lineHeight: 52,
  },
  tagline: {
    ...TYPE.body,
    color: COLORS.textOnDarkMuted,
    marginTop: 4,
  },
  featureSection: { gap: SPACING.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureEmoji: { fontSize: 22 },
  featureText: { flex: 1, ...TYPE.body, color: COLORS.textOnDark },
  ctaSection: { gap: SPACING.sm, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryBtnText: { ...TYPE.headline, color: '#fff' },
  footnote: { ...TYPE.caption, color: COLORS.textOnDarkMuted },
});
