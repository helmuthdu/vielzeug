import { describe, expect, test, vi } from 'vitest';

import { init as initReact, useI18n as useI18nReact } from '../adapters/react';
import { useI18n as useI18nSvelte } from '../adapters/svelte';
import { init as initVue, useI18n as useI18nVue } from '../adapters/vue';
import { createI18n } from '../index';

// ─── Fixture ─────────────────────────────────────────────────────────────────

const catalogs = {
  en: { greeting: 'Hello', items: { one: '{count} item', other: '{count} items' } },
  fr: { greeting: 'Bonjour', items: { one: '{count} article', other: '{count} articles' } },
} as const;

// ─── Vue adapter ─────────────────────────────────────────────────────────────

describe('vue adapter', () => {
  test('throws if init() has not been called', () => {
    // Fresh module state simulated by not calling initVue
    const i18n = createI18n({ catalogs, locale: 'en' });

    expect(() => useI18nVue(i18n)).toThrow('[i18nit/vue]');
  });

  test('init() registers shallowRef and onScopeDispose', () => {
    const disposals: Array<() => void> = [];
    const shallowRef = <T>(value: T) => ({ value });
    const onScopeDispose = (fn: () => void) => {
      disposals.push(fn);
    };

    initVue({ onScopeDispose, shallowRef });

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { locale, t, tp } = useI18nVue(i18n);

    expect(locale.value).toBe('en');
    expect(t('greeting')).toBe('Hello');
    expect(tp('items', 3)).toBe('3 items');
    expect(disposals.length).toBe(1); // onScopeDispose was called once
  });

  test('locale ref updates when setLocale is called', async () => {
    const shallowRef = <T>(value: T) => ({ value });
    const onScopeDispose = (_fn: () => void) => {};

    initVue({ onScopeDispose, shallowRef });

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { locale, t } = useI18nVue(i18n);

    expect(locale.value).toBe('en');

    await i18n.setLocale('fr');

    expect(locale.value).toBe('fr');
    expect(t('greeting')).toBe('Bonjour');
  });

  test('onScopeDispose callback unsubscribes from the i18n instance', async () => {
    let disposeFn: (() => void) | undefined;

    const shallowRef = <T>(value: T) => ({ value });
    const onScopeDispose = (fn: () => void) => {
      disposeFn = fn;
    };

    initVue({ onScopeDispose, shallowRef });

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { locale } = useI18nVue(i18n);

    expect(locale.value).toBe('en');

    // Simulate Vue scope teardown
    disposeFn!();

    await i18n.setLocale('fr');

    // Ref no longer updated after disposal
    expect(locale.value).toBe('en');
  });

  test('fmt getter reflects the current locale', async () => {
    const shallowRef = <T>(value: T) => ({ value });
    const onScopeDispose = (_fn: () => void) => {};

    initVue({ onScopeDispose, shallowRef });

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { fmt } = useI18nVue(i18n);

    const enFormatted = fmt.number(1_234.56);

    await i18n.setLocale('fr');

    const frFormatted = fmt.number(1_234.56);

    expect(enFormatted).toContain('1,234');
    expect(frFormatted).not.toContain('1,234');
  });

  test('setLocale switches the active locale', async () => {
    const shallowRef = <T>(value: T) => ({ value });
    const onScopeDispose = (_fn: () => void) => {};

    initVue({ onScopeDispose, shallowRef });

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { setLocale, t } = useI18nVue(i18n);

    await setLocale('fr');

    expect(t('greeting')).toBe('Bonjour');
  });
});

// ─── React adapter ───────────────────────────────────────────────────────────

describe('react adapter', () => {
  test('throws if init() has not been called', () => {
    // Reset module state by re-importing (vitest isolates modules per file)
    const i18n = createI18n({ catalogs, locale: 'en' });

    expect(() => useI18nReact(i18n)).toThrow('[i18nit/react]');
  });

  test('init() registers useSyncExternalStore', () => {
    // Minimal synchronous stub: immediately calls getSnapshot and returns the value
    const useSyncExternalStore = <T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T): T => {
      const unsub = subscribe(() => {});

      const value = getSnapshot();

      unsub();

      return value;
    };

    initReact(useSyncExternalStore);

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { locale, t, tp } = useI18nReact(i18n);

    expect(locale).toBe('en');
    expect(t('greeting')).toBe('Hello');
    expect(tp('items', 2)).toBe('2 items');
  });

  test('useSyncExternalStore subscribe wires up to i18n.subscribe', () => {
    let capturedSubscribe: ((onChange: () => void) => () => void) | undefined;

    const useSyncExternalStore = <T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T): T => {
      capturedSubscribe = subscribe;

      return getSnapshot();
    };

    initReact(useSyncExternalStore);

    const i18n = createI18n({ catalogs, locale: 'en' });

    useI18nReact(i18n);

    expect(capturedSubscribe).toBeDefined();

    const onChange = vi.fn();
    const unsub = capturedSubscribe!(onChange);

    i18n.subscribe(() => {});

    // Trigger a locale change to verify onChange wiring
    void i18n.setLocale('fr').then(() => {
      expect(onChange).toHaveBeenCalled();
      unsub();
    });
  });

  test('fmt getter delegates to the i18n instance', () => {
    const useSyncExternalStore = <T>(_sub: unknown, getSnapshot: () => T): T => getSnapshot();

    initReact(useSyncExternalStore);

    const i18n = createI18n({ catalogs, locale: 'en' });
    const { fmt } = useI18nReact(i18n);

    expect(fmt.number(1_000)).toBeDefined();
  });
});

// ─── Svelte adapter ──────────────────────────────────────────────────────────

describe('svelte adapter', () => {
  test('subscribe is called immediately with the current state', () => {
    const i18n = createI18n({ catalogs, locale: 'en' });
    const store = useI18nSvelte(i18n);

    let snapshot: { locale: string; t: (key: string) => string } | undefined;

    const unsub = store.subscribe((value) => {
      snapshot = value;
    });

    expect(snapshot?.locale).toBe('en');
    expect(snapshot?.t('greeting')).toBe('Hello');

    unsub();
  });

  test('store emits a new snapshot on locale change', async () => {
    const i18n = createI18n({ catalogs, locale: 'en' });
    const store = useI18nSvelte(i18n);

    const snapshots: string[] = [];

    const unsub = store.subscribe((value) => {
      snapshots.push(value.locale);
    });

    await i18n.setLocale('fr');

    expect(snapshots).toEqual(['en', 'fr']);

    unsub();
  });

  test('unsubscribing stops further emissions', async () => {
    const i18n = createI18n({ catalogs, locale: 'en' });
    const store = useI18nSvelte(i18n);

    const snapshots: string[] = [];

    const unsub = store.subscribe((value) => {
      snapshots.push(value.locale);
    });

    unsub();

    await i18n.setLocale('fr');

    // Only the initial emission should be present
    expect(snapshots).toEqual(['en']);
  });

  test('t and tp in snapshot use the current locale', async () => {
    const i18n = createI18n({ catalogs, locale: 'en' });
    const store = useI18nSvelte(i18n);

    let latestSnapshot: { t: unknown; tp: unknown } | undefined;

    const unsub = store.subscribe((value) => {
      latestSnapshot = value;
    });

    await i18n.setLocale('fr');

    expect((latestSnapshot as any).t('greeting')).toBe('Bonjour');
    expect((latestSnapshot as any).tp('items', 1)).toBe('1 article');

    unsub();
  });

  test('setLocale in snapshot delegates to the i18n instance', async () => {
    const i18n = createI18n({ catalogs, locale: 'en' });
    const store = useI18nSvelte(i18n);

    let latestLocale = '';

    const unsub = store.subscribe((value) => {
      latestLocale = value.locale;
    });

    let setLocale!: (next: string) => Promise<void>;

    store.subscribe((value) => {
      setLocale = value.setLocale;
    });

    await setLocale('fr');

    expect(latestLocale).toBe('fr');

    unsub();
  });

  test('fmt getter in snapshot reflects the current locale', async () => {
    const i18n = createI18n({ catalogs, locale: 'en' });
    const store = useI18nSvelte(i18n);

    const results: string[] = [];

    const unsub = store.subscribe((value) => {
      results.push(value.fmt.number(1_234.56));
    });

    await i18n.setLocale('fr');

    expect(results[0]).toContain('1,234'); // en
    expect(results[1]).not.toContain('1,234'); // fr

    unsub();
  });
});
