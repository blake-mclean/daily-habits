// Apple design system — see DESIGN.md for rationale
// Single source of truth for all visual tokens

export const COLORS = {
  // ── Brand ──────────────────────────────────────────────
  primary: '#0066cc',          // Action Blue — every CTA, link, active indicator
  primaryFocus: '#0071e3',     // keyboard focus ring
  primaryLight: '#dceeff',     // tint for completed-habit card backgrounds
  primaryOnDark: '#2997ff',    // links on dark surfaces

  // ── Surfaces ───────────────────────────────────────────
  background: '#f5f5f7',       // canvas-parchment (page bg)
  surface: '#ffffff',          // canvas (cards, modals, inputs)
  surfacePearl: '#fafafc',     // ghost-button fill
  surfaceDark: '#1d1d1f',      // dark welcome / tile bg
  surfaceTile: '#272729',      // darker card on dark bg

  // ── Text ───────────────────────────────────────────────
  text: '#1d1d1f',             // ink — never pure black
  textStrong: '#333333',       // ink-muted-80
  textMuted: '#7a7a7a',        // ink-muted-48 (captions, meta)
  textOnDark: '#ffffff',
  textOnDarkMuted: '#cccccc',

  // ── Borders / Dividers ─────────────────────────────────
  border: 'rgba(0,0,0,0.08)',  // hairline used on cards
  borderHard: '#e0e0e0',       // explicit 1px lines where needed
  divider: '#f0f0f0',

  // ── Semantic ───────────────────────────────────────────
  success: '#34c759',
  successLight: '#e3f8e8',
  warning: '#ff9f0a',
  warningLight: '#fff3d8',
  gold: '#ff9f0a',        // alias for warning — used for challenges/badges
  goldLight: '#fff3d8',   // alias for warningLight
  error: '#ff3b30',

  // ── Habit color palette (iOS system colors) ────────────
  habitColors: [
    '#0066cc', // Blue
    '#30b0c7', // Teal
    '#34c759', // Green
    '#ff9f0a', // Orange
    '#ff3b30', // Red
    '#af52de', // Purple
    '#ff2d55', // Pink
  ],
};

// ── Spacing (8 px base grid) ─────────────────────────────
export const SPACING = {
  xxs: 4,
  xs:  8,
  sm:  12,
  md:  17,   // Apple's body-text rhythm unit
  lg:  24,
  xl:  32,
  xxl: 48,
  section: 80,
};

// ── Border radius ────────────────────────────────────────
export const RADIUS = {
  sm:   8,     // utility buttons, small inputs
  md:   11,    // ghost capsule buttons
  lg:   18,    // main cards (store-utility-card)
  xl:   24,    // large containers
  full: 9999,  // pill CTAs, search bar
};

// ── Typography presets ───────────────────────────────────
// React Native uses SF Pro automatically on iOS — no fontFamily needed
export const TYPE = {
  display:   { fontSize: 34, fontWeight: '600' as const, letterSpacing: -0.5 },
  titleLg:   { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.4 },
  title:     { fontSize: 22, fontWeight: '600' as const, letterSpacing: -0.3 },
  headline:  { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.4 },
  body:      { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.4 },
  callout:   { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.3 },
  subhead:   { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.2 },
  footnote:  { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.1 },
  caption:   { fontSize: 12, fontWeight: '400' as const, letterSpacing: -0.1 },
  captionSm: { fontSize: 11, fontWeight: '400' as const, letterSpacing: -0.1 },
};

// ── Shared style presets ─────────────────────────────────
// Apple: no shadows on UI chrome — hairline border only
export const CARD_STYLE = {
  backgroundColor: COLORS.surface,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: COLORS.border,
  // No shadow — Apple's design language
} as const;

// Modals are the one exception where a shadow is acceptable (not product imagery but needs lift)
export const MODAL_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.16,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 20,
} as const;

export const PILL_BUTTON = {
  backgroundColor: COLORS.primary,
  borderRadius: RADIUS.full,
  paddingVertical: 11,
  paddingHorizontal: 22,
} as const;
