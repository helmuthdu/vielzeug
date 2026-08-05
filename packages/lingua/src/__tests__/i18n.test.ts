import { describe, expect, test, vi } from 'vitest';

import {
  LinguaDisposedError,
  LinguaInvalidStateError,
  LinguaMissingCatalogError,
  createTranslationStore,
  hydrateTranslationStore,
} from '../';

const catalogs = {
  en: { greeting: 'Hello {name}', inbox: { plural: { one: 'One', other: '{count} messages' } }, title: 'Home' },
  fr: { greeting: 'Bonjour {name}', inbox: { plural: { one: 'Un', other: '{count} messages' } }, title: 'Accueil' },
} as const;

describe('createTranslationStore', () => {
  test('translates declared catalog keys and updates active locale', async () => {
    const i18n = createTranslationStore({ catalogs, locale: 'en' });

    expect(i18n.translate('title')).toBe('Home');
    expect(i18n.translate('greeting', { values: { name: 'Ada' } })).toBe('Hello Ada');

    await i18n.setLocale('fr');

    expect(i18n.translate('title')).toBe('Accueil');
    expect(i18n.translate('inbox', { count: 2 })).toBe('2 messages');
  });

  test('loads one declared lazy catalog once and refreshes active translation', async () => {
    const loadFrench = vi.fn(async () => catalogs.fr);
    const i18n = createTranslationStore({ catalogs: { en: catalogs.en, fr: loadFrench }, locale: 'fr' });
    const listener = vi.fn();

    i18n.subscribe(listener);
    expect(i18n.translateDynamic('title')).toBe('title');

    await Promise.all([i18n.load(), i18n.load()]);

    expect(loadFrench).toHaveBeenCalledTimes(1);
    expect(i18n.translate('title')).toBe('Accueil');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('switches locale independently from catalog loading', async () => {
    const i18n = createTranslationStore({ catalogs: { en: catalogs.en, fr: async () => catalogs.fr }, locale: 'en' });

    await i18n.setLocale('fr');
    expect(i18n.translateDynamic('title')).toBe('title');

    await i18n.load();

    expect(i18n.translate('title')).toBe('Accueil');
    expect(i18n.isLoaded()).toBe(true);
  });

  test('reports missing catalog locales explicitly', async () => {
    const i18n = createTranslationStore({ catalogs: { en: catalogs.en }, locale: 'en' });

    await expect(i18n.load({ locale: 'fr' })).rejects.toBeInstanceOf(LinguaMissingCatalogError);
  });

  test('subscriptions receive stable immutable translator snapshots and support abort cleanup', async () => {
    const i18n = createTranslationStore({ catalogs, locale: 'en' });
    const signal = new AbortController();
    const snapshots: string[] = [];

    expect(i18n.getSnapshot()).toBe(i18n.getSnapshot());
    i18n.subscribe((snapshot) => snapshots.push(`${snapshot.locale}:${snapshot.revision}`), { signal: signal.signal });
    await i18n.setLocale('fr');
    signal.abort();
    await i18n.setLocale('en');

    expect(snapshots).toEqual(['fr:1']);
  });

  test('serializes loaded catalogs and hydrates a matching store', async () => {
    const server = createTranslationStore({ catalogs, locale: 'en' });
    const client = hydrateTranslationStore(server.serialize());

    expect(client.locale).toBe('en');
    expect(client.translate('title')).toBe('Home');
  });

  test('uses fallback catalog after it loads', async () => {
    const i18n = createTranslationStore({
      catalogs: { en: async () => ({ empty: 'Fallback' }), fr: {} },
      fallback: 'en',
      locale: 'fr',
    });

    expect(i18n.translateDynamic('empty')).toBe('empty');
    await i18n.load({ locale: 'en' });

    expect(i18n.translateDynamic('empty')).toBe('Fallback');
  });

  test('isolates subscriber errors without rejecting a committed locale change', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const i18n = createTranslationStore({ catalogs, locale: 'en' });
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
    const i18n = createTranslationStore({ catalogs: { en: catalogs.en, fr: async () => catalogs.fr }, locale: 'fr' });

    await i18n.load();

    const state = i18n.serialize();

    expect(state.catalogs.fr).toEqual(catalogs.fr);
    expect(JSON.stringify(state)).not.toContain('async');
  });

  test('rejects unsupported serialized state versions with a lingua error', () => {
    expect(() => hydrateTranslationStore({ catalogs: {}, locale: 'en', version: 2 } as never)).toThrow(
      LinguaInvalidStateError,
    );
  });

  test('disposal aborts external work and rejects future state mutations', async () => {
    const i18n = createTranslationStore({ catalogs, locale: 'en' });
    const dispose = i18n[Symbol.dispose];

    dispose();

    expect(i18n.disposalSignal.aborted).toBe(true);
    await expect(i18n.setLocale('fr')).rejects.toBeInstanceOf(LinguaDisposedError);
    await expect(i18n.load()).rejects.toBeInstanceOf(LinguaDisposedError);
    expect(() => i18n.subscribe(() => {})).toThrow(LinguaDisposedError);
  });
});
