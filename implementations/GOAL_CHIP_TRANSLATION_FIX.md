# Goal Chip Translation Fix — Issue #183

## Context

The onboarding "what are we saving for?" screen (`app/onboarding.tsx`, `OnboardingStep.GoalDeclaration`)
shows quick-pick goal chips (Vacation, New Car, House Deposit, Emergency Fund, Something Else). The
chip button labels are correctly translated via `t(\`goal.chips.${chip.id}\`)`.

`GOAL_CHIPS[].label` (`src/lib/catalogs.ts`) is the canonical **English** goal name, by deliberate
design (see `catalogs.ts` comment above `GOAL_CHIPS` and `implementations/I18N_PL.md`'s Decisions —
goal names, like plan names, are stored/sent to the backend untranslated). This is correct and stays
unchanged.

The bug: tapping a chip writes `chip.label` (English) into `goalName`, which is then rendered
**directly to the user** — not just persisted — at several points later in the same onboarding flow.
A non-English user picking a chip sees it flip back to English on every subsequent screen:

- `app/onboarding.tsx:1103` — the `Input` field itself, right after tapping the chip
- `app/onboarding.tsx:1121` — `t('targetAmount.headline', { goalName })`
- `app/onboarding.tsx:1203` — `<Row label={t('blueprint.rowGoal')} value={goalName} />`
- `app/onboarding.tsx:1273–1274` — `t('pushPermission.milestoneBody', { goalName })`
- `app/onboarding.tsx:1300` / `:1303` — `t('account.subEmailConfirmed'/'subInitial', { goalName, ... })`

## Approach

Decouple **display** from **canonical storage**. Introduce a derived `goalDisplayName` value in
`app/onboarding.tsx` that maps the canonical English `goalName` back to its translated string when it
matches a known chip, via a new reverse-lookup helper in `catalogs.ts`. Use `goalDisplayName` only at
the six user-facing render sites above. Every other use of `goalName` (chip tap, selected-state
comparison, validation, draft persistence, final Goal/webhook payload) keeps using the canonical
English value, unchanged.

**Out of scope** (flagged, not fixed here): `app/(tabs)/goals.tsx:123` and `src/lib/goalsSync.ts:36`
also render the canonical English goal name post-onboarding, in the Goals list. Same root pattern, but
a separate screen — left untouched pending a decision on whether to fold it in.

---

## Phase 1 — Add reverse-lookup helper

**Files modified:** `src/lib/catalogs.ts`

- [x] Add `getGoalChipId(goalName: string): string | undefined` next to `getGoalIconKey` (~line 114),
      returning the `id` of the `GOAL_CHIPS` entry whose `label` matches, or `undefined` for a
      free-typed name.
- [x] No changes to `GOAL_CHIPS`, `getGoalIconKey`, or the existing doc comment's stated decision
      (canonical English storage stays as-is).

**Phase complete when:**
- [x] `getGoalChipId('Vacation')` returns `'vacation'`, `getGoalChipId('Custom Trip')` returns
  `undefined`.
- [x] `catalogs.ts` has no new dependency on `i18next`/`react-i18next` (stays translation-agnostic).
- [x] Typecheck passes for the new export.

---

## Phase 2 — Derive `goalDisplayName` in onboarding.tsx

**Files modified:** `app/onboarding.tsx`

- [x] Import `getGoalChipId` alongside the existing `GOAL_CHIPS`, `getGoalIconKey` import (line 20).
- [x] Add, near the `goalName`/`goalNameError` state (~line 202–203):
      ```ts
      const goalDisplayName = useMemo(() => {
        const chipId = getGoalChipId(goalName);
        return chipId ? t(`goal.chips.${chipId}`) : goalName;
      }, [goalName, t]);
      ```
- [x] Confirm `useMemo` is already imported from `react` in this file; add it to the import if not.
      (Not present — added `useMemo` to the existing `react` import.)

**Phase complete when:**
- [x] `goalDisplayName` resolves to the translated chip label when `goalName` matches a chip, and falls
  back to the raw typed value otherwise.
- [x] No existing `goalName` usages are touched in this phase (verified via `grep -n "goalName"
  app/onboarding.tsx` — count of references unchanged until Phase 3 edits them).

---

## Phase 3 — Swap in `goalDisplayName` at display sites only

**Files modified:** `app/onboarding.tsx`

- [x] Line 1107 (`Input value={goalName}`) → `value={goalDisplayName}` (kept `onChangeText` writing to
      `setGoalName` unchanged, so free-typed input still becomes the canonical value).
- [x] Line 1125 — `t('targetAmount.headline', { goalName })` → `{ goalName: goalDisplayName }`.
- [x] Line 1207 — `<Row ... value={goalName} />` → `value={goalDisplayName}`.
- [x] Lines 1277–1278 — `t('pushPermission.milestoneBody', { goalName })` →
      `{ goalName: goalDisplayName }` (truthiness check on line 1277 left as `goalName`, unaffected).
- [x] Line 1304 — `t('account.subEmailConfirmed', { goalName })` → `{ goalName: goalDisplayName }`.
- [x] Line 1307 — `t('account.subInitial', { goalName, date: ... })` →
      `{ goalName: goalDisplayName, date: ... }`.
- [x] Explicitly left untouched: chip tap handler (still `setGoalName(chip.label)`),
      selected-state checks (lines 1088, 1096, still compare against `chip.label`), validation (line
      696), draft persistence (lines 283, 322, 340), and the final saved Goal / webhook payload
      (lines 489, 490, 521, 522, still built from canonical `goalName`).

**Phase complete when:**
- [x] `grep -n "goalName" app/onboarding.tsx` shows exactly the six display sites above using
  `goalDisplayName`, and every other line still reads `goalName`.
- [x] No change to what gets persisted to the store, Supabase, or the onboarding webhook payload — only
  what's rendered on-screen changes (verified: lines 489/490/521/522 unchanged, typecheck clean).

---

## Phase 4 — Manual verification

**Files modified:** none (verification only)

- [x] On a device/simulator set to `pl`, run onboarding, tap a goal chip (e.g. "Wyjazd"), and confirm
      the input field, target-amount headline, blueprint summary row, push-permission body, and
      account-confirmation copy all show the Polish label — not English — through to the end of
      onboarding.
- [x] Repeat for `de` and `hu`.
- [x] Confirm free-typed goal names (not matching any chip) still display and persist exactly as
      typed, in all four locales.
- [x] Confirm the chip's "selected" highlight (border/background) still activates correctly when its
      canonical label matches `goalName`.
- [x] Inspect the persisted Goal object (store/Supabase) and the onboarding webhook payload after
      finishing onboarding with a chip-selected goal — confirm both still contain the canonical
      **English** name (e.g. `"Vacation"`), not the translated display string.

**Phase complete when:**
- [x] All checks above pass on `pl`, `de`, and `hu`, plus a free-typed-name spot check on `en`.
      (Verified by user directly.)
- [x] No regression in persisted/backend data (still canonical English).

---

## Phase 5 — Close out

**Files modified:** none

- [ ] All checklist items in GitHub issue #183 ticked.
- [ ] Completion comment posted on #183 summarizing the fix and verification performed.
- [ ] Issue #183 closed.
- [ ] PR opened from `fix/issue-183-goal-chip-translation` → `main`, body includes `Closes #183`.

**Phase complete when:**
- Issue #183 is closed with a completion comment.
- PR is open and linked to #183.
