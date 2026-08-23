# Icon System Migration

Tracks [#128](https://github.com/Koin-App-Official/pignify/issues/128), milestone "Icon System Migration". Replaces raw emoji UI icons with custom icons.

## Status: implemented and live-verified

29 icon assets shipped (`assets/icons/*.png`), registry + `Icon` component built (`src/components/icons/`), all ready call sites migrated across 17 files, `catalogs.ts` restructured (`ACHIEVEMENT_ICONS`, `GOAL_CHIPS` consolidated from onboarding.tsx/goals.tsx duplication, `getGoalIconKey`), a `v6 → v7` persisted-state migration added (drops achievement `icon`, remaps goal `icon` from legacy emoji to registry keys). `npx tsc --noEmit` clean, `npx vitest run` 385/385 passing. Live-verified in the iOS Simulator: achievement badges screen (11/12 icons + the one intentional emoji fallback, a6), dashboard goal ring, and goals list all render correctly against the real Metro bundle.

**Format note — superseded the original SVG-transformer plan:** every source SVG, including the ones that looked "clean" by path-element count, turned out to have single `<path>` elements with 20,000–70,000-character `d` attributes (genuine photo-trace complexity, not decimal-precision bloat SVGO could fix). Shipping these as SVG would be 5–10x the size of a rasterized PNG for no scaling benefit. All 29 assets are pre-rasterized PNG (via `cairosvg`, background-stripped for transparency, trimmed to content bbox) — `react-native-svg-transformer` was never added, and isn't needed.

**Still open (unchanged from the original prep phase — no new source art was provided for these):** `expenseCategory.food`, `achievement.a6` (💪), the milestone-checklist unchecked state (drawn as a plain circle instead, no asset needed), and the three `GOAL_TEMPLATES`/`GOAL_CHIPS` entries with no cleared source (concert/wedding/trip — globe, ring, headphones all need rework; the cake and food-bowl are photorealistic and need a flat-style redo). All of these still render their original emoji, on purpose, per the fallback design below.

---

Below is the original design/prep doc, left as-is for the mapping rationale and pipeline detail.

**Explicitly out of scope:** the mascot (`src/components/Mascot.tsx`, `assets/mascot*.png`). That's on its own track in [MASKOT.md](MASKOT.md), blocked on a `.riv` asset, and its emoji fallback is intentionally kept until that ships. Nothing here should touch it.

## Source assets

Two drops from the user, both in `/tmp` (not in the repo):

- `/tmp/piggy-icons/` — 3 sheets (`icons-1/2/3.svg`), 78 icons total, auto-traced/posterized (one fill per path, thousands of paths per sheet). Usable for reference but too heavy to ship as-is; anything taken from here needs re-export as a clean single icon before use.
- `/tmp/piggy-svg-icons/` — 19 individual "ChatGPT Image *.svg" files. Split into three buckets: **clean** (10–30 paths, transparent bg — car, house, plane, pencil), **usable-but-heavier** (700–2500 paths, still transparent — laptop, notepad+pen, controller, cart, pill bottle, warning triangle, confetti, crown, seedling), and **not ready** (baked-in background and/or off-canvas bleed — globe, ring, headphones; or wrong style entirely — the photorealistic cake and a photorealistic salmon/rice/veggie bowl clearly meant for the food category).

None of these are in the repo yet. Nothing gets copied into `assets/icons/` until each one is individually cleared (see Open items).

## Component API (proposed)

```tsx
<Icon name="goalCar" size={24} />
<Icon name="achievementCrown" size={32} />
```

- `name` is a key into a flat registry (`src/components/icons/registry.ts`), not a raw require/path — call sites never reference file paths.
- `size` sets both width and height (icons are square-canvas exports). No `color` prop for v1: unlike a typical icon font, these are multi-color illustrations, not single-path glyphs — `currentColor` recoloring doesn't apply to most of them. If a future icon is flat/single-color, it can opt into a `color` prop individually, but that's not the default contract.
- Same shape as `Mascot`'s existing `expression` prop pattern (`src/components/Mascot.tsx`) — a lookup table with a safe fallback — so it should feel familiar in this codebase.

## Asset pipeline (once an icon is cleared)

1. Re-export/clean the source SVG — flat single-instance icon, transparent background, content filling the canvas (no bleed, no off-center artwork).
2. Run through SVGO to strip the excess coordinate precision these exports carry (some are 1–2MB for a 30-path icon).
3. Drop into `assets/icons/<key>.svg`.
4. Add the metro SVG transformer (`react-native-svg-transformer`) so `.svg` imports become components directly — not currently configured; `react-native-svg` itself is already installed (`package.json`). This is a one-time setup step, not per-icon.
5. Register the key in `src/components/icons/registry.ts`.

## Proposed key naming

Flat, feature-prefixed, matches the shape of `catalogs.ts`'s existing ids so the mapping stays obvious:

- Goal templates: `goalTemplate.<id>` (ids from `GOAL_TEMPLATES` — holiday, concert, car, emergency, laptop, education, apartment, wedding, trip, purchase)
- Expense categories: `expenseCategory.<id>` (food, transport, entertainment, shopping, bills, health, education, other)
- Achievements: `achievement.<id>` (a1–a12)
- One-off UI icons: `ui.<name>` (lock, warning, bell, celebration, streak, etc.)

## Mapping table

### Goal templates (`src/lib/catalogs.ts:49-58`) — 9/10 ready

| id | emoji | new icon | status |
|---|---|---|---|
| holiday | ✈️ | airplane | ready |
| concert | 🎵 | headphones+notes | **not ready** — baked navy background |
| car | 🚗 | car | ready |
| emergency | 🛡️ | (reuse existing shield from `/tmp/piggy-icons`) | ready |
| laptop | 💻 | laptop | ready |
| education | 📚 | (reuse existing book from `/tmp/piggy-icons`) | ready |
| apartment | 🏠 | house | ready |
| wedding | 💍 | diamond ring | **not ready** — art bleeds off canvas, needs recenter |
| trip | 🌍 | globe | **not ready** — baked navy background |
| purchase | 🎁 | (reuse existing gift from `/tmp/piggy-icons`) | ready |

Same template icons also back `GOAL_CHIPS`/`GOAL_ICONS` in `app/(tabs)/goals.tsx:44-57` (currently duplicated from onboarding.tsx per the existing migration task) and `onboarding.tsx:47-51` — one registry key serves all three call sites once consolidated.

### Expense categories (`catalogs.ts:136-143`) — 7/8 ready

| id | emoji | new icon | status |
|---|---|---|---|
| food | 🍔 | — | **missing** — no source icon in either drop |
| transport | 🚌 | plane+ship+train+car scene | ready (may want to isolate just the car, scene is busy at small sizes) |
| entertainment | 🎮 | game controller | ready |
| shopping | 🛍️ | shopping cart | ready |
| bills | 📄 | (reuse existing receipt from `/tmp/piggy-icons`) | ready |
| health | 💊 | pill bottle | ready |
| education | 📖 | (reuse existing book from `/tmp/piggy-icons`) | ready |
| other | 📌 | (fallback — pencil or existing pin icon) | ready |

### Achievements (`catalogs.ts:29-41`) — 12/12 ready

| id | emoji | new icon |
|---|---|---|
| a1 | 🎯 | target |
| a2 | 🔥 | flame |
| a3 | ⚡ | lightning |
| a4 | 🏆 | trophy |
| a5 | 🌱 | seedling |
| a6 | 💪 | (reuse existing dumbbell-adjacent icon or request one — no direct muscle icon in either drop) |
| a7 | 🚀 | rocket |
| a8 | 👑 | crown |
| a9 | 📊 | pie/bar chart |
| a10 | ⭐ | star |
| a11 | 💎 | diamond |
| a12 | 🧠 | brain |

### One-off UI sites

| Site | emoji | new icon | status |
|---|---|---|---|
| `app/delete-account.tsx:127` | ⚠️ | warning triangle | ready |
| `app/(tabs)/index.tsx:214` | 🎉 | confetti popper | ready |
| `app/delete-account.tsx:155`, `enable-biometric.tsx:105`, `change-pin.tsx:109`, `PinCreationFlow.tsx:161` | 🔐 | (reuse existing padlock from `/tmp/piggy-icons`) | ready |
| `PlanGate.tsx:200` | 🔒 | (reuse existing lock from `/tmp/piggy-icons`) | ready |
| `onboarding.tsx:1245` notifications | 🔔 | (reuse existing bell from `/tmp/piggy-icons`) | ready |
| `goals.tsx:268` milestone checklist | ✅/⬜ | check-circle icon (met) + a plain drawn circle, no asset (not met) | **done** — resolved without needing a sourced "empty" asset |
| `store.ts:589-591` milestone push notification | 🚀/💪/🌱 | **N/A** — these are plain-text notification bodies, not renderable UI; left untouched, not an icon-registry concern |

## Remaining open items (post-implementation)

Everything marked "ready" above, plus the milestone checklist, achievements, and `GOAL_CHIPS` consolidation, is implemented and live-verified (see Status). What's left needs new source art, not more engineering work:

1. **Food icon** — the 18k-path file turned out to be a photorealistic salmon/rice/veggie bowl, clearly intended for `expenseCategory.food`. Same problem as the cake: photorealistic style, not flat/vector — doesn't match the rest of the set. Needs a flat-style redo. `food` still renders its 🍔 emoji fallback.
2. **a6 (💪)** — same "missing source" problem, smaller blast radius. Confirmed live-rendering its emoji fallback correctly (see Status).
3. **Ring recenter, globe/headphones background removal, cake + food-bowl redo in flat style** — four assets need rework before `wedding`/`trip`/`concert` can migrate off their emoji.
