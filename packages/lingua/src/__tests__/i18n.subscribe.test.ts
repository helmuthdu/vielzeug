import { describe, expect, test, vi } from 'vitest';

import type { I18nSnapshot } from '../';

import { createI18n } from '../';

describe('createI18n — subscribe()', () => {
  describe('subscribe()', () => {
    test('does not call the callback immediately by default', () => {
      const listener = vi.fn();

      createI18n({ locale: 'en' }).subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    test('calls the callback immediately with the current snapshot when immediate: true', () => {
      const i18n = createI18n({ catalogs: { en: { hello: 'Hello' } }, locale: 'en' });
      const callback = vi.fn<(snapshot: I18nSnapshot) => void>();

      i18n.subscribe(callback, { immediate: true });
      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(i18n.getSnapshot());
    });

    test('calls the callback with the updated snapshot on locale change', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const snapshots: I18nSnapshot[] = [];

      i18n.subscribe((snapshot) => snapshots.push(snapshot));
      await i18n.setLocale('fr');
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.locale).toBe('fr');
    });

    test('callback receives the exact snapshot reference returned by getSnapshot()', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      let received: I18nSnapshot | undefined;

      i18n.subscribe((snapshot) => {
        received = snapshot;
      });
      await i18n.setLocale('fr');
      expect(received).toBe(i18n.getSnapshot());
    });

    test('snapshot object reference changes on each locale change', async () => {
      const i18n = createI18n({
        catalogs: { de: {}, en: {}, fr: {} },
        locale: 'en',
      });
      const snapshots: object[] = [];

      i18n.subscribe((s) => snapshots.push(s));
      await i18n.setLocale('fr');
      await i18n.setLocale('de');
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]).not.toBe(snapshots[1]);
      expect((snapshots[0] as { locale: string }).locale).toBe('fr');
      expect((snapshots[1] as { locale: string }).locale).toBe('de');
    });

    test('unsubscribe stops future callbacks', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
      });
      const callback = vi.fn();
      const unsubscribe = i18n.subscribe(callback);

      unsubscribe();
      await i18n.setLocale('fr');
      expect(callback).not.toHaveBeenCalled();
    });

    test('isolates listener failures so remaining subscribers still run', async () => {
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
        onSubscriberError: () => {},
      });
      const bad = vi.fn(() => {
        throw new Error('boom');
      });
      const good = vi.fn();

      i18n.subscribe(bad);
      i18n.subscribe(good);
      await i18n.setLocale('fr');
      expect(good).toHaveBeenCalledOnce();
    });

    test('default onSubscriberError logs to console.error', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('boom');
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });

      i18n.subscribe(() => {
        throw error;
      });
      await i18n.setLocale('fr');
      expect(spy).toHaveBeenCalledWith('[@vielzeug/lingua] subscriber error', error);
      spy.mockRestore();
    });

    test('reports listener failures through onSubscriberError', async () => {
      const onSubscriberError = vi.fn();
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' } },
        locale: 'en',
        onSubscriberError,
      });

      i18n.subscribe(() => {
        throw new Error('listener failed');
      });

      await i18n.setLocale('fr');
      expect(onSubscriberError).toHaveBeenCalledTimes(1);
    });

    test('supports self-unsubscribe during dispatch', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const calls: string[] = [];

      const stop = i18n.subscribe(() => {
        calls.push('self');
        stop();
      });

      i18n.subscribe(() => calls.push('other'));

      await i18n.setLocale('fr');
      await i18n.setLocale('en');

      expect(calls).toEqual(['self', 'other', 'other']);
    });

    test('does not run listeners added during an in-flight dispatch until next change', async () => {
      const i18n = createI18n({ catalogs: { de: {}, en: {}, fr: {} }, locale: 'en' });
      const late = vi.fn();

      i18n.subscribe(() => {
        i18n.subscribe(late);
      });

      await i18n.setLocale('fr');
      expect(late).toHaveBeenCalledTimes(0);

      await i18n.setLocale('de');
      expect(late).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe() — signal option', () => {
    test('unsubscribes when the provided AbortSignal fires', async () => {
      const i18n = createI18n({ catalogs: { de: {}, en: {}, fr: {} }, locale: 'en' });
      const controller = new AbortController();
      const calls: string[] = [];

      i18n.subscribe(({ locale }) => calls.push(locale), { signal: controller.signal });

      await i18n.setLocale('fr');
      controller.abort();
      await i18n.setLocale('de');

      expect(calls).toEqual(['fr']);
    });

    test('does not subscribe when signal is already aborted', async () => {
      const i18n = createI18n({ catalogs: { en: {}, fr: {} }, locale: 'en' });
      const controller = new AbortController();

      controller.abort();

      const callback = vi.fn();

      i18n.subscribe(callback, { signal: controller.signal });
      await i18n.setLocale('fr');

      expect(callback).not.toHaveBeenCalled();
    });

    test('already-aborted signal with immediate: true does not call callback', () => {
      const i18n = createI18n({ catalogs: { en: {} }, locale: 'en' });
      const controller = new AbortController();

      controller.abort();

      const callback = vi.fn();

      i18n.subscribe(callback, { immediate: true, signal: controller.signal });

      expect(callback).not.toHaveBeenCalled();
    });

    test('subscriber that throws on immediate is not added to the active subscriber set', async () => {
      const errors: unknown[] = [];
      const i18n = createI18n({
        catalogs: { en: {}, fr: {} },
        locale: 'en',
        onSubscriberError: (e) => errors.push(e),
      });

      let callCount = 0;
      const throwingCb = vi.fn(() => {
        callCount++;
        throw new Error('immediate error');
      });

      i18n.subscribe(throwingCb, { immediate: true });

      // The immediate invocation threw — onSubscriberError was called
      expect(errors).toHaveLength(1);

      // Trigger a bump; the subscriber must NOT fire again
      await i18n.setLocale('fr');
      expect(callCount).toBe(1);
    });
  });

  describe('subscribe() — immediate callback throw', () => {
    test('immediate callback throw invokes onSubscriberError and does not register', () => {
      const errors: unknown[] = [];
      const i18n = createI18n({
        catalogs: { en: { hello: 'Hello' } },
        onSubscriberError: (e) => errors.push(e),
      });
      const boom = new Error('boom');
      const calls: number[] = [];

      i18n.subscribe(
        () => {
          throw boom;
        },
        { immediate: true },
      );

      expect(errors).toEqual([boom]);

      // subscriber was not registered — catalog change should not trigger it
      i18n.register('en', { hello: 'Hi' });
      expect(calls).toHaveLength(0);
    });
  });
});
