# App Review — "Should fix before submitting" items

**Tracking:** [#168](https://github.com/Koin-App-Official/pignify/issues/168)
**Branch:** `fix/issue-168-app-review-should-fix` (to be created off `feat/issue-166-app-review-blockers`)
**Source:** the "Piggy App Store Readiness" audit — the five yellow **Should fix** findings.
The three red **Blocker** findings are handled separately in
[APP_REVIEW_BLOCKERS.md](./APP_REVIEW_BLOCKERS.md) / [#166](https://github.com/Koin-App-Official/pignify/issues/166).

---

## Phase 0 — Audit verification (done before planning; no code)

The audit ran against commit `e82863d` on `fix/issue-164-android-birthdate-confirm-button`.
Two of its five findings do not survive contact with the current tree, and one is materially
worse than described. Every claim below was re-checked by reading the source; the phases that
follow are scoped to what is *actually* true today, not to the report verbatim.

| # | Audit finding | Verified status | Consequence for this plan |
|---|---|---|---|
| 1 | Reviewer demo accounts "are still placeholders" | **Mostly wrong.** `apple@example.com` / `google@example.com` are deliberate real Appwrite accounts on the RFC 2606 documentation domain, created, seeded and verified live under [#148](https://github.com/Koin-App-Official/pignify/issues/148) (see [REVIEWER_DEMO_LOGIN.md](./REVIEWER_DEMO_LOGIN.md) Phase 2/7). Entitlements are `status: "active"`, `current_period_end: 2036-08-23` — permanently ungated. | Phase 5 shrinks to a re-verification pass + the review-notes handoff. No code. |
| 2 | `"Reset All Data (Demo)"` ships in all four locales | **Correct.** `en`/`hu`/`de` say `(Demo)`, `pl` says `(demo)`. | Phase 1, as written. |
| 3 | "Simulate payment" is one missing env var from being live | **Worse than stated.** `startCheckout` returns `'unavailable'` for *five* reasons ([billing.ts:93-117](../src/lib/billing.ts)) — missing env var, missing `userId`, n8n returning no url, `Linking.canOpenURL` false, **and any thrown error incl. network failure**. It is reachable in a production build today whenever the n8n call fails. There is also a **second, unreported site**: the add-on purchase in `app/(tabs)/coach.tsx:186-191`. | Phase 2, widened to both sites and to fixing the misleading production copy. |
| 4 | Dev-server strings ship in every build | **Correct.** [app.json](../app.json) has no environment branch at all — it is static JSON, there is no `app.config.js`. `expo-dev-client`'s own plugin does **not** re-add these keys (checked `node_modules/expo-dev-client/plugin/build/`), so they cannot simply be deleted without losing local-network dev discovery. | Phase 3 — introduce `app.config.js` rather than delete. |
| 5 | "VoiceOver is effectively unsupported… tab bar icons unlabeled" | **Partly wrong, partly understated.** The **tab bar is already accessible**: `@react-navigation/bottom-tabs` synthesises `"Home, tab, 1 of 5"` from `options.title` on iOS ([BottomTabBar.tsx:429-434](../node_modules/@react-navigation/bottom-tabs/src/views/BottomTabBar.tsx)), and all five screens set `title`. The count of "four accessibility props" is stale — there are now ~20 across `button.tsx`, `AiConsentModal`, `BillingTerms`, `PlanGate`. But a scripted sweep finds **36 genuinely unlabeled interactive elements**, more than the report's list. | Phase 4 + Phase 5, scoped from the real scan, with the tab-bar item dropped. |

**Baseline at planning time:** `npm run test` → **394 passed / 19 files**; branch clean at `b884578`.
(The report's "385 tests across 18 files" predates the #166 work.)

### The 36 unlabeled controls (scripted scan, verified by reading each site)

Interactive elements (`TouchableOpacity` / `Pressable` / `Button`) with no `accessibilityLabel`,
no `label` prop, and no `<Text>` descendant to fall back on:

| Group | Count | Sites |
|---|---|---|
| PinPad `Key` (one shared component → 12 rendered keys) | 1 | `src/components/auth/PinPad.tsx:130` |
| Modal / sheet close & cancel buttons | 11 | `AddExpenseModal:50`, `AddSavingsModal:65`, `DeepAnalysisConfirmModal:45`, `UpgradeModal:59`, `ui/calendar-modal:110`, `ui/picker-modal:90`, `ui/currency-convert-modal:57`, `auth/PinCreationFlow:190`, `app/change-pin:106`, `app/delete-account:124`, `app/delete-account:154`, `app/enable-biometric:102` |
| Icon-only back `Button`s (onboarding flow) | 8 | `app/onboarding.tsx:651,667,683,705,728,755,783,828` |
| Icon-only back `Button`s (goal creation) | 4 | `app/(tabs)/goals.tsx:343,379,454`, `src/components/ContributionStep.tsx:249` |
| Back chevrons / arrows | 4 | `app/settings.tsx:265`, `app/plans.tsx:232`, `app/downgrade-selection.tsx:96`, `auth/LoginGate.tsx:163` |
| FABs | 3 | `app/(tabs)/goals.tsx:499` (add goal), `app/(tabs)/profile.tsx:313` (settings), `app/settings.tsx:489` (close) |
| Inline confirm (✓) buttons | 2 | `app/(tabs)/profile.tsx:157` (save name), `app/(tabs)/profile.tsx:221` (save income) |
| Coach send button | 1 | `app/(tabs)/coach.tsx:514` |
| Backdrop scrim (should be *hidden*, not labelled) | 1 | `src/components/animation/BottomSheet.tsx:149` |

Plus one non-interactive gap the report names: **`ProgressRing`** (`src/components/ProgressRing.tsx`,
used at `app/(tabs)/index.tsx:573` and `app/(tabs)/goals.tsx:221`) conveys progress purely visually.

**Why `Button` is the worst offender:** [button.tsx:138-148](../src/components/ui/button.tsx) sets
`accessible` on the wrapper and `accessibilityLabel={accessibilityLabel ?? label}`. When a caller
passes `children` (an icon) instead of `label`, the wrapper collapses into a single a11y element
with **no name at all** — VoiceOver announces a bare "button". That is 13 of the 36.

---

## Phase 1 — Remove "(Demo)" from the reset button

Guideline 2.2 / 2.3.1. Smallest, most isolated change; done first so the branch has a green
commit immediately.

- [x] `en`: `"Reset All Data (Demo)"` → `"Reset All Data"`
- [x] `pl`: `"Resetuj wszystkie dane (demo)"` → `"Resetuj wszystkie dane"`
- [x] `hu`: `"Összes adat visszaállítása (Demo)"` → `"Összes adat visszaállítása"`
- [x] `de`: `"Alle Daten zurücksetzen (Demo)"` → `"Alle Daten zurücksetzen"`
- [x] Grep the whole tree for any other user-visible `Demo` / `demo` string
      (`grep -rni "demo" src/lib/i18n/locales/`) and confirm nothing else leaks — the only hit is
      a false-positive substring match inside `"upgradeModal"` (`...gradeMOdal` contains `demo`
      case-insensitively), confirmed harmless.

**Files to modify**

| File | Change |
|---|---|
| [src/lib/i18n/locales/en/profile.json](../src/lib/i18n/locales/en/profile.json):30 | drop ` (Demo)` from `reset.button` |
| [src/lib/i18n/locales/pl/profile.json](../src/lib/i18n/locales/pl/profile.json):30 | drop ` (demo)` from `reset.button` |
| [src/lib/i18n/locales/hu/profile.json](../src/lib/i18n/locales/hu/profile.json):30 | drop ` (Demo)` from `reset.button` |
| [src/lib/i18n/locales/de/profile.json](../src/lib/i18n/locales/de/profile.json):30 | drop ` (Demo)` from `reset.button` |

**Phase complete when:**
- [x] All four `reset.button` values are free of any "demo" parenthetical.
- [x] `grep -rni "demo" src/lib/i18n/locales/` returns nothing user-visible (one false-positive
      substring match inside `upgradeModal`, not a real string).
- [x] `npm run test` — 394/394, in particular `locales.test.ts` key parity still green
      (values changed, key sets did not, so parity is expected to be untouched).
- [x] `npm run typecheck` clean.

---

## Phase 2 — Make "Simulate payment" unreachable in release builds

Guideline 2.3.1. Two call sites, not one, and a copy problem the audit did not see.

### The problem restated precisely

`startCheckout` / `startAddonCheckout` collapse five distinct failure modes into
`{ status: 'unavailable' }`. Both callers treat that single value as "the build has no billing
configured" and offer a button that grants the entitlement locally for free. In a production
build with `EXPO_PUBLIC_N8N_BILLING_URL` correctly set, a plain **network failure** therefore
shows a reviewer a dialog titled *"Checkout not configured"* with a *"Simulate payment"* button
that upgrades them. Gating on `__DEV__` alone would fix the cheat but leave production showing
"Checkout not configured" with only a Cancel button — a dead end with wrong copy.

So the branch has to split three ways, reusing the pattern
[PlanGate.tsx:219](../src/components/auth/PlanGate.tsx) already uses:

```
result.status === 'unavailable'
  ├── __DEV__ && !isBillingConfigured()  → dev-only simulate alert (unchanged copy)
  └── otherwise                          → "We couldn't open checkout…" + support email
```

`__DEV__` is already an established idiom here ([logger.ts:16](../src/lib/logger.ts),
[i18n/index.ts:192](../src/lib/i18n/index.ts)) and is compile-time-false in release bundles,
so the simulate branch cannot exist in a shipped binary.

### Work

- [ ] `app/plans.tsx` — import `isBillingConfigured` from `@/lib/billing`; restructure the
      `result.status === 'unavailable'` branch per the split above.
- [ ] `app/(tabs)/coach.tsx` — same restructure in `buyMore()` for the add-on purchase.
- [ ] Add production-path copy. Follow the wording already approved for
      `planGate.locked.checkoutFailed` and interpolate `SUPPORT_EMAIL` from
      [src/lib/linking.ts:9](../src/lib/linking.ts):
      - `plans.json` → `checkoutFailedTitle`, `checkoutFailedBody`
      - `coach.json` → `checkoutFailedTitle`, `checkoutFailedBody`
- [ ] Keep `checkoutNotConfigured*` / `simulatePayment` / `simulatePurchase` keys in place —
      they are still reached in dev, and deleting them would break `locales.test.ts` parity
      for no gain.
- [ ] Confirm no test imports either screen (verified: the 19 test files are all under
      `src/lib/**`; only `contentParity.test.ts` reads `app/` — and only as *string lists*,
      not by importing the modules), so `__DEV__` being undefined under vitest cannot bite.

**Files to modify**

| File | Change |
|---|---|
| [app/plans.tsx](../app/plans.tsx):181-192 | three-way branch; new import |
| [app/(tabs)/coach.tsx](../app/(tabs)/coach.tsx):180-194 | three-way branch; new import |
| [src/lib/i18n/locales/{en,pl,hu,de}/plans.json](../src/lib/i18n/locales/en/plans.json) | +2 keys × 4 locales |
| [src/lib/i18n/locales/{en,pl,hu,de}/coach.json](../src/lib/i18n/locales/en/coach.json) | +2 keys × 4 locales |

**Phase complete when:**
- [ ] `grep -n "simulatePayment\|simulatePurchase" app/` shows every remaining occurrence inside
      a `__DEV__` guard.
- [ ] Reading the diff confirms a release bundle (`__DEV__ === false`) can reach only the
      `checkoutFailed*` path, never `applyChange()` / `setAddonMessageBalance()` from an alert.
- [ ] All four locales have identical key sets for `plans` and `coach`
      (`locales.test.ts` proves this).
- [ ] `npm run typecheck` clean; `npm run test` — 394/394.

---

## Phase 3 — Move development-server Info.plist keys out of production builds

Info.plist hygiene. The audit's suggested fix ("move into an `app.config.js` branch on
`EAS_BUILD_PROFILE`") is right; its alternative ("or drop them — `expo-dev-client` adds what it
needs on its own") is **wrong for this project** — `expo-dev-client`'s config plugin contains no
`NSLocalNetworkUsageDescription` / `NSBonjourServices` injection (grepped
`node_modules/expo-dev-client/plugin/build/`). Deleting the keys would break local-network Metro
discovery on physical dev devices. So: branch, don't delete.

### Approach

Expo reads `app.config.js` in preference to `app.json`, and passes the parsed `app.json` in as
`{ config }`. That lets this stay a **thin, additive** file rather than a rewrite: `app.json`
keeps every static value, and `app.config.js` owns only the environment-dependent part.

```js
// app.config.js
const IS_PRODUCTION_BUILD = process.env.EAS_BUILD_PROFILE === 'production';
```

Chosen predicate deliberately: EAS Build sets `EAS_BUILD_PROFILE`; a local
`npx expo run:ios` / `expo prebuild` sets nothing, so the default (**dev keys present**) is the
developer-friendly one and only the App Store rail strips them. The inverse
(`=== 'development'`) would silently break every local build.

- [ ] Create [app.config.js](../app.config.js) exporting `({ config }) => ({ ... })`.
- [ ] Remove `NSLocalNetworkUsageDescription` and `NSBonjourServices` from
      [app.json](../app.json)'s `ios.infoPlist`; re-add them from `app.config.js` only when
      `!IS_PRODUCTION_BUILD`.
- [ ] Leave `CADisableMinimumFrameDurationOnPhone`, `CFBundleLocalizations` and
      `ITSAppUsesNonExemptEncryption` in `app.json` — they belong in every build.
- [ ] Comment the file in the house style (the *why*, like
      [plugins/withoutPushEntitlement.js](../plugins/withoutPushEntitlement.js) does), naming
      the guideline and the reason the keys can't simply be deleted.
- [ ] **Bundled Note-severity cleanup, same block:** de-duplicate `NSBonjourServices`
      (`_expo._tcp`, `_metro._tcp` listed twice) and `CFBundleLocalizations`
      (`en, pl, hu, de` listed twice). Restructuring these arrays while knowingly leaving them
      doubled would be worse than fixing them; called out explicitly because it is *not* one of
      the five yellow items.
- [ ] Verify the resolved config both ways:
      `npx expo config --type public` and
      `EAS_BUILD_PROFILE=production npx expo config --type public`, diffing `ios.infoPlist`.

**Files to modify**

| File | Change |
|---|---|
| [app.config.js](../app.config.js) | **new** — `({ config }) =>` wrapper, dev-only plist keys |
| [app.json](../app.json) | remove the two dev keys; de-duplicate the two arrays |

**Phase complete when:**
- [ ] `EAS_BUILD_PROFILE=production npx expo config --type public` shows an `ios.infoPlist` with
      **no** `NSLocalNetworkUsageDescription` and **no** `NSBonjourServices`.
- [ ] `npx expo config --type public` (no env var) shows both present, each array containing
      each value exactly once.
- [ ] `CFBundleLocalizations` is `["en","pl","hu","de"]` — four entries, not eight — in both.
- [ ] `bundleIdentifier`, `plugins`, `extra.eas.projectId` and every other key are byte-identical
      between the two resolutions (diff the two outputs to prove the wrapper is otherwise inert).
- [ ] `npm run typecheck` clean; `npm run test` — 394/394.

---

## Phase 4 — Accessibility foundations (strings + shared primitives)

Guideline 4.0. Split from Phase 5 so the shared components — which account for the majority of
rendered controls — land and can be verified on their own.

### String strategy

One new `a11y` block in the **`common`** namespace, referenced cross-namespace as
`t('common:a11y.close')`. i18next's default `nsSeparator: ':'` is in effect
([i18n/index.ts](../src/lib/i18n/index.ts) does not override it), so any component can reach it
without changing its `useTranslation(...)` call. `missingKeyHandler` throws in `__DEV__`, so a
typo'd key is a loud dev crash, not a silent raw string.

- [ ] Add to `common.json` (× 4 locales, identical key sets):
      `a11y.close`, `a11y.back`, `a11y.cancel`, `a11y.save`, `a11y.addGoal`, `a11y.openSettings`,
      `a11y.sendMessage`, `a11y.digit` (`"{{digit}}"`), `a11y.deleteDigit`,
      `a11y.unlockWithFaceId`, `a11y.unlockWithFingerprint`, `a11y.pinProgress`
      (`"{{filled}} of {{length}} digits entered"`), `a11y.goalProgress`
      (`"{{percent}} percent of goal reached"`).
      Exact key list to be finalised while implementing; every key added must be added to all
      four files in the same commit or `locales.test.ts` fails.

### Shared primitives

- [ ] **`PinPad`** — the highest-value fix; a keypad VoiceOver cannot read is a real lockout.
      Add `useTranslation('common')`; give `Key` an `accessibilityRole="button"` and an
      `accessibilityLabel` prop; pass `t('a11y.digit', { digit: k })` for the ten digit keys,
      `t('a11y.deleteDigit')` for backspace, and the Face ID / fingerprint label for the
      biometric key (branch on `biometricKind`). Add `accessibilityState={{ disabled }}`.
- [ ] **`PinDots`** — currently a row of anonymous `View`s. Wrap with `accessible`,
      `accessibilityRole="progressbar"`, `accessibilityLabel={t('a11y.pinProgress', …)}` so
      entry progress is announced. (Needs `useTranslation` in the same file.)
- [ ] **`Button`** — add a dev-only guard: when neither `label` nor `accessibilityLabel` is
      given, `__DEV__ && console.warn(...)` naming the component, so future icon-only buttons
      cannot silently regress. No runtime behaviour change in release.
- [ ] **`BottomSheet`** scrim (`:149`) — this must be **hidden**, not labelled:
      `importantForAccessibility="no"` + `accessibilityElementsHidden` so VoiceOver does not
      offer a full-screen unnamed button above the sheet's own content.
- [ ] **`ProgressRing`** — accept an optional `accessibilityLabel`; when present, set
      `accessible` + `accessibilityRole="progressbar"` +
      `accessibilityValue={{ min: 0, max: 100, now: progress }}` on the outer `View` and mark
      the `Svg` wrapper `accessibilityElementsHidden`. Wire the two call sites
      (`app/(tabs)/index.tsx:573`, `app/(tabs)/goals.tsx:221`) with
      `t('common:a11y.goalProgress', { percent: Math.round(pct) })`.
      **Care:** setting `accessible` collapses children into one node — check on-device that the
      amount/label rendered inside the ring is still announced, and if it is not, prefer
      labelling a sibling wrapper over hiding the children.

**Files to modify**

| File | Change |
|---|---|
| [src/lib/i18n/locales/{en,pl,hu,de}/common.json](../src/lib/i18n/locales/en/common.json) | new `a11y` block × 4 |
| [src/components/auth/PinPad.tsx](../src/components/auth/PinPad.tsx) | roles + labels on `Key`, `PinDots`; add `useTranslation` |
| [src/components/ui/button.tsx](../src/components/ui/button.tsx) | `__DEV__` unlabeled-button warning |
| [src/components/animation/BottomSheet.tsx](../src/components/animation/BottomSheet.tsx):149 | hide the scrim from a11y |
| [src/components/ProgressRing.tsx](../src/components/ProgressRing.tsx) | optional label + `progressbar` role |
| [app/(tabs)/index.tsx](../app/(tabs)/index.tsx):573 | pass ring label |
| [app/(tabs)/goals.tsx](../app/(tabs)/goals.tsx):221 | pass ring label |

**Phase complete when:**
- [ ] Every one of the twelve `PinPad` keys has a role and a translated name; the biometric key's
      name matches the icon actually shown (Face ID vs. fingerprint).
- [ ] `locales.test.ts` passes — all four `common.json` files have identical key sets.
- [ ] `npm run typecheck` clean; `npm run test` — 394/394.
- [ ] Manual iOS Simulator pass with VoiceOver on the lock screen: every key announces, and the
      dots announce progress. **User-verified** — per standing preference, visual/interaction
      checks are the user's, not simulator-driven by me.

---

## Phase 5 — Accessibility sweep (screen-level controls)

The remaining 23 sites from Phase 0's table. Mechanical, but grouped so each commit is reviewable.

- [ ] **Modal / sheet close & cancel buttons (11)** — `accessibilityRole="button"` +
      `accessibilityLabel={t('common:a11y.close')}` (or `a11y.cancel` where the control cancels a
      flow rather than dismissing a sheet: `PinCreationFlow:190`).
      Files: `AddExpenseModal:50`, `AddSavingsModal:65`, `DeepAnalysisConfirmModal:45`,
      `UpgradeModal:59`, `ui/calendar-modal:110`, `ui/picker-modal:90`,
      `ui/currency-convert-modal:57`, `auth/PinCreationFlow:190`, `app/change-pin:106`,
      `app/delete-account:124`, `app/delete-account:154`, `app/enable-biometric:102`.
      Where the control is `disabled` while busy, also pass `accessibilityState={{ disabled }}`
      (`DeepAnalysisConfirmModal`, `currency-convert-modal`, `delete-account:124`).
- [ ] **Icon-only back `Button`s (12)** — `accessibilityLabel={t('common:a11y.back')}`.
      Files: `app/onboarding.tsx:651,667,683,705,728,755,783,828`,
      `app/(tabs)/goals.tsx:343,379,454`, `src/components/ContributionStep.tsx:249`.
- [ ] **Back chevrons / arrows (4)** — role + `a11y.back`.
      Files: `app/settings.tsx:265`, `app/plans.tsx:232`, `app/downgrade-selection.tsx:96`,
      `auth/LoginGate.tsx:163`.
- [ ] **FABs (3)** — `a11y.addGoal` (`goals:499`), `a11y.openSettings` (`profile:313`),
      `a11y.close` (`settings:489`).
- [ ] **Inline ✓ confirm buttons (2)** — `a11y.save`; `profile:157` (name), `profile:221` (income).
- [ ] **Coach send button (1)** — `a11y.sendMessage` + `accessibilityState={{ disabled: !input.trim() }}`
      (`coach:514`).
- [ ] **Money figures** — the audit asks that amounts "are announced, not spelled".
      `formatCurrency` output (`$1,234`, `1 234 zł`) is already read as a quantity by VoiceOver;
      this is a *verification* item, not a code change. Check the Profile stat row
      (`profile.tsx:186-196`) and the dashboard ring on-device, and only add
      `accessibilityLabel` overrides where an amount is genuinely mis-announced.
      **Do not** pre-emptively wrap every amount.
- [ ] Re-run the scan script from Phase 0 and confirm the unlabeled-control count is 0
      (excluding intentionally-hidden decorative elements).

**Files to modify:** the 23 sites listed above, across
`app/onboarding.tsx`, `app/settings.tsx`, `app/plans.tsx`, `app/change-pin.tsx`,
`app/delete-account.tsx`, `app/enable-biometric.tsx`, `app/downgrade-selection.tsx`,
`app/(tabs)/goals.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/coach.tsx`,
`src/components/AddExpenseModal.tsx`, `src/components/AddSavingsModal.tsx`,
`src/components/DeepAnalysisConfirmModal.tsx`, `src/components/UpgradeModal.tsx`,
`src/components/ContributionStep.tsx`, `src/components/ui/calendar-modal.tsx`,
`src/components/ui/picker-modal.tsx`, `src/components/ui/currency-convert-modal.tsx`,
`src/components/auth/PinCreationFlow.tsx`, `src/components/auth/LoginGate.tsx`.

**Explicitly NOT changed:** `app/(tabs)/_layout.tsx`. The tab bar is already labelled by
React Navigation (Phase 0, row 5). Adding `tabBarAccessibilityLabel` would *replace* the
platform-idiomatic `"Home, tab, 1 of 5"` with a bare `"Home"` — a regression.

**Phase complete when:**
- [ ] The Phase 0 scan script reports **0** unlabeled interactive elements.
- [ ] No new translation key is referenced that does not exist in all four locales
      (`locales.test.ts` + the dev `missingKeyHandler` both enforce this).
- [ ] `npm run typecheck` clean; `npm run test` — 394/394.
- [ ] **User-verified** VoiceOver pass over: onboarding back navigation, goal creation, a modal
      open/close, the Coach send button, and the Profile save-name flow.

---

## Phase 6 — Reviewer demo accounts: verify, don't rebuild

Guideline 2.1. Per Phase 0, the accounts are real and were verified live on 2026-08-23. What is
left is confirmation that nothing has drifted, plus the handoff the audit correctly flags.
**No code changes in this phase.**

- [ ] Re-read both `entitlements` rows via the Appwrite MCP and confirm they are still
      `status: "active"`, `locked: false`, `current_period_end: 2036-08-23`, `trial_ends_at: null`.
- [ ] Confirm both accounts still have a `users` row and at least one `goals` row.
- [ ] **Gap the audit names that #148 did not cover:** the audit asks for "seeded goals, savings
      history, and an active entitlement". #148 seeded goals and entitlements but **not deposit
      history** — a reviewer sees goals at 0% with an empty activity list. Decide whether to seed
      a few deposits (makes the app look alive, ~15 min of MCP writes) or accept it.
      → **Recommendation: seed them.** An empty dashboard invites the reviewer to go looking for
      the paywall, which is exactly the surface with an unresolved 3.1.1 blocker.
- [ ] Known limitation to re-check, from
      [REVIEWER_DEMO_LOGIN.md](./REVIEWER_DEMO_LOGIN.md): on a fresh device only *goals* hydrate —
      `account.name` / `account.email` do not, so the reviewer's Profile tab shows a blank name.
      Confirm whether that is still true and whether it is worth fixing before submission.
- [ ] Re-verify the password path once on a **production-profile** build, not development
      (the audit asks for this specifically; #148 verified on `expo run:ios`, a development
      build). Requires `eas build --profile production` + TestFlight or a local release build.
- [ ] Draft the App Store Connect review-notes text, including the audit's PIN warning:
      *after signing in, the app asks you to create a 6-digit device PIN — choose any six digits;
      it is a local device lock, not an account password.*
      Store the draft **in the issue**, never in this repo (credentials must not be committed).

**Files to modify:** none. This is Appwrite data + App Store Connect.

**Phase complete when:**
- [ ] Both demo accounts confirmed active, ungated, and populated (goals + deposits if seeded).
- [ ] The password login has been exercised at least once on a production-profile build.
- [ ] Review-notes text (credentials + PIN warning) is written and attached to
      [#168](https://github.com/Koin-App-Official/pignify/issues/168) as a comment, ready to paste
      at submission time.
- [ ] Any decision to *not* seed deposits / *not* fix the blank-name gap is recorded here with a
      reason, rather than left implicit.

---

## Phase 7 — Verification and close-out

- [ ] `npm run typecheck` — clean.
- [ ] `npm run test` — 394/394 (or higher if any phase adds tests; never lower).
- [ ] `npm run check:bundle-size` — no regression (Phase 4/5 add strings and props only).
- [ ] `EAS_BUILD_PROFILE=production npx expo config --type public` re-checked one final time
      after all phases, to confirm Phase 3 was not undone by a later edit.
- [ ] Full-tree grep for release-build leaks:
      `grep -rn "Simulate\|(Demo)\|development server" app src languages app.json app.config.js`
      — every hit is either inside `__DEV__`, inside a non-production config branch, or a comment.
- [ ] Update every checkbox in this file to reflect what actually happened, including anything
      skipped and why (house convention — see the other `implementations/*.md`).
- [ ] Per [github-issues-prs](../GITHUB_ISSUES_GUIDE.md) Phase 3: tick the issue checklist,
      close [#168](https://github.com/Koin-App-Official/pignify/issues/168) with a completion
      comment, then open the PR with `Closes #168`.

**Phase complete when:**
- [ ] Typecheck, tests and bundle-size are all green, and the numbers are written down here.
- [ ] This document has no stale `[ ]` describing work that was in fact done, and no `[x]`
      describing work that was not.
- [ ] Issue #168 is closed with a completion comment and the PR is open against
      `feat/issue-166-app-review-blockers` (or `main`, if #166 has merged by then).

---

## Explicitly out of scope

- **Guideline 3.1.1 (IAP / payment rail).** Still deferred pending the web billing dashboard —
  see [APP_REVIEW_BLOCKERS.md](./APP_REVIEW_BLOCKERS.md) Phase 6. Phase 2 here deliberately does
  not touch the checkout *rail*, only the failure path around it.
- **The audit's Note-severity items** — stale `ios/` directory, `ITSAppUsesNonExemptEncryption`
  legal confirmation, the iPad `supportsTablet` decision, `expo-web-browser` for legal links,
  dark mode, `autoIncrement` build numbers. Not requested. The one exception is the duplicated
  `app.json` arrays, folded into Phase 3 because that phase rewrites those exact arrays.
- **A full WCAG pass** — Dynamic Type scaling, contrast ratios, focus order, reduced-motion.
  Phase 4/5 deliver *names and roles for every control*, which is what Guideline 4.0 and the
  audit ask for; they do not claim full accessibility conformance.
- **New automated tests.** No existing test renders a component (all 19 suites are pure-logic,
  under `src/lib/`), and adding a React Native rendering harness to assert `accessibilityLabel`
  props would be a larger change than every fix in this plan combined. The guardrails used
  instead are `locales.test.ts` key parity, the dev `missingKeyHandler` throw, the new
  `__DEV__` unlabeled-`Button` warning, and re-running the Phase 0 scan script.

---

## Appendix — the unlabeled-control scan script

Throwaway tooling, kept here so Phase 0's "36" and Phase 5's "0" are both reproducible rather
than asserted. Run with `node scan.mjs` from a scratch directory. It is deliberately *not*
committed to `scripts/` — it is a one-off audit aid, not part of the build.

It finds `TouchableOpacity` / `Pressable` / `Button` / `TouchableWithoutFeedback` /
`TouchableHighlight` elements that have no `accessibilityLabel`, no `label` prop, and no `<Text>`
or `<Trans>` descendant to be named by. Brace-aware opening-tag parsing matters: a naive scan for
the closing `>` breaks on every `onPress={() => …}` arrow and produces false positives.

```js
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/mateuszrochowski/My-Programs/apps/piggy';
const roots = [`${ROOT}/app`, `${ROOT}/src`];
const files = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
}
roots.forEach(walk);

// Find the '>' that closes the opening tag, ignoring '>' inside {expressions} and strings.
function endOfOpenTag(src, start) {
  let brace = 0, inStr = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === inStr && src[i - 1] !== '\\') inStr = null; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '{') brace++;
    else if (c === '}') brace--;
    else if (c === '>' && brace === 0) return i;
  }
  return -1;
}

const TAGS = ['TouchableOpacity', 'Pressable', 'Button', 'TouchableWithoutFeedback', 'TouchableHighlight'];
const out = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const tag of TAGS) {
    const re = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
    let m;
    while ((m = re.exec(src))) {
      const start = m.index;
      const tagEnd = endOfOpenTag(src, start);
      if (tagEnd < 0) continue;
      const openTag = src.slice(start, tagEnd + 1);
      let body = '';
      if (src[tagEnd - 1] !== '/') {
        let idx = tagEnd + 1, depth = 1, end = -1;
        while (idx < src.length && depth > 0) {
          const no = src.indexOf(`<${tag}`, idx), nc = src.indexOf(`</${tag}>`, idx);
          if (nc === -1) break;
          if (no !== -1 && no < nc) { depth++; idx = no + 1; }
          else { depth--; idx = nc + tag.length + 3; if (depth === 0) end = nc; }
        }
        body = end === -1 ? '' : src.slice(tagEnd + 1, end);
      }
      const named = /accessibilityLabel/.test(openTag)
        || /[\s{]label=/.test(openTag)
        || /<(Text|Trans)[\s>]/.test(body);
      if (!named) {
        const line = src.slice(0, start).split('\n').length;
        out.push(`${f.replace(ROOT + '/', '')}:${line}\t${openTag.replace(/\s+/g, ' ').slice(0, 110)}`);
      }
    }
  }
}
out.sort();
console.log(out.join('\n'));
console.log('\nTOTAL:', out.length);
```

**Known limits:** it cannot see labels applied via spread props or a wrapper component, and it
counts a shared component (e.g. `PinPad`'s `Key`) once regardless of how many instances render.
Treat its output as a worklist to read, not as a verdict — every one of the 36 sites in Phase 0
was opened and confirmed by hand.
