import type {
  Catalog,
  I18nOptions,
  I18nState,
  Locale,
  ResourceCatalog,
  Resources,
  PluralKey,
  PluralOptions,
  SubscribeOptions,
  TextKey,
  TranslateOptions,
} from './types';

import { error as logError } from './_dev';
import { canonicalLocale } from './_locale';
import { createResourceStore } from './_resources';
import { LinguaDisposedError, LinguaInvalidStateError } from './errors';
import { type Translator, createTranslatorFromCompiled } from './translator';

export type I18nSnapshot<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly revision: number;
  readonly translator: Translator<C>;
};

export type I18n<C extends Catalog = Catalog> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): I18nSnapshot<C>;
  isLoaded(resource: string, options?: { locale?: Locale }): boolean;
  load(resource: string, options?: { locale?: Locale }): Promise<void>;
  readonly locale: Locale;
  segments<V>(
    key: TextKey<C> | (string & {}),
    options: TranslateOptions & { values: Record<string, V> },
  ): Array<string | V>;
  segments<V>(
    key: PluralKey<C> | (string & {}),
    options: PluralOptions & { values?: Record<string, V> },
  ): Array<string | number | V>;
  serialize(): I18nState<C>;
  setLocale(locale: Locale, options?: { load?: readonly string[] }): Promise<void>;
  subscribe(listener: (snapshot: I18nSnapshot<C>) => void, options?: SubscribeOptions): () => void;
  translate(key: TextKey<C> | (string & {}), options?: TranslateOptions): string;
  translate(key: PluralKey<C> | (string & {}), options: PluralOptions): string;
};

export function createI18n<R extends Resources>(
  options: Omit<I18nOptions<ResourceCatalog<R>>, 'resources'> & { resources: R & Resources<ResourceCatalog<R>> },
): I18n<ResourceCatalog<R>>;
export function createI18n<C extends Catalog>(options: I18nOptions<C>): I18n<C>;
export function createI18n(options: I18nOptions<Catalog>): I18n<Catalog> {
  type C = Catalog;

  const resources = createResourceStore<C>(options.resources);
  const fallback = options.fallback;
  const controller = new AbortController();
  const subscribers = new Set<(snapshot: I18nSnapshot<C>) => void>();
  let disposed = false;
  let locale = canonicalLocale(options.locale ?? 'en');
  let revision = 0;

  const buildSnapshot = (): I18nSnapshot<C> => ({
    locale,
    revision,
    translator: createTranslatorFromCompiled<C>(resources.catalogMap(), { ...options, fallback, locale }),
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

  const dispatch = (listener: (snapshot: I18nSnapshot<C>) => void): void => {
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

  const relevant = (candidate: Locale): boolean => snapshot.translator.locale === candidate || candidate === locale;

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
    isLoaded(resource, loadOptions) {
      return !disposed && resources.isLoaded(resource, loadOptions?.locale ?? locale);
    },
    async load(resource, loadOptions) {
      assertLive();

      const targetLocale = canonicalLocale(loadOptions?.locale ?? locale);
      const changed = await resources.load(resource, targetLocale);

      if (!disposed && changed && relevant(targetLocale)) notify();
    },
    get locale() {
      return locale;
    },
    segments(key: string, translateOptions: TranslateOptions | PluralOptions) {
      return snapshot.translator.segments(key, translateOptions as never);
    },
    serialize() {
      assertLive();

      return resources.state(locale);
    },
    async setLocale(nextLocale, setOptions) {
      assertLive();

      const next = canonicalLocale(nextLocale);

      for (const resource of ['core', ...(setOptions?.load ?? [])]) {
        if (options.resources[resource]) await resources.load(resource, next);
      }

      assertLive();
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
    translate(key: string, translateOptions: TranslateOptions | PluralOptions = {}) {
      return snapshot.translator.translate(key, translateOptions as never);
    },
  };
}

export function hydrateI18n<C extends Catalog>(
  state: I18nState<C>,
  options?: Omit<I18nOptions<C>, 'locale' | 'resources'>,
): I18n<C> {
  if (state.version !== 2) {
    throw new LinguaInvalidStateError(`Unsupported lingua state version: ${String(state.version)}.`);
  }

  return createI18n({ ...options, locale: state.locale, resources: state.resources });
}
