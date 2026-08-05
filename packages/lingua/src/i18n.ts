import type { Catalog, TranslationStoreOptions, TranslationState, Locale, SubscribeOptions } from './types';

import { error as logError } from './_dev';
import { canonicalLocale, localeChain } from './_locale';
import { createCatalogStore } from './_resources';
import { LinguaDisposedError, LinguaInvalidStateError } from './errors';
import { type Translator, createTranslatorFromCompiled } from './translator';

export type TranslationSnapshot<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly revision: number;
  readonly translator: Translator<C>;
};

export type TranslationStore<C extends Catalog = Catalog> = Translator<C> & {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): TranslationSnapshot<C>;
  isLoaded(options?: { locale?: Locale }): boolean;
  load(options?: { locale?: Locale }): Promise<void>;
  serialize(): TranslationState<C>;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (snapshot: TranslationSnapshot<C>) => void, options?: SubscribeOptions): () => void;
};

export function createTranslationStore<C extends Catalog>(options: TranslationStoreOptions<C>): TranslationStore<C> {
  const catalogs = createCatalogStore(options.catalogs);
  const fallback = options.fallback;
  const fallbackLocales = (Array.isArray(fallback) ? fallback : fallback ? [fallback] : []).map(canonicalLocale);
  const controller = new AbortController();
  const subscribers = new Set<(snapshot: TranslationSnapshot<C>) => void>();
  let disposed = false;
  let locale = canonicalLocale(options.locale ?? 'en');
  let revision = 0;

  const buildSnapshot = (): TranslationSnapshot<C> => ({
    locale,
    revision,
    translator: createTranslatorFromCompiled<C>(catalogs.catalogMap(), { ...options, fallback, locale }),
  });
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

  const dispatch = (listener: (next: TranslationSnapshot<C>) => void): void => {
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
      const changed = await catalogs.load(targetLocale);

      if (!disposed && changed && relevant(targetLocale)) notify();
    },
    get locale() {
      return locale;
    },
    segments(key: string, translateOptions) {
      return snapshot.translator.segmentsDynamic(key, translateOptions);
    },
    segmentsDynamic(key, translateOptions) {
      return snapshot.translator.segmentsDynamic(key, translateOptions);
    },
    serialize() {
      assertLive();

      return catalogs.state(locale);
    },
    async setLocale(nextLocale) {
      assertLive();

      const next = canonicalLocale(nextLocale);

      if (next === locale) return;

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
  } as TranslationStore<C>;
}

export function hydrateTranslationStore<C extends Catalog>(
  state: TranslationState<C>,
  options?: Omit<TranslationStoreOptions<C>, 'locale' | 'catalogs'>,
): TranslationStore<C> {
  if (state.version !== 3) {
    throw new LinguaInvalidStateError(`Unsupported lingua state version: ${String(state.version)}.`);
  }

  return createTranslationStore({ ...options, catalogs: state.catalogs, locale: state.locale });
}
