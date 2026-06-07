export interface ChallengeTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  durationDays: number;
  badgeEmoji: string;
  badgeName: string;
  prerequisiteId: string | null;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'kickstart-3',
    name: '3-Day Kickstart',
    emoji: '🚀',
    description: 'Build early momentum. Complete all habits for 3 consecutive days.',
    durationDays: 3,
    badgeEmoji: '🥉',
    badgeName: 'Kickstarter',
    prerequisiteId: null,
  },
  {
    id: 'streak-7',
    name: '7-Day Streak',
    emoji: '🔥',
    description: 'Prove your consistency. A full week of habit mastery.',
    durationDays: 7,
    badgeEmoji: '🔥',
    badgeName: 'On Fire',
    prerequisiteId: 'kickstart-3',
  },
  {
    id: 'builder-21',
    name: '21-Day Builder',
    emoji: '🏗️',
    description: 'Science says 21 days builds a habit. Put that to the test.',
    durationDays: 21,
    badgeEmoji: '🥇',
    badgeName: 'Habit Builder',
    prerequisiteId: 'streak-7',
  },
  {
    id: 'champion-30',
    name: '30-Day Champion',
    emoji: '👑',
    description: 'A full month of daily mastery. The ultimate test of consistency.',
    durationDays: 30,
    badgeEmoji: '🏆',
    badgeName: 'Champion',
    prerequisiteId: 'builder-21',
  },
];

export function getTemplate(id: string): ChallengeTemplate | undefined {
  return CHALLENGE_TEMPLATES.find(t => t.id === id);
}
