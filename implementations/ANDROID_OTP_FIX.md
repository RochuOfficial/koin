# Android Email OTP Send Failure — Fix Plan

Tracking issue: [#181](https://github.com/Koin-App-Official/pignify/issues/181)
Branch: `fix/issue-181-android-otp-send`

## Root cause

**No Android platform is registered on the Appwrite project console** for project
`6a15741300220ae26d13`. Only an Apple platform exists.

Confirmed by live reproduction against the production server
(`https://appwrite.piggnify.com/v1`):

```
POST /v1/account/tokens/email
Origin: appwrite-android://com.piggnify.app
→ 403 {"message":"Invalid Origin. Register your new client (com.piggnify.app) as a
        new Android platform on your project console dashboard",
       "code":403,"type":"general_unknown_origin"}

Origin: appwrite-ios://com.piggnify.app.ios
→ 400 {"message":"Invalid `email` param..."}   ← passes the origin check
```

Appwrite's origin validator (`Origin.php`) checks native-app origins
(`appwrite-{os}://{id}`) by **scheme only** — `appwrite-android` vs `appwrite-ios` —
against the project's `allowedSchemes`, which is derived purely from which platform
*types* are registered in the console. With zero Android platforms registered, every
Android request is rejected before it ever reaches normal validation, regardless of
package name. iOS passes because an Apple platform already exists.

This is a **console configuration gap, not an app-code bug** — but three code-level
issues compound it and need fixing alongside the console change:

1. `src/lib/appwrite.ts` never calls `.setPlatform(...)`, so the client sends
   `Origin: appwrite-android://` (empty host) instead of the real application id.
   Appwrite doesn't validate the host for native origins today, so this isn't the
   trigger — but it's a latent correctness gap worth closing (defense-in-depth, and
   the host may matter for future platform-scoped features).
2. `app/onboarding.tsx:458` and `src/components/auth/LoginGate.tsx:75` both use bare
   `catch { ... }` blocks that discard the `AppwriteException` entirely — nothing is
   logged. This is why the real `403 general_unknown_origin` was never visible; it
   just looked like a generic "something went wrong" error.
3. No regression test / manual check currently exists that would catch "OTP send
   broken on one platform" before release.

## Phase 1 — Register the Android platform in Appwrite console ✅ DONE

**Files:** none (external Appwrite project configuration, not a git change).

- [x] Register a new Android platform on project `6a15741300220ae26d13`:
      name `Android`, application id `com.piggnify.app` (matches `app.json` →
      `android.package`) — done manually via the Appwrite console dashboard (the
      MCP connector here only has project-scoped API key auth, which can't reach
      the console-only platforms route)
- [x] Confirmed via live probe: `POST /v1/account/tokens/email` with
      `Origin: appwrite-android://com.piggnify.app` now returns
      `400 general_argument_invalid` (invalid email) instead of
      `403 general_unknown_origin` — matches iOS's existing behavior

**This is the actual fix** — everything else in this plan is defense-in-depth and
observability. This step changes live backend configuration, so it needs your
explicit go-ahead before I execute it (I have a tool that can do this directly via
the Appwrite MCP connector, or you can do it by hand in the console — your call).

**Phase done when:** a probe request with `Origin: appwrite-android://com.piggnify.app`
against `https://appwrite.piggnify.com/v1/account/tokens/email` no longer returns
`403 general_unknown_origin` (it should reach normal argument validation instead, the
same way the iOS origin already does).

## Phase 2 — Set the real platform id on the Appwrite client ✅ DONE

**Files:**
- `src/lib/appwrite.ts`

- [x] Imported `expo-application` (already a project dependency, used the same way in
      `src/lib/device.ts`) and added `.setPlatform(Application.applicationId ?? '')`
      right after `.setProject(...)` on the `client` builder chain
- [x] Guarded for `Application.applicationId` being `null` (Expo Go has no native
      module) — falls back to `''`, matching the existing `isConfigured` fallback
      pattern already in this file, so module evaluation never throws
- [x] No `Platform.OS` branching needed — `Application.applicationId` already
      resolves to `com.piggnify.app` on Android and `com.piggnify.app.ios` on iOS
      natively

**Phase done when:** `client.config.platform` is a non-empty string matching
`app.json`'s `android.package` on Android builds and `ios.bundleIdentifier` on iOS
builds (verified by logging it once during manual testing), and the app still
authenticates normally on iOS (no regression).

## Phase 3 — Stop swallowing the OTP request error ✅ DONE

**Files:**
- `app/onboarding.tsx`
- `src/components/auth/LoginGate.tsx`

- [x] `app/onboarding.tsx`: imported `createLogger` from `@/lib/logger` and
      instantiated `const log = createLogger('onboarding')` at module scope,
      matching the pattern in `LoginGate.tsx` / `device.ts`
- [x] `app/onboarding.tsx:458` — changed `catch {` to `catch (err) {` and added
      `log.error('requestEmailOtp failed:', err);` before `setNetworkError(...)`
- [x] `src/components/auth/LoginGate.tsx:75` — same change: `catch (err) {` +
      `log.error('requestEmailOtp failed:', err);` before `setError(...)` (this file
      already had `log` set up, matching its own error handling at lines 96 and 144)
- [x] User-facing copy/behavior unchanged — purely made the already-caught error
      observable, no UX change
- [x] `npx tsc --noEmit` passes clean after all Phase 2 + 3 changes

**Phase done when:** forcing a fake `AppwriteException` through `requestEmailOtp`
(or reverting Phase 1 temporarily in a local test) prints a clear `AppwriteException`
with code/type/message to the console/logger from both call sites, instead of being
silently discarded.

## Phase 4 — Verification

**Files:** none (manual + scripted verification, no further code changes expected).

- [ ] Re-run the raw-HTTP probe from the Root Cause section against
      `https://appwrite.piggnify.com/v1/account/tokens/email` with
      `Origin: appwrite-android://com.piggnify.app` and confirm it no longer 403s
- [ ] Run the app on an Android emulator/device, go through onboarding (or
      `LoginGate`), request an OTP, confirm the email arrives and the code screen
      is reached
- [ ] Verify the same flow still works on iOS (no regression from the `setPlatform`
      change)
- [ ] `npx tsc --noEmit` (or the project's existing typecheck script) passes
- [ ] Update issue [#181](https://github.com/Koin-App-Official/pignify/issues/181)
      checklist and close it per the `github-issues-prs` workflow; open the PR with
      `Closes #181`

**Phase done when:** all boxes above are checked and both platforms send/verify an
Email OTP successfully end-to-end.

---

## Open question for you

Phase 1 modifies live Appwrite project configuration (adds a platform entry — low
risk, purely additive, does not touch existing data or the Apple platform). I can do
this myself via the Appwrite MCP connector, or you can do it by hand in the console.
**Waiting for your approval before touching anything — console config or code.**
