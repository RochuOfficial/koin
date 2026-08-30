/**
 * Consent gate for the app's two AI surfaces (Coach, Deep Analysis) — Apple
 * Guideline 5.1.2(i), added Nov 2025: explicit permission is required before
 * personal data is shared with a third-party AI, not just disclosure.
 * Pure and dependency-free so it's testable without importing store.ts (see
 * storeMigrations.ts's module doc for why that matters here).
 */

/** Bump when the consent copy changes what it discloses (provider, data sent,
 * retention) — a stale-version grant must not silently cover a wider claim
 * than the user actually saw. Does NOT need to bump for copy typo fixes. */
export const AI_CONSENT_VERSION = 1;

export interface AiConsent {
  granted: boolean;
  grantedAt: string | null;
  version: number;
}

/**
 * Whether the consent modal must be shown before the next AI call.
 * True for a fresh install (`consent` is null), a user who declined, or one
 * who granted under an older disclosure version.
 */
export function needsAiConsent(consent: AiConsent | null, currentVersion: number): boolean {
  if (!consent) return true;
  if (!consent.granted) return true;
  return consent.version < currentVersion;
}
