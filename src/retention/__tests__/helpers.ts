/**
 * Pure unit tests for retention helpers.
 * No test framework needed — run with:
 *   npx ts-node src/retention/__tests__/helpers.ts
 * (or compile first: npx tsc && node dist/retention/__tests__/helpers.js)
 */

import {
  completionDelta, clampMomentum, computeTrend, recalcMomentum, MOMENTUM,
} from '../momentum';
import {
  xpForChapter, chapterFromXp, xpToNextChapter, phaseLabel,
  inferIdentityType, computeIdentityXp, strongestIdentity,
} from '../identity';
import { pickMessage, getFutureSelfCategory } from '../futureSelf';
import { daysBetween, addDay, subtractDay, daysAfterUpTo } from '../../utils/dateHelpers';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

function assertEq<T>(actual: T, expected: T, label: string) {
  assert(actual === expected, `${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── Date helpers ─────────────────────────────────────────

console.log('\n── daysBetween ──');
assertEq(daysBetween('2024-01-01', '2024-01-04'), 3, 'same month, 3 days apart');
assertEq(daysBetween('2024-01-04', '2024-01-01'), -3, 'negative direction');
assertEq(daysBetween('2024-01-01', '2024-01-01'), 0, 'same day = 0');

console.log('\n── subtractDay / addDay ──');
assertEq(subtractDay('2024-03-01'), '2024-02-29', 'leap year Feb');
assertEq(addDay('2024-02-29'), '2024-03-01', 'leap year forward');
assertEq(subtractDay('2024-01-01'), '2023-12-31', 'year boundary');

console.log('\n── daysAfterUpTo ──');
assertEq(daysAfterUpTo('2024-01-01', '2024-01-04').join(','), '2024-01-02,2024-01-03,2024-01-04', '3 days');
assertEq(daysAfterUpTo('2024-01-05', '2024-01-04').length, 0, 'start >= end = empty');

// ── Momentum math ─────────────────────────────────────────

console.log('\n── completionDelta ──');
// 100% complete, streak 1 → base 8, no streak bonus
assert(Math.abs(completionDelta(1.0, 1) - 8) < 0.01, '100% streak=1 → 8');
// 50% complete → 0 delta (neutral rate)
assert(Math.abs(completionDelta(0.5, 1)) < 0.01, '50% neutral → ~0');
// 0% complete → -8
assert(Math.abs(completionDelta(0.0, 1) - (-8)) < 0.01, '0% → -8');
// streak bonus caps at 6
assert(completionDelta(1.0, 5) === 8 + 6, '100% streak=5 → bonus capped at 6 → 14');
assert(completionDelta(1.0, 2) === 8 + 2, '100% streak=2 → +2 bonus → 10');

console.log('\n── clampMomentum ──');
assertEq(clampMomentum(110), 100, 'clamp above max');
assertEq(clampMomentum(-5), 0, 'clamp below min');
assertEq(clampMomentum(75), 75, 'within range unchanged');

console.log('\n── computeTrend ──');
const histA = [
  { date: '2024-01-01', score: 50 },
  { date: '2024-01-02', score: 55 },
  { date: '2024-01-03', score: 60 },
];
assertEq(computeTrend(65, histA), 'rising', 'score 50→65 = rising');
assertEq(computeTrend(50, histA), 'stable', 'score 50→50 = stable (diff 0, within band)');
const histB = [{ date: '2024-01-01', score: 75 }, { date: '2024-01-02', score: 70 }, { date: '2024-01-03', score: 65 }];
assertEq(computeTrend(55, histB), 'falling', 'score 75→55 = falling');

// ── Acceptance test §10.1: 5 days of 100% → momentum ≥ 75 ──
console.log('\n── §10.1: 5 days 100% completion → score ≥ 75 ──');
const habits1 = [{ id: 'h1', targetCount: 1 }];
const logs1: { habitId: string; date: string; count: number }[] = [];
const startDate = '2024-01-05'; // "today" starts the day after settled date
// Simulate 5 days of full completion by putting logs in dates 01-06 to 01-10
for (let i = 1; i <= 5; i++) {
  logs1.push({ habitId: 'h1', date: `2024-01-0${i + 5}`, count: 1 });
}
const result5 = recalcMomentum({
  settledScore: 50,
  lastSettledDate: '2024-01-05',
  history: [],
  logs: logs1,
  habits: habits1,
  todayStr: '2024-01-11', // day after the 5th complete day
});
assert(result5.settledScore >= 75, `§10.1: 5 days 100% → score ${result5.settledScore} ≥ 75`);

// ── Acceptance test §10.2: 1 missed day drops by ≤ 8 ──
console.log('\n── §10.2: 1 missed day from peak → drop ≤ 8 ──');
const peakScore = result5.settledScore;
const resultMiss = recalcMomentum({
  settledScore: peakScore,
  lastSettledDate: '2024-01-11',
  history: result5.history,
  logs: [], // no logs for Jan 12
  habits: habits1,
  todayStr: '2024-01-13',
});
const drop = peakScore - resultMiss.settledScore;
assert(drop <= 8, `§10.2: missed day drop is ${drop} ≤ 8`);
assert(resultMiss.settledScore > 0, `§10.2: score ${resultMiss.settledScore} > 0 (not zeroed)`);

// ── XP & chapters ─────────────────────────────────────────

console.log('\n── xpForChapter ──');
assertEq(xpForChapter(1), 0, 'ch1 starts at 0');
assertEq(xpForChapter(2), 50, 'ch2 needs 50');
assertEq(xpForChapter(3), 125, 'ch3 needs 50+75=125');
assertEq(xpForChapter(4), 225, 'ch4 = 50+75+100 = 225');

console.log('\n── chapterFromXp ──');
assertEq(chapterFromXp(0), 1, '0 xp = ch1');
assertEq(chapterFromXp(49), 1, '49 xp = still ch1');
assertEq(chapterFromXp(50), 2, '50 xp = ch2');
assertEq(chapterFromXp(124), 2, '124 xp = ch2');
assertEq(chapterFromXp(125), 3, '125 xp = ch3');

console.log('\n── phaseLabel ──');
assertEq(phaseLabel(1), 'Getting Started', 'ch1 phase');
assertEq(phaseLabel(5), 'Getting Started', 'ch5 phase');
assertEq(phaseLabel(6), 'Building Proof', 'ch6 phase');
assertEq(phaseLabel(16), 'Becoming Consistent', 'ch16 phase');
assertEq(phaseLabel(61), 'Locked In', 'ch61 phase');

// ── Identity inference ────────────────────────────────────

console.log('\n── inferIdentityType ──');
assertEq(inferIdentityType('Exercise 30 minutes'), 'athlete', 'exercise → athlete');
assertEq(inferIdentityType('Read for 20 minutes'), 'scholar', 'read → scholar');
assertEq(inferIdentityType('Meditate'), 'mindful', 'meditate → mindful');
assertEq(inferIdentityType('Drink 8 glasses of water'), 'disciplined', 'drink water → disciplined');
assertEq(inferIdentityType('Call a friend'), 'social', 'call → social');

// ── Message rotation ──────────────────────────────────────

console.log('\n── pickMessage rotation (never repeats last) ──');
const r1 = pickMessage('rising', -1, null);
const r2 = pickMessage('rising', r1.variantIndex, null);
const r3 = pickMessage('rising', r2.variantIndex, null);
assert(r1.variantIndex !== r2.variantIndex, 'variant changes each pick');
assert(r2.variantIndex !== r3.variantIndex, 'variant keeps changing');

// ── getFutureSelfCategory ─────────────────────────────────

console.log('\n── getFutureSelfCategory ──');
assertEq(getFutureSelfCategory({ score: 70, trend: 'rising', daysSinceCheckIn: 0, isNewChapter: false }), 'rising', 'rising trend → rising');
assertEq(getFutureSelfCategory({ score: 70, trend: 'rising', daysSinceCheckIn: 3, isNewChapter: false }), 'reengagement', '3+ days → reengagement overrides');
assertEq(getFutureSelfCategory({ score: 70, trend: 'rising', daysSinceCheckIn: 0, isNewChapter: true }), 'milestone', 'new chapter → milestone');
assertEq(getFutureSelfCategory({ score: 50, trend: 'stable', daysSinceCheckIn: 0, isNewChapter: false }), 'stable', 'stable trend → stable');

// ── Summary ──────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
