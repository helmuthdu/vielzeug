import { describe, expect, test, vi } from 'vitest';

import { LinguaDisposedError, LinguaRestoreError, createI18n } from '../';

describe('createI18n — SSR (getState/restoreState)', () => {
  describe('getState() / restoreState() — basic round-trip', () => {
    test('getState() returns the active locale and all loaded catalogs', () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello', nav: { home: 'Home' } } },
        locale: 'en',
      });
      const state = i18n.getState();

      expect(state.locale).toBe('en');
      expect(state.catalogs['en']?.['hello']).toBe('Hello');
      expect(state.catalogs['en']?.['nav.home']).toBe('Home');
    });

    test('getState() only includes already-loaded catalogs (not pending loaders)', async () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });
      const stateBefore = i18n.getState();

      expect(Object.keys(stateBefore.catalogs)).toEqual(['en']);

      await i18n.preload('fr');

      const stateAfter = i18n.getState();

      expect(Object.keys(stateAfter.catalogs)).toContain('fr');
    });

    test('restoreState() hydrates catalogs and switches locale', () => {
      const server = createI18n({
        catalogs: { de: { title: 'Titel' }, en: { title: 'Title' } },
        locale: 'de',
      });
      const state = server.getState();

      const client = createI18n({ catalogs: { de: {}, en: {} } });

      client.restoreState(state);
      expect(client.locale).toBe('de');
      expect(client.t('title')).toBe('Titel');
    });

    test('restoreState() adds previously unknown locales', () => {
      const state = {
        catalogs: { fr: { greeting: 'Bonjour' } },
        locale: 'fr',
      };
      const i18n = createI18n();

      i18n.restoreState(state);
      expect(i18n.t('greeting')).toBe('Bonjour');
      expect(i18n.getSupportedLocales()).toContain('fr');
    });

    test('restoreState() notifies subscribers', () => {
      const i18n = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const listener = vi.fn();

      i18n.subscribe(listener);
      i18n.restoreState({ catalogs: { de: {} }, locale: 'de' });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0]?.[0]?.locale).toBe('de');
    });

    test('restoreState() then t() resolves from restored catalog', () => {
      const i18n = createI18n();

      i18n.restoreState({ catalogs: { es: { hello: 'Hola' } }, locale: 'es' });
      expect(i18n.t('hello')).toBe('Hola');
    });

    test('restoreState() preserves active fallback chain resolution', () => {
      const server = createI18n({
        catalogs: { en: { title: 'Title' }, fr: {} },
        fallback: 'en',
        locale: 'fr',
      });
      const state = server.getState();

      const client = createI18n({ fallback: 'en', locale: 'fr' });

      client.restoreState(state);
      expect(client.t('title')).toBe('Title');
    });

    test('getState() → restoreState() round-trips correctly', async () => {
      const original = createI18n({
        catalogs: { en: { greeting: 'Hello, {name}!' }, fr: { greeting: 'Bonjour, {name}!' } },
        locale: 'en',
      });

      await original.preload('fr');

      const state = original.getState();
      const hydrated = createI18n();

      hydrated.restoreState(state);
      expect(hydrated.locale).toBe('en');
      expect(hydrated.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');

      await hydrated.setLocale('fr');
      expect(hydrated.t('greeting', { name: 'Alice' })).toBe('Bonjour, Alice!');
    });
  });

  describe('restoreState() — knownLocales consistency', () => {
    test('throws LinguaRestoreError when state.locale is absent from state.catalogs', () => {
      const i18n = createI18n();

      expect(() => i18n.restoreState({ catalogs: {}, locale: 'fr' })).toThrow(LinguaRestoreError);
    });

    test('active locale appears in getSupportedLocales() after valid restoreState()', () => {
      const i18n = createI18n();

      i18n.restoreState({ catalogs: { fr: { hello: 'Bonjour' } }, locale: 'fr' });
      expect(i18n.getSupportedLocales()).toContain('fr');
    });
  });

  describe('getState() — namespace semantics', () => {
    test('getState() includes namespace-patched keys in the flat catalog', async () => {
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } }, locale: 'en' });

      await i18n.extend('ui', () => Promise.resolve({ btn: 'Click me' }));

      const state = i18n.getState();

      expect(state.catalogs['en']).toMatchObject({ base: 'Base', btn: 'Click me' });
    });

    test('after restoreState(), extend() re-applies namespace keys', async () => {
      const source = createI18n({ catalogs: { en: { base: 'Base' } }, locale: 'en' });

      await source.extend('ui', () => Promise.resolve({ btn: 'Click me' }));

      const state = source.getState();
      const target = createI18n();

      target.restoreState(state);

      // Namespace registry not serialized — extend() re-registers and re-loads
      await target.extend('ui', () => Promise.resolve({ btn: 'Click me' }));

      expect(target.t('btn')).toBe('Click me');
    });
  });

  describe('getState() / restoreState() — errors and edge cases', () => {
    test('restoreState() throws LinguaDisposedError on disposed instance', () => {
      const i18n = createI18n();

      i18n.dispose();
      expect(() => i18n.restoreState({ catalogs: { en: {} }, locale: 'en' })).toThrow(LinguaDisposedError);
    });

    test('restoreState() clears namespace markers so extend() can re-apply', async () => {
      let calls = 0;
      const i18n = createI18n({ catalogs: { en: { base: 'Base' } }, locale: 'en' });

      await i18n.extend('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      expect(calls).toBe(1);

      i18n.restoreState({ catalogs: { en: { base: 'Base2' } }, locale: 'en' });
      // btn is gone after restore
      expect(i18n.t('btn')).toBe('btn');

      // extend() re-applies because restoreState cleared the marker
      await i18n.extend('ui', async () => {
        calls++;

        return { btn: 'Click' };
      });
      expect(calls).toBe(2);
      expect(i18n.t('btn')).toBe('Click');
    });

    test('getState() only includes fully loaded catalogs', () => {
      const i18n = createI18n({
        catalogs: {
          en: { hello: 'Hello' },
          fr: async () => ({ hello: 'Bonjour' }),
        },
        locale: 'en',
      });
      const state = i18n.getState();

      expect(Object.keys(state.catalogs)).toEqual(['en']);
    });
  });
});
