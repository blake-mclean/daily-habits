// ── Identity types ────────────────────────────────────────

export type IdentityType =
  | 'athlete'
  | 'scholar'
  | 'builder'
  | 'creator'
  | 'mindful'
  | 'social'
  | 'disciplined';

export const IDENTITY_TYPES: IdentityType[] = [
  'athlete', 'scholar', 'builder', 'creator', 'mindful', 'social', 'disciplined',
];

export const IDENTITY_META: Record<
  IdentityType,
  { label: string; emoji: string; keywords: string[] }
> = {
  athlete: {
    label: 'The Athlete',
    emoji: '🏃',
    keywords: ['exercise', 'run', 'workout', 'gym', 'walk', 'swim', 'sport', 'lift', 'train', 'yoga', 'stretch', 'bike', 'hike', 'steps'],
  },
  scholar: {
    label: 'The Scholar',
    emoji: '📚',
    keywords: ['read', 'study', 'learn', 'book', 'practice', 'course', 'language', 'write', 'journal', 'research'],
  },
  builder: {
    label: 'The Builder',
    emoji: '🏗️',
    keywords: ['code', 'build', 'work', 'project', 'ship', 'launch', 'side project', 'develop'],
  },
  creator: {
    label: 'The Creator',
    emoji: '🎨',
    keywords: ['draw', 'paint', 'music', 'play', 'sing', 'art', 'design', 'create', 'write', 'sketch', 'blog', 'video', 'photo'],
  },
  mindful: {
    label: 'The Mindful',
    emoji: '🧘',
    keywords: ['meditate', 'breathe', 'mindful', 'gratitude', 'journal', 'reflect', 'sleep', 'rest', 'breath', 'calm'],
  },
  social: {
    label: 'The Social',
    emoji: '🤝',
    keywords: ['call', 'friend', 'family', 'connect', 'talk', 'message', 'reach out', 'text', 'catch up'],
  },
  disciplined: {
    label: 'The Disciplined',
    emoji: '⚡',
    keywords: ['water', 'drink', 'eat', 'diet', 'sleep', 'wake', 'cold', 'fast', 'no sugar', 'vitamins', 'supplement', 'glass', 'meal'],
  },
};

/** Infer identity type from habit name via keyword matching. Falls back to 'disciplined'. */
export function inferIdentityType(habitName: string): IdentityType {
  const lower = habitName.toLowerCase();
  for (const type of IDENTITY_TYPES) {
    if (IDENTITY_META[type].keywords.some(kw => lower.includes(kw))) {
      return type;
    }
  }
  return 'disciplined';
}

// ── XP & chapter system ───────────────────────────────────

export const XP_PER_COMPLETION = 10;

/**
 * Cumulative XP needed to REACH chapter n (1-based).
 * Chapter 1 starts at 0 XP.
 * Cost to advance from chapter n to n+1 = 50 + 25*(n-1).
 */
export function xpForChapter(n: number): number {
  if (n <= 1) return 0;
  let total = 0;
  for (let i = 1; i < n; i++) {
    total += 50 + 25 * (i - 1);
  }
  return total;
}

/** Chapter index (1-based) from total accumulated XP. */
export function chapterFromXp(xp: number): number {
  let n = 1;
  while (xpForChapter(n + 1) <= xp) n++;
  return n;
}

/** XP cost to advance FROM current chapter to the next. */
export function xpToNextChapter(chapter: number): number {
  return 50 + 25 * (chapter - 1);
}

/** Phase label derived from chapter number. */
export function phaseLabel(chapter: number): string {
  if (chapter <= 5) return 'Getting Started';
  if (chapter <= 15) return 'Building Proof';
  if (chapter <= 30) return 'Becoming Consistent';
  if (chapter <= 60) return 'Identity Forming';
  return 'Locked In';
}

/** Compute XP per identity type from habit completions in logs. */
export function computeIdentityXp(
  habits: { id: string; identityType?: IdentityType; targetCount: number }[],
  logs: { habitId: string; date: string; count: number }[]
): Partial<Record<IdentityType, number>> {
  const xp: Partial<Record<IdentityType, number>> = {};
  for (const habit of habits) {
    const type = habit.identityType;
    if (!type) continue;
    const completions = new Set(
      logs
        .filter(l => l.habitId === habit.id && l.count >= habit.targetCount)
        .map(l => l.date)
    ).size;
    xp[type] = (xp[type] ?? 0) + completions * XP_PER_COMPLETION;
  }
  return xp;
}

// ── Level names ───────────────────────────────────────────

const LEVEL_NAMES: Record<IdentityType, string[]> = {
  athlete: [
    'The Rookie', 'The Jogger', 'The Mover', 'The Contender', 'The Competitor',
    'The Grinder', 'The Athlete', 'The Champion', 'The Elite', 'The Legend',
  ],
  scholar: [
    'The Curious One', 'The Reader', 'The Student', 'The Learner', 'The Scholar',
    'The Analyst', 'The Intellectual', 'The Expert', 'The Sage', 'The Polymath',
  ],
  builder: [
    'The Tinkerer', 'The Maker', 'The Hacker', 'The Developer', 'The Builder',
    'The Architect', 'The Engineer', 'The Craftsperson', 'The Innovator', 'The Visionary',
  ],
  creator: [
    'The Dabbler', 'The Experimenter', 'The Expressive One', 'The Sketcher', 'The Creator',
    'The Artisan', 'The Artist', 'The Maestro', 'The Virtuoso', 'The Luminary',
  ],
  mindful: [
    'The Seeker', 'The Pauser', 'The Breather', 'The Present One', 'The Reflector',
    'The Contemplative', 'The Mindful One', 'The Inner Guide', 'The Centered Soul', 'The Awakened',
  ],
  social: [
    'The Connector', 'The Friend Maker', 'The Outreacher', 'The Socializer', 'The Networker',
    'The Community Builder', 'The Pillar', 'The Beloved', 'The Anchor', 'The Cornerstone',
  ],
  disciplined: [
    'The Starter', 'The Consistent One', 'The Habit Maker', 'The Routine Builder', 'The Disciplined One',
    'The Self-Master', 'The Iron Will', 'The Unstoppable', 'The Resolute', 'The Embodied',
  ],
};

/** Returns the level-specific name for a given identity type and chapter (1-based). */
export function identityLevelName(type: IdentityType, chapter: number): string {
  const names = LEVEL_NAMES[type];
  return names[Math.min(chapter - 1, names.length - 1)];
}

/** Returns the identity type with the most XP. Tie broken by type order. Null if all empty. */
export function strongestIdentity(
  xp: Partial<Record<IdentityType, number>>
): IdentityType | null {
  let best: IdentityType | null = null;
  let bestXp = -1;
  for (const type of IDENTITY_TYPES) {
    const v = xp[type] ?? 0;
    if (v > bestXp) {
      bestXp = v;
      best = type;
    }
  }
  return bestXp > 0 ? best : null;
}
