import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SPACING } from '../theme';

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const resetForm = (nextTab: Tab) => {
    setTab(nextTab);
    setEmail('');
    setPassword('');
    setError(null);
    setConfirmationSent(false);
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    if (tab === 'signin') {
      const { error } = await signIn(trimmedEmail, password);
      if (error) setError(error);
    } else {
      const { error, needsConfirmation } = await signUp(trimmedEmail, password);
      if (error) {
        setError(error);
      } else if (needsConfirmation) {
        setConfirmationSent(true);
      }
      // If no error and no confirmation needed, session is set and AuthContext handles the rest
    }

    setLoading(false);
  };

  if (confirmationSent) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationEmoji}>📬</Text>
          <Text style={styles.confirmationTitle}>Check your email</Text>
          <Text style={styles.confirmationBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmationEmail}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={styles.confirmationHint}>
            Click the link in the email to activate your account, then come back here to sign in.
          </Text>
          <TouchableOpacity style={styles.backToSignIn} onPress={() => resetForm('signin')}>
            <Text style={styles.backToSignInText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Wordmark */}
          <View style={styles.wordmarkContainer}>
            <Text style={styles.appEmoji}>✦</Text>
            <Text style={styles.appName}>Daily Habits</Text>
            <Text style={styles.appTagline}>Build momentum, one day at a time.</Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, tab === 'signin' && styles.tabActive]}
              onPress={() => resetForm('signin')}
            >
              <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && styles.tabActive]}
              onPress={() => resetForm('signup')}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={t => { setEmail(t); setError(null); }}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={t => { setPassword(t); setError(null); }}
                placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {tab === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer hint */}
          <Text style={styles.footer}>
            {tab === 'signin'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text
              style={styles.footerLink}
              onPress={() => resetForm(tab === 'signin' ? 'signup' : 'signin')}
            >
              {tab === 'signin' ? 'Create one' : 'Sign in'}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 28,
  },

  wordmarkContainer: { alignItems: 'center', gap: 8, paddingBottom: 8 },
  appEmoji: { fontSize: 40, color: COLORS.primary },
  appName: { fontSize: 30, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  appTagline: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: RADIUS.md - 2,
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },

  form: { gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: COLORS.text,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    paddingLeft: 2,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  footer: { textAlign: 'center', fontSize: 14, color: COLORS.textMuted },
  footerLink: { color: COLORS.primary, fontWeight: '600' },

  confirmationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 16,
  },
  confirmationEmoji: { fontSize: 56 },
  confirmationTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  confirmationBody: {
    fontSize: 16,
    color: COLORS.textStrong,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmationEmail: { fontWeight: '700', color: COLORS.text },
  confirmationHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backToSignIn: {
    marginTop: 8,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.full,
  },
  backToSignInText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
});
