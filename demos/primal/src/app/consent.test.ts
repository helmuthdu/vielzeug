import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The consent store reads localStorage at module load (the gate must answer
 * synchronously before the vault opens), so each scenario stubs storage and
 * re-imports the module fresh.
 */
async function loadConsentStore(stored: string | null) {
  const entries = new Map<string, string>(stored !== null ? [['primal:consent', stored]] : []);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    removeItem: (key: string) => entries.delete(key),
    setItem: (key: string, value: string) => entries.set(key, value),
  });
  vi.resetModules();
  return { ...(await import('./consent')), entries };
}

describe('consent store', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts undecided with the banner open when nothing is stored', async () => {
    const store = await loadConsentStore(null);

    expect(store.consent.peek()).toEqual({ decided: false, music: false });
    expect(store.musicAllowed()).toBe(false);
    expect(store.consentBannerOpen.peek()).toBe(true);
  });

  it('starts decided and closed when a granted record is stored', async () => {
    const store = await loadConsentStore(JSON.stringify({ decided: true, music: true }));

    expect(store.musicAllowed()).toBe(true);
    expect(store.consentBannerOpen.peek()).toBe(false);
  });

  it('treats a stored rejection as decided but not allowed', async () => {
    const store = await loadConsentStore(JSON.stringify({ decided: true, music: false }));

    expect(store.musicAllowed()).toBe(false);
    expect(store.consentBannerOpen.peek()).toBe(false);
  });

  it('ignores a corrupt stored record and asks again', async () => {
    const store = await loadConsentStore('{not json');

    expect(store.consent.peek()).toEqual({ decided: false, music: false });
    expect(store.consentBannerOpen.peek()).toBe(true);
  });

  it('saveConsent persists the decision, updates the signal, and closes the banner', async () => {
    const store = await loadConsentStore(null);

    store.saveConsent({ essential: true, music: true });

    expect(store.musicAllowed()).toBe(true);
    expect(store.consentBannerOpen.peek()).toBe(false);
    expect(JSON.parse(store.entries.get('primal:consent') ?? '{}')).toEqual({ decided: true, music: true });
  });

  it('saveConsent records a rejection as decided without access', async () => {
    const store = await loadConsentStore(null);

    store.saveConsent({ essential: true, music: false });

    expect(store.musicAllowed()).toBe(false);
    expect(store.consent.peek().decided).toBe(true);
  });

  it('requestMusicConsent re-opens the banner for revising a stored decision', async () => {
    const store = await loadConsentStore(JSON.stringify({ decided: true, music: false }));

    store.requestMusicConsent();

    expect(store.consentBannerOpen.peek()).toBe(true);
  });
});
