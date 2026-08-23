/**
 * I/O for currency-conversion rates. Kept separate from
 * `currencyConversion.ts`, which is intentionally pure (no fetch) — same
 * split as `entitlementsSync.ts` vs `entitlements.ts` (see that module's
 * header).
 */

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';

/**
 * Frankfurter's rates are ECB reference rates — AED isn't one, confirmed by
 * checking `api.frankfurter.dev/v1/currencies` directly (31 codes, no AED)
 * against the app's `CURRENCIES` list. Conversion stays unavailable for AED
 * until a different rate source covering it is chosen.
 */
export const FRANKFURTER_UNSUPPORTED: readonly string[] = ['AED'];

interface FrankfurterLatestResponse {
  rates?: Record<string, number>;
}

/**
 * Best-effort fetch — returns null on any failure (unsupported currency,
 * network error, non-2xx, missing rate, abort) and never throws. Mirrors
 * `fetchEntitlementsSync`'s contract.
 */
export async function fetchExchangeRate(from: string, to: string, signal?: AbortSignal): Promise<number | null> {
  if (from === to) return 1;
  if (FRANKFURTER_UNSUPPORTED.includes(from) || FRANKFURTER_UNSUPPORTED.includes(to)) return null;

  try {
    const res = await fetch(`${FRANKFURTER_URL}?base=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
      signal,
    });
    if (!res.ok) return null;

    const raw = (await res.json().catch(() => null)) as FrankfurterLatestResponse | null;
    const rate = raw?.rates?.[to];
    return typeof rate === 'number' ? rate : null;
  } catch {
    return null;
  }
}
