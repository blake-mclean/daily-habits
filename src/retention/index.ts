/**
 * Retention system orchestrator.
 * Called lazily on app open and after each habit log/unlog.
 * All inputs come from AppState; output is dispatched as UPDATE_RETENTION.
 */
import { recalcMomentum, MomentumTrend, MomentumHistoryEntry } from './momentum';
import {
  computeIdentityXp,
  chapterFromXp,
  strongestIdentity,
  IdentityType,
} from './identity';
import {
  getFutureSelfCategory,
  pickMessage,
  FutureSelfCategory,
} from './futureSelf';

// ── Shape of the slice we update ─────────────────────────

export interface RetentionState {
  momentumScore: number;          // display score (includes today's partial delta)
  momentumSettled: number;        // score as of end of lastMomentumDate (before today)
  momentumTrend: MomentumTrend;
  lastMomentumDate: string;       // last settled date (yesterday or earlier)
  momentumHistory: MomentumHistoryEntry[];
  identityXpSnapshot: Partial<Record<IdentityType, number>>; // stored for dashboard reads
  lastKnownChapter: number;       // for new-chapter detection on next recalc
  futureSelfText: string;
  futureSelfCategory: FutureSelfCategory;
  futureSelfVariantIdx: Partial<Record<string, number>>;
  daysSinceLastCheckIn: number;
}

// ── Minimal shape the orchestrator needs from AppState ────

interface RecalcInput {
  momentumSettled: number;
  lastMomentumDate: string;
  momentumHistory: MomentumHistoryEntry[];
  lastKnownChapter: number;
  futureSelfVariantIdx: Partial<Record<string, number>>;
  habits: { id: string; targetCount: number; identityType?: IdentityType }[];
  logs: { habitId: string; date: string; count: number }[];
  futureSelfNudgesEnabled: boolean;
  todayStr: string;
}

export function runRetentionRecalc(input: RecalcInput): RetentionState {
  const {
    habits, logs, todayStr,
    futureSelfNudgesEnabled,
    futureSelfVariantIdx,
  } = input;

  // ── 1. Momentum ───────────────────────────────────────
  const momentum = recalcMomentum({
    settledScore: input.momentumSettled,
    lastSettledDate: input.lastMomentumDate,
    history: input.momentumHistory,
    logs,
    habits,
    todayStr,
  });

  // ── 2. Identity XP ────────────────────────────────────
  const identityXp = computeIdentityXp(habits, logs);
  const strongest = strongestIdentity(identityXp);
  const strongestXp = strongest ? (identityXp[strongest] ?? 0) : 0;
  const currentChapter = chapterFromXp(strongestXp);
  const isNewChapter = currentChapter > (input.lastKnownChapter ?? 0);

  // ── 3. Future Self message ────────────────────────────
  let futureSelfText = '';
  let futureSelfCategory: FutureSelfCategory = 'stable';
  let newVariantIdx = { ...futureSelfVariantIdx };

  if (futureSelfNudgesEnabled) {
    futureSelfCategory = getFutureSelfCategory({
      score: momentum.displayScore,
      trend: momentum.trend,
      daysSinceCheckIn: momentum.daysSinceLastCheckIn,
      isNewChapter,
    });
    const lastIdx = (futureSelfVariantIdx[futureSelfCategory] as number | undefined) ?? -1;
    const picked = pickMessage(futureSelfCategory, lastIdx, strongest);
    futureSelfText = picked.text;
    newVariantIdx = { ...futureSelfVariantIdx, [futureSelfCategory]: picked.variantIndex };
  }

  return {
    momentumScore: momentum.displayScore,
    momentumSettled: momentum.settledScore,
    momentumTrend: momentum.trend,
    lastMomentumDate: momentum.lastSettledDate,
    momentumHistory: momentum.history,
    identityXpSnapshot: identityXp,
    lastKnownChapter: currentChapter,
    futureSelfText,
    futureSelfCategory,
    futureSelfVariantIdx: newVariantIdx,
    daysSinceLastCheckIn: momentum.daysSinceLastCheckIn,
  };
}
