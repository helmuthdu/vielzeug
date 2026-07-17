import { describe, expect, test, vi } from 'vitest';

import { LinguaDisposedError, createI18n } from '../';

describe('createI18n — lifecycle', () => {
  describe('dispose()', () => {
    test('clears subscribers — no callbacks after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } } });
      let calls = 0;

      i18n.subscribe(() => calls++);
      i18n.dispose();

      expect(() => i18n.register('en', { hello: 'Hi' })).toThrow(LinguaDisposedError);
      expect(calls).toBe(0);
    });

    test('is idempotent — calling dispose() twice does not throw', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(() => {
        i18n.dispose();
        i18n.dispose();
      }).not.toThrow();
    });

    test('isLoaded returns false for all locales after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isLoaded('en')).toBe(true);
      i18n.dispose();
      expect(i18n.isLoaded('en')).toBe(false);
    });

    test('isRegistered returns false for all locales after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.isRegistered('en')).toBe(true);
      i18n.dispose();
      expect(i18n.isRegistered('en')).toBe(false);
    });

    test('disposed getter is false before dispose and true after', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.disposed).toBe(false);
      i18n.dispose();
      expect(i18n.disposed).toBe(true);
    });

    test('disposalSignal is not aborted before dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.disposalSignal.aborted).toBe(false);
    });

    test('disposalSignal is aborted after dispose', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.dispose();
      expect(i18n.disposalSignal.aborted).toBe(true);
    });

    test('[Symbol.dispose]() delegates to dispose()', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.disposed).toBe(false);
      i18n[Symbol.dispose]();
      expect(i18n.disposed).toBe(true);
    });

    test('t() after dispose returns onMissingKey result for every key', () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' } },
        onMissingKey: (k) => `MISSING:${k}`,
      });

      i18n.dispose();
      expect(i18n.t('hello')).toBe('MISSING:hello');
    });

    test('setLocale() after dispose throws [E007]', async () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.dispose();
      await expect(i18n.setLocale('en')).rejects.toThrow(LinguaDisposedError);
    });

    test('subscribe() after dispose throws [E007]', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.dispose();
      expect(() => i18n.subscribe(() => {})).toThrow(LinguaDisposedError);
    });

    test('extend() after dispose throws [E007]', () => {
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.dispose();

      expect(() => i18n.extend('ui', () => Promise.resolve({ btn: 'Click me' }))).toThrow(LinguaDisposedError);
    });

    test('setLocale() dispose race — silent return when disposed mid-await', async () => {
      let resolveLoader!: (m: Record<string, string>) => void;
      const lazyLoader = () =>
        new Promise<Record<string, string>>((res) => {
          resolveLoader = res;
        });
      const i18n = createI18n({ catalogs: { en: {} } });

      i18n.register('fr', lazyLoader);

      const setLocalePromise = i18n.setLocale('fr');

      i18n.dispose();
      resolveLoader({ bonjour: 'Hello' });
      await expect(setLocalePromise).resolves.toBeUndefined();
      expect(i18n.locale).toBe('en');
    });
  });

  describe('dispose() — register() guard', () => {
    test('register() after dispose throws [E007]', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      i18n.dispose();
      expect(() => i18n.register('en', { hello: 'Hi' })).toThrow(LinguaDisposedError);
    });

    test('has() on disposed instance returns false', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } } });

      expect(i18n.has('hello')).toBe(true);
      i18n.dispose();
      expect(i18n.has('hello')).toBe(false);
    });
  });

  describe('dispose() — scope() contract', () => {
    test('scope().t() after dispose returns onMissingKey result', () => {
      const i18n = createI18n({
        catalogs: { en: { nav: { home: 'Home' } } },
        onMissingKey: (k) => `[${k}]`,
      });
      const nav = i18n.scope('nav');

      expect(nav.t('home')).toBe('Home');
      i18n.dispose();
      expect(nav.t('home')).toBe('[nav.home]');
    });

    test('scope().has() after dispose returns false', () => {
      const i18n = createI18n({ catalogs: { en: { nav: { home: 'Home' } } } });
      const nav = i18n.scope('nav');

      expect(nav.has('home')).toBe(true);
      i18n.dispose();
      expect(nav.has('home')).toBe(false);
    });
  });

  describe('subscribe() — signal cleanup', () => {
    test('manual unsubscribe detaches the AbortSignal listener', () => {
      const i18n = createI18n({ catalogs: { en: {} } });
      const controller = new AbortController();
      const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

      const unsubscribe = i18n.subscribe(() => {}, { signal: controller.signal });

      unsubscribe();

      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    test('dispose detaches the AbortSignal listener for active subscriptions', () => {
      const i18n = createI18n({ catalogs: { en: {} } });
      const controller = new AbortController();
      const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

      i18n.subscribe(() => {}, { signal: controller.signal });
      i18n.dispose();

      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });
});
