# App Review Blockers — AI consent (5.1.2(i)) + subscription disclosure (3.1.2)

## Context

Pre-submission audit against the 2026 App Review guide found three blockers. Decisions from conversation:

- **Blocker 1 (3.1.1, IAP)** — deferred. Direction is the **reader model**: subscriptions are
  managed on the website, like Netflix. The web dashboard is incomplete, so no work now.
- **Blocker 2 (3.1.2, subscription disclosure)** — in scope, Phases 5–6.
- **Blocker 3 (5.1.2(i), AI consent)** — in scope, Phases 1–4. Done first: it is fully
  self-contained and blocks nothing else.

### The Blocker 1 ↔ Blocker 2 dependency (read before starting Phase 5)

The reader model is not "keep the paywall, pay elsewhere." Apple's reader/external-purchase rules
mean an app that offers no IAP **must not** contain buttons or links that send users to an external
purchase flow. `app/plans.tsx` today calls `startCheckout()` → `Linking.openURL(stripeUrl)`
([billing.ts](../src/lib/billing.ts)), which is exactly that link. So:

- If Piggy goes **reader model**, the 3.1.2 fix is to *remove* the purchase path from iOS, not to
  add renewal terms to it. Disclosure obligations largely fall away with the purchase screen.
- If Piggy adds **StoreKit IAP** later, the full 3.1.2 disclosure set becomes mandatory on the
  paywall.

Phase 5 builds the copy and the `<BillingTerms />` block that both branches need. Phase 6 is the
fork. Do not start Phase 6 until Blocker 1 is decided.

### AI surfaces found in the codebase

Two, not one — both must be behind the same consent:

1. **Coach** — `app/(tabs)/coach.tsx:264` POSTs `{ userID, messages, context }` to
   `n8n.piggnify.com/webhook/claude-coach`. `context` carries first name, streak, level, and the
   primary goal's name + saved/target amounts.
2. **Deep Analysis** — `src/lib/deepAnalysis.ts:30` POSTs `{ userId, language, saved_money }`; n8n
   looks up name, email, and wage server-side from Appwrite and emails a written analysis.
   Whether an LLM writes that email is verified in Phase 0.

---

## Phase 0 — Verify the AI surface ✅ (findings below)

Nothing is built here; this establishes what the consent copy must actually claim. Copy that
overstates or understates the data flow is its own 5.1.2 problem.

- [x] Open the Deep Analysis n8n workflow (webhook `cfbc46c0-bc70-4b9b-bdea-a6c881ee9019`) and
      confirm whether it calls an LLM, and which provider.
- [x] Open `CLAUDE_coach_reply` and confirm the provider and the exact fields forwarded to it —
      in particular whether the Appwrite-side lookup adds anything beyond the client `context`.
- [x] Confirm whether either workflow retains prompts/replies anywhere (n8n execution history
      counts as retention for disclosure purposes) — see caveat below.
- [x] Grep for any third AI surface: `grep -rn "webhook" src app | grep -v billing`. None found —
      Coach and Deep Analysis are the only two.
- [x] Findings written into the appendix below. **Read the caveat before writing Phase 2 copy.**

**Files:** this file only (findings appendix). No source changes.

**Phase complete when:** the provider, the exact field list, and the retention answer are written
down for both surfaces, and no third AI surface exists. — Done, with one open item carried
forward (see caveat).

### Caveat carried into Phase 2 — Deep Analysis is a bigger surface than the client code implies

`src/lib/deepAnalysis.ts`'s docstring describes "client → n8n → email." The workflow actually
wired to that webhook today (`Customer - reques for deep financial analysations II DEMO`,
n8n id `fnezcOF8tV7yEXjL`) does more than that, and disclosure copy has to match the real
behavior, not the docstring:

- **Two providers, not one.** A "decision making ai" classifier plus three specialist agents
  (`financial`, `Investement`, `Saving`) run across **both** Anthropic (`claude-opus-4-8`,
  `claude-sonnet-4-5`, `claude-sonnet-4-6`) and OpenAI (`gpt-5-mini`).
  Consent/nutrition-label copy naming "our AI provider" (singular) would be wrong for this surface.
- **Agents have tool access beyond the user's own data.** Each specialist agent can call a Dropbox
  knowledge-base tool and open-ended HTTP-request tools, and one branch has a web-search tool.
  What (if anything) about the user's request reaches those tools wasn't traced node-by-node —
  worth a narrower follow-up before Phase 2 copy claims a closed, data-doesn't-leave-Piggy scope.
- **No email node is actually connected.** All three `Convert HTML To PDF` nodes are dead ends —
  nothing sends the generated PDF anywhere. Whatever the user currently experiences after
  requesting Deep Analysis, it is not "you'll get an emailed report" as the client code assumes.
  This is a product-correctness question for you, not something Phase 2 copy can paper over —
  don't promise "sent to your email" in the consent screen until this is confirmed fixed or
  changed.
- **Retention** is n8n's own execution-log retention (instance-level setting, not inspected here)
  for both workflows — treat as "not verified" rather than assume none.
- Not a 5.1.2 item, but noted since it was seen in passing: a live Appwrite server API key is
  hardcoded in plaintext across several HTTP nodes in this workflow rather than stored as an n8n
  credential. Flagging once here; no action taken per your instruction to proceed with Phase 0 as
  scoped.

**Practical effect on Phase 2:** write the Deep Analysis consent copy to say "Anthropic and
OpenAI" (plural, both named), and hold off on any "you'll receive this by email" language until
the dead-end PDF nodes are addressed — treat that as a blocking question to resolve before Phase 2
starts on the Deep Analysis half specifically. The Coach half of Phase 2 is unaffected and can
proceed.

---

## Phase 1 — Consent state ✅

Persisted, versioned, and defaulting to *not granted* for existing users, so everyone sees the
gate once.

- [x] Add to the persisted profile in `src/lib/store.ts`:
      `aiConsent: { granted: boolean; grantedAt: string | null; version: number } | null`,
      defaulting to `null`.
- [x] Add actions `grantAiConsent()` / `revokeAiConsent()` alongside the existing profile actions.
- [x] Export `AI_CONSENT_VERSION = 1` from a small pure module (`src/lib/aiConsent.ts`) plus a
      pure `needsAiConsent(consent, currentVersion): boolean` helper — pure so it is testable
      without importing `store.ts` (see the module doc in `storeMigrations.ts` for why).
- [x] Bump `PIGGY_STORE_VERSION` 7 → 8 in `src/lib/storeMigrations.ts` and add the v7 → v8 step
      that sets `profile.aiConsent = null` on existing blobs.
- [x] Bump the matching `version:` in `store.ts`'s persist config (it reads `PIGGY_STORE_VERSION`
      directly, so this was automatic — added a comment noting the bump for future readers).
- [x] Tests: `src/lib/aiConsent.test.ts` for `needsAiConsent` (null, declined, granted-current,
      granted-stale-version, granted-newer-than-current); extended `storeMigrations.test.ts` with
      a v7 → v8 describe block, and updated the existing `PIGGY_STORE_VERSION matches the highest
      migration step` sanity guard from 7 → 8.

**Files:** `src/lib/store.ts`, `src/lib/storeMigrations.ts`, `src/lib/storeMigrations.test.ts`,
`src/lib/aiConsent.ts` (new), `src/lib/aiConsent.test.ts` (new).

**Phase complete when:** `npx vitest run` and `npm run typecheck` both pass, a v7 blob migrates to
v8 with `aiConsent: null`, and `needsAiConsent(null, 1) === true`. — 394/394 tests pass, typecheck
clean.

---

## Phase 2 — Consent screen + copy in four locales ✅

- [x] Build `src/components/AiConsentModal.tsx`, styled after `DeepAnalysisConfirmModal.tsx`
      (same modal idiom already used for irreversible confirmations).
- [x] Content, in this order: what the feature does → **which data leaves the device** (the
      literal field list from Phase 0) → **who receives it** (named provider) → retention →
      a link to the existing AI Transparency page → two buttons.
- [x] Buttons are **"Not now"** and **"Allow"**. Decline is a real, equal-weight choice — not a
      single "OK" — satisfying the "explicit permission" bar in 5.1.2(i).
- [x] Declining leaves the rest of the app fully usable — the modal only calls `onAllow`/
      `onDecline`; it never touches quota or the network itself (enforced in Phase 3).
- [x] Added an `aiConsent.*` block to `en`, `pl`, `hu`, and `de` **`common.json`**, not
      `coach.json` — decided in this phase: the same modal serves both Coach and Deep Analysis
      (index.tsx), and `common.json` already holds exactly this kind of cross-screen modal copy
      (see `dobConfirmModal`, used from onboarding *and* settings). Copy names **both** AI
      surfaces and **both** providers (OpenAI for Coach, OpenAI + Anthropic for Deep Analysis —
      per the Phase 0 appendix) so the single shared consent flag stays truthful regardless of
      which surface asked first.
- [x] Promoted the AI Transparency URL out of `app/onboarding.tsx`'s local `LEGAL_LINKS` into
      `AI_TRANSPARENCY_URL` in `src/lib/linking.ts` (next to `SUPPORT_EMAIL`) — one definition,
      reused by both onboarding and the new modal, rather than a second hardcoded copy.
- [x] Added `accessibilityRole`/`accessibilityLabel`/`accessibilityHint` — this required
      extending the shared `Button` component (`src/components/ui/button.tsx`), which had no
      accessibility props at all (it renders a Gesture-Handler `Animated.View`, not a
      `Pressable`, so nothing was reaching VoiceOver by default on *any* button in the app, not
      just this modal's). Scoped the change to exactly what Phase 2 needed: `accessibilityLabel`
      (falls back to `label`), `accessibilityHint`, `accessibilityRole="button"`, and
      `accessibilityState.disabled` — every existing `<Button>` call site benefits for free, with
      no prop changes required at those call sites.

**Files:** `src/components/AiConsentModal.tsx` (new), `src/components/ui/button.tsx`,
`src/lib/linking.ts`, `app/onboarding.tsx`, `src/lib/i18n/locales/{en,pl,hu,de}/common.json`.

**Phase complete when:** the four locale files have identical key sets (`locales.test.ts` green —
confirmed, 394/394 tests pass), the modal renders in all four languages without truncation
(**visual check left to you**, per your usual workflow — not run here), and every claim in the
copy matches the Phase 0 findings (verified: names Coach + Deep Analysis, OpenAI + Anthropic,
links to the real AI Transparency URL, and does not promise anything about email delivery).

---

## Phase 3 — Gate every AI call ✅

The gate must sit at the call site, not at screen mount — a user can reach Deep Analysis without
ever opening Coach.

- [x] `app/(tabs)/coach.tsx`: in `send()`, after the existing `has('aiCoach')` and
      `aiMessages.allowed` gates and **before** `incrementCoachMessages()`, checks
      `needsAiConsent(...)` and opens the consent modal instead of sending. Quota is not consumed
      on a consent prompt — the `incrementCoachMessages` call sits after the check.
- [x] On Allow: `grantAiConsent()`, then the exact interrupted `send(text)` call resumes via a
      ref (`pendingSendTextRef`) — the user never retypes. On Decline, the ref is cleared and
      nothing is sent.
- [x] `app/(tabs)/index.tsx`: gates `triggerDeepAnalysis()` the same way, in `runDeepAnalysis()`
      — consent first, then the existing `DeepAnalysisConfirmModal` (`setConfirmingAnalysis(true)`
      only happens after Allow), then the call from `confirmDeepAnalysis()`.
- [x] Grepped for direct calls to either endpoint: `grep -rn "claude-coach\|triggerDeepAnalysis"
      app src` — exactly one call site each, both now gated, no other path found.
- [ ] Manual check: fresh install → Coach → first send shows consent; decline → nothing is sent
      and no quota is consumed; allow → message sends; second send shows nothing. **Left to you**
      — same as Phase 2's visual check, not run here.

**Files:** `app/(tabs)/coach.tsx`, `app/(tabs)/index.tsx`.

**Phase complete when:** no network call to either AI endpoint is possible with
`aiConsent.granted !== true`, declining costs no quota, and consent is asked exactly once. — true
by construction (both call sites gate before their respective network call and before any quota
increment); `npx vitest run` (394/394) and `npm run typecheck` both pass. The interactive walk
above is the one item not verified here.

---

## Phase 4 — Revocation and declaration ⚠️ code done, non-code items remain

Consent that cannot be withdrawn is not consent.

- [x] Added a new **Privacy** section to `app/settings.tsx` (between Account and Support & About)
      with an **"AI features"** toggle, using the existing `Switch` row pattern from the
      biometrics toggle. One deliberate deviation from a plain revoke switch: turning it **ON**
      re-opens the same `AiConsentModal` used at the Coach/Deep Analysis call sites, rather than
      granting silently — the disclosure lives in the modal, not in the fact of a switch flip, so
      re-granting goes through the same full-content screen every time. Turning **OFF** calls
      `revokeAiConsent()` immediately, no modal (revoking should be frictionless).
- [x] Off → `revokeAiConsent()`; the next AI action (or turning the toggle back on) re-shows the
      modal — confirmed by construction: `revokeAiConsent()` sets `granted: false`, and
      `needsAiConsent` (Phase 1) returns `true` for any non-granted consent.
- [x] Added `settings.sections.privacy` and `settings.aiFeatures.toggleLabel` to all four
      `settings.json` locale files (not `settings.aiConsent.*` — the disclosure copy itself stays
      in `common.json`'s `aiConsent.*` block from Phase 2, shared with the modal; this is just the
      row label).
- [x] Skipped the `contentParity.test.ts` extension — that pattern (`AUTO_LOCK_OPTIONS`,
      `LEGAL_LINKS`) is for a static *array* of ids that must line up with translation keys. This
      is a single toggle with one label key, not a list, so there's nothing for that test style to
      check; `locales.test.ts`'s standard key-parity check already covers the new keys (confirmed
      green).
- [ ] Update the App Privacy nutrition label in App Store Connect to declare the data types sent
      to the AI provider(s) and their purpose. **This is the half Apple actually
      cross-references** — an in-app consent screen with a stale nutrition label is still a 5.1.2
      finding. **Not done here — App Store Connect is outside this repo and this tool's reach.**
      Use the Phase 0 appendix as the source list: OpenAI (Coach — name, streak, level, currency,
      country, income, goal names/amounts, last 10 messages) and OpenAI + Anthropic (Deep Analysis
      — name, email, income, saved-money figure, free-text request).
- [ ] Confirm the published privacy policy and the AI Transparency page (`piggnify.com/ai-transparency`)
      name the actual providers (OpenAI; OpenAI + Anthropic) and match the in-app copy on the data
      list. **Not done here** — that page lives on the website, not in this repo, and I have no
      access to verify or edit it.
- [ ] Add one line to the review notes: where the consent screen appears and how to reach it (also
      still pending — this is written at submission time, not implementation time).
- [ ] Resolve the Phase 0 caveat about Deep Analysis's dead-end PDF nodes before relying on any
      "you'll receive this by email" language anywhere in the product — carried forward, still
      open.

**Files:** `app/settings.tsx`, `src/lib/i18n/locales/{en,pl,hu,de}/settings.json`. App Store
Connect and the website are explicitly out of scope for this session.

**Phase complete when:** the toggle round-trips (revoke → gate returns → re-grant) — true by
construction, `npx vitest run` (394/394) and `npm run typecheck` pass — **and** the nutrition
label, privacy policy, and in-app copy agree, which is not yet true and cannot be verified from
here. Treat this phase as code-complete, not App-Review-ready, until the four unchecked items
above are handled outside this repo.

---

## Phase 5 — Billing terms block (branch-independent) ✅

Everything here is needed whether Piggy ends up reader-model or IAP, so it is safe to build before
Blocker 1 is decided.

- [x] Built `src/components/BillingTerms.tsx`: three short sentences (renewal/billing, how to
      cancel, the existing upgrade/downgrade mechanics line) plus tappable **Terms of Service**
      and **Privacy Policy** links. Kept as three separate sentences rather than one sentence with
      inline tappable spans — matches the existing plain-list pattern (`LegalLinksNote`,
      onboarding.tsx) instead of composing a single grammatically-correct sentence around links
      across four languages, which is fragile to translate.
- [x] Promoted `PRIVACY_URL` / `TERMS_URL` out of `app/settings.tsx` into `src/lib/linking.ts`
      next to `SUPPORT_EMAIL` and `AI_TRANSPARENCY_URL` (added in Phase 2). Also updated
      `app/onboarding.tsx`'s `LEGAL_LINKS`, which still had its own copies of both — the phase's
      own completion bar ("exactly one definition") covers it even though it wasn't in the
      original file list. `services`/`aiFeatureAccess` in that same array are untouched — out of
      scope, no promoted constant exists for them.
- [x] `safeOpenURL` (`src/lib/linking.ts`) now routes any `http(s)://` URL through
      `WebBrowser.openBrowserAsync` (added the `expo-web-browser` dependency via
      `npx expo install`, which also registered its config plugin in `app.json`); non-http schemes
      (`mailto:`, etc.) still go through the system `Linking` API, which `WebBrowser` can't handle.
      Fixed at the shared helper rather than per call site, so Settings' existing Privacy/Terms/
      Support rows and the Phase 2 `AiConsentModal` link all picked this up automatically — closes
      audit note 13 more broadly than just the new component. Onboarding's own five-link list
      calls `Linking.openURL` directly (not through this helper) and was left as-is — genuinely
      out of this phase's file list, noted here as a loose end rather than fixed silently.
- [x] Replaced `plans.disclaimer` with a `plans.terms.*` block (`billing`, `cancel`,
      `planMechanics`, `termsOfUse`, `privacyPolicy`, `linkError`) in all four locales —
      `planMechanics` carries the old disclaimer sentence verbatim, unchanged in meaning, just
      relocated. Confirmed no remaining reference to the old key (`grep -rn "disclaimer" app src`
      → empty).
- [x] Did not touch the plan cards themselves — price stays bold and dominant, the trial stays an
      ordinary bullet next to it, exactly as before.

**Files:** `src/components/BillingTerms.tsx` (new), `src/lib/linking.ts`, `app/settings.tsx`,
`app/plans.tsx`, `app/onboarding.tsx`, `src/lib/i18n/locales/{en,pl,hu,de}/plans.json`,
`package.json`/`app.json` (new `expo-web-browser` dependency + config plugin).

**Phase complete when:** `<BillingTerms />` renders correctly in four languages (locale key
parity confirmed — `npx vitest run`, 394/394), both links open in-app (via the shared
`safeOpenURL`, unverified visually — left to you per usual), and there is exactly one definition
of `PRIVACY_URL`/`TERMS_URL` in the codebase (confirmed by grep). `npm run typecheck` clean.

---

## Phase 6 — Fork: apply Phase 5 to the chosen rail

**Blocked on the Blocker 1 decision. Do not start before it.**

### Branch A — reader model (current direction)

- [ ] Remove the external-checkout call sites from iOS: `startCheckout()` and
      `startAddonCheckout()` must not be reachable in an iOS build.
- [ ] Remove pricing, plan-selection CTAs, and any "subscribe / upgrade" wording from the iOS
      surface — including `UpgradeModal.tsx` and the Coach's `openGate('aiMessages')` upsell.
- [ ] Replace gated states with a neutral message that does not name a price or point to a
      purchase page.
- [ ] Delete the `simulatePayment` branch outright rather than gating it behind `__DEV__`.
- [ ] Keep `<BillingTerms />` reachable from Settings for existing subscribers.
- [ ] Confirm the app is still fully usable for a subscribed user who signed up on the web, and
      write the review notes explaining exactly that.

### Branch B — StoreKit IAP

- [ ] Render `<BillingTerms />` on `app/plans.tsx` directly above the plan cards' CTA.
- [ ] Add **Restore Purchases** — mandatory under 3.1.1 and absent today.
- [ ] Point the EULA link at Apple's standard EULA if no custom one is published.
- [ ] Make sure the trial is not promoted more conspicuously than the billed amount.

**Files:** Branch A — `app/plans.tsx`, `src/components/UpgradeModal.tsx`,
`app/(tabs)/coach.tsx`, `src/lib/billing.ts`. Branch B — `app/plans.tsx`, `src/lib/billing.ts`,
plus the StoreKit integration.

**Phase complete when:** under A, no iOS code path opens an external purchase URL and no price
appears in the iOS UI; under B, the paywall shows all five required 3.1.2 elements and Restore
Purchases works on a real device.

---

## Cross-cutting rules for every phase

- Every new user-facing string lands in **all four** locales in the same commit — `locales.test.ts`
  fails on key drift, by design.
- `npm run typecheck` and `npx vitest run` stay green at the end of each phase.
- Each phase is its own issue and branch per `GITHUB_ISSUES_GUIDE.md`.

---

## Appendix — what leaves the device (Phase 0 findings)

| Surface | Endpoint | Fields sent | Provider | Retention |
| --- | --- | --- | --- | --- |
| Coach | `webhook/claude-coach` (n8n `CLAUDE_coach_reply`, id `2ZLK31SPSSrplvlO`) | Last 10 messages of the conversation, plus server-enriched context: first name, streak, level, currency, country, total monthly income (from Appwrite `incomes`), primary goal name/saved/target, other active goals' name/target/monthly contribution/deadline. A separate jailbreak classifier sees the last 6 messages first. | **OpenAI** — despite the workflow's name/description saying "Claude Haiku 4.5," the actual language-model node (`GPT Luna`) is an OpenAI node on model `gpt-5.6-luna` via credential `OpenAI account 2`. The jailbreak classifier (`Luna Guard`) is the same OpenAI node/credential. No Anthropic node exists in this workflow. | n8n's own execution-log retention (instance setting, not verified here). |
| Deep Analysis | `webhook/cfbc46c0-bc70-4b9b-bdea-a6c881ee9019` (n8n `Customer - reques for deep financial analysations II DEMO`, id `fnezcOF8tV7yEXjL`) | Full name, email, total monthly income, the `saved_money` figure from the client, plus an intent classification of the free-text request. | **Both Anthropic and OpenAI** — a classifier + 3 specialist agents (`financial`, `Investement`, `Saving`) run across `claude-opus-4-8`, `claude-sonnet-4-5`, `claude-sonnet-4-6`, and `gpt-5-mini`. Agents also hold a Dropbox knowledge-base tool and open-ended HTTP-request tools (one branch adds web search); whether user data reaches those tools wasn't traced. | n8n's own execution-log retention (instance setting, not verified here). **Output is not currently emailed** — see caveat above; all three PDF-generation nodes are dead ends. |
