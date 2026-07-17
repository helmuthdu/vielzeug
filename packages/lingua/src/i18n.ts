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

import { CatalogEntry, type Messages, flattenStrings } from './_catalog';
import { type CatalogStore, type Loader, type LocaleSource, createCatalogStore } from './_catalog-store';
import { type LocaleCaches, buildLocaleChain, canon, createLocaleCaches, selectPluralForm } from './_chain';
import { error as logError } from './_dev';
import { type NamespaceFactory, type NamespaceStore, createNamespaceStore } from './_namespace-store';
import {
  LinguaCountInVarsError,
  LinguaDisposedError,
  LinguaInvalidCountError,
  LinguaRestoreError,
  checkDisposed,
} from './errors';
import { type Formatter, createFormatter } from './format';
import { type CompiledTemplate, renderTemplate } from './template';

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

// ─── Plural key priority ──────────────────────────────────────────────────────
// Cardinal zero: try .zero override first, then CLDR form, then .other as final fallback.
// Ordinal / non-zero: try CLDR form, then .other as final fallback.
function pluralKeyPriority(base: string, form: string, count: number, ordinal: boolean): string[] {
  const keys: string[] = [];

  if (!ordinal && count === 0) keys.push(`${base}.zero`);

  if (form !== 'zero' || ordinal) keys.push(`${base}.${form}`);

  if (form !== 'other') keys.push(`${base}.other`);

  return keys;
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
  const scopeCache = new Map<string, ScopedI18n>();

  const getFormatter = (): Formatter => {
    if (!_fmt) _fmt = createFormatter(() => state.locale);

    return _fmt;
  };

  // ─── Translate helpers ────────────────────────────────────────────────────

  // Single-pass entry lookup across the active fallback chain.
  const findEntry = (key: string): { compiled: CompiledTemplate; message: string } | undefined => {
    for (const candidate of state.chain) {
      const found = catalogStore.resolve(candidate)?.get(key);

      if (found !== undefined) return found;
    }

    return undefined;
  };

  // Shared by has() and scope().has() — true if `base` exists as a leaf key or a plural branch prefix.
  const hasKey = (base: string): boolean => {
    if (findEntry(base) !== undefined) return true;

    for (const candidate of state.chain) {
      const catalog = catalogStore.resolve(candidate);

      if (!catalog) continue;

      if (catalog.prefixes.has(base)) return true;
    }

    return false;
  };

  const interpolate = (
    key: string,
    found: { compiled: CompiledTemplate; message: string },
    vars: TranslateVars | undefined,
  ): string => renderTemplate(found.compiled, vars, key, state.locale, onMissingVar);

  const translate = (key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string => {
    const base = String(key);
    const found = findEntry(base);

    if (!found) return onMissingKey(base, state.locale);

    return interpolate(base, found, vars);
  };

  const translatePlural = (key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpOptions): string => {
    if (!Number.isFinite(count)) {
      throw new LinguaInvalidCountError('`count` must be a finite number.');
    }

    const vars = options?.vars;
    const ordinal = options?.ordinal ?? false;

    if (vars && Object.hasOwn(vars, 'count')) {
      throw new LinguaCountInVarsError('`tp` does not allow `vars.count`; `count` is injected automatically.');
    }

    const base = String(key);
    const mergedVars = vars ? { count, ...vars } : { count };

    // Walk the fallback chain locale-by-locale, selecting CLDR plural form using each
    // locale's own rules. This ensures cross-locale fallbacks produce grammatically correct forms.
    for (const candidate of state.chain) {
      const catalog = catalogStore.resolve(candidate);

      if (!catalog) continue;

      const form = selectPluralForm(candidate, count, ordinal, caches);
      const keys = pluralKeyPriority(base, form, count, ordinal);

      for (const k of keys) {
        const found = catalog.get(k);

        if (found !== undefined) {
          return interpolate(k, found, mergedVars);
        }
      }
    }

    return onMissingKey(base, state.locale);
  };

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
    catalogStore.seedFrom(_seed.catalogStore.catalogs, _seed.catalogStore.pendingLoaders);
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

  return {
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
          catalogStore: catalogStore as CatalogStore<M>,
          nsStore: nsStore as NamespaceStore,
        },
      );
    },

    getSnapshot() {
      return snapshot;
    },

    getState(): I18nState {
      const catalogsOut: Record<Locale, Record<string, string>> = {};

      for (const [loc, entry] of catalogStore.catalogs) {
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
      const cached = scopeCache.get(pre);

      if (cached) return cached;

      const scoped: ScopedI18n = {
        get fmt() {
          return getFormatter();
        },
        has: (key) => hasKey(`${pre}.${key}`),
        t: (key, vars?) => translate(`${pre}.${key}`, vars),
        tp: (key, count, options?) => translatePlural(`${pre}.${key}`, count, options),
      };

      scopeCache.set(pre, scoped);

      return scoped;
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
      this.dispose();
    },

    t: translate,

    tp: translatePlural,
  };
}

// ─── SSR standalone helpers ───────────────────────────────────────────────────

/**
 * Serialises the currently loaded catalogs and active locale into a plain object.
 * Pass the result to `hydrateI18n()` on the client.
 *
 * Prefer calling `i18n.getState()` directly — these standalone functions are provided
 * for convenience when you receive a plain `I18n` reference without the full type.
 *
 * **Warning:** Only fully resolved catalogs are included. Loader-only locales not yet
 * preloaded are omitted. Use `i18n.isLoaded(locale)` to verify before calling.
 *
 * **Warning:** The namespace registry is **not** serialized — factory functions cannot
 * be converted to JSON. After `hydrateI18n()`, call `extend()` again for each namespace
 * before relying on namespace-patched keys.
 */
export function serializeI18n(i18n: I18n): I18nState {
  return i18n.getState();
}

/**
 * Hydrates an i18n instance with pre-loaded state (e.g. from a server-rendered payload).
 *
 * Prefer calling `i18n.restoreState(state)` directly — these standalone functions are
 * provided for convenience.
 *
 * @remarks The namespace registry is **not** included in `I18nState`. After hydrating,
 * call `extend()` for each namespace before relying on namespace-patched keys.
 *
 * @throws `LinguaDisposedError` if called on a disposed instance.
 * @throws `LinguaRestoreError` if the state's locale has no catalog.
 */
export function hydrateI18n(i18n: I18n, state: I18nState): void {
  i18n.restoreState(state);
}
