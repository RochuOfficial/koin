# Editable Currency — Settings Screen with Optional Conversion

**Tracking:** [#152](https://github.com/Koin-App-Official/pignify/issues/152)
**Branch:** `feat/issue-152-settings-currency`

## Problem

Users can change the app language from Settings, but currency is only ever
set once, during onboarding (`app/onboarding.tsx`'s country→currency picker,
auto-derived from device locale). There is no way to correct or update it
afterward — `app/settings.tsx` has no currency reference at all.

## Architecture recap (from reading the current code)

- `UserProfile.currency: string` (`src/lib/store.ts:151`, default `'USD'` at
  line 261) already exists and is deliberately independent of `language` —
  see the doc comment at `src/lib/i18n/detect.ts:1-6` ("a Polish speaker in
  the UK still wants `pl` copy with `GBP` amounts"). No schema change is
  needed for the field itself.
- **Relabel-only path already works today**: `updateProfile({ currency })`
  (the same generic action Language uses,
  `src/lib/store.ts:506`) instantly changes every screen's display, since
  `formatCurrency` (`store.ts:868`) reads `profile.currency` live off the
  store. The new work is entirely about (a) exposing a picker in Settings,
  and (b) the conversion option decided in this feature's brainstorm.
- **`store.ts` cannot be imported under vitest** (`store.ts:846-848`'s own
  comment: it transitively pulls in `AsyncStorage`/`expo-notifications`).
  Every existing piece of non-trivial store logic that needs unit tests
  lives in a separate pure module instead —`deposits.ts` and `goalMath.ts`
  are the precedent (`deposits.ts:1-8`'s header states this explicitly),
  imported into `store.ts` and called from inside its actions (e.g.
  `computeStreak(...)` at `store.ts:712`). The conversion math follows the
  same split: pure module + unit tests, then a thin store action that calls
  it.
- **Fields that need conversion**, confirmed by reading `store.ts` directly
  (not assumed):
  - `UserProfile.monthlyIncome` (`store.ts:171`)
  - `UserProfile.monthlyContribution` (`store.ts:184`) and its deprecated
    alias `estimatedMonthlySavings` (`store.ts:190`) — kept in sync since
    both are still read in places
  - `UserProfile.expenses[].amount` (`Expense.amount`, `store.ts:83`) —
    `expenses` lives nested under `profile`, not as a separate top-level
    state array (`store.ts:231`, `790`)
  - Every `Goal.targetAmount`, `Goal.savedAmount`, `Goal.monthlyContribution`,
    and each `Goal.deposits[].amount` (`store.ts:50-51,60,72`) — converting
    `deposits` too keeps `sum(deposits) === savedAmount` consistent instead
    of leaving historical deposit rows in the old currency
  - **Not converted:** `GOAL_TEMPLATES.suggestedAmount`
    (`src/lib/catalogs.ts:48-52`) — a static catalog of suggested defaults
    shown before a goal exists, not user data.
- **Rate source, confirmed live**: `api.frankfurter.dev/v1/currencies`
  returns 31 codes. Cross-checked against the app's 20-code `CURRENCIES`
  list (`catalogs.ts:93-114`): every code is covered **except `AED`**, which
  isn't an ECB reference currency. The conversion option must degrade
  gracefully (relabel-only) when the target is `AED` or the API call fails.
- **Fetch pattern precedent**: `src/lib/entitlementsSync.ts:46-79`
  (`fetchEntitlementsSync`) is a "best-effort fetch — returns null on any
  failure (including abort) and never throws" function. The new
  `fetchExchangeRate` follows the exact same shape.
- **Modal UI precedent**: `src/components/ui/dob-confirm-modal.tsx` is a
  small `BottomSheet` + two-`Button` confirmation modal
  (edit-vs-confirm). The new currency-convert modal reuses this shape
  (convert-vs-keep-numbers) rather than introducing a different modal
  primitive.
- **Rounding**: the codebase has no existing per-currency decimal-places
  table (`formatMoney` in `src/lib/i18n/format.ts` just strips trailing
  zeros generically, `maximumFractionDigits` defaults to 3). Rather than
  inventing an unverified "HUF/JPY are integer-only" rule, converted amounts
  round to 2 decimal places uniformly — the standard money-math convention —
  and existing display formatting is untouched.
- **Circular-import guard**: like `deposits.ts` (`deposits.ts:26-29`), the
  new pure module defines its own structural subset types instead of
  importing `UserProfile`/`Goal` from `store.ts`, since `store.ts` will
  import this module.
- No existing test in the repo mocks `fetch` — `entitlementsSync.ts` itself
  has no test file. `exchangeRates.test.ts` (Phase 2) will be the first,
  using vitest's standard `vi.stubGlobal('fetch', ...)`.

---

## Phase 1 — Pure conversion math (`src/lib/currencyConversion.ts`)

- [x] Create `src/lib/currencyConversion.ts` with structural subset types
      (no import from `store.ts`):
      `ConvertibleProfile = { monthlyIncome: number | null; monthlyContribution: number | null; estimatedMonthlySavings: number | null; expenses: { amount: number }[] }`
      and
      `ConvertibleGoal = { targetAmount: number; savedAmount: number; monthlyContribution?: number; deposits: { date: string; amount: number }[] }`.
- [x] `convertAmount(amount: number, rate: number): number` — `amount * rate`
      rounded to 2 decimals.
- [x] `convertProfileAmounts<T extends ConvertibleProfile>(profile: T, rate: number): T`
      — returns a new object with `monthlyIncome`, `monthlyContribution`,
      `estimatedMonthlySavings` converted (nulls stay null), and `expenses`
      mapped with each `amount` converted.
- [x] `convertGoalAmounts<T extends ConvertibleGoal>(goals: T[], rate: number): T[]`
      — returns a new array with `targetAmount`, `savedAmount`,
      `monthlyContribution` (if present) converted per goal, and each
      `deposits[].amount` converted.
- [x] `hasConvertibleMonetaryData(profile: ConvertibleProfile, goals: ConvertibleGoal[]): boolean`
      — true if income/contribution is set, any expense exists, or any goal
      has a non-zero `targetAmount`/`savedAmount`/deposit. Used by Settings to
      skip the confirm modal entirely when there's nothing to convert.
- [x] Unit tests in `src/lib/currencyConversion.test.ts`: `convertAmount`
      rounding (including a case that needs rounding, e.g. `10 * 0.923`);
      `convertProfileAmounts` with a null income (stays null) and with
      expenses; `convertGoalAmounts` with deposits and with a goal missing
      `monthlyContribution`; `hasConvertibleMonetaryData` true and false
      cases (empty profile + empty goals → false).

**Modified files:**
- [src/lib/currencyConversion.ts](../src/lib/currencyConversion.ts) (new)
- [src/lib/currencyConversion.test.ts](../src/lib/currencyConversion.test.ts) (new)

**Phase complete when:**
- [x] `npm run typecheck` is clean.
- [x] `npm run test` passes, including the new `currencyConversion.test.ts`
      cases listed above — 14/14 new tests passing, 370/370 full suite.

---

## Phase 2 — Exchange rate fetch (`src/lib/exchangeRates.ts`)

- [x] Create `src/lib/exchangeRates.ts` with a `FRANKFURTER_UNSUPPORTED`
      constant (`['AED']`, with a comment noting it's not an ECB reference
      currency, confirmed against the live `/v1/currencies` endpoint).
- [x] `fetchExchangeRate(from: string, to: string, signal?: AbortSignal): Promise<number | null>`:
      - Returns `1` immediately (no network call) if `from === to`.
      - Returns `null` immediately (no network call) if either code is in
        `FRANKFURTER_UNSUPPORTED`.
      - Otherwise fetches
        `` `https://api.frankfurter.dev/v1/latest?base=${from}&to=${to}` ``,
        and returns `null` on any non-2xx response, JSON parse failure,
        missing `rates[to]`, or thrown error/abort — mirroring
        `fetchEntitlementsSync`'s never-throws contract
        (`entitlementsSync.ts:46-51`).
- [x] Unit tests in `src/lib/exchangeRates.test.ts` using
      `vi.stubGlobal('fetch', vi.fn(...))`: same-currency short-circuit,
      `AED` short-circuit (assert `fetch` was never called), a successful
      response, a non-2xx response, and a network-error rejection.

**Modified files:**
- [src/lib/exchangeRates.ts](../src/lib/exchangeRates.ts) (new)
- [src/lib/exchangeRates.test.ts](../src/lib/exchangeRates.test.ts) (new)

**Phase complete when:**
- [x] `npm run typecheck` is clean.
- [x] `npm run test` passes, including all `exchangeRates.test.ts` cases,
      with no real network call made during the test run — 7/7 new tests
      passing, 377/377 full suite.

---

## Phase 3 — Store wiring (`src/lib/store.ts`)

- [x] Import `convertProfileAmounts` and `convertGoalAmounts` from
      `./currencyConversion`.
- [x] Add `applyCurrencyConversion: (targetCurrency: string, rate: number) => void;`
      to the `PiggyState` interface, next to `updateProfile`'s declaration
      (`store.ts:324`).
- [x] Implement it next to `updateProfile` (`store.ts:506`):
      ```
      applyCurrencyConversion: (targetCurrency, rate) => set((state) => ({
        profile: { ...convertProfileAmounts(state.profile, rate), currency: targetCurrency },
        goals: convertGoalAmounts(state.goals, rate),
      })),
      ```
      The relabel-only path needs no new action — it's the existing
      `updateProfile({ currency })` call, unchanged.

**Modified files:**
- [src/lib/store.ts](../src/lib/store.ts)

**Phase complete when:**
- [x] `npm run typecheck` is clean (the new action's types line up with
      `ConvertibleProfile`/`ConvertibleGoal` being structural subsets of the
      real `UserProfile`/`Goal`).
- [x] `npm run test` — same pass count as before this phase (377/377,
      `store.ts` itself stays untestable under vitest per the existing
      constraint; correctness is covered by Phase 1's unit tests on the pure
      functions this action delegates to, plus Phase 6's manual pass).

---

## Phase 4 — Currency-convert modal + i18n copy

- [x] Create `src/components/ui/currency-convert-modal.tsx`
      (`CurrencyConvertModal`) — closer precedent than `dob-confirm-modal.tsx`
      turned out to be `DeepAnalysisConfirmModal.tsx` (`BottomSheet` + close
      `X` + `Button`s + `ActivityIndicator` loading state), so this mirrors
      that shape instead. Props: `isVisible`, `fromCurrency`, `toCurrency`,
      `rate: number | null`, `loading: boolean`, `unavailable: boolean`,
      `onConvert: () => void`, `onKeepNumbers: () => void`,
      `onClose: () => void`.
- [x] Body renders: title/body copy naming both currencies; an
      `ActivityIndicator` while `loading`; the fetched rate line once loaded
      (e.g. "1 USD ≈ 0.9248 EUR", display-rounded to 4 decimals — the actual
      conversion math in `currencyConversion.ts` rounds independently); if
      `unavailable`, a short note instead of the rate line and the "Convert
      amounts" button isn't rendered (only "Keep numbers" + the close `X`).
- [x] Add a `currency` section to `settings.json` in all four locales
      (`src/lib/i18n/locales/{en,pl,hu,de}/settings.json`), mirroring the
      existing `language` section shape (`"currency": { "sectionLabel": "Currency" }`).
- [x] Add a `currencyConvertModal` block to the same four `settings.json`
      files with the copy needed above (title, body, rateLine, unavailableNote,
      convert button label, keepNumbers button label) — matching the existing
      per-locale JSON key parity the repo already enforces
      (`src/lib/i18n/contentParity.test.ts`).

**Modified files:**
- [src/components/ui/currency-convert-modal.tsx](../src/components/ui/currency-convert-modal.tsx) (new)
- [src/lib/i18n/locales/en/settings.json](../src/lib/i18n/locales/en/settings.json)
- [src/lib/i18n/locales/pl/settings.json](../src/lib/i18n/locales/pl/settings.json)
- [src/lib/i18n/locales/hu/settings.json](../src/lib/i18n/locales/hu/settings.json)
- [src/lib/i18n/locales/de/settings.json](../src/lib/i18n/locales/de/settings.json)

**Phase complete when:**
- [x] `npm run typecheck` is clean.
- [x] `npm run test` passes, including `contentParity.test.ts` (18/18,
      confirms all four locales have identical key sets for the new
      `currency` and `currencyConvertModal` blocks) — 377/377 full suite.
      The component itself isn't wired into any screen yet (Phase 5), so
      there's nothing to visually verify in the browser preview until then.

---

## Phase 5 — Settings screen wiring (`app/settings.tsx`)

- [x] Add `const goals = useStore((state) => state.goals);` and
      `const applyCurrencyConversion = useStore((state) => state.applyCurrencyConversion);`
      alongside the existing selectors (`settings.tsx:108-110`).
- [x] Add state: `currencyPickerVisible`, `pendingCurrency: string | null`,
      `conversionRate: number | null`, `rateLoading`, `rateUnavailable`.
- [x] Add a "Currency" `Row` + section directly below the existing Language
      block, using `CURRENCIES` (imported from `@/lib/store`, already
      re-exported there per `store.ts:43`) for picker items:
      `items={CURRENCIES.map((c) => ({ code: c.code, name: t(\`content:currencies.${c.code}\`), symbol: c.symbol }))}`,
      `selectedCode={profile.currency}` — same cross-namespace `t('ns:key')`
      call already used elsewhere. Shifted every subsequent `FadeInStagger`
      `index` down by one (Account 3→4, Support 4→5, footer 5→6) so the
      stagger order stays contiguous with the new section inserted.
- [x] `PickerModal`'s `onSelect` → `handleSelectCurrency(item)`:
      - No-op if `item.code === profile.currency`.
      - Else set `pendingCurrency = item.code`. If
        `!hasConvertibleMonetaryData(profile, goals)`, apply immediately via
        `updateProfile({ currency: item.code })` — no modal, nothing to
        convert.
      - Otherwise open `CurrencyConvertModal` (`isVisible={pendingCurrency != null}`,
        no separate visibility flag needed), set `rateLoading = true`, call
        `fetchExchangeRate(profile.currency, item.code)`, and on resolve set
        `conversionRate` and `rateUnavailable = (rate === null)`.
- [x] `CurrencyConvertModal` callbacks:
      - `onConvert` (`handleConvertCurrency`) →
        `applyCurrencyConversion(pendingCurrency, conversionRate)`, then
        `closeConvertModal()` (clears `pendingCurrency`/rate/loading state).
      - `onKeepNumbers` (`handleKeepCurrencyNumbers`) →
        `updateProfile({ currency: pendingCurrency })`, then
        `closeConvertModal()`.
      - `onClose` → `closeConvertModal()` directly, no profile change.

**Modified files:**
- [app/settings.tsx](../app/settings.tsx)

**Phase complete when:**
- [x] `npm run typecheck` is clean.
- [x] `npm run test` — same pass count as before this phase (377/377).
- [ ] Manual pass (Phase 6) confirms the full flow end-to-end — **left to the
      user to verify directly**, per prior guidance (visual/UI changes are
      self-verified, not pushed through simulator/browser automation).

---

## Post-Phase-5 fix — currency selection appeared to do nothing

**Bug report:** selecting a currency (e.g. Polish Złoty) in Settings had no
visible effect.

**Root cause:** `handleSelectCurrency` ran synchronously inside
`PickerModal`'s `onSelect`, which fires in the same tick as the picker's own
`onClose()`. That opened `CurrencyConvertModal` (a second native `<Modal>`)
at the exact moment the currency `PickerModal`'s `<Modal>` was still
animating closed — two overlapping native modals with no precedent
elsewhere in the codebase (`DobConfirmModal`, the only other sequential-sheet
case, opens from a plain button tap, never from inside another sheet's
`onSelect`). The confirm sheet was easy to miss or visually clashed with the
closing picker, making the currency change look like it silently failed.

**Fix:** defer the entire selection handler (`app/settings.tsx`) behind a
`setTimeout` matching the picker's own close-animation duration
(`timingPresets.sheet.duration`, 280ms, from `src/lib/springPresets.ts` —
the same constant `BottomSheet` itself animates with), so
`CurrencyConvertModal` only opens once the picker has fully closed. A
`currencySelectionTimeout` ref tracks the pending timeout so a rapid
re-selection cancels the previous one, and a mount-scoped `useEffect`
cleans it up on unmount.

**Modified files:**
- [app/settings.tsx](../app/settings.tsx)

**Verified:**
- [x] `npm run typecheck` clean.
- [x] `npm run test` — 377/377, unchanged.
- [ ] Manual on-device confirmation that the confirm sheet now visibly opens
      after picking a currency — **left to the user**.

---

## Post-Phase-6 polish — round-up conversion + button copy

**1. Rounding:** `convertAmount` (`src/lib/currencyConversion.ts`) switched
from `Math.round` to `Math.ceil` — converted amounts now always round up
rather than to nearest, so a conversion never understates a goal target,
income figure, or expense by a fraction of a unit. The modal's informational
rate line (`currency-convert-modal.tsx`'s `formatRate`) was changed the same
way for consistency. Added a test case
(`currencyConversion.test.ts`: "always rounds up (ceiling), even when the
third decimal is below 5") that would fail under plain rounding but passes
under ceiling, to actually exercise the behavior change rather than just
re-testing cases both rules already agreed on.

**2. Button copy:** the "Keep numbers, just relabel" label was cut off in
Polish. Shortened both `CurrencyConvertModal` buttons to `Convert` /
`Don't convert` across all four locales (`currencyConvertModal.convert` /
`.keepNumbers` in each `settings.json`) — no key renames, only values, since
the underlying relabel-only behavior is unchanged.

**Modified files:**
- [src/lib/currencyConversion.ts](../src/lib/currencyConversion.ts)
- [src/lib/currencyConversion.test.ts](../src/lib/currencyConversion.test.ts)
- [src/components/ui/currency-convert-modal.tsx](../src/components/ui/currency-convert-modal.tsx)
- [src/lib/i18n/locales/en/settings.json](../src/lib/i18n/locales/en/settings.json)
- [src/lib/i18n/locales/pl/settings.json](../src/lib/i18n/locales/pl/settings.json)
- [src/lib/i18n/locales/hu/settings.json](../src/lib/i18n/locales/hu/settings.json)
- [src/lib/i18n/locales/de/settings.json](../src/lib/i18n/locales/de/settings.json)

**Verified:**
- [x] `npm run typecheck` clean.
- [x] `npm run test` — 378/378 (15/15 in `currencyConversion.test.ts`).
- [ ] Manual on-device confirmation that the Polish "Don't convert" label no
      longer clips — **left to the user**.

---

## Post-Phase-6 polish — all money display as whole numbers

`formatMoney` (`src/lib/i18n/format.ts`) is the single shared formatter
behind every money display in the app (`formatCurrency` in `store.ts`
delegates to it, and nothing else formats money independently — confirmed
by grepping for `formatNumber(`/`formatMoney(` call sites). Changed its call
to `formatNumber` to pass `{ maximumFractionDigits: 0 }` instead of the
default 3, so cents/decimals never show — goal amounts, income, expenses,
the new currency-conversion modal's converted figures, everywhere. Rounds to
nearest (not up) — this is a display-only formatting change, distinct from
`currencyConversion.ts`'s deliberate round-up-on-convert policy above, which
still stores/converts the underlying number precisely; only how it's shown
changed.

**Deliberately left untouched:** `formatUSD` (`src/lib/entitlements.ts`),
used only for subscription plan pricing (`$5.99/mo` etc.). That's a real
Stripe-charged amount, not the user's own financial data — rounding it would
misrepresent what's actually billed, so it keeps its 2-decimal display.

**Modified files:**
- [src/lib/i18n/format.ts](../src/lib/i18n/format.ts)
- [src/lib/i18n/format.test.ts](../src/lib/i18n/format.test.ts)
- [src/lib/i18n/contributionMoneyFormatting.test.ts](../src/lib/i18n/contributionMoneyFormatting.test.ts)

**Verified:**
- [x] `npm run typecheck` clean.
- [x] `npm run test` — 379/379.
- [ ] Manual on-device confirmation that decimals no longer appear anywhere
      money is shown — **left to the user**.

---

## Phase 6 — Verification

- [x] `npm run typecheck` — clean.
- [x] `npm run test` — full suite passing (377/377), including every new
      test file added in Phases 1, 2, and 4.
- [x] Grep confirms no other screen needs updating: `app/(tabs)/index.tsx:64`,
      `app/(tabs)/profile.tsx` (multiple), `app/(tabs)/missions.tsx:69`,
      `app/(tabs)/goals.tsx:76`, and `src/components/AddExpenseModal.tsx:25`
      all read `profile.currency` via a live `useStore` selector, and every
      goal/expense object they format comes from the same live `goals`/
      `profile` state — so both `applyCurrencyConversion` (which updates
      `profile` and `goals` together) and the relabel-only
      `updateProfile({ currency })` propagate to every money display with no
      per-screen code change — confirmed by reading each call site, not
      assumed. `app/onboarding.tsx`'s `currency` is separate local
      onboarding-flow state, irrelevant post-onboarding.
- [ ] Manual pass on device/simulator — **left to the user to verify
      directly** (per prior guidance: visual/UI changes are self-verified):
      1. Currency with no monetary data yet → switching currency applies
         instantly, no modal.
      2. Currency with goals/income set → switching opens the modal, shows a
         loading state then a real rate.
      3. Tap "Convert amounts" → goal/income/expense values update to the
         converted numbers; a manual spot check against the shown rate
         confirms the math.
      4. Tap "Keep numbers, just relabel" → values stay numerically the
         same, only the symbol/format changes.
      5. Switch to `AED` (or go offline) → modal shows the unavailable state,
         only relabel is offered.
      6. Values persist after app restart in both the converted and
         relabel-only cases.

**Modified files:** none (verification only), plus this plan file's own
checkbox updates.

**Phase complete when:**
- [x] Typecheck and full test suite are clean.
- [ ] The user has confirmed the manual pass above works end-to-end.
- [ ] Issue [#152](https://github.com/Koin-App-Official/pignify/issues/152)
      is ready to close per the `github-issues-prs` skill's Phase 3.

---

## Explicitly out of scope

- Any backend/multi-device sync of currency changes — `updateProfile` and
  the new `applyCurrencyConversion` are purely local (Zustand + AsyncStorage
  persist), matching how every other profile field already works.
- Re-fetching or refreshing a stale rate after the modal is shown once — a
  single rate fetch per currency switch, not a live-updating rate.
- Converting `GOAL_TEMPLATES.suggestedAmount` — static catalog defaults, not
  user data (see architecture recap).
- Adding `AED` support to the conversion path — it stays relabel-only until
  a different rate source covering it is chosen, which is a separate
  decision.
