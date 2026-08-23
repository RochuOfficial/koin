import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchExchangeRate, FRANKFURTER_UNSUPPORTED } from './exchangeRates';

function mockFetchOnce(response: { ok: boolean; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchExchangeRate', () => {
  it('short-circuits to 1 when from and to are the same, without calling fetch', async () => {
    const fetchMock = mockFetchOnce({ ok: true, json: async () => ({}) });
    expect(await fetchExchangeRate('USD', 'USD')).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns null for an unsupported currency without calling fetch', async () => {
    expect(FRANKFURTER_UNSUPPORTED).toContain('AED');
    const fetchMock = mockFetchOnce({ ok: true, json: async () => ({}) });
    expect(await fetchExchangeRate('USD', 'AED')).toBeNull();
    expect(await fetchExchangeRate('AED', 'USD')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the rate from a successful response', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ amount: 1, base: 'USD', date: '2026-08-21', rates: { EUR: 0.92 } }) });
    expect(await fetchExchangeRate('USD', 'EUR')).toBe(0.92);
  });

  it('returns null on a non-2xx response', async () => {
    mockFetchOnce({ ok: false });
    expect(await fetchExchangeRate('USD', 'EUR')).toBeNull();
  });

  it('returns null when the response has no rate for the target currency', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ rates: {} }) });
    expect(await fetchExchangeRate('USD', 'EUR')).toBeNull();
  });

  it('returns null instead of throwing on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    expect(await fetchExchangeRate('USD', 'EUR')).toBeNull();
  });

  it('returns null instead of throwing when the response body is not valid JSON', async () => {
    mockFetchOnce({
      ok: true,
      json: async () => {
        throw new Error('invalid json');
      },
    });
    expect(await fetchExchangeRate('USD', 'EUR')).toBeNull();
  });
});
