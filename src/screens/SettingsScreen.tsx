import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHabits } from '../context/HabitsContext';
import { useAuth } from '../context/AuthContext';
import { formatPrefTime } from '../utils/notifications';
import { COLORS, RADIUS, SPACING } from '../theme';
import DevScreen from './DevScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsScreen({ visible, onClose }: Props) {
  const { userName, setUserName, resetData, notifPrefs, futureSelfNudgesEnabled, toggleNudges } = useHabits();
  const { signOut, user } = useAuth();
  const [nameInput, setNameInput] = useState(userName);
  const [showDev, setShowDev] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  const handleSaveName = () => {
    if (nameInput.trim()) setUserName(nameInput.trim());
  };

  const activeNotifCount = notifPrefs.filter(p => p.enabled).length;
  const notifDesc = activeNotifCount === 0
    ? 'All reminders off'
    : notifPrefs.filter(p => p.enabled).map(p => formatPrefTime(p)).join(' · ');

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your habits, history, and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await resetData();
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.doneBtn} hitSlop={12}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Profile */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Profile</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Your name</Text>
            <View style={styles.nameRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                maxLength={30}
              />
              <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName}>
                <Text style={styles.saveNameBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Notifications</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowNotifSettings(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Daily Reminders</Text>
                <Text style={styles.rowDesc}>{notifDesc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={styles.dividerRow} />

            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Future Self nudges</Text>
                <Text style={styles.rowDesc}>Motivational messages and re-engagement prompts</Text>
              </View>
              <Switch
                value={futureSelfNudgesEnabled}
                onValueChange={toggleNudges}
                trackColor={{ false: COLORS.borderHard, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Developer — only visible in dev builds */}
          {__DEV__ && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Developer</Text>
              </View>
              <View style={styles.card}>
                <TouchableOpacity style={styles.row} onPress={() => setShowDev(true)}>
                  <View style={[styles.rowIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="code-slash-outline" size={20} color={COLORS.gold} />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Developer Tools</Text>
                    <Text style={styles.rowDesc}>Simulate dates, test rewards, reset data</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Danger zone */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: '#DC2626' }]}>Danger Zone</Text>
          </View>
          <View style={[styles.card, { borderColor: '#FECACA', borderWidth: 1.5 }]}>
            <TouchableOpacity style={styles.row} onPress={handleResetData}>
              <View style={[styles.rowIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: '#DC2626' }]}>Reset All Data</Text>
                <Text style={styles.rowDesc}>Delete all habits and history permanently</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Account */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Account</Text>
          </View>
          <View style={styles.card}>
            {user && (
              <>
                <View style={[styles.row, { paddingBottom: 8 }]}>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowTitle}>Signed in as</Text>
                    <Text style={styles.rowDesc}>{user.email}</Text>
                  </View>
                </View>
                <View style={styles.dividerRow} />
              </>
            )}
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                Alert.alert('Sign Out', 'Your data will sync automatically next time you sign in.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: signOut },
                ])
              }
            >
              <View style={[styles.rowIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: '#DC2626' }]}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Version */}
          <Text style={styles.version}>Daily Habits · v1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      <DevScreen visible={showDev} onClose={() => setShowDev(false)} />
      <NotificationSettingsScreen visible={showNotifSettings} onClose={() => setShowNotifSettings(false)} />
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
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  doneBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  body: { padding: SPACING.md, gap: 8, paddingBottom: 40 },
  sectionHeader: { paddingLeft: 4, paddingTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  saveNameBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  saveNameBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.borderHard, marginLeft: SPACING.md },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rowDesc: { fontSize: 12, color: COLORS.textMuted },
  version: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, paddingTop: 12 },
});
