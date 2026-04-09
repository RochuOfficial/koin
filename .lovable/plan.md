

# Material Design 3 Migration for Koin

## Overview
Restyle the entire Koin app to follow Material Design 3 principles — surface layering, tonal elevation, M3 typography scale, proper component patterns — while keeping the existing brand palette and fintech identity.

## Design System Changes

### CSS Variables & Surfaces (index.css)
Map the existing brand palette into M3 color roles:
- **Surface**: 3-tier tonal system (`surface`, `surface-container-low`, `surface-container`, `surface-container-high`) using subtle blue-tinted grays instead of flat white/border
- **On-surface / On-surface-variant**: replace raw foreground/muted usage
- **Primary container / On-primary-container**: tonal primary for filled cards (e.g. `#DBEAFE` / `#1E3A5F`)
- **Tertiary**: map `accent` (#10B981) as tertiary with container variant
- **Elevation**: replace `border + shadow-sm` with M3 tonal elevation (surface-container tints at levels 0-3 instead of box-shadow borders)
- **Shape**: increase `--radius` to `1rem` (16px) for large components, keep `0.75rem` for medium

### Typography
- Define M3 type scale classes: `display-small`, `headline-medium`, `title-large`, `title-medium`, `body-large`, `body-medium`, `label-large`, `label-medium`
- Map to Inter weights: Display/Headline 700-800, Title 600, Body 400-500, Label 500-600
- Apply consistently across all pages

### Tailwind Config
- Add surface-container color tokens
- Add M3 state-layer utilities (hover: 8% opacity overlay, pressed: 12%, focus: 12%)

## Component Updates

### Bottom Navigation (BottomNav.tsx)
- M3 bottom nav: active item gets pill-shaped indicator behind icon (primary-container color)
- Remove text color change; add filled indicator shape
- 80px height with proper touch targets
- Subtle surface-container-low background, no top border — use tonal elevation

### Cards (all pages)
- Remove `border border-border` pattern everywhere
- Use `surface-container-low` background with no border for standard cards
- Use `surface-container` for elevated/interactive cards
- Round corners to 16px
- M3 filled cards for primary content (primary-container bg)

### Buttons
- M3 filled button: `bg-primary rounded-full h-12` (pill shape)
- M3 tonal button: `bg-primary-container text-on-primary-container rounded-full`
- M3 outlined button: `border-outline rounded-full`
- M3 text button: no bg, primary color text
- FAB: 56px, rounded-2xl (M3 large FAB shape = 28px radius), surface-container-high bg with primary icon, tonal elevation

### Chips (goal templates, starters, filters)
- M3 filter/suggestion chips: `rounded-full px-4 h-8` with outline or tonal fill
- Replace current border-2 template selectors with M3 chip style
- Selected state: tonal fill with checkmark

### Input Fields
- M3 outlined text field: rounded-sm (4px) top corners, bottom border emphasis — or use filled variant with surface-container-highest bg, rounded-t-lg
- Label above with `label-medium` style

### Progress Indicators
- Keep existing ProgressRing but ensure stroke uses M3 track (surface-container) + active (primary)
- Linear progress: 4px height, rounded-full, track color = surface-container

### Sheets & Dialogs
- Bottom sheet: rounded-t-3xl (28px), surface-container-low bg, drag handle 32x4px
- Dialog: rounded-3xl, surface-container-high bg, 24px padding

## Page-Specific Changes

### Dashboard
- Top app bar: transparent bg, `headline-medium` for "Koin", streak badge as M3 tonal chip
- Goal ring section: clean surface card with tonal elevation
- Stats grid: surface-container cards, no borders
- Quick-add button: M3 outlined/tonal button, not dashed border
- Goal list items: M3 list style with proper 56px row height, leading icon, trailing metadata
- Level bar: M3 linear progress indicator

### Goals
- Template picker: M3 filter chips or tonal cards in grid
- Goal cards: M3 card with headline + supporting text pattern
- FAB: M3 large FAB (rounded-2xl, 56px, tertiary-container or primary)
- Goal detail: M3 layout with hero section, proper spacing

### Missions
- Tab switcher: M3 segmented button (not custom tabs) — pill shape, filled active state
- Mission cards: M3 list items with leading checkbox (M3 circular checkbox), supporting text, trailing label
- Achievement grid: M3 small cards with tonal fill for unlocked

### AI Coach
- Top bar: M3 small top app bar with avatar
- Chat bubbles: primary-container for user, surface-container for coach
- Starter chips: M3 suggestion chips (rounded-full, outlined)
- Input area: M3 text field with trailing icon button

### Onboarding
- Progress indicator: M3 linear progress or connected dots
- Template selection: M3 cards with selected state (primary-container outline + tint)
- Quiz options: M3 outlined cards → filled on selection
- CTA buttons: M3 filled button (rounded-full)

### Profile
- User card: M3 filled card (primary-container) with centered layout
- Stats: M3 metrics in labeled containers
- Settings sections: M3 list with switch controls (existing Switch is fine)
- Notification toggles: proper M3 list item height (56px)

## Files to Modify
1. `src/index.css` — M3 color tokens, surface layers, type scale utilities
2. `tailwind.config.ts` — new color tokens, state-layer utilities
3. `src/components/BottomNav.tsx` — M3 nav bar with pill indicator
4. `src/components/ui/button.tsx` — M3 button variants (filled, tonal, outlined, text, FAB)
5. `src/components/ui/card.tsx` — M3 card variants (filled, elevated, outlined)
6. `src/components/ui/input.tsx` — M3 text field styling
7. `src/components/ui/dialog.tsx` — M3 dialog shape/surface
8. `src/components/ProgressRing.tsx` — M3 track colors
9. `src/components/AddExpenseModal.tsx` — M3 dialog + chips for categories
10. `src/pages/Dashboard.tsx` — full M3 restyle
11. `src/pages/Goals.tsx` — M3 cards, chips, FAB
12. `src/pages/Missions.tsx` — M3 segmented buttons, list items
13. `src/pages/AICoach.tsx` — M3 chat surfaces, chips
14. `src/pages/Onboarding.tsx` — M3 cards, buttons, progress
15. `src/pages/Profile.tsx` — M3 filled card, lists
16. `src/components/AppShell.tsx` — M3 surface background

