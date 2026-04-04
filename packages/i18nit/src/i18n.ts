import type {
  BoundI18n,
  I18n,
  I18nOptions,
  Loader,
  Locale,
  LocaleChangeEvent,
  LocaleChangeReason,
  Messages,
  MessageValue,
  NamespaceKeys,
  SwitchMode,
  Unsubscribe,
  Vars,
} from './types';

import { BoundedMap, deepMerge, isMessageValue, resolvePath } from './helpers';
import { interpolate } from './interpolate';
import {
  formatDate,
  formatList,
  formatNumber,
  formatRelative,
  getPluralForm,
  type IntlCaches,
  makeIntlCaches,
} from './intl';

export function createI18n<T extends Messages = Messages>(config: I18nOptions<T> = {}): I18n<T> {
  let locale = config.locale ?? 'en';
  const defaultSwitchMode: SwitchMode = config.switchMode ?? 'strict';
  const fallbacks = Array.isArray(config.fallback) ? config.fallback : config.fallback ? [config.fallback] : [];
  const catalogs = new Map<Locale, Messages>();
  const loaders = new Map<Locale, Loader>();
  const loading = new Map<Locale, Promise<void>>();
  const subscribers = new Set<(event: LocaleChangeEvent) => void>();
  const chainCache = new BoundedMap<Locale, Locale[]>(128);
  const caches: IntlCaches = makeIntlCaches();

  let localesCache: Locale[] | null = null;
  let loadersCache: Locale[] | null = null;
  let disposed = false;
  let batchDepth = 0;
  let pendingNotify: LocaleChangeReason | null = null;

  const onMissing = config.onMissing;
  const onDiagnostic = config.onDiagnostic;

  if (config.messages) {
    for (const [loc, messages] of Object.entries(config.messages)) {
      catalogs.set(loc, structuredClone(messages) as Messages);
    }
  }

  if (config.loaders) {
    for (const [loc, loader] of Object.entries(config.loaders)) {
      loaders.set(loc, loader);
    }
  }

  function diagnoseSubscriber(error: unknown): void {
    if (onDiagnostic) {
      onDiagnostic({ error, kind: 'subscriber-error' });
    } else {
      console.error('[i18nit] Subscriber threw:', error);
    }
  }

  function diagnoseLoader(error: unknown, loc: Locale): void {
    if (onDiagnostic) {
      onDiagnostic({ error, kind: 'loader-error', locale: loc });
    } else {
      console.warn('[i18nit] Loader error:', error);
    }
  }

  function notify(reason: LocaleChangeReason): void {
    if (batchDepth > 0) {
      if (pendingNotify !== 'locale-change') pendingNotify = reason;

      return;
    }

    const event: LocaleChangeEvent = { locale, reason };

    for (const listener of subscribers) {
      try {
        listener(event);
      } catch (error) {
        diagnoseSubscriber(error);
      }
    }
  }

  function getLocaleChain(loc: Locale): Locale[] {
    const cached = chainCache.get(loc);

    if (cached) return cached;

    const seen = new Set<Locale>();

    const push = (value: Locale) => {
      seen.add(value);

      const parts = value.split('-');

      for (let i = parts.length - 1; i > 0; i--) {
        seen.add(parts.slice(0, i).join('-'));
      }
    };

    push(loc);
    for (const fallback of fallbacks) push(fallback);

    const chain = [...seen];

    chainCache.set(loc, chain);

    return chain;
  }

  function checkOwn(key: string, loc: Locale): boolean {
    const catalog = catalogs.get(loc);

    if (!catalog) return false;

    const value = resolvePath(catalog, key);

    return value !== undefined && isMessageValue(value);
  }

  function findMessage(key: string, loc: Locale): MessageValue | undefined {
    for (const localeInChain of getLocaleChain(loc)) {
      const messages = catalogs.get(localeInChain);

      if (!messages) continue;

      const value = resolvePath(messages, key);

      if (value !== undefined && isMessageValue(value)) return value;
    }

    return undefined;
  }

  function translate(key: string, vars: Vars | undefined, loc: Locale): string {
    const message = findMessage(key, loc);

    if (message === undefined) return onMissing?.(key, loc) ?? key;

    if (typeof message === 'string') {
      return interpolate(message, vars ?? {}, loc, caches);
    }

    const context = vars ?? {};

    if (import.meta.env?.DEV && context.count === undefined) {
      console.warn(`[i18nit] Key "${key}" is a plural message but vars.count is missing. Defaulting to 0.`);
    }

    const count = Number(context.count ?? 0);
    const form = count === 0 && message.zero !== undefined ? 'zero' : getPluralForm(caches, loc, count);

    return interpolate(message[form] ?? message.other, context, loc, caches);
  }

  function loadOne(loc: Locale, mode: SwitchMode): Promise<void> {
    if (loading.has(loc)) return loading.get(loc)!;

    if (catalogs.has(loc)) return Promise.resolve();

    const loader = loaders.get(loc);

    if (!loader) {
      if (mode === 'strict') {
        return Promise.reject(new Error(`[i18nit] Missing loader for locale "${loc}".`));
      }

      return Promise.resolve();
    }

    const promise = (async () => {
      try {
        const messages = await loader(loc);

        if (!disposed) api.replace(loc, messages);
      } catch (error) {
        diagnoseLoader(error, loc);
        throw error;
      } finally {
        loading.delete(loc);
      }
    })();

    loading.set(loc, promise);

    return promise;
  }

  function createView<U extends Messages = Messages>(fixedLocale: Locale | null, prefix?: string): BoundI18n<U> {
    const activeLocale = (): Locale => fixedLocale ?? locale;
    const keyWithPrefix = (key: string): string => (prefix ? `${prefix}.${key}` : key);
    const t: BoundI18n<U>['t'] = (key: NamespaceKeys<U>, vars?: Record<string, unknown>) =>
      translate(keyWithPrefix(key as string), vars, activeLocale());

    const view = {
      currency(
        value: number,
        currency: string,
        options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>,
      ): string {
        return formatNumber(caches, value, { ...options, currency, style: 'currency' }, activeLocale());
      },
      date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
        return formatDate(caches, value, options, activeLocale());
      },
      has(key: string): boolean {
        return findMessage(keyWithPrefix(key), activeLocale()) !== undefined;
      },
      hasOwn(key: string): boolean {
        return checkOwn(keyWithPrefix(key), activeLocale());
      },
      list(items: unknown[], type: 'and' | 'or' = 'and'): string {
        return formatList(caches, items, activeLocale(), type);
      },
      get locale(): Locale {
        return activeLocale();
      },
      number(value: number, options?: Intl.NumberFormatOptions): string {
        return formatNumber(caches, value, options, activeLocale());
      },
      relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string {
        return formatRelative(caches, value, unit, options, activeLocale());
      },
      scope<K extends NamespaceKeys<U>>(ns: K): BoundI18n<U[K] & Messages> {
        const nextPrefix = prefix ? `${prefix}.${String(ns)}` : String(ns);

        return createView<U[K] & Messages>(fixedLocale, nextPrefix);
      },
      t,
      withLocale(nextLocale: Locale): BoundI18n<U> {
        return createView<U>(nextLocale, prefix);
      },
    } satisfies BoundI18n<U>;

    return view;
  }

  const rootView = createView<T>(null);

  const api = Object.create(rootView) as I18n<T>;

  api.add = (loc: Locale, messages: Messages): void => {
    const existing = catalogs.get(loc) ?? {};

    catalogs.set(loc, deepMerge(existing, messages));
    localesCache = null;

    if (getLocaleChain(locale).includes(loc)) notify('catalog-update');
  };

  api.batch = (fn: () => void): void => {
    batchDepth++;

    try {
      fn();
    } finally {
      batchDepth--;

      if (batchDepth === 0 && pendingNotify !== null) {
        const reason = pendingNotify;

        pendingNotify = null;
        notify(reason);
      }
    }
  };

  api.dispose = (): void => {
    disposed = true;
    subscribers.clear();
    catalogs.clear();
    loaders.clear();
    loading.clear();
    chainCache.clear();
    localesCache = null;
    loadersCache = null;
  };

  api.ensureLocale = async (loc: Locale, mode: SwitchMode = defaultSwitchMode): Promise<void> => {
    await loadOne(loc, mode);
  };

  api.hasLocale = (loc: Locale): boolean => catalogs.has(loc);
  api.isReady = (loc: Locale): boolean => catalogs.has(loc);

  Object.defineProperties(api, {
    loadableLocales: {
      get(): Locale[] {
        loadersCache ??= [...loaders.keys()];

        return loadersCache;
      },
    },
    locales: {
      get(): Locale[] {
        localesCache ??= [...catalogs.keys()];

        return localesCache;
      },
    },
  });

  api.registerLoader = (loc: Locale, loader: Loader): void => {
    loaders.set(loc, loader);
    loadersCache = null;
  };

  api.reload = async (loc: Locale): Promise<void> => {
    if (!loaders.has(loc)) {
      throw new Error(`[i18nit] Cannot reload locale "${loc}" without a registered loader.`);
    }

    catalogs.delete(loc);
    localesCache = null;
    await loadOne(loc, 'strict');
  };

  api.replace = (loc: Locale, messages: Messages): void => {
    catalogs.set(loc, structuredClone(messages));
    localesCache = null;

    if (getLocaleChain(locale).includes(loc)) notify('catalog-update');
  };

  api.subscribe = (listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe => {
    subscribers.add(listener);

    if (immediate) {
      try {
        listener({ locale, reason: 'locale-change' });
      } catch (error) {
        diagnoseSubscriber(error);
      }
    }

    return () => subscribers.delete(listener);
  };

  api.switchLocale = async (nextLocale: Locale, mode: SwitchMode = defaultSwitchMode): Promise<void> => {
    if (nextLocale === locale) return;

    await loadOne(nextLocale, mode);
    locale = nextLocale;
    notify('locale-change');
  };

  api[Symbol.asyncDispose] = async (): Promise<void> => {
    await Promise.allSettled([...loading.values()]);
    api.dispose();
  };

  api[Symbol.dispose] = (): void => {
    api.dispose();
  };

  return api;
}

export type { I18n };
