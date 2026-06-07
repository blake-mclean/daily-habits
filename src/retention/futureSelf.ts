import { IdentityType, IDENTITY_META } from './identity';
import { MomentumTrend } from './momentum';

export type FutureSelfCategory =
  | 'rising'
  | 'falling'
  | 'stable'
  | 'milestone'
  | 'reengagement';

// 4 variants per category — rotated to prevent staleness
const TEMPLATES: Record<FutureSelfCategory, string[]> = {
  rising: [
    "You're building something real. The version of you who doesn't quit is showing up every day.",
    "Momentum is compounding. Each check-in is a brick in the foundation you're building.",
    "You're not just tracking habits — you're building trust with yourself. That's the real win.",
    "The work is starting to show. Consistency is the rare edge — and you have it.",
  ],
  falling: [
    "Every expert has gaps. What matters is the next step, not the missed ones.",
    "A pause isn't a failure. Returning is what counts — you've done it before.",
    "Progress is rarely a straight line. One check-in today brings everything back.",
    "The gap doesn't erase what you've built. Come back and pick up where you left off.",
  ],
  stable: [
    "Steady is underrated. You're building the kind of consistency most people only dream about.",
    "Not every day is a highlight — but showing up every day is the whole game.",
    "You're in your maintenance phase. That's not a plateau — that's a foundation.",
    "Sustainable beats spectacular. You've found a rhythm worth keeping.",
  ],
  milestone: [
    "A new chapter. This is what commitment looks like when it compounds.",
    "You've reached a point most people never get to. This is what sticking with it feels like.",
    "Each level is a version of you who didn't quit. You've earned this one.",
    "Chapter unlocked. The next one starts right now.",
  ],
  reengagement: [
    "Your future self is waiting. One habit today is all it takes to reconnect.",
    "The person you're becoming hasn't forgotten you — and neither have your habits.",
    "Streaks restart. Momentum rebuilds. The only thing that matters is right now.",
    "You've started before. You can start again. Everything is still here.",
  ],
};

/** Identity-specific suffixes appended when a strongest identity exists (optional flavor). */
const IDENTITY_SUFFIX: Partial<Record<IdentityType, string>> = {
  athlete: " The Athlete in you is still here.",
  scholar: " The Scholar in you doesn't forget why this matters.",
  mindful: " The Mindful in you knows this is exactly the right moment.",
  disciplined: " The Disciplined in you already knows what to do.",
};

export function getFutureSelfCategory(params: {
  score: number;
  trend: MomentumTrend;
  daysSinceCheckIn: number;
  isNewChapter: boolean;
}): FutureSelfCategory {
  const { trend, daysSinceCheckIn, isNewChapter } = params;
  if (daysSinceCheckIn >= 3) return 'reengagement';
  if (isNewChapter) return 'milestone';
  if (trend === 'rising') return 'rising';
  if (trend === 'falling') return 'falling';
  return 'stable';
}

export function pickMessage(
  category: FutureSelfCategory,
  /** Last variant index shown for this category (-1 = never shown). */
  lastVariantIndex: number,
  strongest: IdentityType | null
): { text: string; variantIndex: number } {
  const variants = TEMPLATES[category];
  // Never repeat the last shown variant
  const next = (lastVariantIndex + 1) % variants.length;
  let text = variants[next];

  // Optionally append identity suffix on reengagement or milestone
  if (strongest && (category === 'reengagement' || category === 'milestone')) {
    const suffix = IDENTITY_SUFFIX[strongest];
    if (suffix) text = text + suffix;
  }

  return { text, variantIndex: next };
}

export function identityLabel(type: IdentityType): string {
  return IDENTITY_META[type].label;
}
