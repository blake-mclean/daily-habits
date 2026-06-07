# DESIGN.md — Apple Design System

Source: Apple.com design analysis (homepage, store, iPhone buy page, accessories, environment pages).

## Core Philosophy

Photography-first, UI recedes. Near-invisible chrome, single Action Blue accent, no decorative gradients, no card shadows. Elevation comes from surface-color change, not shadow. The product (content) speaks; the UI disappears.

---

## Colors

| Token | Hex | Role |
|---|---|---|
| primary | #0066cc | Action Blue — every CTA, link, active state, focus ring |
| primary-focus | #0071e3 | Keyboard focus ring |
| primary-on-dark | #2997ff | Links on dark surfaces |
| ink | #1d1d1f | All headings and body text on light surfaces |
| ink-muted-80 | #333333 | Secondary text on light |
| ink-muted-48 | #7a7a7a | Captions, disabled, metadata |
| canvas | #ffffff | Primary surface — cards, modals |
| canvas-parchment | #f5f5f7 | Page background, footer, alternating sections |
| surface-pearl | #fafafc | Ghost button fill |
| surface-dark | #1d1d1f | Dark tile / welcome screen bg |
| surface-tile | #272729 | Dark card surfaces |
| on-dark | #ffffff | Text on dark surfaces |
| hairline | #e0e0e0 | Card borders, input borders |
| divider-soft | #f0f0f0 | Subtle separators (rgba 0,0,0,0.04 in practice) |
| success | #34c759 | iOS system green |
| success-light | #e3f8e8 | Success tint |
| warning | #ff9f0a | iOS system orange |
| warning-light | #fff3d8 | Warning tint |
| error | #ff3b30 | iOS system red |

## Typography

React Native uses SF Pro automatically on iOS (system font). Do not specify fontFamily.

| Role | Size | Weight | Letter Spacing |
|---|---|---|---|
| Display | 34px | 600 | -0.5 |
| Title Large | 28px | 600 | -0.4 |
| Title | 22px | 600 | -0.3 |
| Headline | 17px | 600 | -0.4 |
| Body | 17px | 400 | -0.4 |
| Callout | 16px | 400 | -0.3 |
| Subhead | 15px | 400 | -0.2 |
| Footnote | 13px | 400 | -0.1 |
| Caption | 12px | 400 | -0.1 |

## Spacing (8px base grid)

xxs: 4 · xs: 8 · sm: 12 · md: 17 · lg: 24 · xl: 32 · xxl: 48 · section: 80

## Border Radius

sm: 8 (utility/inputs) · md: 11 (ghost buttons) · lg: 18 (cards) · xl: 24 · pill: 9999 (CTAs, search)

## Elevation

**Apple uses NO shadows on cards or buttons.** The only shadow is on product imagery:
`rgba(0,0,0,0.22) 3px 5px 30px` — imagery only.

Cards use a 1px hairline border: `borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)'`

## Buttons

- Primary CTA: `backgroundColor: #0066cc, borderRadius: 9999, paddingVertical: 11, paddingHorizontal: 22`
- Active/press state: `transform: scale(0.97)`
- Ghost: transparent bg, `borderColor: #0066cc`, pill shape
- Utility (dark): `backgroundColor: #1d1d1f`, `borderRadius: 8`

## Do's

- Use #0066cc for every interactive element — one accent color only
- Hairline border on cards, never shadow
- body text at 17px/400/-0.4 letter spacing
- Pill shape (borderRadius: 9999) for all primary CTAs
- Press state = scale(0.97)

## Don'ts

- No gradients as decorative backgrounds
- No shadows on cards, inputs, or buttons
- No second accent color
- No fontWeight: 500 — ladder is 300/400/600/700
- Never use #000000 for text — use #1d1d1f (ink)
