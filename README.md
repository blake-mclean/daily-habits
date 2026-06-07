# Daily Habits

A React Native habit tracking app built with Expo, featuring an identity-based progression system, momentum scoring, and motivational nudges.

## Features

- **Habit tracking** — daily and volume-based habits with swipe-to-delete and per-habit reminders
- **Identity system** — 7 identity archetypes (Athlete, Scholar, Builder, Creator, Mindful, Social, Disciplined), each with 10 progressive level names that unlock as you earn XP
- **Momentum score** — a 0–100 score that rises with consistency and falls with missed days, with rising/stable/falling trend indicator
- **Future Self nudges** — motivational messages that adapt to your momentum and level milestones
- **Challenges** — structured multi-day habit challenges with rewards
- **Stats** — 14-day completion chart, current/best streaks, per-habit completion rates

## Tech Stack

- **Expo SDK 54** / React Native 0.81
- **TypeScript** (strict mode)
- **React Navigation** bottom tabs (no Expo Router)
- **AsyncStorage** for persistence
- `expo-av` for sound, `expo-haptics` for haptic feedback, `expo-notifications` for reminders

## Getting Started

Install Expo Go on your iOS or Android device, then:

```bash
npm install
npx expo start --tunnel
```

Scan the QR code with your device camera (iOS) or the Expo Go app (Android).

## Project Structure

```
src/
  context/        # HabitsContext — all state via useReducer + AsyncStorage
  retention/      # Pure-function subsystem: momentum, identity XP, future self messages
  screens/        # Today, History, Stats, Challenges, Settings, Onboarding
  components/     # HabitCard, RetentionDashboard, AddHabitModal, RewardModal
  hooks/          # useSound
  utils/          # dateHelpers, notifications
  theme.ts        # Design tokens (Apple design language)
```

## Design

Follows Apple's design language — Action Blue (#0066cc), hairline card borders (no shadows), SF Pro typography, pill-shaped CTAs. Full spec in [DESIGN.md](DESIGN.md).
