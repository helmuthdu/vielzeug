import { describe, expect, test, vi } from 'vitest';

import {
  type Catalog,
  createI18n,
  LinguaDisposedError,
  LinguaInvalidStateError,
  LinguaMissingCatalogError,
  LinguaMissingKeyError,
} from '../';

const enCatalog = {
  greeting: 'Hello {name}',
  inbox: { plural: { one: 'One', other: '{count} messages' } },
  title: 'Home',
};

const frCatalog = {
  greeting: 'Bonjour {name}',
  inbox: { plural: { one: 'Un', other: '{count} messages' } },
  title: 'Accueil',
};

const catalogs: Record<string, Catalog> = { en: enCatalog, fr: frCatalog };

describe('createI18n', () => {
  test('eagerly translates static catalogs and updates active locale', async () => {
    const i18n = createI18n<Catalog>({ catalogs, locale: 'en' });

    expect(i18n.translate('title')).toBe('Home');
    expect(i18n.translate('greeting', { values: { name: 'Ada' } })).toBe('Hello Ada');

    await i18n.setLocale('fr');

    expect(i18n.translate('title')).toBe('Accueil');
    expect(i18n.translate('inbox', { count: 2 })).toBe('2 messages');
  });

  test('loads one lazy catalog once and refreshes active translation', async () => {
    const loadFrench = vi.fn(async () => frCatalog);
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) => (locale === 'fr' ? loadFrench() : enCatalog),
      locale: 'fr',
    });
    const listener = vi.fn();

    i18n.subscribe(listener);
    expect(() => i18n.translateDynamic('title')).toThrow(LinguaMissingCatalogError);

    await Promise.all([i18n.load(), i18n.load()]);

    expect(loadFrench).toHaveBeenCalledTimes(1);
    expect(i18n.translate('title')).toBe('Accueil');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('loads the selected catalog while switching locale', async () => {
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) => (locale === 'fr' ? Promise.resolve(frCatalog) : enCatalog),
      locale: 'en',
    });

    await i18n.load();
    await i18n.setLocale('fr');

    expect(i18n.translate('title')).toBe('Accueil');
    expect(i18n.isLoaded()).toBe(true);
  });

  test('keeps locale and snapshot unchanged when selected catalog loading fails', async () => {
    const i18n = createI18n<Catalog>({
      catalogs: { en: enCatalog },
      loadCatalog: () => Promise.reject(new LinguaMissingCatalogError('Catalog unavailable.')),
      locale: 'en',
    });
    const snapshot = i18n.getSnapshot();

    await expect(i18n.setLocale('de')).rejects.toBeInstanceOf(LinguaMissingCatalogError);

    expect(i18n.locale).toBe('en');
    expect(i18n.getSnapshot()).toBe(snapshot);
    expect(i18n.translate('title')).toBe('Home');
  });

  test('commits only the latest concurrent locale selection', async () => {
    let resolveFrench!: (catalog: Catalog) => void;
    const french = new Promise<Catalog>((resolve) => {
      resolveFrench = resolve;
    });
    const i18n = createI18n<Catalog>({
      catalogs: { en: enCatalog },
      loadCatalog: (locale) => (locale === 'fr' ? french : { ...enCatalog, title: 'Startseite' }),
      locale: 'en',
    });

    const selectFrench = i18n.setLocale('fr');
    const selectGerman = i18n.setLocale('de');

    await selectGerman;
    resolveFrench(frCatalog);
    await selectFrench;

    expect(i18n.locale).toBe('de');
    expect(i18n.translate('title')).toBe('Startseite');
  });

  test('reports missing catalog locales explicitly', async () => {
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) =>
        catalogs[locale] ?? Promise.reject(new LinguaMissingCatalogError(`No catalog for ${locale}`)),
      locale: 'en',
    });

    await i18n.load();

    await expect(i18n.load({ locale: 'de' })).rejects.toBeInstanceOf(LinguaMissingCatalogError);
  });

  test('reports catalog readiness before an asynchronous initial load completes', async () => {
    const i18n = createI18n<Catalog>({ loadCatalog: async () => enCatalog, locale: 'en' });

    expect(() => i18n.translateDynamic('title')).toThrow(LinguaMissingCatalogError);
    await i18n.load();
    expect(i18n.translate('title')).toBe('Home');
  });

  test('requires a catalog source or serialized state at compile time', () => {
    const invalidConfigurations = (): void => {
      // @ts-expect-error An i18n instance needs catalogs, a loader, or serialized state.
      createI18n();
      // @ts-expect-error A locale alone cannot provide translations.
      createI18n({ locale: 'en' });
    };

    expect(invalidConfigurations).toBeTypeOf('function');
  });

  test('subscriptions receive stable immutable translator snapshots and support abort cleanup', async () => {
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) => catalogs[locale] ?? enCatalog,
      locale: 'en',
    });
    const signal = new AbortController();
    const snapshots: string[] = [];

    expect(i18n.getSnapshot()).toBe(i18n.getSnapshot());
    i18n.subscribe((snapshot) => snapshots.push(`${snapshot.locale}:${snapshot.revision}`), { signal: signal.signal });
    await i18n.setLocale('fr');
    signal.abort();
    await i18n.setLocale('en');

    expect(snapshots).toEqual(['fr:1']);
  });

  test('serializes loaded catalogs and hydrates the serialized locale', async () => {
    const server = createI18n<Catalog>({ catalogs, locale: 'fr' });
    const client = createI18n<Catalog>({ state: server.serialize() });

    expect(client.locale).toBe('fr');
    expect(client.getSnapshot().locale).toBe('fr');
    expect(client.translate('title')).toBe('Accueil');
  });

  test('loads the active locale and configured fallback chain together', async () => {
    const loadCatalog = vi.fn((locale: string): Catalog => (locale === 'en' ? { empty: 'Fallback' } : {}));
    const i18n = createI18n<Catalog>({ fallback: 'en', loadCatalog, locale: 'fr' });

    await i18n.load();

    expect(loadCatalog.mock.calls.map(([locale]) => locale)).toEqual(['fr', 'en']);
    expect(i18n.isLoaded({ locale: 'en' })).toBe(true);
    expect(i18n.translateDynamic('empty')).toBe('Fallback');
  });

  test('isolates subscriber errors without rejecting a committed locale change', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) => catalogs[locale] ?? enCatalog,
      locale: 'en',
    });
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
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) => (locale === 'fr' ? Promise.resolve(frCatalog) : enCatalog),
      locale: 'fr',
    });

    await i18n.load();

    const state = i18n.serialize();

    expect(state.catalogs.fr).toEqual(frCatalog);
    expect(JSON.stringify(state)).not.toContain('async');
  });

  test('rejects unsupported serialized state versions with a lingua error', () => {
    expect(() => createI18n({ state: { catalogs: {}, locale: 'en', version: 3 } as never })).toThrow(
      LinguaInvalidStateError,
    );
  });

  test('disposal aborts external work and rejects future state mutations', async () => {
    const i18n = createI18n<Catalog>({
      loadCatalog: (locale) => catalogs[locale] ?? enCatalog,
      locale: 'en',
    });
    const dispose = i18n[Symbol.dispose];

    dispose();

    expect(i18n.disposalSignal.aborted).toBe(true);
    await expect(i18n.setLocale('fr')).rejects.toBeInstanceOf(LinguaDisposedError);
    await expect(i18n.load()).rejects.toBeInstanceOf(LinguaDisposedError);
    expect(() => i18n.subscribe(() => {})).toThrow(LinguaDisposedError);
  });

  test('missing: "throw" propagates from translator snapshots', () => {
    const i18n = createI18n<Catalog>({
      catalogs: { en: enCatalog },
      locale: 'en',
      missing: 'throw',
    });

    expect(() => i18n.translateDynamic('unknown')).toThrow(LinguaMissingKeyError);
  });
});
