import { describe, expect, test, vi } from 'vitest';

import { LinguaError, LinguaNamespaceMissingError, createI18n } from '../';

describe('createI18n — namespaces', () => {
  describe('registerNamespace() / loadNamespace()', () => {
    test('registerNamespace() registers without loading', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => ({ btn: 'Click' }));
      expect(i18n.isNamespaceLoaded('ui')).toBe(false);
      expect(i18n.t('btn')).toBe('btn');
    });

    test('loadNamespace() loads after registerNamespace()', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => ({ btn: 'Click' }));
      await i18n.loadNamespace('ui');
      expect(i18n.isNamespaceLoaded('ui')).toBe(true);
      expect(i18n.t('btn')).toBe('Click');
    });

    test('loadNamespace() deduplicates concurrent calls', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      await Promise.all([i18n.loadNamespace('ui'), i18n.loadNamespace('ui'), i18n.loadNamespace('ui')]);
      expect(calls).toBe(1);
    });

    test('loadNamespace() is a no-op after the namespace is already loaded', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.registerNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      await i18n.loadNamespace('ui');
      await i18n.loadNamespace('ui');
      await i18n.loadNamespace('ui');
      expect(calls).toBe(1);
    });

    test('loadNamespace() rejects when namespace is not registered', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      await expect(i18n.loadNamespace('unregistered')).rejects.toThrow('not registered');
      await expect(i18n.loadNamespace('unregistered')).rejects.toBeInstanceOf(LinguaNamespaceMissingError);
      await expect(i18n.loadNamespace('unregistered')).rejects.toBeInstanceOf(LinguaError);
    });

    test('isNamespaceLoaded() with explicit locale argument', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.registerNamespace('ui', async (locale) => (locale === 'fr' ? { btn: 'Cliquer' } : { btn: 'Click' }));
      await i18n.loadNamespace('ui', undefined, 'fr');
      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(true);
      expect(i18n.isNamespaceLoaded('ui', 'en')).toBe(false);
    });

    test('isNamespaceLoaded() throws for invalid locale tags', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      expect(() => i18n.isNamespaceLoaded('ui', 'not-a-valid-locale!!!')).toThrow(/BCP 47/);
    });

    test('loadNamespace(ns, factory) = registerNamespace + load in one call', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });

      await i18n.loadNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      expect(calls).toBe(1);
      expect(i18n.isNamespaceLoaded('ui')).toBe(true);
      expect(i18n.t('btn')).toBe('Click');
    });

    test('a new factory after loading updates the registry but does not reload until the marker is cleared', async () => {
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } } });

      await i18n.loadNamespace('ui', () => Promise.resolve({ btn: 'Click A' }));
      expect(i18n.t('btn')).toBe('Click A');

      // New factory: registered for future loads, but no reload while the marker stands.
      await i18n.loadNamespace('ui', () => Promise.resolve({ btn: 'Click B' }));
      expect(i18n.t('btn')).toBe('Click A');

      // register() clears the marker — the new factory takes effect on the next load.
      i18n.register('en', { base: 'Base' });
      await i18n.loadNamespace('ui', () => Promise.resolve({ btn: 'Click B' }));
      expect(i18n.t('btn')).toBe('Click B');
    });

    test('loadNamespace() with a non-function factory throws a migration error (old two-arg form)', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      expect(() => i18n.loadNamespace('ui', 'fr' as never)).toThrow(/factory must be a function/);
    });

    test('loadNamespace() for a specific locale does not notify when locale is not in active chain', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const listener = vi.fn();

      i18n.registerNamespace('ui', async () => ({ btn: 'Cliquer' }));
      i18n.subscribe(listener);
      await i18n.loadNamespace('ui', undefined, 'fr');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('restoreState() namespace marker reset', () => {
    test('restoreState() clears markers for locales removed from state', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.registerNamespace('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });

      await i18n.loadNamespace('ui', undefined, 'fr');
      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(true);
      expect(calls).toBe(1);

      i18n.restoreState({ catalogs: { en: {} }, locale: 'en', version: 1 });

      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(false);

      await i18n.loadNamespace('ui', undefined, 'fr');
      expect(calls).toBe(2);
      expect(i18n.isNamespaceLoaded('ui', 'fr')).toBe(true);
    });
  });

  describe('loadNamespace() as catalog overlay', () => {
    test('adds new keys to an existing static catalog', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.loadNamespace('extra', () => Promise.resolve({ world: 'World' }));
      expect(i18n.t('hello')).toBe('Hello');
      expect(i18n.t('world')).toBe('World');
    });

    test('overlays keys into existing catalog via namespace', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.loadNamespace('patch', () => Promise.resolve({ hello: 'Hi' }));
      expect(i18n.t('hello')).toBe('Hi');
    });

    test('supports nested message objects and preserves sibling keys', async () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });

      await i18n.loadNamespace('extra', () =>
        Promise.resolve({ footer: { contact: 'Contact' }, nav: { about: 'About' } }),
      );
      expect(i18n.t('nav.home')).toBe('Home');
      expect(i18n.t('nav.about')).toBe('About');
      expect(i18n.t('footer.contact')).toBe('Contact');
    });

    test('notifies subscribers after loading namespace into the active locale', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.loadNamespace('extra', () => Promise.resolve({ world: 'World' }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('does not notify subscribers when loading namespace into an inactive locale', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.loadNamespace('extra', () => Promise.resolve({ world: 'Monde' }), 'fr');
      expect(listener).not.toHaveBeenCalled();
    });

    test('concurrent loadNamespace() calls are deduped — factory called once', async () => {
      let factoryCalls = 0;
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });
      const factory = () => {
        factoryCalls++;

        return Promise.resolve({ a: 'A', b: 'B' });
      };

      await Promise.all([i18n.loadNamespace('extra', factory), i18n.loadNamespace('extra', factory)]);
      expect(factoryCalls).toBe(1);
      expect(i18n.t('a')).toBe('A');
      expect(i18n.t('b')).toBe('B');
    });

    test('register() after loadNamespace() fully replaces the catalog, discarding overlay keys', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });

      await i18n.loadNamespace('extra', () => Promise.resolve({ world: 'World' }));
      expect(i18n.t('world')).toBe('World');

      i18n.register('en', { hello: 'Hi' });
      expect(i18n.t('hello')).toBe('Hi');
      expect(i18n.t('world')).toBe('world');
    });

    test('notifies subscribers and resolves via fallback when loading into a fallback locale', async () => {
      const i18n = createI18n({
        catalogs: { en: {}, fr: {} },
        fallback: 'fr',
        locale: 'en',
      });
      const listener = vi.fn();

      i18n.subscribe(listener);
      await i18n.loadNamespace('extra', () => Promise.resolve({ extra: 'Supplément' }), 'fr');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(i18n.t('extra')).toBe('Supplément');
    });
  });

  describe('namespaces', () => {
    test('loadNamespace() patches translations into the active locale catalog', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.loadNamespace('settings', () => Promise.resolve({ lang: 'Language', theme: 'Theme' }) as any);

      expect(i18n.t('theme')).toBe('Theme');
      expect(i18n.t('lang')).toBe('Language');
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('loadNamespace() loads for a specific locale', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      await i18n.loadNamespace(
        'nav',
        (locale) => Promise.resolve(locale === 'fr' ? { home: 'Accueil' } : { home: 'Home' }),
        'fr',
      );
      await i18n.setLocale('fr');

      expect(i18n.t('home')).toBe('Accueil');
    });

    test('loadNamespace() deduplicates concurrent calls (source loaded at most once)', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });
      const factory = () => {
        calls++;

        return Promise.resolve({ x: 'X' });
      };

      await Promise.all([
        i18n.loadNamespace('settings', factory),
        i18n.loadNamespace('settings', factory),
        i18n.loadNamespace('settings', factory),
      ]);
      expect(calls).toBe(1);
    });

    test('loadNamespace() is a no-op on repeated calls after loading', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });
      const factory = () => {
        calls++;

        return Promise.resolve({ x: 'X' });
      };

      await i18n.loadNamespace('settings', factory);
      await i18n.loadNamespace('settings', factory);
      await i18n.loadNamespace('settings', factory);
      expect(calls).toBe(1);
    });

    test('loadNamespace() uses the active locale when locale argument is omitted', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'fr' });

      await i18n.loadNamespace('ui', (locale) =>
        Promise.resolve(locale === 'fr' ? { save: 'Sauvegarder' } : { save: 'Save' }),
      );

      expect(i18n.t('save')).toBe('Sauvegarder');
    });

    test('loadNamespace() supports async factory sources', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      await i18n.loadNamespace('settings', async () => ({ lang: 'Language' }) as any);

      expect(i18n.t('lang')).toBe('Language');
      expect(i18n.t('hello')).toBe('Hello');
    });

    test('different locales are tracked independently per namespace', async () => {
      let enCalls = 0;
      let frCalls = 0;
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const factory = (locale: string) => {
        if (locale === 'en') enCalls++;
        else frCalls++;

        return Promise.resolve(locale === 'fr' ? { save: 'Sauvegarder' } : { save: 'Save' });
      };

      await i18n.loadNamespace('ui', factory, 'en');
      await i18n.loadNamespace('ui', factory, 'fr');
      // Repeat — should not re-load
      await i18n.loadNamespace('ui', factory, 'en');
      await i18n.loadNamespace('ui', factory, 'fr');

      expect(enCalls).toBe(1);
      expect(frCalls).toBe(1);
    });

    test('register() clears namespace dedup markers so they can be re-applied', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } } });
      const factory = () => {
        calls++;

        return Promise.resolve({ extra: 'Extra' }) as any;
      };

      await i18n.loadNamespace('ui', factory);
      expect(calls).toBe(1);
      expect(i18n.t('extra')).toBe('Extra');

      // register() replaces the full catalog, discarding namespace-patched keys
      i18n.register('en', { base: 'NewBase' });
      expect(i18n.t('extra')).toBe('extra'); // key gone — returns key string

      // loadNamespace() should re-apply since register() cleared the marker
      await i18n.loadNamespace('ui', factory);
      expect(calls).toBe(2);
      expect(i18n.t('extra')).toBe('Extra');
    });

    test('restoreState() clears namespace dedup markers so they can be re-applied', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } } });
      const factory = () => {
        calls++;

        return Promise.resolve({ extra: 'Extra' }) as any;
      };

      await i18n.loadNamespace('ui', factory);
      expect(calls).toBe(1);
      expect(i18n.t('extra')).toBe('Extra');

      // restoreState() replaces the catalog — namespace keys are gone
      i18n.restoreState({ catalogs: { en: { base: 'RestoredBase' } }, locale: 'en', version: 1 });
      expect(i18n.t('extra')).toBe('extra'); // key gone

      // loadNamespace() should re-apply since restoreState() cleared the marker
      await i18n.loadNamespace('ui', factory);
      expect(calls).toBe(2);
      expect(i18n.t('extra')).toBe('Extra');
    });

    test('namespace task key with colon in name does not collide with locale', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: {} } });
      const factory = () => {
        calls++;

        return Promise.resolve({ profile: 'Profile' });
      };

      await i18n.loadNamespace('user:settings', factory);
      await i18n.loadNamespace('user:settings', factory); // no-op

      expect(calls).toBe(1);
      expect(i18n.t('profile')).toBe('Profile');
    });
  });

  describe('loadNamespace() on an unregistered locale', () => {
    test('creates a new catalog for the locale via namespace', async () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, fallback: 'fr', locale: 'en' });

      await i18n.loadNamespace('farewell', () => Promise.resolve({ bye: 'Au revoir' }), 'fr');

      await i18n.setLocale('fr');
      expect(i18n.t('bye')).toBe('Au revoir');
      expect(i18n.isLoaded('fr')).toBe(true);
    });
  });
});
