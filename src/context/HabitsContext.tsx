import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { today, todayAsDate, subtractDay } from '../utils/dateHelpers';
import { COLORS } from '../theme';
import { NotificationPref, DEFAULT_NOTIF_PREFS, scheduleReengagementNotification } from '../utils/notifications';
import { getTemplate } from '../data/challengeTemplates';
import { runRetentionRecalc, RetentionState } from '../retention';
import { MomentumTrend, MomentumHistoryEntry } from '../retention/momentum';
import { IdentityType, inferIdentityType, IDENTITY_TYPES, chapterFromXp } from '../retention/identity';
import { FutureSelfCategory } from '../retention/futureSelf';
import { supabase } from '../lib/supabase';
import { pushToSupabase, pullFromSupabase, deleteHabitFromSupabase, SyncState } from '../lib/sync';

export type HabitType = 'daily' | 'volume';

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  type: HabitType;
  targetCount: number;
  color: string;
  createdAt: string;
  reminder?: { hour: number; minute: number };
  identityType?: IdentityType;
}

export interface HabitLog {
  habitId: string;
  date: string;
  count: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  durationDays: number;
  startDate: string;
  completedDays: string[];
  completed: boolean;
  rewardShown: boolean;
}

interface AppState {
  // ── Habits & tracking ───────────────────────────────────
  habits: Habit[];
  logs: HabitLog[];
  challenges: Challenge[];
  hasOnboarded: boolean;
  userName: string;
  lastRewardDate: string;
  notifPrefs: NotificationPref[];

  // ── Retention system ────────────────────────────────────
  momentumScore: number;
  momentumSettled: number;
  momentumTrend: MomentumTrend;
  lastMomentumDate: string;
  momentumHistory: MomentumHistoryEntry[];
  identityXpSnapshot: Partial<Record<IdentityType, number>>;
  lastKnownChapter: number;
  futureSelfText: string;
  futureSelfCategory: FutureSelfCategory;
  futureSelfVariantIdx: Partial<Record<string, number>>;
  futureSelfNudgesEnabled: boolean;
  daysSinceLastCheckIn: number;
  reengagementScheduledDate: string;

  // ── Ephemeral UI state (not persisted) ──────────────────
  pendingLevelUp: { identityType: IdentityType; newChapter: number } | null;

  loaded: boolean;
}

const RETENTION_DEFAULTS: Pick<
  AppState,
  | 'momentumScore' | 'momentumSettled' | 'momentumTrend' | 'lastMomentumDate'
  | 'momentumHistory' | 'identityXpSnapshot' | 'lastKnownChapter'
  | 'futureSelfText' | 'futureSelfCategory' | 'futureSelfVariantIdx'
  | 'futureSelfNudgesEnabled' | 'daysSinceLastCheckIn' | 'reengagementScheduledDate'
> = {
  momentumScore: 50,
  momentumSettled: 50,
  momentumTrend: 'stable',
  lastMomentumDate: '',
  momentumHistory: [],
  identityXpSnapshot: {},
  lastKnownChapter: 0,
  futureSelfText: '',
  futureSelfCategory: 'stable',
  futureSelfVariantIdx: {},
  futureSelfNudgesEnabled: true,
  daysSinceLastCheckIn: 0,
  reengagementScheduledDate: '',
};

const initialState: AppState = {
  habits: [],
  logs: [],
  challenges: [],
  hasOnboarded: false,
  userName: '',
  lastRewardDate: '',
  notifPrefs: DEFAULT_NOTIF_PREFS,
  ...RETENTION_DEFAULTS,
  pendingLevelUp: null,
  loaded: false,
};

type Action =
  | { type: 'LOAD'; payload: Omit<AppState, 'loaded' | 'pendingLevelUp'> }
  | { type: 'ADD_HABIT'; payload: Habit }
  | { type: 'DELETE_HABIT'; payload: string }
  | { type: 'LOG_HABIT'; payload: { habitId: string; date: string } }
  | { type: 'UNLOG_HABIT'; payload: { habitId: string; date: string } }
  | { type: 'COMPLETE_ONBOARDING'; payload: { userName: string; habits: Habit[]; challenge: Challenge } }
  | { type: 'START_CHALLENGE'; payload: Challenge }
  | { type: 'MARK_CHALLENGE_DAY'; payload: { challengeId: string; date: string } }
  | { type: 'MARK_CHALLENGE_REWARD_SHOWN'; payload: string }
  | { type: 'MARK_REWARD_SHOWN'; payload: string }
  | { type: 'SET_USER_NAME'; payload: string }
  | { type: 'UPDATE_NOTIF_PREFS'; payload: NotificationPref[] }
  | { type: 'SET_HABIT_REMINDER'; payload: { habitId: string; reminder?: { hour: number; minute: number } } }
  | { type: 'UPDATE_RETENTION'; payload: RetentionState & { reengagementScheduledDate?: string } }
  | { type: 'TOGGLE_NUDGES'; payload: boolean }
  | { type: 'SET_PENDING_LEVEL_UP'; payload: { identityType: IdentityType; newChapter: number } }
  | { type: 'CLEAR_LEVEL_UP' }
  | { type: 'RESET' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.payload, pendingLevelUp: null, loaded: true };

    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.payload] };

    case 'DELETE_HABIT':
      return {
        ...state,
        habits: state.habits.filter(h => h.id !== action.payload),
        logs: state.logs.filter(l => l.habitId !== action.payload),
      };

    case 'LOG_HABIT': {
      const { habitId, date } = action.payload;
      const existing = state.logs.find(l => l.habitId === habitId && l.date === date);
      if (existing) {
        return {
          ...state,
          logs: state.logs.map(l =>
            l.habitId === habitId && l.date === date ? { ...l, count: l.count + 1 } : l
          ),
        };
      }
      return { ...state, logs: [...state.logs, { habitId, date, count: 1 }] };
    }

    case 'UNLOG_HABIT': {
      const { habitId, date } = action.payload;
      const existing = state.logs.find(l => l.habitId === habitId && l.date === date);
      if (!existing || existing.count <= 0) return state;
      if (existing.count === 1) {
        return { ...state, logs: state.logs.filter(l => !(l.habitId === habitId && l.date === date)) };
      }
      return {
        ...state,
        logs: state.logs.map(l =>
          l.habitId === habitId && l.date === date ? { ...l, count: l.count - 1 } : l
        ),
      };
    }

    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        hasOnboarded: true,
        userName: action.payload.userName,
        habits: [...state.habits, ...action.payload.habits],
        challenges: [...state.challenges, action.payload.challenge],
      };

    case 'START_CHALLENGE':
      if (state.challenges.find(c => c.id === action.payload.id)) return state;
      return { ...state, challenges: [...state.challenges, action.payload] };

    case 'MARK_CHALLENGE_DAY': {
      const { challengeId, date } = action.payload;
      return {
        ...state,
        challenges: state.challenges.map(c => {
          if (c.id !== challengeId) return c;
          const completedDays = c.completedDays.includes(date)
            ? c.completedDays
            : [...c.completedDays, date];
          const completed = completedDays.length >= c.durationDays;
          return { ...c, completedDays, completed };
        }),
      };
    }

    case 'MARK_CHALLENGE_REWARD_SHOWN':
      return {
        ...state,
        challenges: state.challenges.map(c =>
          c.id === action.payload ? { ...c, rewardShown: true } : c
        ),
      };

    case 'MARK_REWARD_SHOWN':
      return { ...state, lastRewardDate: action.payload };

    case 'SET_USER_NAME':
      return { ...state, userName: action.payload };

    case 'UPDATE_NOTIF_PREFS':
      return { ...state, notifPrefs: action.payload };

    case 'SET_HABIT_REMINDER':
      return {
        ...state,
        habits: state.habits.map(h =>
          h.id === action.payload.habitId
            ? { ...h, reminder: action.payload.reminder }
            : h
        ),
      };

    case 'UPDATE_RETENTION':
      return {
        ...state,
        momentumScore: action.payload.momentumScore,
        momentumSettled: action.payload.momentumSettled,
        momentumTrend: action.payload.momentumTrend,
        lastMomentumDate: action.payload.lastMomentumDate,
        momentumHistory: action.payload.momentumHistory,
        identityXpSnapshot: action.payload.identityXpSnapshot,
        lastKnownChapter: action.payload.lastKnownChapter,
        futureSelfText: action.payload.futureSelfText,
        futureSelfCategory: action.payload.futureSelfCategory,
        futureSelfVariantIdx: action.payload.futureSelfVariantIdx,
        daysSinceLastCheckIn: action.payload.daysSinceLastCheckIn,
        ...(action.payload.reengagementScheduledDate !== undefined
          ? { reengagementScheduledDate: action.payload.reengagementScheduledDate }
          : {}),
      };

    case 'TOGGLE_NUDGES':
      return { ...state, futureSelfNudgesEnabled: action.payload };

    case 'SET_PENDING_LEVEL_UP':
      return { ...state, pendingLevelUp: action.payload };

    case 'CLEAR_LEVEL_UP':
      return { ...state, pendingLevelUp: null };

    case 'RESET':
      return { ...initialState, loaded: true };

    default:
      return state;
  }
}

const STORAGE_KEY = 'HABITS_APP_V2';

function buildLoadPayload(data: Partial<Omit<AppState, 'loaded' | 'pendingLevelUp'>>): Omit<AppState, 'loaded' | 'pendingLevelUp'> {
  return {
    habits: ((data.habits ?? []) as Habit[]).map((h: Habit) => ({
      ...h,
      identityType: h.identityType ?? inferIdentityType(h.name),
    })),
    logs: (data.logs ?? []) as HabitLog[],
    challenges: ((data.challenges ?? []) as Challenge[]).map((c: Challenge) =>
      c.id === 'starter-challenge' ? { ...c, id: 'kickstart-3' } : c
    ),
    hasOnboarded: data.hasOnboarded ?? false,
    userName: data.userName ?? '',
    lastRewardDate: data.lastRewardDate ?? '',
    notifPrefs: (data.notifPrefs as NotificationPref[]) ?? DEFAULT_NOTIF_PREFS,
    momentumScore: data.momentumScore ?? 50,
    momentumSettled: data.momentumSettled ?? 50,
    momentumTrend: (data.momentumTrend as MomentumTrend) ?? 'stable',
    lastMomentumDate: data.lastMomentumDate ?? subtractDay(today()),
    momentumHistory: (data.momentumHistory as MomentumHistoryEntry[]) ?? [],
    identityXpSnapshot: (data.identityXpSnapshot as Partial<Record<IdentityType, number>>) ?? {},
    lastKnownChapter: data.lastKnownChapter ?? 0,
    futureSelfText: data.futureSelfText ?? '',
    futureSelfCategory: (data.futureSelfCategory as FutureSelfCategory) ?? 'stable',
    futureSelfVariantIdx: (data.futureSelfVariantIdx as Partial<Record<string, number>>) ?? {},
    futureSelfNudgesEnabled: data.futureSelfNudgesEnabled ?? true,
    daysSinceLastCheckIn: data.daysSinceLastCheckIn ?? 0,
    reengagementScheduledDate: data.reengagementScheduledDate ?? '',
  };
}

interface ContextType extends AppState {
  addHabit: (h: Omit<Habit, 'id' | 'createdAt'>) => void;
  deleteHabit: (id: string) => void;
  logHabit: (habitId: string, date?: string) => void;
  unlogHabit: (habitId: string, date?: string) => void;
  getCountForDate: (habitId: string, date: string) => number;
  isHabitComplete: (habit: Habit, date: string) => boolean;
  getAllCompleteForDate: (date: string) => boolean;
  completeOnboarding: (userName: string) => void;
  startChallenge: (templateId: string) => void;
  markChallengeDay: (challengeId: string, date?: string) => void;
  markChallengeRewardShown: (challengeId: string) => void;
  markRewardShown: () => void;
  setUserName: (name: string) => void;
  updateNotifPrefs: (prefs: NotificationPref[]) => void;
  setHabitReminder: (habitId: string, reminder?: { hour: number; minute: number }) => void;
  toggleNudges: (enabled: boolean) => void;
  resetData: () => Promise<void>;
  clearLevelUp: () => void;
  getCurrentStreak: () => number;
  getBestStreak: () => number;
  getCompletionRate: (habitId: string) => number;
}

const HabitsContext = createContext<ContextType | null>(null);

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevents false level-up fires on the initial retention recalc after load
  const retentionInitialized = useRef(false);

  // ── Load from AsyncStorage, then pull from Supabase ────
  useEffect(() => {
    const init = async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      const localData = raw ? JSON.parse(raw) : {};
      dispatch({ type: 'LOAD', payload: buildLoadPayload(localData) });

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const remote = await pullFromSupabase(session.user.id);
          if (remote) {
            dispatch({ type: 'LOAD', payload: buildLoadPayload({ ...localData, ...remote }) });
          }
        } catch {
          // Use local data if remote pull fails
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
        const localData = raw ? JSON.parse(raw) : {};
        try {
          const remote = await pullFromSupabase(session.user.id);
          if (remote) {
            dispatch({ type: 'LOAD', payload: buildLoadPayload({ ...localData, ...remote }) });
          }
        } catch {
          // Keep local data on pull failure
        }
      } else if (event === 'SIGNED_OUT') {
        retentionInitialized.current = false;
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        dispatch({ type: 'RESET' });
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to AsyncStorage + debounced Supabase sync ──
  useEffect(() => {
    if (!state.loaded) return;
    // Exclude ephemeral fields from persistence
    const { loaded, pendingLevelUp, ...data } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) pushToSupabase(user.id, data as SyncState).catch(() => {});
      });
    }, 5000);
  }, [state]);

  // ── Retention recalc + level-up detection ──────────────
  useEffect(() => {
    if (!state.loaded) return;

    const oldXpSnapshot = state.identityXpSnapshot;

    const patch = runRetentionRecalc({
      momentumSettled: state.momentumSettled,
      lastMomentumDate: state.lastMomentumDate,
      momentumHistory: state.momentumHistory,
      lastKnownChapter: state.lastKnownChapter,
      futureSelfVariantIdx: state.futureSelfVariantIdx,
      habits: state.habits,
      logs: state.logs,
      futureSelfNudgesEnabled: state.futureSelfNudgesEnabled,
      todayStr: today(),
    });
    dispatch({ type: 'UPDATE_RETENTION', payload: patch });

    // Detect per-identity level-ups — skip the very first recalc to avoid
    // false positives when loading existing data on app start.
    if (retentionInitialized.current) {
      for (const type of IDENTITY_TYPES) {
        const oldXp = (oldXpSnapshot as Record<string, number>)[type] ?? 0;
        const newXp = (patch.identityXpSnapshot as Record<string, number>)[type] ?? 0;
        const oldChapter = chapterFromXp(oldXp);
        const newChapter = chapterFromXp(newXp);
        if (newChapter > oldChapter && newChapter > 1) {
          dispatch({ type: 'SET_PENDING_LEVEL_UP', payload: { identityType: type, newChapter } });
          break;
        }
      }
    }
    retentionInitialized.current = true;

    if (state.futureSelfNudgesEnabled && patch.daysSinceLastCheckIn >= 3) {
      scheduleReengagementNotification({
        daysSince: patch.daysSinceLastCheckIn,
        userName: state.userName,
        alreadyScheduledDate: state.reengagementScheduledDate,
        todayStr: today(),
      }).then(scheduledDate => {
        if (scheduledDate) {
          dispatch({
            type: 'UPDATE_RETENTION',
            payload: { ...patch, reengagementScheduledDate: scheduledDate },
          });
        }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loaded, state.logs.length, state.habits.length, state.futureSelfNudgesEnabled]);

  // ── Query helpers ───────────────────────────────────────
  const getCountForDate = (habitId: string, date: string): number =>
    state.logs.find(l => l.habitId === habitId && l.date === date)?.count ?? 0;

  const isHabitComplete = (habit: Habit, date: string): boolean =>
    getCountForDate(habit.id, date) >= habit.targetCount;

  const getAllCompleteForDate = (date: string): boolean =>
    state.habits.length > 0 && state.habits.every(h => isHabitComplete(h, date));

  // ── Mutations ───────────────────────────────────────────
  const addHabit = (h: Omit<Habit, 'id' | 'createdAt'>) => {
    const habit: Habit = {
      ...h,
      id: `${Date.now()}-${Math.random()}`,
      createdAt: today(),
      identityType: h.identityType ?? inferIdentityType(h.name),
    };
    dispatch({ type: 'ADD_HABIT', payload: habit });
  };

  const deleteHabit = (id: string) => {
    dispatch({ type: 'DELETE_HABIT', payload: id });
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) deleteHabitFromSupabase(user.id, id).catch(() => {});
    });
  };

  const logHabit = (habitId: string, date = today()) =>
    dispatch({ type: 'LOG_HABIT', payload: { habitId, date } });

  const unlogHabit = (habitId: string, date = today()) =>
    dispatch({ type: 'UNLOG_HABIT', payload: { habitId, date } });

  const completeOnboarding = (userName: string) => {
    const now = today();
    const starterHabits: Habit[] = [
      { id: `starter-0-${Date.now()}`, name: 'Drink 8 glasses of water', emoji: '💧', type: 'volume', targetCount: 8, color: '#14B8A6', createdAt: now, identityType: 'disciplined' },
      { id: `starter-1-${Date.now() + 1}`, name: 'Exercise 30 minutes', emoji: '🏃', type: 'daily', targetCount: 1, color: COLORS.primary, createdAt: now, identityType: 'athlete' },
      { id: `starter-2-${Date.now() + 2}`, name: 'Meditate', emoji: '🧘', type: 'daily', targetCount: 1, color: '#8B5CF6', createdAt: now, identityType: 'mindful' },
    ];
    const challenge: Challenge = {
      id: 'kickstart-3',
      name: '3-Day Kickstart',
      description: 'Build early momentum. Complete all habits for 3 consecutive days.',
      durationDays: 3,
      startDate: now,
      completedDays: [],
      completed: false,
      rewardShown: false,
    };
    dispatch({ type: 'COMPLETE_ONBOARDING', payload: { userName, habits: starterHabits, challenge } });
  };

  const startChallenge = (templateId: string) => {
    const template = getTemplate(templateId);
    if (!template) return;
    const challenge: Challenge = {
      id: template.id,
      name: template.name,
      description: template.description,
      durationDays: template.durationDays,
      startDate: today(),
      completedDays: [],
      completed: false,
      rewardShown: false,
    };
    dispatch({ type: 'START_CHALLENGE', payload: challenge });
  };

  const markChallengeDay = (challengeId: string, date = today()) =>
    dispatch({ type: 'MARK_CHALLENGE_DAY', payload: { challengeId, date } });

  const markChallengeRewardShown = (challengeId: string) =>
    dispatch({ type: 'MARK_CHALLENGE_REWARD_SHOWN', payload: challengeId });

  const markRewardShown = () =>
    dispatch({ type: 'MARK_REWARD_SHOWN', payload: today() });

  const setUserName = (name: string) =>
    dispatch({ type: 'SET_USER_NAME', payload: name });

  const updateNotifPrefs = (prefs: NotificationPref[]) =>
    dispatch({ type: 'UPDATE_NOTIF_PREFS', payload: prefs });

  const setHabitReminder = (habitId: string, reminder?: { hour: number; minute: number }) =>
    dispatch({ type: 'SET_HABIT_REMINDER', payload: { habitId, reminder } });

  const toggleNudges = (enabled: boolean) =>
    dispatch({ type: 'TOGGLE_NUDGES', payload: enabled });

  const resetData = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'RESET' });
  };

  const clearLevelUp = () => dispatch({ type: 'CLEAR_LEVEL_UP' });

  // ── Streak helpers ──────────────────────────────────────
  const getCurrentStreak = (): number => {
    if (state.habits.length === 0) return 0;
    let streak = 0;
    const d = todayAsDate();
    if (getAllCompleteForDate(d.toISOString().split('T')[0])) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 1);
    }
    while (streak <= 365) {
      const dateStr = d.toISOString().split('T')[0];
      if (!getAllCompleteForDate(dateStr)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const getBestStreak = (): number => {
    if (state.habits.length === 0) return 0;
    let best = 0;
    let current = 0;
    const d = todayAsDate();
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0];
      if (getAllCompleteForDate(dateStr)) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
      d.setDate(d.getDate() - 1);
    }
    return best;
  };

  const getCompletionRate = (habitId: string): number => {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return 0;
    const daysSince = Math.max(1, daysBetween(habit.createdAt, today()) + 1);
    const daysCompleted = new Set(
      state.logs.filter(l => l.habitId === habitId && l.count >= habit.targetCount).map(l => l.date)
    ).size;
    return Math.round((daysCompleted / Math.min(daysSince, 30)) * 100);
  };

  return (
    <HabitsContext.Provider
      value={{
        ...state,
        addHabit,
        deleteHabit,
        logHabit,
        unlogHabit,
        getCountForDate,
        isHabitComplete,
        getAllCompleteForDate,
        completeOnboarding,
        startChallenge,
        markChallengeDay,
        markChallengeRewardShown,
        markRewardShown,
        setUserName,
        updateNotifPrefs,
        setHabitReminder,
        toggleNudges,
        resetData,
        clearLevelUp,
        getCurrentStreak,
        getBestStreak,
        getCompletionRate,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabits must be inside HabitsProvider');
  return ctx;
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T12:00:00');
  const d2 = new Date(date2 + 'T12:00:00');
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}
