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

// ─── Module-level defaults (stateless, shared across all instances) ────────────

function defaultDiagnostic(event: DiagnosticEvent): void {
  if (event.kind === 'subscriber-error') {
    console.error('[i18nit] Subscriber threw:', event.error);

    return;
  }

  console.warn('[i18nit] Loader error:', event.error);
}

function defaultOnMissing(key: string): string {
  return key;
}

// ─── Type Guards ───────────────────────────────────────────────────────────────

export const isLoaderError = (event: DiagnosticEvent): event is Extract<DiagnosticEvent, { kind: 'loader-error' }> =>
  event.kind === 'loader-error';

export const isSubscriberError = (
  event: DiagnosticEvent,
): event is Extract<DiagnosticEvent, { kind: 'subscriber-error' }> => event.kind === 'subscriber-error';

// ─── Factory ──────────────────────────────────────────────────────────────────

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
  let localeChainCache: Locale[] | null = null;
  let disposed = false;

  const onMissing = config.onMissing ?? defaultOnMissing;
  const onDiagnostic = config.onDiagnostic ?? defaultDiagnostic;

  if (config.messages) {
    for (const [loc, messages] of Object.entries(config.messages)) {
      catalogs.set(loc, structuredClone(messages));
    }
  }

  if (config.loaders) {
    for (const [loc, loader] of Object.entries(config.loaders)) {
      loaders.set(loc, loader);
    }
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
    localeChainCache = null;
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
    localeChainCache ??= buildLocaleChain(loc);

    return localeChainCache;
  }

  function buildLocaleChain(loc: Locale): Locale[] {
    const seen = new Set<Locale>();

    for (const value of [loc, ...fallbacks]) {
      seen.add(value);

      const parts = value.split('-');

      for (let i = parts.length - 1; i > 0; i--) {
        seen.add(parts.slice(0, i).join('-'));
      }
    }

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
    get loadedLocales(): Locale[] {
      localesCache ??= [...catalogs.keys()];

      return localesCache;
    },
    get locale(): Locale {
      return locale;
    },
    preload: async (loc: Locale): Promise<void> => {
      ensureNotDisposed('preload');

      try {
        await loadOne(loc, false);
      } catch {
        // loader errors are already routed through onDiagnostic inside loadOne
      }
    },
    setCatalog: (loc: Locale, messages: Messages): void => {
      ensureNotDisposed('setCatalog');

      catalogs.set(loc, structuredClone(messages));
      localesCache = null;

      if (getLocaleChain(locale).includes(loc)) notify('catalog-update');
    },
    setLoader: (loc: Locale, loader: Loader): void => {
      ensureNotDisposed('setLoader');
      loaders.set(loc, loader);
      loadersCache = null;
    },
    setLocale: async (nextLocale: Locale): Promise<void> => {
      ensureNotDisposed('setLocale');

      if (nextLocale === locale) return;

      await loadOne(nextLocale, true);
      locale = nextLocale;
      localeChainCache = null;
      notify('locale-change');
    },
    subscribe: (listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe => {
      ensureNotDisposed('subscribe');

      subscribers.add(listener);

      if (immediate) {
        try {
          listener({ locale, reason: 'init' });
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
    t: (key: string, vars?: Vars): string => {
      const message = findMessage(key, locale);

      return message === undefined ? onMissing(key, locale) : interpolate(message, vars);
    },
    tp: (key: string, count: number, vars?: Vars): string => {
      const context = { ...(vars ?? {}), count };
      const selected = count === 0 ? `${key}.zero` : `${key}.${selectPluralForm(caches, locale, count)}`;
      const message = findMessage(selected, locale) ?? findMessage(`${key}.other`, locale);

      if (message === undefined) return onMissing(key, locale);

      return interpolate(message, context);
    },
  } satisfies I18n;

  return api;
}
