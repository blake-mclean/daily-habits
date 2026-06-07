import { daysBetween, daysAfterUpTo, subtractDay } from '../utils/dateHelpers';

export const MOMENTUM = {
  START: 50,
  MIN: 0,
  MAX: 100,
  COMPLETION_GAIN: 8,        // max upward push on a 100%-complete day
  NEUTRAL_RATE: 0.5,         // completion rate that's break-even
  STREAK_BONUS_PER_DAY: 2,
  STREAK_BONUS_CAP: 6,
  MISS_DECAY_PER_DAY: 5,     // subtracted per missed calendar day
  TREND_BAND: 3,             // ±this counts as stable
} as const;

export type MomentumTrend = 'rising' | 'stable' | 'falling';

export interface MomentumHistoryEntry {
  date: string;   // YYYY-MM-DD
  score: number;  // settled score at end of that day
}

// ── Pure math ────────────────────────────────────────────

/**
 * Delta for one day that had check-ins.
 * completionRate: 0..1
 * consecutiveStreak: how many consecutive fully-complete days ending on this day (≥1)
 */
export function completionDelta(completionRate: number, consecutiveStreak: number): number {
  const base =
    MOMENTUM.COMPLETION_GAIN *
    (completionRate - MOMENTUM.NEUTRAL_RATE) /
    (1 - MOMENTUM.NEUTRAL_RATE);
  const streakBonus =
    consecutiveStreak > 1
      ? Math.min(
          (consecutiveStreak - 1) * MOMENTUM.STREAK_BONUS_PER_DAY,
          MOMENTUM.STREAK_BONUS_CAP
        )
      : 0;
  return base + streakBonus;
}

export function clampMomentum(score: number): number {
  return Math.max(MOMENTUM.MIN, Math.min(MOMENTUM.MAX, Math.round(score)));
}

/** Compare current score to 3 entries ago (or oldest available). */
export function computeTrend(
  currentScore: number,
  history: MomentumHistoryEntry[]
): MomentumTrend {
  if (history.length < 2) return 'stable';
  const compareIdx = Math.max(0, history.length - 3);
  const diff = currentScore - history[compareIdx].score;
  if (diff > MOMENTUM.TREND_BAND) return 'rising';
  if (diff < -MOMENTUM.TREND_BAND) return 'falling';
  return 'stable';
}

// ── Recalculation helpers ─────────────────────────────────

interface DayLog {
  habitId: string;
  date: string;
  count: number;
}
interface HabitMeta {
  id: string;
  targetCount: number;
}

function completionRateForDay(
  date: string,
  logs: DayLog[],
  habits: HabitMeta[]
): number {
  if (habits.length === 0) return 0;
  const done = habits.filter(h => {
    const log = logs.find(l => l.habitId === h.id && l.date === date);
    return log !== undefined && log.count >= h.targetCount;
  }).length;
  return done / habits.length;
}

function allCompleteForDay(date: string, logs: DayLog[], habits: HabitMeta[]): boolean {
  return habits.length > 0 && completionRateForDay(date, logs, habits) >= 1;
}

function streakEndingOn(date: string, logs: DayLog[], habits: HabitMeta[]): number {
  let streak = 0;
  let d = date;
  while (streak < 366) {
    if (!allCompleteForDay(d, logs, habits)) break;
    streak++;
    d = subtractDay(d);
  }
  return streak;
}

export interface RecalcInput {
  /** Score as of end of lastSettledDate (before any today activity). */
  settledScore: number;
  /** Last date whose activity is already baked into settledScore. '' = never settled. */
  lastSettledDate: string;
  history: MomentumHistoryEntry[];
  logs: DayLog[];
  habits: HabitMeta[];
  /** The current app "today" (mock-aware). */
  todayStr: string;
}

export interface RecalcOutput {
  /** New settled score (through yesterday). */
  settledScore: number;
  /** Yesterday's date string (the new lastSettledDate). */
  lastSettledDate: string;
  /** Updated history (max 7 entries). */
  history: MomentumHistoryEntry[];
  /** Display score = clamp(settledScore + todayDelta). */
  displayScore: number;
  trend: MomentumTrend;
  /** Days since last check-in (any log). 0 = activity today, 999 = no history. */
  daysSinceLastCheckIn: number;
}

export function recalcMomentum(input: RecalcInput): RecalcOutput {
  const { logs, habits, todayStr } = input;
  const yesterday = subtractDay(todayStr);

  // Bootstrap: if never settled, start at START and treat yesterday as first settled date
  const baseScore = input.lastSettledDate ? input.settledScore : MOMENTUM.START;
  const lastSettled = input.lastSettledDate || yesterday;

  // ── 1. Settle all days from lastSettled+1 to yesterday ──
  const daysToSettle = daysAfterUpTo(lastSettled, yesterday);
  let score = baseScore;
  const history = [...input.history];

  for (const day of daysToSettle) {
    const rate = completionRateForDay(day, logs, habits);
    if (rate > 0 || logs.some(l => l.date === day)) {
      // Has some activity
      const streak = streakEndingOn(day, logs, habits);
      score = clampMomentum(score + completionDelta(rate, streak));
    } else {
      // Missed day
      score = clampMomentum(score - MOMENTUM.MISS_DECAY_PER_DAY);
    }
    history.push({ date: day, score });
  }

  // Keep last 7 entries for trend
  const trimmedHistory = history.slice(-7);

  // ── 2. Today's partial delta (recomputed fresh each call) ──
  const todayRate = completionRateForDay(todayStr, logs, habits);
  const todayStreak = streakEndingOn(todayStr, logs, habits);
  const todayDelta =
    logs.some(l => l.date === todayStr)
      ? completionDelta(todayRate, Math.max(todayStreak, 1))
      : 0;

  const displayScore = clampMomentum(score + todayDelta);
  const trend = computeTrend(displayScore, trimmedHistory);

  // ── 3. Days since last check-in ──
  const allDates = [...new Set(logs.map(l => l.date))].sort();
  const lastCheckIn = allDates[allDates.length - 1] ?? null;
  const daysSinceLastCheckIn = lastCheckIn
    ? daysBetween(lastCheckIn, todayStr)
    : 999;

  return {
    settledScore: score,
    lastSettledDate: yesterday,
    history: trimmedHistory,
    displayScore,
    trend,
    daysSinceLastCheckIn,
  };
}
