import { error as logError } from './_dev';
import { canonicalLocale, localeChain } from './_locale';
import { createCatalogStore } from './_resources';
import { LinguaDisposedError, LinguaMissingCatalogError } from './errors';
import { createTranslateEngine, type Translator } from './translator';
import type {
  Catalog,
  I18nOptions,
  Locale,
  PartsOptions,
  PluralOptions,
  PluralPartsOptions,
  Segment,
  SerializedI18n,
  SubscribeOptions,
  TranslateOptions,
} from './types';

export type I18n<C extends Catalog = Catalog> = Translator<C> & {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  /** Current locale. Referentially stable until the locale changes, so frameworks can use it directly as a store snapshot. */
  getSnapshot(): Locale;
  isLoaded(options?: { locale?: Locale }): boolean;
  load(options?: { locale?: Locale }): Promise<void>;
  serialize(): SerializedI18n<C>;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (locale: Locale) => void, options?: SubscribeOptions): () => void;
};

export function createI18n<C extends Catalog>(options: I18nOptions<C>): I18n<C> {
  const fallbackLocales = (
    Array.isArray(options.fallback) ? options.fallback : options.fallback ? [options.fallback] : []
  ).map(canonicalLocale);
  const controller = new AbortController();
  const subscribers = new Set<(locale: Locale) => void>();
  let disposed = false;
  let locale = canonicalLocale(options.locale ?? 'en');
  let transition = 0;

  const catalogs = createCatalogStore<C>({ catalogs: options.catalogs, loadCatalog: options.loadCatalog });

  const loadTargets = async (target: Locale): Promise<readonly Locale[]> => {
    const changed: Locale[] = [];

    for (const candidate of new Set([target, ...fallbackLocales])) {
      if (await catalogs.load(candidate)) changed.push(candidate);
    }

    return changed;
  };

  const buildEngine = () => {
    const ready = localeChain(locale, fallbackLocales).some(catalogs.isLoaded);
    const effectiveMissing = ready
      ? options.missing
      : (): never => {
          throw new LinguaMissingCatalogError(
            `No catalog loaded for locale "${locale}". Call load() before translating.`,
          );
        };

    return createTranslateEngine(catalogs.catalogMap(), { ...options, locale, missing: effectiveMissing });
  };

  const assertLive = (): void => {
    if (disposed) throw new LinguaDisposedError();
  };

  const dispose = (): void => {
    if (disposed) return;

    disposed = true;
    subscribers.clear();
    controller.abort();
  };

  const notify = (): void => {
    engine = buildEngine();

    for (const listener of [...subscribers]) {
      try {
        listener(locale);
      } catch (error) {
        logError('subscriber error', error);
      }
    }
  };

  const relevant = (candidate: Locale): boolean => localeChain(locale, fallbackLocales).includes(candidate);

  let engine = buildEngine();

  const instance: I18n<C> = {
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    getSnapshot() {
      return locale;
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
    // Delegating through the mutable `engine` is what makes these follow `setLocale()`:
    // `notify()` swaps the engine, and the public slots must pick up the new one.
    parts: (<V>(key: string, options?: PartsOptions<V> | PluralPartsOptions<V>): readonly Segment<V>[] =>
      engine.parts(key, options)) as I18n<C>['parts'],
    partsUnkeyed: (<V>(key: string, options?: PartsOptions<V> | PluralPartsOptions<V>): readonly Segment<V>[] =>
      engine.parts(key, options)) as I18n<C>['partsUnkeyed'],
    serialize() {
      assertLive();

      return catalogs.serialized(locale);
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

      if (subscribeOptions?.immediate) {
        try {
          listener(locale);
        } catch (error) {
          logError('subscriber error', error);
        }
      }

      return unsubscribe;
    },
    translate: (key: string, translateOptions?: TranslateOptions | PluralOptions): string =>
      engine.translate(key, translateOptions),
    translateUnkeyed: (key: string, translateOptions?: TranslateOptions | PluralOptions): string =>
      engine.translate(key, translateOptions),
    [Symbol.dispose]: dispose,
  };

  return instance;
}
