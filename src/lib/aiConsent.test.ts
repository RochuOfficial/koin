import { describe, it, expect } from 'vitest';
import { needsAiConsent, AI_CONSENT_VERSION } from './aiConsent';

describe('needsAiConsent', () => {
  it('requires consent when null (fresh install / never asked)', () => {
    expect(needsAiConsent(null, AI_CONSENT_VERSION)).toBe(true);
  });

  it('requires consent when previously declined', () => {
    expect(
      needsAiConsent({ granted: false, grantedAt: null, version: AI_CONSENT_VERSION }, AI_CONSENT_VERSION)
    ).toBe(true);
  });

  it('does not require consent when granted at the current version', () => {
    expect(
      needsAiConsent(
        { granted: true, grantedAt: '2026-08-28T00:00:00.000Z', version: AI_CONSENT_VERSION },
        AI_CONSENT_VERSION
      )
    ).toBe(false);
  });

  it('requires re-consent when granted under an older disclosure version', () => {
    expect(
      needsAiConsent({ granted: true, grantedAt: '2026-01-01T00:00:00.000Z', version: 0 }, 1)
    ).toBe(true);
  });

  it('does not require consent when granted under a newer version than current (no downgrade churn)', () => {
    expect(
      needsAiConsent({ granted: true, grantedAt: '2026-01-01T00:00:00.000Z', version: 5 }, 1)
    ).toBe(false);
  });
});
