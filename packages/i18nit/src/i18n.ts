import type {
  DiagnosticEvent,
  FormatInput,
  I18n,
  I18nOptions,
  Loader,
  Locale,
  LocaleChangeEvent,
  LocaleChangeReason,
  Messages,
  Unsubscribe,
  Vars,
} from './types';

import { resolvePath } from './helpers';
import { interpolate } from './interpolate';
import { format, makeIntlCaches, selectPluralForm } from './intl';

export function createI18n(config: I18nOptions = {}): I18n {
  let locale = config.locale ?? 'en';
  const fallbacks = Array.isArray(config.fallback) ? config.fallback : config.fallback ? [config.fallback] : [];
  const catalogs = new Map<Locale, Messages>();
  const loaders = new Map<Locale, Loader>();
  const loading = new Map<Locale, Promise<void>>();
  const subscribers = new Set<(event: LocaleChangeEvent) => void>();
  const caches = makeIntlCaches();

  let localesCache: Locale[] | null = null;
  let loadersCache: Locale[] | null = null;
  let disposed = false;

  const onMissing = config.onMissing ?? ((key: string) => key);
  const onDiagnostic = config.onDiagnostic ?? defaultDiagnostic;

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

  function defaultDiagnostic(event: DiagnosticEvent): void {
    if (event.kind === 'subscriber-error') {
      console.error('[i18nit] Subscriber threw:', event.error);

      return;
    }

    console.warn('[i18nit] Loader error:', event.error);
  }

  function diagnoseSubscriber(error: unknown): void {
    onDiagnostic({ error, kind: 'subscriber-error' });
  }

  function diagnoseLoader(error: unknown, loc: Locale): void {
    onDiagnostic({ error, kind: 'loader-error', locale: loc });
  }

  function ensureNotDisposed(methodName: string): void {
    if (disposed) {
      throw new Error(`[i18nit] Cannot call ${methodName}() after dispose().`);
    }
  }

  function invalidateCaches(): void {
    localesCache = null;
    loadersCache = null;
  }

  function notify(reason: LocaleChangeReason): void {
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

    return [...seen];
  }

  function findMessage(key: string, loc: Locale): string | undefined {
    for (const localeInChain of getLocaleChain(loc)) {
      const catalog = catalogs.get(localeInChain);

      if (!catalog) continue;

      const value = resolvePath(catalog, key);

      if (typeof value === 'string') return value;
    }

    return undefined;
  }

  function translate(key: string, vars: Vars | undefined, loc: Locale): string {
    const message = findMessage(key, loc);

    if (message === undefined) return onMissing(key, loc);

    return interpolate(message, vars ?? {});
  }

  function loadOne(loc: Locale, strict: boolean): Promise<void> {
    if (loading.has(loc)) return loading.get(loc)!;

    if (catalogs.has(loc)) return Promise.resolve();

    const loader = loaders.get(loc);

    if (!loader)
      return strict ? Promise.reject(new Error(`[i18nit] Missing loader for locale "${loc}".`)) : Promise.resolve();

    const promise = (async () => {
      try {
        const messages = await loader(loc);

        if (!disposed) api.setCatalog(loc, messages);
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

  function pluralMessageKey(baseKey: string, count: number): string {
    if (count === 0) return `${baseKey}.zero`;

    const form = selectPluralForm(caches, locale, count);

    return `${baseKey}.${form}`;
  }

  const api = {
    dispose: (): void => {
      if (disposed) return;

      disposed = true;
      subscribers.clear();
      catalogs.clear();
      loaders.clear();
      loading.clear();
      invalidateCaches();
    },
    format: (input: FormatInput): string => format(caches, locale, input),
    has: (key: string): boolean => findMessage(key, locale) !== undefined,
    get loadableLocales(): Locale[] {
      loadersCache ??= [...loaders.keys()];

      return loadersCache;
    },
    get locale(): Locale {
      return locale;
    },
    get locales(): Locale[] {
      localesCache ??= [...catalogs.keys()];

      return localesCache;
    },
    preload: async (loc: Locale): Promise<void> => {
      ensureNotDisposed('preload');
      await loadOne(loc, false);
    },
    setCatalog: (loc: Locale, messages: Messages): void => {
      ensureNotDisposed('setCatalog');

      catalogs.set(loc, structuredClone(messages));
      invalidateCaches();

      if (getLocaleChain(locale).includes(loc)) notify('catalog-update');
    },
    setLoader: (loc: Locale, loader: Loader): void => {
      ensureNotDisposed('setLoader');
      loaders.set(loc, loader);
      invalidateCaches();
    },
    setLocale: async (nextLocale: Locale): Promise<void> => {
      ensureNotDisposed('setLocale');

      if (nextLocale === locale) return;

      await loadOne(nextLocale, true);
      locale = nextLocale;
      notify('locale-change');
    },
    subscribe: (listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe => {
      ensureNotDisposed('subscribe');

      subscribers.add(listener);

      if (immediate) {
        try {
          listener({ locale, reason: 'locale-change' });
        } catch (error) {
          diagnoseSubscriber(error);
        }
      }

      return () => subscribers.delete(listener);
    },
    [Symbol.asyncDispose]: async (): Promise<void> => {
      await Promise.allSettled([...loading.values()]);
      api.dispose();
    },
    [Symbol.dispose]: (): void => {
      api.dispose();
    },
    t: (key: string, vars?: Vars): string => translate(key, vars, locale),
    tp: (key: string, count: number, vars?: Vars): string => {
      const context = { ...(vars ?? {}), count };
      const selected = pluralMessageKey(key, count);
      const message = findMessage(selected, locale) ?? findMessage(`${key}.other`, locale);

      if (message === undefined) return onMissing(key, locale);

      return interpolate(message, context);
    },
  } satisfies I18n;

  return api;
}
