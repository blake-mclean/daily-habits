# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SDK Version

This project uses **Expo SDK 54** (`"expo": "~54.0.0"` in package.json). Always consult the versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing or modifying Expo/React Native code. Do not use SDK 55/56 APIs.

When adding packages with native dependencies, always use `npx expo install <package>` (not `npm install`) so the SDK-54-compatible version is resolved.

## Commands

```bash
npx expo start --tunnel     # physical device via Expo Go (required — use this, not npm start)
npm run ios                 # iOS Simulator
npx tsc --noEmit            # type check (must be clean before any PR)
npx ts-node --compiler-options '{"module":"CommonJS"}' src/retention/__tests__/helpers.ts  # unit tests
```

There is no configured test runner. Unit tests live in `src/retention/__tests__/` and are executed directly via ts-node with `module: CommonJS` to avoid ESM resolution errors.

## Architecture

### Entry point & navigation

`index.ts` → `App.tsx`. No Expo Router — all navigation is React Navigation bottom tabs (`@react-navigation/bottom-tabs`). Four tabs: Today, History, Stats, Challenges.

User flow on first launch: `WelcomeScreen` → `OnboardingScreen` → main tabs. Gate is `state.hasOnboarded` in context.

### State management

All app state lives in a single `HabitsContext` (`src/context/HabitsContext.tsx`) using `useReducer` + `AsyncStorage` (key: `HABITS_APP_V2`). The context provides both state and all mutation functions. No external state library.

Key state shapes:
- `Habit` — id, name, emoji, type (`'daily'|'volume'`), targetCount, color, identityType
- `HabitLog` — habitId, date (YYYY-MM-DD), count
- Retention fields — see `RetentionState` in `src/retention/index.ts`

**Critical**: `LOG_HABIT` either creates a new log entry (count=1) or increments an existing one. `logs.length` only changes on the first log for a date — subsequent taps for volume habits only change `count`. The retention recalc `useEffect` depends on `state.logs.length`, so it won't re-fire for volume habit increments. The `RetentionDashboard` bypasses this by calling `computeIdentityXp()` live on every render.

**Backfill**: On LOAD from AsyncStorage, habits missing `identityType` get it inferred via `inferIdentityType(habit.name)`. This is necessary for users who created habits before that field was added.

### Retention system (`src/retention/`)

A pure-function subsystem with no React dependencies. The orchestrator `runRetentionRecalc()` in `index.ts` is called from a `useEffect` in `HabitsContext` whenever `state.logs.length`, `state.habits.length`, or `state.futureSelfNudgesEnabled` changes.

- `momentum.ts` — score (0–100), trend, history. `momentumSettled` tracks the score through yesterday; `momentumScore` includes a live today delta to prevent double-counting on re-renders.
- `identity.ts` — 7 identity types, XP per completion (10 XP), chapter/level system, 10 level names per type via `identityLevelName(type, chapter)`. XP is counted as completed days (not taps): `count >= habit.targetCount`.
- `futureSelf.ts` — motivational message templates, 5 categories × 4 variants.
- `__tests__/helpers.ts` — 47 unit tests, no framework.

### Design system

Apple design language. Full spec in `DESIGN.md`. Key rules:
- **No shadows on cards or UI elements** — use hairline border `rgba(0,0,0,0.08)` instead
- One accent: `COLORS.primary` (#0066cc)
- All tokens are in `src/theme.ts`: `COLORS`, `SPACING`, `RADIUS`, `TYPE` presets, `CARD_STYLE`
- Do not specify `fontFamily` — SF Pro is automatic on iOS
- `fontWeight` ladder: 400 / 600 / 700 only (no 500)

### Animations

Use `Animated` API from React Native. `useNativeDriver: false` is required for width/height animations (e.g., progress bars). `useNativeDriver: true` is fine for opacity and transform. Progress bars use `Animated.spring` with `tension: 60, friction: 8`.

### Sound

`src/hooks/useSound.ts` — `playChime()` (per habit tap), `playCelebrate()` (all-habits-complete / reward modal). Audio files in `assets/`.

### Notifications

`src/utils/notifications.ts` — daily reminder scheduling and re-engagement push notifications. Uses `expo-notifications`.
