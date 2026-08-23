# Edit Monthly Income — Post-Onboarding Entry Point

**Tracking:** [#150](https://github.com/Koin-App-Official/pignify/issues/150)
**Branch:** `fix/issue-150-edit-monthly-income`

## Problem

Onboarding (`app/onboarding.tsx`) lets users skip entering their monthly income
(`handleSkipIncome` sets `incomeSkipped: true`, `monthlyIncome: null`). After
that, there is no way back — the profile screen shows income read-only
(`app/(tabs)/profile.tsx:178-187`, "Not provided" when null), settings has no
income reference at all, and the dashboard's `incomeSkippedTip` nudge
(`app/(tabs)/index.tsx:245-253`) is a plain, non-tappable `<View>`. Confirmed
via repo-wide search: the only `updateProfile({ monthlyIncome: ... })` call
site anywhere is inside onboarding.

## Architecture recap (from reading the current code)

- `UserProfile.monthlyIncome: number | null` and `incomeSkipped: boolean` live
  in `src/lib/store.ts`, mutated via the generic, purely-local
  `updateProfile(updates: Partial<UserProfile>)` (Zustand + AsyncStorage
  persist — no backend sync call happens on update, confirmed by grepping for
  webhook/fetch calls outside `onboarding.tsx`). Editing income after
  onboarding is therefore a pure client-side change, same as editing the name.
- The **name field** on the profile screen (`profile.tsx:38-39`, `106-146`) is
  the existing precedent for inline-editing a profile value: an
  `editingName` boolean + `nameInput` string state, a `TouchableOpacity`
  wrapping the display value that flips `editingName` to `true`, and a
  `TextInput` + `Check`-icon button that calls `updateProfile()` and flips it
  back. This plan reuses that exact pattern for income instead of introducing
  a modal or a new screen.
- `src/components/ui/currency-amount-input.tsx` (`CurrencyAmountInput`) is the
  shared numeric-amount input already used by onboarding's income step,
  goals, and `ContributionStep` — takes `currencyCode`/`value`/`onChangeText`/
  `placeholder`, strips non-numeric input, and renders the currency symbol on
  the correct side. Reusing it here means no new input component and no new
  currency-symbol-position bug class.
- The dashboard nudge's route target: `app/(tabs)/_layout.tsx:153` names the
  tab `"profile"`, which expo-router resolves to the URL `/profile` (group
  segments in `(tabs)` are not part of the path) — confirmed no other call
  site in the repo currently routes there, so this is a new but
  straightforward `router.push`.
- No new translation keys are needed. Following the name field's precedent,
  the edit affordance is icon-only (a `Pencil` next to the existing
  `t('monthlyIncome')` label) with no extra copy, and the numeric placeholder
  reuses the existing cross-namespace key `t('onboarding:contribution.amountPlaceholder')`
  (`"0.00"`) — the same cross-namespace `t('ns:key')` call syntax is already
  used elsewhere in the codebase (e.g. `onboarding.tsx`'s
  `t(\`common:language.${language}\`)`).

---

## Phase 1 — Profile screen: editable monthly income card

- [x] Add `editingIncome` (boolean) and `incomeInput` (string) state to
      `Profile()`, mirroring `editingName`/`nameInput`.
- [x] Add a `saveIncome()` handler mirroring `saveName()`: parses
      `incomeInput` to a number, and only calls
      `updateProfile({ monthlyIncome: parsed, incomeSkipped: false })` (then
      closes edit mode) when `parsed > 0` — an empty or zero input is a no-op,
      same defensive bar as the onboarding step's own `incomeNumber > 0`
      check, so a user can't save a garbage/blank value that then displays
      confusingly as "$0". Also added `openIncomeEdit()` to seed
      `incomeInput` from the current value each time edit mode is opened.
- [x] In the income card (`profile.tsx:178-188`), add a `Pencil` icon next to
      the `t('monthlyIncome')` label, wrapped in a `TouchableOpacity` that
      sets `editingIncome(true)` and seeds `incomeInput` from
      `profile.monthlyIncome` (empty string if `null`) — same trigger
      pattern as the name field.
- [x] When `editingIncome` is true, render `CurrencyAmountInput`
      (`currencyCode={profile.currency}`, `value={incomeInput}`,
      `onChangeText={setIncomeInput}`,
      `placeholder={t('onboarding:contribution.amountPlaceholder')}`,
      `autoFocus`) in place of the display `Text`, plus a `Check`-icon
      `TouchableOpacity` calling `saveIncome()` — same layout shape as the
      name field's edit state (`profile.tsx:122-139`).
- [x] When `editingIncome` is false, keep the existing display line
      (`profile.monthlyIncome != null ? formatCurrency(...) : t('notProvided')`)
      unchanged.

**Modified files:**
- [app/(tabs)/profile.tsx](../app/(tabs)/profile.tsx)

**Phase complete when:**
- [x] Tapping the pencil (or the "Not provided" value) switches the income
  card into the `CurrencyAmountInput` + Check-button edit state, pre-filled
  with the current value (or empty, if it was never set) — confirmed by
  reading the JSX branch and `openIncomeEdit()`.
- [x] Saving a valid amount updates `profile.monthlyIncome`, clears
  `profile.incomeSkipped`, and returns the card to its display state showing
  the new formatted value — confirmed by reading `saveIncome()`.
- [x] Saving with an empty/zero input is a no-op (edit mode stays open, no
  `updateProfile` call fires) — confirmed by reading `saveIncome()`'s guard.
- [x] `npm run typecheck` is clean.
- [x] `npm run test` — 356/356 passing, unchanged from before this phase.

---

## Phase 2 — Dashboard: wire the income-skipped nudge to the new entry point

- [x] Change the `incomeSkipped` nudge block
      (`app/(tabs)/index.tsx:245-253`) from a plain `<View>` to a
      `TouchableOpacity` (`activeOpacity={0.85}`, matching the `past_due`
      banner right above it) that calls
      `router.push({ pathname: '/profile', params: { editIncome: '1' } })`.
      Copy (`t('incomeSkippedTip')`) is unchanged — it already reads as a
      call to action ("Add your monthly income to unlock...").
- [x] In `profile.tsx`, read the `editIncome` param via
      `useLocalSearchParams()` (new import from `expo-router`) and, in a
      `useEffect` that runs once on mount, call the same open-edit-mode logic
      as the pencil tap (`openIncomeEdit()`) when `editIncome === '1'`. No
      scroll-into-view needed — the income card is the second card on the
      screen (right after the user-stats card) and is on-screen without
      scrolling on all supported device sizes.

**Modified files:**
- [app/(tabs)/index.tsx](../app/(tabs)/index.tsx)
- [app/(tabs)/profile.tsx](../app/(tabs)/profile.tsx)

**Phase complete when:**
- [x] Tapping the dashboard nudge navigates to the Profile tab with the
  income card already in edit mode, cursor focused, ready to type — confirmed
  by reading the `router.push` target and the mount `useEffect`.
- [x] Navigating to Profile normally (tapping the tab bar, no `editIncome`
  param) behaves exactly as before — card starts in its normal display state,
  since the effect only fires `openIncomeEdit()` when `editIncome === '1'`.
- [x] `npm run typecheck` is clean.
- [x] `npm run test` — 356/356 passing, unchanged from before this phase.

---

## Phase 3 — Verification

- [x] `npm run typecheck` — clean.
- [x] `npm run test` — 356/356 passing, same count as `main`.
- [x] Grep confirms no other screen needs updating: `goals.tsx:83` and
      `index.tsx:70` both read `monthlyIncome`/`incomeSkipped` via
      `useStore((s) => s.profile...)` selectors, so `goals.tsx`'s "exceeds
      income" warning and the dashboard nudge pick up an edited value
      automatically with no code change of their own — confirmed by reading
      both call sites, not assumed.
- [ ] Manual pass on device/simulator — **left to the user to verify
      directly** (per prior guidance: visual/UI changes are self-verified,
      not pushed through simulator automation): skip income in onboarding →
      dashboard shows the nudge → tap it → lands on Profile with income edit
      open → save a value → nudge disappears on next dashboard visit → value
      persists after app restart.

**Modified files:** none (verification only), plus this plan file's own
checkbox updates.

**Phase complete when:**
- [x] Typecheck and full test suite are clean.
- [x] The user has confirmed the manual pass above works end-to-end:
  "everything works perfectly."
- [x] Issue [#150](https://github.com/Koin-App-Official/pignify/issues/150) is
  ready to close per the `github-issues-prs` skill's Phase 3.

## Verified

**2026-08-23** — All 3 phases complete. `npm run typecheck` and `npm run test`
(356/356) clean throughout. Live manual pass confirmed working by the user
directly: skip income in onboarding → dashboard nudge appears → tap it →
lands on Profile with the income field already open → save a value → nudge
disappears → value persists after app restart.

---

## Explicitly out of scope

- The backend `incomes` collection (`scripts/appwrite/schema.mjs:318-337`,
  supports multiple named income entries) — the client only implements the
  single `monthlyIncome` scalar today, and this plan doesn't change that.
  Migrating to multi-income is a separate, larger effort.
- An explicit "clear income back to unset" affordance. Onboarding's skip
  path remains the only way to end up with `monthlyIncome: null`; editing
  after the fact only ever sets a positive value.
- Settings-screen income entry. The profile card is the single edit surface;
  Settings gets no new UI.
