import * as Notifications from 'expo-notifications';

export interface NotificationPref {
  id: 'morning' | 'midday' | 'evening';
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPref[] = [
  { id: 'morning', label: 'Morning Reminder', hour: 8, minute: 0, enabled: true },
  { id: 'midday', label: 'Midday Check-in', hour: 13, minute: 0, enabled: true },
  { id: 'evening', label: 'Evening Reminder', hour: 20, minute: 0, enabled: true },
];

const NOTIF_CONTENT: Record<string, { title: string; body: string }> = {
  morning: { title: 'Morning check-in 🌅', body: "Ready to build your habits today? Let's go!" },
  midday: { title: 'Midday nudge ☀️', body: "How's your habit streak going? Keep the momentum!" },
  evening: { title: 'Evening reminder 🌙', body: "Don't forget to log your habits before bed!" },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleHabitNotifications(
  prefs: NotificationPref[] = DEFAULT_NOTIF_PREFS
): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const pref of prefs) {
    if (!pref.enabled) continue;
    const content = NOTIF_CONTENT[pref.id] ?? {
      title: 'Habit reminder',
      body: 'Time to check your habits!',
    };
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { hour: pref.hour, minute: pref.minute, repeats: true } as any,
    });
  }
}

export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  habitEmoji: string,
  hour: number,
  minute: number
): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  const id = `habit-reminder-${habitId}`;
  // Cancel existing first
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `${habitEmoji} Habit reminder`,
      body: `Time for: ${habitName}`,
    },
    trigger: { hour, minute, repeats: true } as any,
  });
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`habit-reminder-${habitId}`);
  } catch {}
}

/**
 * Schedule a one-time re-engagement notification for tomorrow morning (9am).
 * Only schedules if: nudges enabled, not already scheduled for this gap, and
 * current hour is within quiet hours window (7am–9pm).
 * Returns the date string we scheduled for (to store as reengagementScheduledDate).
 */
export async function scheduleReengagementNotification(params: {
  daysSince: number;
  userName: string;
  alreadyScheduledDate: string;
  todayStr: string;
}): Promise<string | null> {
  const { daysSince, userName, alreadyScheduledDate, todayStr } = params;
  // Don't re-schedule if already scheduled for this gap
  if (alreadyScheduledDate === todayStr) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  // Quiet hours: only schedule between 7am and 9pm
  const hour = new Date().getHours();
  if (hour < 7 || hour >= 21) return null;

  const title = daysSince >= 6
    ? "Your future self hasn't heard from you"
    : "Time to reconnect";
  const body = daysSince >= 6
    ? `${daysSince} days since your last habit. One check-in changes everything.`
    : `${userName ? `Hey ${userName} — ` : ''}your habits are waiting. Come back.`;

  // Schedule for tomorrow 9am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const seconds = Math.max(60, Math.round((tomorrow.getTime() - Date.now()) / 1000));

  await Notifications.scheduleNotificationAsync({
    identifier: 'reengagement-nudge',
    content: { title, body },
    trigger: { seconds } as any,
  });

  return todayStr;
}

export async function cancelReengagementNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('reengagement-nudge');
  } catch {}
}

export function formatPrefTime(pref: NotificationPref): string {
  const h = pref.hour % 12 === 0 ? 12 : pref.hour % 12;
  const m = pref.minute.toString().padStart(2, '0');
  const ampm = pref.hour < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${ampm}`;
}
