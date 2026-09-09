import { error as logError } from './_dev';
import { canonicalLocale, localeChain } from './_locale';
import { createCatalogStore } from './_resources';
import { LinguaDisposedError, LinguaInvalidStateError, LinguaMissingCatalogError } from './errors';
import { createTranslatorFromCompiled, type Translator } from './translator';
import type { Catalog, I18nOptions, Locale, SubscribeOptions, TranslationState } from './types';

export type I18nSnapshot<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly revision: number;
  readonly translator: Translator<C>;
};

export type I18n<C extends Catalog = Catalog> = Translator<C> & {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): I18nSnapshot<C>;
  isLoaded(options?: { locale?: Locale }): boolean;
  load(options?: { locale?: Locale }): Promise<void>;
  serialize(): TranslationState<C>;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (snapshot: I18nSnapshot<C>) => void, options?: SubscribeOptions): () => void;
};

export function createI18n<C extends Catalog>(options: I18nOptions<C>): I18n<C> {
  if (options.state && options.state.version !== 4) {
    throw new LinguaInvalidStateError(`Unsupported lingua state version: ${String(options.state.version)}.`);
  }

  const fallback = options.fallback;
  const fallbackLocales = (Array.isArray(fallback) ? fallback : fallback ? [fallback] : []).map(canonicalLocale);
  const controller = new AbortController();
  const subscribers = new Set<(snapshot: I18nSnapshot<C>) => void>();
  let disposed = false;
  let locale = canonicalLocale(options.locale ?? options.state?.locale ?? 'en');
  let revision = 0;
  let transition = 0;

  const catalogs = createCatalogStore<C>({ catalogs: options.catalogs, loadCatalog: options.loadCatalog });

  // Hydrate from serialized state (SSR).
  if (options.state) {
    for (const [stateLocale, catalog] of Object.entries(options.state.catalogs)) {
      catalogs.hydrate(stateLocale, catalog);
    }
  }

  const loadTargets = async (target: Locale): Promise<readonly Locale[]> => {
    const changed: Locale[] = [];

    for (const candidate of new Set([target, ...fallbackLocales])) {
      if (await catalogs.load(candidate)) changed.push(candidate);
    }

    return changed;
  };

  const buildSnapshot = (): I18nSnapshot<C> => {
    const ready = localeChain(locale, fallbackLocales).some(catalogs.isLoaded);
    const missing = ready
      ? options.missing
      : () => {
          throw new LinguaMissingCatalogError(
            `No catalog loaded for locale "${locale}". Call load() before translating.`,
          );
        };

    return {
      locale,
      revision,
      translator: createTranslatorFromCompiled<C>(catalogs.catalogMap(), { fallback, locale, missing }),
    };
  };
  let snapshot = buildSnapshot();

  const assertLive = (): void => {
    if (disposed) throw new LinguaDisposedError();
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    subscribers.clear();
    controller.abort();
  };

  const dispatch = (listener: (next: I18nSnapshot<C>) => void): void => {
    try {
      listener(snapshot);
    } catch (error) {
      logError('subscriber error', error);
    }
  };

  const notify = (): void => {
    revision++;
    snapshot = buildSnapshot();

    for (const listener of [...subscribers]) dispatch(listener);
  };

  const relevant = (candidate: Locale): boolean => localeChain(locale, fallbackLocales).includes(candidate);

  return {
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    getSnapshot() {
      return snapshot;
    },
    isLoaded(loadOptions) {
      return !disposed && catalogs.isLoaded(loadOptions?.locale ?? locale);
    },
    async load(loadOptions) {
      assertLive();

      const targetLocale = canonicalLocale(loadOptions?.locale ?? locale);
      const changed = await loadTargets(targetLocale);

      assertLive();
      if (changed.some(relevant)) notify();
    },
    get locale() {
      return locale;
    },
    parts(key: string, translateOptions) {
      return snapshot.translator.partsDynamic(key, translateOptions);
    },
    partsDynamic(key, translateOptions) {
      return snapshot.translator.partsDynamic(key, translateOptions);
    },
    serialize() {
      assertLive();

      return catalogs.state(locale);
    },
    async setLocale(nextLocale) {
      assertLive();

      const next = canonicalLocale(nextLocale);
      const request = ++transition;
      const changed = await loadTargets(next);

      assertLive();
      if (request !== transition) return;

      if (next === locale) {
        if (changed.some(relevant)) notify();

        return;
      }

      locale = next;
      notify();
    },
    subscribe(listener, subscribeOptions) {
      assertLive();

      if (subscribeOptions?.signal?.aborted) return () => {};

      const unsubscribe = (): void => {
        subscribers.delete(listener);
        subscribeOptions?.signal?.removeEventListener('abort', unsubscribe);
      };

      subscribeOptions?.signal?.addEventListener('abort', unsubscribe, { once: true });
      subscribers.add(listener);

      if (subscribeOptions?.immediate) dispatch(listener);

      return unsubscribe;
    },
    [Symbol.dispose]: dispose,
    translate(key: string, translateOptions = {}) {
      return snapshot.translator.translateDynamic(key, translateOptions);
    },
    translateDynamic(key, translateOptions) {
      return snapshot.translator.translateDynamic(key, translateOptions);
    },
  } as I18n<C>;
}
