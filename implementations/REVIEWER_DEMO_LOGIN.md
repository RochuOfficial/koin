# Reviewer Demo Login — Password Fallback for App Store / Play Store Demo Accounts

**Tracking:** [#148](https://github.com/Koin-App-Official/pignify/issues/148)
**Branch:** `feat/issue-148-reviewer-demo-login`

## Problem

Apple and Google reviewers need to sign in to test the app, but the only account
auth is Appwrite Email OTP (`src/lib/auth.ts`) — reviewers have no inbox access
to receive the code. Appwrite has no way to pin a fixed OTP for Email OTP (only
Phone Auth has a "mock OTP" feature, confirmed via direct Appwrite API
inspection). The fix: two whitelisted demo accounts (Apple, Google) get a
static email+password login path instead of OTP. Every other user is
completely unaffected — the OTP flow is not touched.

## Architecture recap (from reading the current code)

- `src/lib/auth.ts` — `verifyEmailOtp()` calls `account.createSession()`, then
  `resolveSessionSecret()` recovers the real session token from the native
  cookie jar (Appwrite always returns `secret: ""` in the response body —
  documented at the top of the file). Returns `{userId, secret}`.
- `account.createEmailPasswordSession({email, password})` (confirmed present
  in `node_modules/react-native-appwrite/types/services/account.d.ts:609`)
  returns the exact same `Models.Session` shape as `createSession` — meaning
  it has the **same empty-`secret` behavior** and needs the same
  `resolveSessionSecret()` treatment. This is the one non-obvious risk in the
  whole plan; Phase 3 verifies it explicitly rather than assuming it.
- `src/components/auth/LoginGate.tsx` — email → OTP code, two-stage UI, calls
  `useAuthLock().onLoggedIn(userId, secret)` on success. This is the screen
  that needs the password fallback, gated on a whitelist check of the typed
  email.
- `app/welcome.tsx` and `app/onboarding.tsx` already have a working "Already
  have an account? Sign in" link (`requestLogin()`) that reaches `LoginGate`
  from a fresh install, before onboarding — this is how reviewers get to the
  login screen at all. **No change needed here.**
- Once logged in, `authLock.onLoggedIn()` → `hydrateGoalsIfEmpty()` pulls the
  account's goals from the server automatically on a fresh device — this
  already-existing mechanism is what will show reviewers a populated goal, as
  long as the demo account has a `goals` row server-side (Phase 2).
- `account.email` / `account.name` are **not** hydrated the same way (only
  goals are) — a pre-existing gap in the "existing account, new device" path,
  not something this plan fixes. Reviewers will see a real goal and dashboard,
  but the Profile tab's name/email fields will be blank. Documented as a known
  limitation (Phase 7), not a blocker.
- Config convention in this repo: `EXPO_PUBLIC_*` env vars, read directly with
  `?? fallback` in the module that needs them (see `appwrite.ts`, `billing.ts`)
  — no central constants file. `eas.json` bakes these directly into build
  profiles since none of the existing ones are secret. The two demo **emails**
  are not secrets either (only the passwords are, and passwords never live in
  the client) — so they follow the same plaintext-env-var convention.

---

## Phase 1 — Config & whitelist foundation

- [x] Add `EXPO_PUBLIC_REVIEWER_DEMO_EMAILS` env var: comma-separated list of
      whitelisted demo emails (e.g. `apple-review@piggnify.com,google-review@piggnify.com`).
      Empty/unset means the feature is fully inert (no email will ever match).
- [x] Add `isReviewerDemoEmail(email: string): boolean` — trims + lowercases
      both sides before comparing, splits the env var on commas, filters empty
      entries. Lives in `src/lib/auth.ts` next to the other auth primitives
      (not a new file — there's no constants-file convention to extend, and
      this is one function tightly coupled to the login flow it gates).
- [x] Document the env var in the file header comment block (mirrors the
      existing `EXPO_PUBLIC_APPWRITE_*` doc block style).

**Modified files:**
- [src/lib/auth.ts](../src/lib/auth.ts) — add `isReviewerDemoEmail()`, update header doc comment

**Phase 1 is done when:**
- [x] `isReviewerDemoEmail()` exists, is exported, and has no runtime dependency on
  anything beyond `process.env.EXPO_PUBLIC_REVIEWER_DEMO_EMAILS`.
- [x] With the env var unset, `isReviewerDemoEmail('anything@example.com')` returns
  `false` (feature is a strict opt-in, never accidentally active) — confirmed by
  reading the implementation: an unset var is `''`, `''.split(',')` yields `['']`,
  filtered to `[]` by `.filter(Boolean)`, so `.includes(...)` is always `false`.
- [x] `npm run typecheck` is clean (one pre-existing implicit-`any` needed an
  explicit `(e: string)` annotation on the `.map()` callback — fixed inline).
- [x] `npm run test` — 356/356 passing, unchanged from before this phase.

---

## Phase 2 — Backend: create the two demo accounts + provision their data

Uses the Appwrite MCP connection directly (no new script file — this is a
one-time provisioning action per account, not a repeatable schema migration
like `scripts/appwrite/setup.mjs`).

- [x] Decide the two demo email addresses. User-confirmed: `apple@example.com`
      and `google@example.com` — deliberately on the reserved `example.com`
      documentation domain (RFC 2606); confirmed fine because password login
      never sends mail to either address.
- [x] Generate two strong random passwords (20 chars, mixed case/digits/symbols,
      `crypto.randomBytes`-backed). Reported once, directly in chat — never
      written to a file in this repo.
- [x] Create both Appwrite Auth accounts via the Appwrite MCP (`account_create`):
      - Apple Reviewer — `$id 6a8a9a2fe178f05e6f0e`, `apple@example.com`
      - Google Reviewer — `$id 6a8a9a345c0771b9a2d5`, `google@example.com`
- [x] Provision each account's app data by POSTing to the **existing,
      unmodified** onboarding webhook
      (`https://n8n.piggnify.com/webhook/claude-onboarding`) with that
      account's real `userID`, a realistic demo goal, and a plausible profile
      — mirrors exactly the payload shape in `app/onboarding.tsx`'s
      `provisionAccount()`. Wrote the `users` row, a `goals` row
      ("New Laptop" $1,500 / "Vacation Fund" $2,000), and an `entitlements`
      row via the workflow's existing trial-grant step.
- [x] Verify server-side: `users` row exists for both `$id`s with the expected
      email — confirmed via `tables_db_list_rows`. `goals` row exists for
      both — confirmed. Entitlements row exists for both — confirmed, but see
      the finding below.

**Finding — the default 14-day trial was wrong for permanent demo accounts,
fixed:** the onboarding webhook grants the same 14-day trial it gives every
real signup (`status: "trialing"`, `trial_ends_at: now + 14d`, confirmed via
`n8n/README.md` and by reading the actual written rows). `planGate.ts`'s
`planGateReason()` treats a `trialing` status whose `trial_ends_at` has passed
as `locked` once the (live, not-in-this-repo) `CLAUDE_entitlements_get`
workflow re-evaluates it — and `lockoutEnforced()` is structurally *on*
whenever billing is configured, which it is
(`EXPO_PUBLIC_N8N_BILLING_URL` is set in `eas.json`). App review can sit in
queue for weeks, and the same demo account is often reused across many future
review cycles — a 14-day clock would silently lock reviewers out mid-review at
some unpredictable future point. Fixed by updating both `entitlements` rows
directly via `tables_db_update_row`: `status: "active"` (not `"trialing"`),
`current_period_end: "2036-08-23"`, `trial_ends_at: null`. `status: "active"`
makes `planGateReason()` return `null` unconditionally (neither the
`expired`/`canceled` branch nor the `trialing` branch match), so these two
accounts are now permanently ungated regardless of how much time passes.
Verified by re-reading both rows back after the update.

Also checked: the `users` table's `free_trial`/`days_left` columns (visible on
both provisioned rows) are dead legacy columns — grepped the entire app/n8n
source tree, zero references anywhere. Left untouched; they don't affect
anything.

**Modified files:** none in the repo — this phase is pure Appwrite/n8n data,
performed live via the Appwrite MCP and a webhook call.

**Phase 2 is done when:**
- [x] Both Appwrite Auth accounts exist and were confirmed via the MCP
  (`account_create`'s own response) to have `email` set and `status: true`.
- [x] Both accounts have a `users` row, a `goals` row, and an `entitlements`
  row with `status: "active"`, `locked: false`, confirmed by reading those
  rows back via the Appwrite MCP after the trial-length fix above.
- [x] The two passwords have been shared with the user in chat and nowhere
  else in this session's file output.

---

## Phase 3 — App: password-session primitive in `auth.ts`

- [x] Add `signInWithPassword(email: string, password: string): Promise<VerifiedSession>`,
      structured identically to `verifyEmailOtp()`:
      1. `const session = await account.createEmailPasswordSession({ email, password })`
      2. `const secret = await resolveSessionSecret(session.secret)` — reuse the
         existing helper as-is; do not duplicate its retry/cookie logic.
      3. `applySession(secret)`
      4. return `{ userId: session.userId, secret }`
- [x] Let Appwrite's own errors (wrong password → 401, unknown user → 401)
      propagate as `AppwriteException` — no bespoke error mapping needed, the
      caller (Phase 4) already has a generic "sign-in failed" catch-all.
- [x] Do **not** add any whitelist check inside `signInWithPassword()` itself —
      keep it a plain, generic password-login primitive; the whitelist gating
      belongs entirely in the UI layer (Phase 4), so this function stays
      reusable/testable in isolation and the auth module doesn't need to know
      about "demo" as a concept.

**Modified files:**
- [src/lib/auth.ts](../src/lib/auth.ts) — add `signInWithPassword()`

**Phase 3 is done when:**
- [x] `signInWithPassword()` compiles and follows the exact same
  secret-recovery/apply-session sequence as `verifyEmailOtp()`.
- [ ] Manually exercised once against one real demo account (from Phase 2) —
  **deferred to Phase 4 on purpose**: this function has no UI hook yet, and
  the cookie-recovery path it depends on (`react-native-nitro-cookies`) is a
  native module that doesn't run under Expo web preview — exercising it there
  would test a different code path (web's cookie fallback, not the native one)
  and give a false signal either way. Phase 4/7's iOS Simulator pass is the
  first point where this is actually verifiable end-to-end.
- [x] `npm run typecheck` is clean.
- [x] `npm run test` — 356/356 passing, unchanged.

---

## Phase 4 — App: `LoginGate` password fallback UI

- [x] Extend `stage` state from `'email' | 'code'` to
      `'email' | 'code' | 'password'`.
- [x] In `sendCode()`: after the existing `isEmailValid` check, branch — if
      `isReviewerDemoEmail(email)`, set `stage('password')` and return
      (no `requestEmailOtp` call, no network request, no email is ever sent
      for these two addresses).
- [x] Add a `password` state string and a `submitPassword()` handler,
      structured like `verify()`:
      - same defensive `clearClientSession()` + `NitroCookies.clearAll()`
        pre-flight (guards the same `user_session_already_exists` failure mode
        documented in `PASSCODE.md`'s Phase 3 amendment — applies to any
        session creation, not just OTP).
      - `const { userId, secret } = await signInWithPassword(email.trim(), password)`
      - same post-login bookkeeping as `verify()`: `if (!onboardingCompleted) updateProfile({ onboardingCompleted: true })` then `onLoggedIn(userId, secret)`.
      - on failure: `SessionSecretUnavailableError` keeps the typed password
        (unlike OTP's code, a password isn't single-use/consumed, so an
        immediate retry is safe and correct); any other failure shows
        `t('login.passwordIncorrect')` and clears the field.
- [x] Add the password-stage JSX block (mirrors the existing `code`-stage
      block): a masked `Input` (`secureTextEntry`), a "Sign in" button wired to
      `submitPassword`, using the same `Button`/`Input` primitives and spacing
      already used by the other stages — no new visual pattern. Went with a
      title+subtitle matching the `email`/`code` stages'
      title+subtitle+field+button shape (`login.enterPassword` /
      `login.enterPasswordSub`) rather than a bare field, for visual
      consistency — this adds 2 more translation keys than originally scoped
      in this plan (5 total, not 3); corrected in Phase 5 below.
- [ ] Optional, low-risk polish: change the email-stage button label to
      `t('continue')` (an existing top-level key, no new string needed) when
      `isReviewerDemoEmail(email)` is true, so the button doesn't say "Send
      code" right before silently not sending one. **Skipped** — the existing
      `code`/`password` stages both lack any "why did the button change"
      affordance already (e.g. no per-stage back button), so this asymmetry
      is consistent with the screen's existing minimalism rather than a gap.

**Modified files:**
- [src/components/auth/LoginGate.tsx](../src/components/auth/LoginGate.tsx)

**Phase 4 is done when:**
- [x] Typing a non-whitelisted email and tapping through still produces the
  exact original OTP flow, byte-for-byte — confirmed by reading the final
  diff: the `email`/`code` stage branches and `verify()`/`sendCode()`'s
  original OTP logic are untouched, only a new early-return branch and a new
  third ternary arm were added.
- [x] Typing one of the two whitelisted demo emails skips straight to a
  password field with no network call until "Sign in" is tapped — confirmed
  by reading `sendCode()`: the `isReviewerDemoEmail` branch returns before any
  `fetch`/SDK call.
- [ ] A correct demo password reaches `onLoggedIn()` and the app unlocks
  (needs_pin_setup, since it's a fresh device) — **not yet run live**; needs
  the iOS Simulator pass in Phase 7 (this is also where Phase 3's deferred
  `resolveSessionSecret()`-for-password-sessions check finally happens).
- [ ] An incorrect password shows an inline error and does not crash or leave
  the client in a half-applied-session state — same deferral as above.
- [x] `npm run typecheck` is clean.
- [x] `npm run test` — 356/356 passing, unchanged.

---

## Phase 5 — i18n: translation keys

New keys under `login` in all four locale files (parity confirmed required —
`en`/`pl`/`hu`/`de` currently have identical `login.*` key sets). **Revised
from 3 to 5 keys** after Phase 4's actual implementation added a
title+subtitle to the password stage for visual parity with the `email`/`code`
stages (see Phase 4 notes):

- `login.enterPassword` — "Enter your password"
- `login.enterPasswordSub` — "Sign in to {{email}}" (interpolated, same
  pattern as the existing `login.codeSentTo`)
- `login.passwordPlaceholder` — "Password"
- `login.signIn` — "Sign in"
- `login.passwordIncorrect` — "Incorrect email or password."

- [x] Add all five keys to [src/lib/i18n/locales/en/auth.json](../src/lib/i18n/locales/en/auth.json)
- [x] Add all five keys (translated) to [src/lib/i18n/locales/pl/auth.json](../src/lib/i18n/locales/pl/auth.json)
- [x] Add all five keys (translated) to [src/lib/i18n/locales/hu/auth.json](../src/lib/i18n/locales/hu/auth.json)
- [x] Add all five keys (translated) to [src/lib/i18n/locales/de/auth.json](../src/lib/i18n/locales/de/auth.json)

**Modified files:**
- `src/lib/i18n/locales/en/auth.json`
- `src/lib/i18n/locales/pl/auth.json`
- `src/lib/i18n/locales/hu/auth.json`
- `src/lib/i18n/locales/de/auth.json`

**Phase 5 is done when:**
- [x] All four locale files have identical `login.*` key sets again — verified
  programmatically (`set` diff of `login` keys across en/pl/hu/de: zero
  missing, zero extra in all three non-English locales) and all four files
  parse as valid JSON.
- [x] `LoginGate.tsx`'s JSX only references keys that exist in `en/auth.json`
  (source of truth) — verified by extracting every `t('login.*')` call from
  the component and diffing against the defined key set: zero undefined
  references.
- [x] `npm run typecheck` and `npm run test` (356/356) both clean.

---

## Phase 6 — Env wiring (local + build profiles)

- [x] Add `EXPO_PUBLIC_REVIEWER_DEMO_EMAILS=apple@example.com,google@example.com`
      to the local `.env` (confirmed gitignored via `git check-ignore -v .env`
      before editing; matches how `EXPO_PUBLIC_APPWRITE_*` already live there).
- [x] Add the same key to all three `eas.json` build profiles (`development`,
      `preview`, `production`) — consistent with how every other
      `EXPO_PUBLIC_*` var is already baked in there today. Production is the
      one that actually matters for the App Store/Play submission; the other
      two are included for parity/dev-testing the feature pre-submission.
- [x] Update `.env.appwrite.example`'s client-side comment block to document
      the new var (documentation only — this file is about the *provisioning*
      script's env, but its "mirror into .env" comment block is the closest
      existing pointer to what belongs in `.env`).

**Modified files:**
- `.env` (gitignored, not committed)
- [eas.json](../eas.json)
- [.env.appwrite.example](../.env.appwrite.example)

**Phase 6 is done when:**
- [ ] A local dev build picks up the two demo emails and Phase 4's UI branch
  fires for them — deferred to Phase 7's iOS Simulator pass (needs a real
  build, not just a config read).
- [x] `eas.json`'s three profiles all carry the new key with identical values
  (no drift between profiles) — verified by reading the file back after the
  edit.
- [x] Nothing under `.env` or any *.local file is staged for commit — verified
  via `git status --short`: `.env` does not appear (confirmed gitignored
  beforehand), only the intended tracked files show as modified.
- [x] `npm run typecheck` and `npm run test` (356/356) both clean.

---

## Phase 7 — Verification & review-notes handoff

- [x] `npm run typecheck` — clean.
- [x] `npm run test` — 356/356 passing. Confirmed no existing test touches
      `LoginGate.tsx` or `auth.ts` (grepped the test suite for both) — this
      phase didn't need new automated tests to stay green.
- [x] Native build produced and installed for manual testing: `npx expo run:ios
      --device "iPhone 17"` — `.env` (including the new
      `EXPO_PUBLIC_REVIEWER_DEMO_EMAILS`) confirmed loaded/exported before the
      build, Xcode build succeeded (0 errors, 1 pre-existing unrelated
      warning), Metro bundled 4249 modules with no errors, app installed and
      launched on the simulator as `com.piggnify.app`.
- [x] Manual pass on iOS Simulator, fresh install, for **each** demo account —
      verified live by the user directly on the simulator: "everything works
      perfectly." This resolves Phase 3's deferred check
      (`resolveSessionSecret()` recovers a usable secret for a *password*
      session, not just OTP) and Phase 4's two deferred checkboxes.
- [x] Confirm the **non-demo** OTP path is unaffected — verified by static
      diff review (`git diff main -- src/components/auth/LoginGate.tsx`):
      every line of the original `verify()` function and the `code`-stage JSX
      block is byte-for-byte unchanged; only additive branches (`sendCode()`'s
      early-return, a new `submitPassword()` function, a new ternary arm) were
      introduced.
- [ ] Write the final demo credentials (email + password, one line each) into
      the App Store Connect **and** Google Play Console review-notes fields
      directly — not into any file in this repo, not into a commit, not into
      this plan document. **This remains the user's action**, to be done
      outside this repo/session whenever the app is actually submitted for
      review — not a blocker for merging this branch. Credentials (both
      rotated once since Phase 2, current as of this writing) were shared in
      chat, not committed anywhere:
      - Apple: `apple@example.com`
      - Google: `google@example.com`

**Modified files:** none (verification only), plus this plan file's own
checkbox/notes updates.

**Phase 7 is done when:**
- [x] Everything verifiable without driving the simulator has been checked:
  typecheck, tests, a real native build/install, and a static diff proving the
  OTP path is untouched.
- [x] The user confirmed the live simulator pass for both demo accounts:
  "everything works perfectly."
- [ ] Demo credentials submitted to App Store Connect and Google Play Console
  review notes — deliverable at actual submission time, not required for this
  branch to merge.
- [x] Issue [#148](https://github.com/Koin-App-Official/pignify/issues/148) is
  ready to close per the `github-issues-prs` skill's Phase 3.

## Verified

**2026-08-23** — All 7 phases complete. `npm run typecheck` and `npm run test`
(356/356) clean throughout. Live end-to-end pass on iOS Simulator (both demo
accounts: fresh install → "Already have an account?" → whitelisted email →
password stage → correct password → PIN setup → dashboard with the seeded demo
goal → kill/relaunch → PIN unlock) confirmed working by the user directly.
Non-demo OTP path confirmed unaffected by static diff review. Both demo
account passwords were rotated once post-verification (new values shared in
chat, not committed) — `signInWithPassword()`/`isReviewerDemoEmail()` have no
dependency on any specific password value, so this required no code changes.

---

## Explicitly out of scope

- Fixing the pre-existing "name/email not hydrated on new-device login" gap
  (only goals are). Noted above as a known limitation, not fixed here.
- Any change to the OTP flow, PIN machinery, biometrics, or device
  registration — all untouched by this plan.
- A cleanup/rotation policy for the demo passwords. If they ever need
  rotating (e.g. after a review cycle), that's a manual repeat of Phase 2's
  password-generation step against the same two accounts — not built as
  tooling here.
