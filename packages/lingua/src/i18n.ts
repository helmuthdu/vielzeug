import type {
  I18n,
  I18nOptions,
  I18nSnapshot,
  I18nState,
  Locale,
  MessageBranchKeys,
  MessageLeafKeys,
  ScopedI18n,
  SubscribeOptions,
  TpOptions,
  TranslateVars,
  Unsubscribe,
} from './i18n-types';

import { getOrCreate } from './_bounded-cache';
import { CatalogEntry, type Messages, flattenStrings } from './_catalog';
import {
  type CatalogStore,
  type Loader,
  type LocaleSource,
  createCatalogStore,
  validateCatalogInDev,
} from './_catalog-store';
import { type LocaleCaches, buildLocaleChain, canon, createLocaleCaches } from './_chain';
import { error as logError } from './_dev';
import { type NamespaceFactory, type NamespaceStore, createNamespaceStore } from './_namespace-store';
import {
  type TranslateContext,
  hasKey as hasKeyIn,
  translate as translateIn,
  translatePlural as translatePluralIn,
} from './_translate';
import { LinguaDisposedError, LinguaRestoreError, checkDisposed } from './errors';
import { type Formatter, createFormatter } from './format';

export {
  LinguaCountInVarsError,
  LinguaDisposedError,
  LinguaError,
  LinguaInvalidCountError,
  LinguaInvalidLocaleError,
  LinguaMissingLocaleError,
  LinguaNamespaceMissingError,
  LinguaRestoreError,
} from './errors';

export type {
  I18n,
  I18nOptions,
  I18nSnapshot,
  I18nState,
  Locale,
  MessageBranchKeys,
  MessageLeafKeys,
  ScopedI18n,
  SubscribeOptions,
  TpOptions,
  TranslateVars,
  Unsubscribe,
} from './i18n-types';
export type { Loader, LocaleSource } from './_catalog-store';
export type { Messages } from './_catalog';
export type { NamespaceFactory } from './_namespace-store';

// Bound for the per-instance `scope()` cache — see its declaration below for why it's bounded.
const SCOPE_CACHE_MAX = 128;

// ─── Locale state ─────────────────────────────────────────────────────────────
// Replaced atomically on every locale change.

type LocaleState = {
  readonly chain: readonly Locale[];
  readonly chainSet: ReadonlySet<Locale>;
  readonly locale: Locale;
};

function buildState(locale: Locale, fallback: Locale[], caches: LocaleCaches): LocaleState {
  const { chain, set } = buildLocaleChain(locale, fallback, caches);

  return { chain, chainSet: set, locale };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Overload: explicit type parameter (strict typing) */
export function createI18n<M extends Messages>(config: I18nOptions<M>): I18n<M>;
/** Overload: no type parameter (loose typing, allows heterogeneous catalogs) */
export function createI18n(config?: I18nOptions<Messages>): I18n<Messages>;
export function createI18n<M extends Messages = Messages>(config?: I18nOptions<M>): I18n<M> {
  return _createI18nImpl<M>(config);
}

// ─── Internal seed shape ──────────────────────────────────────────────────────

type I18nSeed<M extends Messages> = {
  catalogStore?: CatalogStore<M>;
  nsStore?: NamespaceStore;
};

function _createI18nImpl<M extends Messages = Messages>(config?: I18nOptions<M>, _seed?: I18nSeed<M>): I18n<M> {
  const cfg: I18nOptions<M> = config ?? {};

  // ─── Per-instance caches (no shared module-level state) ───────────────────
  const caches: LocaleCaches = createLocaleCaches();

  const canonL = (loc: string) => canon(loc, caches);

  const fallback = Array.isArray(cfg.fallback) ? cfg.fallback.map(canonL) : cfg.fallback ? [canonL(cfg.fallback)] : [];

  // ─── Disposal ─────────────────────────────────────────────────────────────
  let disposed = false;
  const disposeController = new AbortController();

  // ─── Bounded stores ───────────────────────────────────────────────────────
  const catalogStore: CatalogStore<M> = createCatalogStore(() => disposed);
  const nsStore: NamespaceStore = createNamespaceStore(() => disposed);

  // ─── Locale state ─────────────────────────────────────────────────────────
  let state: LocaleState = buildState(canonL(cfg.locale ?? 'en'), fallback, caches);

  // ─── Subscribers ──────────────────────────────────────────────────────────
  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();
  const subscriptionUnsubscribers = new Set<Unsubscribe>();

  const onMissingKey = cfg.onMissingKey ?? ((key: string) => key);
  const onMissingVar = cfg.onMissingVar ?? ((varName: string) => `{${varName}}`);
  const onSubscriberError = cfg.onSubscriberError ?? ((error: unknown) => logError('subscriber error', error));

  // ─── Lazy formatter — avoids Intl overhead for SSR forks that only need t(). ──
  let _fmt: Formatter | undefined;

  // ─── Scope cache — stable object references per prefix for reactive framework renders. ──
  // Bounded the same way format.ts bounds its Intl-formatter caches: `scope()` is meant for a
  // static, finite set of prefixes (nav sections, form names, ...), but nothing stopped a caller
  // from passing a dynamic per-item prefix (e.g. `scope(`item.${id}`)` in a list render) and
  // growing this unboundedly for the instance's lifetime. Oldest entry evicts past the cap.
  const scopeCache = new Map<string, ScopedI18n>();

  const getFormatter = (): Formatter => {
    if (!_fmt) _fmt = createFormatter(() => state.locale);

    return _fmt;
  };

  // ─── Translate helpers ────────────────────────────────────────────────────
  // The actual algorithm (fallback-chain lookup, plural-form selection, interpolation) lives in
  // `_translate.ts` — this instance just supplies fresh context (current locale/chain) per call.

  const translateContext = (): TranslateContext => ({
    caches,
    catalogStore,
    chain: state.chain,
    locale: state.locale,
    onMissingKey,
    onMissingVar,
  });

  // Shared by has() and scope().has().
  const hasKey = (base: string): boolean => hasKeyIn(translateContext(), base);

  const translate = (key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string =>
    translateIn(translateContext(), String(key), vars);

  const translatePlural = (key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpOptions): string =>
    translatePluralIn(translateContext(), String(key), count, options);

  // ─── bump() ───────────────────────────────────────────────────────────────
  // Rebuilds the snapshot and notifies all current subscribers.

  let snapshot: I18nSnapshot = {
    locale: state.locale,
    t: translate,
    tp: translatePlural,
  };

  const bump = (): void => {
    snapshot = { locale: state.locale, t: translate, tp: translatePlural };

    const listeners = [...subscribers];

    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        onSubscriberError(error);
      }
    }
  };

  // ─── Wire catalog store onChange → bump ───────────────────────────────────
  catalogStore.onChange = (loc: Locale) => {
    if (state.chainSet.has(loc)) bump();
  };

  // ─── Seed from parent fork ─────────────────────────────────────────────────
  if (_seed?.catalogStore) {
    catalogStore.seedFrom(_seed.catalogStore.snapshotCatalogs(), _seed.catalogStore.snapshotLoaders());
  }

  if (_seed?.nsStore) {
    nsStore.seedFrom(_seed.nsStore);
  }

  // ─── Initial catalogs from config ─────────────────────────────────────────
  if (cfg.catalogs) {
    const staticEntries = new Map<Locale, CatalogEntry>();
    const loaderEntries = new Map<Locale, Loader<M>>();

    for (const [loc, source] of Object.entries(cfg.catalogs)) {
      const normalized = canonL(loc);

      if (typeof source === 'function') {
        loaderEntries.set(normalized, source as Loader<M>);
      } else {
        const entry = new CatalogEntry();

        entry.setAll(flattenStrings(source as M));
        staticEntries.set(normalized, entry);
        validateCatalogInDev(normalized, source as M);
      }
    }

    // Use seedFrom for zero-overhead init (no bump, no notifications during setup)
    catalogStore.seedFrom(staticEntries, loaderEntries);
  }

  // ─── Preload helper ───────────────────────────────────────────────────────

  const preload = (loc: Locale): Promise<void> => catalogStore.preload(canonL(loc));

  // ─── Monotonic generation counter — last writer wins for concurrent setLocale() ──
  let switchGen = 0;

  // ─── Subscribe helper ─────────────────────────────────────────────────────

  const subscribeInternal = (callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe => {
    const signal = options?.signal;

    const unsubscribe = (): void => {
      subscribers.delete(callback);
      signal?.removeEventListener('abort', unsubscribe);
      subscriptionUnsubscribers.delete(unsubscribe);
    };

    if (disposed) throw new LinguaDisposedError();

    if (signal?.aborted) return unsubscribe;

    if (options?.immediate === true) {
      try {
        callback(snapshot);
      } catch (error) {
        onSubscriberError(error);

        return unsubscribe;
      }
    }

    subscribers.add(callback);
    signal?.addEventListener('abort', unsubscribe, { once: true });
    subscriptionUnsubscribers.add(unsubscribe);

    return unsubscribe;
  };

  // ─── Public object ─────────────────────────────────────────────────────────
  // Named `const` (not a bare `return { ... }`) so `[Symbol.dispose]` below can close over
  // `source` directly instead of `this` — `this` inside an object-literal method is only bound
  // when called as `obj.method()`; detaching it first (`const d = i18n[Symbol.dispose]; d()`,
  // the exact shape most framework cleanup-hook APIs expect) would otherwise throw.

  const source: I18n<M> = {
    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      disposeController.abort();
      for (const unsubscribe of [...subscriptionUnsubscribers]) unsubscribe();
      subscriptionUnsubscribers.clear();
      subscribers.clear();
      catalogStore.dispose();
      nsStore.dispose();
      scopeCache.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    extend(ns: string, factory: NamespaceFactory, loc?: Locale): Promise<void> {
      checkDisposed(disposed);

      nsStore.registerNamespace(ns, factory);

      const normalized = loc ? canonL(loc) : state.locale;

      return nsStore.loadNamespace(ns, normalized, (l, messages) => catalogStore.patch(l, messages));
    },

    get fmt(): Formatter {
      return getFormatter();
    },

    fork(overrides?: Omit<I18nOptions<M>, 'catalogs'>): I18n<M> {
      return _createI18nImpl(
        {
          fallback: overrides?.fallback ?? (fallback.length > 0 ? fallback : undefined),
          locale: overrides?.locale ?? state.locale,
          onMissingKey: overrides?.onMissingKey ?? cfg.onMissingKey,
          onMissingVar: overrides?.onMissingVar ?? cfg.onMissingVar,
          onSubscriberError: overrides?.onSubscriberError ?? cfg.onSubscriberError,
        },
        {
          catalogStore,
          nsStore,
        },
      );
    },

    getSnapshot() {
      return snapshot;
    },

    getState(): I18nState {
      const catalogsOut: Record<Locale, Record<string, string>> = {};

      for (const [loc, entry] of catalogStore.snapshotCatalogs()) {
        catalogsOut[loc] = Object.fromEntries([...entry.entries.entries()].map(([k, { message }]) => [k, message]));
      }

      return { catalogs: catalogsOut, locale: state.locale };
    },

    getSupportedLocales(sorted?: boolean): Locale[] {
      const locales = [...catalogStore.knownLocales()];

      return sorted === true ? locales.sort() : locales;
    },

    has(key: MessageLeafKeys<M> | MessageBranchKeys<M> | (string & {})): boolean {
      return hasKey(String(key));
    },

    isLoaded(loc: Locale): boolean {
      try {
        return catalogStore.isLoaded(canonL(loc));
      } catch {
        return false;
      }
    },

    isNamespaceLoaded(ns: string, loc?: Locale): boolean {
      if (!loc) return nsStore.isLoaded(ns, state.locale);

      try {
        return nsStore.isLoaded(ns, canonL(loc));
      } catch {
        return false;
      }
    },

    isNamespaceRegistered(ns: string): boolean {
      return nsStore.isRegistered(ns);
    },

    isRegistered(loc: Locale): boolean {
      try {
        return catalogStore.isRegistered(canonL(loc));
      } catch {
        return false;
      }
    },

    loadNamespace(ns: string, loc?: Locale): Promise<void> {
      const normalized = loc ? canonL(loc) : state.locale;

      return nsStore.loadNamespace(ns, normalized, (l, messages) => catalogStore.patch(l, messages));
    },

    get locale(): Locale {
      return state.locale;
    },

    preload,

    register(loc: Locale, source: LocaleSource<M>): Promise<void> {
      const normalized = canonL(loc);

      return catalogStore.register(normalized, source, nsStore);
    },

    registerNamespace(ns: string, factory: NamespaceFactory): void {
      nsStore.registerNamespace(ns, factory);
    },

    restoreState(st: I18nState): void {
      checkDisposed(disposed);

      if (!Object.hasOwn(st.catalogs, st.locale)) {
        throw new LinguaRestoreError(`restoreState: locale "${st.locale}" has no catalog in the provided state.`);
      }

      const freshEntries = new Map<Locale, CatalogEntry>();
      const knownLocales = catalogStore.knownLocales();

      for (const knownLocale of knownLocales) {
        nsStore.clearLocale(knownLocale);
      }

      // No validateCatalogInDev() call here, unlike register()/construction/preload(): `state`
      // is already flattened dot-notation (I18nState.catalogs), not the nested Messages shape
      // validateCatalog() expects, and restoreState() exists specifically for cheap SSR
      // hydration of a payload that was already registered — and therefore already
      // validated — once on the system that produced it. Re-validating here would mean
      // un-flattening every restored catalog back into nested form on every hydration, for a
      // check that's already run.
      for (const [loc, flatCatalog] of Object.entries(st.catalogs)) {
        const normalized = canonL(loc);
        const entry = new CatalogEntry();

        entry.setAll(Object.entries(flatCatalog));
        freshEntries.set(normalized, entry);
      }

      // Dispose and re-seed the catalog store with the restored entries.
      // onChange is re-wired immediately after dispose.
      catalogStore.dispose();
      catalogStore.onChange = (loc: Locale) => {
        if (state.chainSet.has(loc)) bump();
      };
      catalogStore.seedFrom(freshEntries, new Map());

      const normalized = canonL(st.locale);

      state = buildState(normalized, fallback, caches);
      _fmt?.clear();
      bump();
    },

    scope(prefix: MessageBranchKeys<M> | (string & {})): ScopedI18n {
      const pre = String(prefix);

      return getOrCreate(scopeCache, pre, SCOPE_CACHE_MAX, () => ({
        get fmt() {
          return getFormatter();
        },
        has: (key) => hasKey(`${pre}.${key}`),
        t: (key, vars?) => translate(`${pre}.${key}`, vars),
        tp: (key, count, options?) => translatePlural(`${pre}.${key}`, count, options),
      }));
    },

    async setLocale(next: Locale): Promise<void> {
      checkDisposed(disposed);

      const normalized = canonL(next);

      if (state.locale === normalized) return;

      // Monotonic generation counter — last writer wins.
      const gen = ++switchGen;

      await preload(normalized);

      if (disposed || switchGen !== gen) return;

      state = buildState(normalized, fallback, caches);
      _fmt?.clear();
      bump();
    },

    subscribe: subscribeInternal,

    [Symbol.dispose](): void {
      source.dispose();
    },

    t: translate,

    tp: translatePlural,
  };

  return source;
}
