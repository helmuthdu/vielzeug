import { describe, expect, test, vi } from 'vitest';

import { LinguaDisposedError, LinguaInvalidStateError, LinguaMissingResourceError, createI18n, hydrateI18n } from '../';

const core = {
  en: { greeting: 'Hello {name}', inbox: { plural: { one: 'One', other: '{count} messages' } } },
  fr: { greeting: 'Bonjour {name}', inbox: { plural: { one: 'Un', other: '{count} messages' } } },
} as const;

describe('createI18n', () => {
  test('builds an immutable translator snapshot from declared core resources', async () => {
    const i18n = createI18n({ locale: 'en', resources: { core } });

    expect(i18n.translate('greeting', { values: { name: 'Ada' } })).toBe('Hello Ada');
    expect(i18n.getSnapshot().translator).toBe(i18n.getSnapshot().translator);

    await i18n.setLocale('fr');

    expect(i18n.translate('greeting', { values: { name: 'Ada' } })).toBe('Bonjour Ada');
  });

  test('loads declared feature resources once and notifies only active locale state', async () => {
    const loadSettings = vi.fn(async () => ({ title: 'Settings' }));
    const i18n = createI18n({
      locale: 'en',
      resources: { core, settings: { en: loadSettings, fr: async () => ({ title: 'Réglages' }) } },
    });
    const listener = vi.fn();

    i18n.subscribe(listener);
    await Promise.all([i18n.load('settings'), i18n.load('settings')]);

    expect(loadSettings).toHaveBeenCalledTimes(1);
    expect(i18n.translate('title')).toBe('Settings');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('loads requested feature resources while switching locale', async () => {
    const i18n = createI18n({
      locale: 'en',
      resources: { core, settings: { en: { title: 'Settings' }, fr: async () => ({ title: 'Réglages' }) } },
    });

    await i18n.setLocale('fr', { load: ['settings'] });

    expect(i18n.translate('title')).toBe('Réglages');
    expect(i18n.isLoaded('settings')).toBe(true);
  });

  test('reports missing resource/locale combinations explicitly', async () => {
    const i18n = createI18n({ locale: 'en', resources: { core } });

    await expect(i18n.load('settings')).rejects.toBeInstanceOf(LinguaMissingResourceError);
  });

  test('subscriptions receive stable immutable snapshots and support abort cleanup', async () => {
    const i18n = createI18n({ locale: 'en', resources: { core } });
    const signal = new AbortController();
    const snapshots: string[] = [];

    i18n.subscribe((snapshot) => snapshots.push(`${snapshot.locale}:${snapshot.revision}`), { signal: signal.signal });
    await i18n.setLocale('fr');
    signal.abort();
    await i18n.setLocale('en');

    expect(snapshots).toEqual(['fr:1']);
  });

  test('serializes loaded resource state and hydrates a new store', async () => {
    const server = createI18n({ locale: 'en', resources: { core, settings: { en: { title: 'Settings' } } } });

    await server.load('settings');

    const client = hydrateI18n(server.serialize());

    expect(client.locale).toBe('en');
    expect(client.translate('title')).toBe('Settings');
  });

  test('uses declared resource order when async resource keys overlap', async () => {
    let resolveAlpha!: (catalog: { title: string }) => void;
    let resolveBeta!: (catalog: { title: string }) => void;
    const i18n = createI18n({
      locale: 'en',
      resources: {
        alpha: { en: () => new Promise((resolve) => (resolveAlpha = resolve)) },
        beta: { en: () => new Promise((resolve) => (resolveBeta = resolve)) },
        core,
      },
    });

    const alpha = i18n.load('alpha');
    const beta = i18n.load('beta');

    resolveBeta({ title: 'Beta' });
    await beta;
    resolveAlpha({ title: 'Alpha' });
    await alpha;

    expect(i18n.translate('title')).toBe('Beta');
  });

  test('isolates subscriber errors without rejecting a committed locale change', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const i18n = createI18n({ locale: 'en', resources: { core } });
    const healthy = vi.fn();

    i18n.subscribe(() => {
      throw new Error('listener failed');
    });
    i18n.subscribe(healthy);

    await expect(i18n.setLocale('fr')).resolves.toBeUndefined();

    expect(i18n.locale).toBe('fr');
    expect(healthy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith('[@vielzeug/lingua] subscriber error', expect.any(Error));
    errorSpy.mockRestore();
  });

  test('serializes resolved catalogs, never loader functions', async () => {
    const i18n = createI18n({
      locale: 'en',
      resources: { core, settings: { en: async () => ({ title: 'Settings' }) } },
    });

    await i18n.load('settings');

    const state = i18n.serialize();

    expect(state.resources.settings?.en).toEqual({ title: 'Settings' });
    expect(JSON.stringify(state)).not.toContain('async');
  });

  test('rejects unsupported serialized state versions with a lingua error', () => {
    expect(() => hydrateI18n({ locale: 'en', resources: {}, version: 1 } as never)).toThrow(LinguaInvalidStateError);
  });

  test('disposal aborts external work and rejects future state mutations', async () => {
    const i18n = createI18n({ locale: 'en', resources: { core } });
    const dispose = i18n[Symbol.dispose];

    dispose();

    expect(i18n.disposalSignal.aborted).toBe(true);
    await expect(i18n.setLocale('fr')).rejects.toBeInstanceOf(LinguaDisposedError);
    expect(() => i18n.subscribe(() => {})).toThrow(LinguaDisposedError);
  });
});
