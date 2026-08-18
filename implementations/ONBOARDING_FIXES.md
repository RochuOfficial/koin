# Onboarding v2 — Post-implementation Audit

Findings from a full read of the onboarding, auth and entitlement paths after issues A–H landed.

- **Audited:** `main` @ `e6cbcaf` (2026-08-16), after PR #90 merged
- **Method:** traced every route through the `authLock` state machine and the trial lifecycle by reading source, not diffs; checked live Appwrite/n8n state where behaviour depended on it
- **Companion doc:** [ONBOARDING_V2.md](ONBOARDING_V2.md) — the implementation plan this audits

Nothing here is a regression introduced by A–H unless it says so. Several of the worst findings are pre-existing gaps that the batch made reachable, visible, or more costly.

---

## Summary

| # | Finding | Severity | Pre-existing? |
|---|---|---|---|
| 1 | Locked users can't log out, delete their account, or get help | 🔴 Blocking | No — introduced by D12 |
| 2 | Reinstall / new device forces a full re-onboarding | 🔴 Blocking | Yes |
| 3 | No read-down sync — reinstall loses data and diverges from the server | 🔴 Blocking | Yes |
| 4 | A user on a trial cannot pay, even if they want to | 🟠 Significant | No |
| 5 | Trialing users can schedule a phantom downgrade that never resolves | 🟠 Significant | Partly |
| 6 | A failed fetch during onboarding means the trial intro never appears | 🟠 Significant | No |
| 7 | `retention.ts` has zero callers; downgrades apply with no retention check | 🟠 Significant | Yes |
| 8 | "You're all set" copy lost with the Success screen | 🟡 Minor | No |
| 9 | Stripe return deep link is inert while locked | 🟡 Minor | No |
| 10 | `past_due` never reaches the client | 🟡 Minor | Yes |
| 11 | Pre-trial accounts never get a trial and never lapse | 🟡 Minor | No |

---

## 🔴 1. A locked user cannot log out, delete their account, or get help

**What.** D12 makes the lockout total: `AuthGate` renders `PlanGate` instead of the navigation stack, so it is the only reachable screen. [PlanGate.tsx:124](../src/components/auth/PlanGate.tsx) offers plan cards and an "I've already subscribed" action. There is no logout, no settings, no account deletion, and no support affordance — the only mention of support is inside an error string that appears when checkout fails.

**Why it matters.** A user who decides not to subscribe has two options: pay, or uninstall. `CLAUDE_account_delete` is implemented and working, but it lives behind Settings, which is unreachable. Someone who wants their data deleted cannot ask for it from inside the app. That is a data-rights problem before it is a UX one, and it is the kind of thing that generates support mail and store reviews.

**Fix.** Add a persistent footer to `PlanGate`'s locked mode with **Log out**, **Delete account**, and a support address. Deleting an account from a locked state is a legitimate action and needs no subscription. Logging out returns to `LoginGate`, which is a coherent exit.

**Effort.** Small. The actions already exist (`useAuthLock().logout`, `requestAccountDeletion`); this is wiring plus a confirmation dialog.

---

## 🔴 2. Reinstall or a new device forces a full re-onboarding

**What.** [AuthGate.tsx:45](../src/components/auth/AuthGate.tsx) shows `LoginGate` only when `onboardingCompleted` is true **in local storage**:

```ts
if (status === 'unauthenticated') {
  if (onboardingCompleted) return <LoginGate />;
  return <>{children}</>;
}
```

On a fresh install AsyncStorage is empty, so that flag is false and the user is routed to `/welcome` → `/onboarding` ([index.tsx:173](../app/%28tabs%29/index.tsx)). Neither `welcome.tsx` nor `onboarding.tsx` contains a sign-in link — verified by grep.

`LoginGate` is therefore only reachable after a *logout on a device that already onboarded*. It cannot be reached by a returning user on new hardware.

**It does eventually work, badly.** `requestEmailOtp` calls `createEmailToken` with `ID.unique()`, which Appwrite resolves to the existing account for a known email, and `CLAUDE_onboarding` is idempotent. So a returning user gets back into the right account — after re-entering their name, age, country, goal, target, income and contribution, and being shown a trial intro for a trial they may have already used.

**Why it matters.** Reinstalling is not an edge case. Neither is getting a new phone. Today both look like "the app forgot me".

**Fix.** An "I already have an account" link on the welcome carousel and/or the name step, routing to `LoginGate`. That requires `LoginGate` to be renderable without `onboardingCompleted` — either a dedicated route or a local flag that forces it.

**Effort.** Small for the entry point. Note it only closes the *auth* half; finding 3 is the other half.

---

## 🔴 3. Nothing reads data back down from the server

**What.** There is no read path for `goals` anywhere in the app — grep finds only entitlement/quota references. The client is the sole author of goals, deposits, expenses and streak, all of which live in AsyncStorage.

**Consequences after a reinstall:**

- Streak, deposits, expenses and XP are gone permanently.
- The server still holds the original goal row. The client, walking onboarding again, calls `addGoal()` and creates a *new* local goal with `savedAmount: 0`.
- `CLAUDE_onboarding`'s `Check Goal Exists` correctly declines to create a duplicate server-side — so you end up with one server goal and one unrelated local goal, with no reconciliation in either direction.

**Why it matters.** This is the deepest structural gap in the product. The backend already stores the data needed to restore a user; nothing consumes it. Every other retention feature (streaks, missions, milestones) silently depends on data that cannot survive a phone upgrade.

**Fix.** A hydrate-on-login path: after `onLoggedIn`, fetch `goals`/`incomes` for the user and merge into the store, with a clear rule for conflicts (server wins on first hydrate is the simplest defensible choice). Deposits have no server representation at all today, so a full fix implies a schema addition.

**Effort.** Large — this is its own epic, not a fix to fold into this batch.

---

## 🟠 4. A user on a trial cannot pay, even if they want to

**What.** Checkout is reachable from exactly one place: the locked mode of `PlanGate`. In [plans.tsx:158](../app/plans.tsx) the checkout call is gated behind `isUpgrade(currentPlan, target)`.

The trial grants **Family** (`TRIAL_PLAN_ID` in `CLAUDE_onboarding`). Family is the top tier, so `isUpgrade('family', …)` is false for every target and the checkout branch is unreachable for the entire trial.

**Why it matters.** The only conversion moment in the product is *after* the trial lapses and the user has been locked out. A motivated user in day 3 who wants to commit has no way to do so. It also means every conversion is preceded by a negative experience.

**Fix.** Allow checkout whenever `planStatus` is `trialing` or `expired`, independent of tier ranking. The cleanest shape is a `canSubscribe(planStatus, current, target)` helper in `planGate.ts` (pure, testable) that both `plans.tsx` and `PlanGate` consult, so there is one rule rather than two.

**Effort.** Small.

---

## 🟠 5. Trialing users can schedule a phantom downgrade that never resolves

**What.** Same function, [plans.tsx:183](../app/plans.tsx). Because a trialing user is on Family, every other tier is a *downgrade*, so tapping Medium or Beginner runs:

```
changePlan(target)  →  profile.pendingPlan = target
```

`plans.tsx` then renders "Scheduled change: your plan switches to … on the end of your billing period" — `formatPeriodEnd()` falls back to that phrase because `currentPeriodEnd` is null for a trial.

It never resolves, because **`applyPendingPlan` and `cancelPlan` are never called anywhere in the app** ([store.ts:587,595](../src/lib/store.ts) define them; nothing consumes them). The banner is permanent until the user re-selects their current plan.

**Why it matters.** A user with no subscription can schedule a downgrade of a plan they aren't paying for, and then live with a banner about a billing period that doesn't exist. It also means the local plan-change model as a whole is half-wired: the client can write intent that nothing ever executes.

**Fix.** Two parts. Short term, suppress the downgrade branch while `planStatus === 'trialing'` (nothing to downgrade). Longer term, decide whether local `changePlan`/`pendingPlan` should exist at all now that Stripe is authoritative — the honest answer is probably that downgrades should be requested server-side and mirrored back, and the dead store actions removed.

**Effort.** Small to suppress; medium to resolve properly. Overlaps issue I.

---

## 🟠 6. A failed fetch during onboarding means the trial intro never appears

**What.** [onboarding.tsx:552](../app/onboarding.tsx) fetches entitlements best-effort after provisioning:

```ts
const entitlements = await fetchEntitlementsSync(userId);
```

`fetchEntitlementsSync` never throws and returns `null` on any failure. On the null path, no `planStatus` is written, so it stays at the `DEFAULT_PROFILE` value of `'active'`. `planGateReason` then returns null — not `trial_intro`, which requires `trialing` — and the gate is skipped.

The hourly sync later sets `planStatus: 'trialing'` correctly. But the gate is only consulted at login and at unlock, and [planGate.ts:66](../src/lib/planGate.ts) deliberately excludes the intro from the unlock check:

```ts
export function planGateReasonOnUnlock(input) {
  const reason = planGateReason(input);
  return reason === 'locked' ? reason : null;
}
```

So the intro is never shown, at any later point. `trialIntroSeen` stays false forever with no effect.

**Why it matters.** The whole purpose of issue G was that the user learns a trial started, so that day 15 isn't a surprise. This is the exact flaky-network path where that guarantee silently evaporates — and it fails closed in the wrong direction.

**Fix.** Either (a) retry the fetch once before falling through, or (b) allow `trial_intro` at unlock time when `trialIntroSeen` is false and the status is `trialing`. (b) is more robust and is one line, at the cost of the intro possibly appearing on the second launch rather than the first — a much better outcome than never.

**Effort.** Trivial. Should be tested, since the existing suite asserts the *current* (excluding) behaviour.

---

## 🟠 7. `retention.ts` has zero callers

**What.** All 95 lines of [retention.ts](../src/lib/retention.ts) are dead — grep finds no importer anywhere in `src/` or `app/`. The module implements exactly the rule issue I needs: over-limit records are archived rather than deleted, and a downgrade is blocked (`awaiting_selection`) until the user chooses what to keep.

Meanwhile `changePlan` ([store.ts:561](../src/lib/store.ts)) applies plan changes with no retention check at all.

**Why it matters.** Issue I is scoped in the plan as "UI and wiring, the logic already exists". That's half right: the logic exists but has no enforcement point. Anything that changes a user's plan today bypasses retention entirely, so I needs to add the *gate*, not just the screen.

**Fix.** Establish the enforcement point first — a single place a plan change must pass through — then build the selection UI against it. Worth re-scoping issue I in the plan doc accordingly.

**Effort.** Medium. This is issue I.

---

## 🟡 8. The "You're all set" copy was lost

Removing the onboarding Success screen in G moved the celebration to the dashboard, but only the confetti moved. The copy — *"You're all set, {name}! Your Piggy Plan is live. Time to start saving for your {goal}."* — is gone. The dashboard now fires confetti with no words.

**Fix.** A one-time banner or toast on the dashboard when `justOnboarded` is true, before it's cleared ([index.tsx:61](../app/%28tabs%29/index.tsx)).

---

## 🟡 9. The Stripe return deep link is inert while locked

`CLAUDE_billing_checkout` sets `success_url` to `piggy://plans?checkout=success`. While the user is locked, `AuthGate` renders `PlanGate` over the whole stack, so `plans.tsx` never mounts and never consumes the parameter. Its post-checkout reconcile effect doesn't run.

The manual "I've already subscribed" button covers this, which is why it exists — but the flow is clunkier than it needs to be.

**Fix.** An `AppState` foreground listener on `PlanGate` that re-runs `refreshAfterCheckout` automatically when the user returns from the browser.

---

## 🟡 10. `past_due` never reaches the client

[entitlementsSync.ts:33](../src/lib/entitlementsSync.ts) filters incoming statuses against `KNOWN_STATUSES`, which omits `past_due`, `cancel_scheduled` and `incomplete`. `past_due` is a real Stripe state (renewal payment failed, retries pending) and `resolve-entitlements.js` treats it as still-entitled, so access correctly continues — but the user is never told a payment failed, and there is no prompt to fix a card before Stripe gives up and cancels.

**Fix.** Add `past_due` to `PlanStatus` and surface a non-blocking banner. Deliberately *not* a lockout — that's what the grace period is for.

---

## 🟡 11. Pre-trial accounts never get a trial and never lapse

The three accounts predating issue E have `status: active`, `effective_plan_id: beginner`, `trial_ends_at: null`. `CLAUDE_onboarding` only seeds entitlements when the row is absent, so they will never receive a trial; `planGateReason` returns null for `active`, so they will never see the gate or be asked to pay.

Acknowledged as deferred ("we will handle all current users later"). Recorded so it isn't lost — the decision needed is whether to backfill them a trial, move them to a paid plan, or leave them grandfathered.

---

## What holds up well

Worth stating, since the list above is one-sided:

- **The trial machinery is verified live end-to-end.** Grant, lazy expiry, the Appwrite write-back, its idempotency, and onboarding replay safety were all exercised against production on 2026-08-16.
- **`lockoutEnforced(billingConfigured)`** makes the "user trapped behind a broken button" failure unshippable by omission rather than dependent on someone remembering a flag.
- **The pure modules are genuinely well covered** — `planGate`, `goalMath`, `deposits`, `missions`, `storeMigrations`, `onboardingDraft` at 202 passing tests, with guard tests that have already caught a real version bump.
- **The `beginner` rename** closed a live client/server mismatch and a latent bug where `billing.ts` sent a plan id the `plans` table could never match.
- **Removing the Stripe-side Family trial** fixed a real billing defect: 21 free days instead of 14.

---

## Untested surface

Not defects, but nothing here has met reality:

- [ ] **No live Stripe checkout has ever run.** Price IDs resolve and the env is set, but no session has been created end-to-end.
- [ ] **Six device-check boxes remain open** across A, B, D, F, G and H. No screen in this batch has been seen on a real device or simulator.
- [ ] **`emailReports`** is sold on two paid tiers and has no implementation — there is no email provider configured in n8n at all. Same blocker as issue C's deferred "email me this plan".

---

## Suggested order

1. **#1** — locked users need an exit. Small, and the current state is indefensible if anyone hits it.
2. **#4 + #5** — make the trial convertible and stop the phantom downgrade. Both live in one function.
3. **#6** — one line, protects the entire point of issue G.
4. **#9, #8, #10** — polish, cheap, do them alongside the above.
5. **Issue I**, re-scoped to include #7's missing enforcement point.
6. **#2 and #3** as a separate epic. They are a data-architecture project, not onboarding fixes, and folding them into this batch would misrepresent their size.
7. **#11** whenever you decide what those accounts should become.
