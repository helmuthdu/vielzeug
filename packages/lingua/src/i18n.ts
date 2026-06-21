import { CatalogEntry, type Messages, flattenStrings } from './_catalog';
import { type CatalogStore, type Loader, type LocaleSource, createCatalogStore } from './_catalog-store';
import { type LocaleCaches, buildLocaleChain, canon, createLocaleCaches, selectPluralForm } from './_chain';
import { E, LinguaError, checkDisposed, disposedError } from './_errors';
import { type NamespaceFactory, type NamespaceStore, createNamespaceStore } from './_namespace-store';
import { issue } from './_warn';
import { type Formatter, createFormatter } from './format';
import { type CompiledTemplate, renderTemplate } from './template';

export { E, LinguaError } from './_errors';
export type { ErrorCode } from './_errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = string;
export type Unsubscribe = () => void;

export type { Messages } from './_catalog';
export type { Loader, LocaleSource } from './_catalog-store';
export type { NamespaceFactory } from './_namespace-store';

export type TranslateVars = Record<string, unknown>;

/**
 * A snapshot of the i18n instance state at a point in time.
 * Object identity changes on every observable change (locale switch, catalog load).
 * `t` and `tp` are bound to the locale captured in this snapshot.
 */
export type I18nSnapshot = {
  readonly locale: Locale;
  /** @security Returns raw, unsanitized strings. Sanitize before `innerHTML` insertion. */
  readonly t: (key: string, vars?: TranslateVars) => string;
  readonly tp: (key: string, count: number, options?: TpOptions) => string;
};

/** Shape of the serialised state produced by `serializeI18n()`. Pass to `hydrateI18n()` on the client. */
export type I18nState = {
  readonly catalogs: Record<Locale, Record<string, string>>;
  readonly locale: Locale;
};

export type SubscribeOptions = {
  immediate?: boolean;
  /** AbortSignal — automatically unsubscribes when the signal is aborted. */
  signal?: AbortSignal;
};

export type TpOptions = {
  /** Use ordinal plural rules (1st, 2nd, 3rd) instead of cardinal (default: `false`). */
  ordinal?: boolean;
  /** Inject additional interpolation variables alongside the automatically injected `count`. */
  vars?: TranslateVars;
};

export type ScopedI18n = {
  /** Intl formatter inherited from the parent instance. Follows locale changes automatically. */
  readonly fmt: Formatter;
  has(key: string): boolean;
  t(key: string, vars?: TranslateVars): string;
  tp(key: string, count: number, options?: TpOptions): string;
};

// ─── Key inference ────────────────────────────────────────────────────────────
// Depth tuple prevents infinite recursion on recursive `Messages` type.
// Depth 7 covers real-world catalog nesting without measurable TS instantiation cost.
type Depth = [never, 0, 1, 2, 3, 4, 5, 6];

export type MessageLeafKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
  ? never
  : T extends string
    ? P
    : T extends Record<string, unknown>
      ? { [K in string & keyof T]: MessageLeafKeys<T[K], P extends '' ? K : `${P}.${K}`, Depth[D]> }[string & keyof T]
      : never;

export type MessageBranchKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
  ? never
  : T extends Record<string, unknown>
    ? {
        [K in string & keyof T]: T[K] extends string
          ? never
          : (P extends '' ? K : `${P}.${K}`) | MessageBranchKeys<T[K], P extends '' ? K : `${P}.${K}`, Depth[D]>;
      }[string & keyof T]
    : never;

// ─── Config ───────────────────────────────────────────────────────────────────

export type I18nOptions<M extends Messages = Messages> = {
  /** Locale registry. Values can be static message objects or async loaders. */
  catalogs?: Record<Locale, LocaleSource<M>>;
  /** Locale(s) to search when the active locale is missing a key. Subtags are expanded automatically (e.g. `en-US` → `en`). */
  fallback?: Locale | Locale[];
  /** Initial active locale. Defaults to `"en"`. Canonicalized via `Intl.getCanonicalLocales`. */
  locale?: Locale;
  /**
   * Called when a translation key is missing.
   * Defaults to returning the key string.
   *
   * @security The default handler returns `key` verbatim. Do not render the return value as HTML
   * if keys are constructed from untrusted user input.
   */
  onMissingKey?: (key: string, locale: Locale) => string;
  /**
   * Called when an interpolation variable is missing.
   * Defaults to returning `{varName}`.
   */
  onMissingVar?: (varName: string, key: string, locale: Locale) => string;
  /**
   * Called when a subscriber callback throws. Defaults to `console.error`.
   * Override in production to route errors to a structured logger rather than the browser console.
   */
  onSubscriberError?: (error: unknown) => void;
};

// ─── Public interface ─────────────────────────────────────────────────────────

export type I18n<M extends Messages = Messages> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this instance. */
  readonly disposalSignal: AbortSignal;
  /**
   * Disposes this i18n instance: removes all subscribers and clears catalog, loader, and namespace state.
   * After disposal, all mutation methods throw `LinguaError(E.DISPOSED)` and translation methods
   * fall back to `onMissingKey` for every key. Idempotent.
   */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /**
   * Registers a namespace factory and immediately starts loading it for the given locale
   * (defaults to the active locale). Deduplicates concurrent and repeated calls.
   *
   * @remarks
   * Call `registerNamespace()` first if you only want to register without loading.
   * `extend()` is a convenience that does both in one call.
   *
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   *
   * @example
   * await i18n.extend('settings', (locale) =>
   *   import(`./locales/${locale}/settings.json`).then((m) => m.default),
   * );
   */
  extend(ns: string, factory: NamespaceFactory<M>, locale?: Locale): Promise<void>;
  /** Intl formatter bound to this instance's locale. Follows locale changes automatically. */
  readonly fmt: Formatter;
  /**
   * Creates a derived instance that inherits the current catalog snapshot, loaders,
   * namespace registry, and loaded-namespace markers, but has its own locale, fallback chain,
   * and subscribers. Catalog mutations on the fork do not affect the parent.
   *
   * Resolved catalog entries are shared by reference (no template re-compilation), making
   * `fork()` cheap for SSR fork-per-request patterns with large catalogs.
   *
   * @example
   * // SSR: per-request locale without touching the shared instance
   * const reqI18n = i18n.fork({ locale: req.locale });
   */
  fork(overrides?: Omit<I18nOptions<M>, 'catalogs'>): I18n<M>;
  /** Returns the current snapshot. Object identity changes on every observable change. */
  getSnapshot(): I18nSnapshot;
  /**
   * Extracts a serializable snapshot of all loaded catalogs and the active locale.
   * Pass the result to `hydrateI18n()` on the client.
   *
   * **Warning:** Only fully resolved catalogs are included. Loader-only locales not yet
   * preloaded are omitted. Use `i18n.isLoaded(locale)` to verify before calling.
   *
   * **Warning:** The namespace registry is **not** serialized — factory functions cannot
   * be converted to JSON. After `hydrateI18n()`, call `extend()` again for each namespace
   * before relying on namespace-patched keys.
   */
  getState(): I18nState;
  /**
   * Returns all registered locales.
   * - Default (no argument): locales in registration order.
   * - `getSupportedLocales(true)`: sorted in ascending code-point order.
   */
  getSupportedLocales(sorted?: boolean): Locale[];
  /**
   * Returns `true` if the given key exists in the active fallback chain — either as a leaf
   * string key or as a plural branch (any key under `key.` prefix).
   *
   * @example
   * i18n.has('inbox')       // true for leaf or pipe-plural expanded branch
   * i18n.has('inbox.one')   // true for explicit sub-key
   */
  has(key: MessageLeafKeys<M> | MessageBranchKeys<M> | (string & {})): boolean;
  /**
   * Returns `true` if the catalog for `locale` is fully resolved.
   * Returns `false` for locales registered as async loaders not yet preloaded, and for unknown locales.
   */
  isLoaded(locale: Locale): boolean;
  /**
   * Returns `true` if the namespace has been fully loaded for the given locale.
   * Returns `false` if it is not registered or not yet loaded for this locale.
   */
  isNamespaceLoaded(ns: string, locale?: Locale): boolean;
  /**
   * Returns `true` if a namespace factory is registered under the given name.
   */
  isNamespaceRegistered(ns: string): boolean;
  /**
   * Returns `true` if `locale` is in the known locale registry — either resolved or pending loader.
   * Returns `false` for locales that have never been registered.
   */
  isRegistered(locale: Locale): boolean;
  /**
   * Loads a previously registered namespace for the given locale (defaults to the active locale).
   * Deduplicates concurrent and repeated calls.
   *
   * @throws an error if the namespace has not been registered with `registerNamespace()` first.
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   */
  loadNamespace(ns: string, locale?: Locale): Promise<void>;
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  /**
   * Registers (or replaces) a locale source. If the source is an async loader, it is loaded
   * immediately and this method returns a Promise that resolves when the load is complete.
   * If the source is a static message object, it is synchronously registered and the returned
   * Promise resolves immediately.
   *
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   */
  register(locale: Locale, source: LocaleSource<M>): Promise<void>;
  /**
   * Registers a namespace factory without loading it. Use `loadNamespace()` to trigger loading,
   * or use `extend()` to register and load in one call.
   *
   * @remarks
   * Re-registering a namespace updates the factory for future loads but does **not** reload
   * the namespace if it is already loaded. The new factory takes effect the next time the
   * namespace marker is cleared (by a `register()` or `restoreState()` call).
   *
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   */
  registerNamespace(ns: string, factory: NamespaceFactory<M>): void;
  /**
   * Hydrates this instance with pre-loaded state (e.g. from a server-rendered payload).
   *
   * @remarks The namespace registry is **not** included in `I18nState`. After restoring,
   * call `extend()` for each namespace before relying on namespace-patched keys.
   *
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   * @throws `LinguaError(E.RESTORE_NO_LOCALE)` if the state's locale has no catalog.
   */
  restoreState(state: I18nState): void;
  /**
   * Returns a scoped translator. All `t()` / `tp()` calls are automatically prefixed with `${prefix}.`.
   * The returned object is memoized — calling `scope(prefix)` with the same string always returns the
   * same reference.
   *
   * @example
   * const nav = i18n.scope('nav');
   * nav.t('home');      // i18n.t('nav.home')
   * nav.tp('items', 3); // i18n.tp('nav.items', 3)
   */
  scope(prefix: MessageBranchKeys<M> | (string & {})): ScopedI18n;
  /**
   * Switches the active locale. Loads the locale if it is registered as an async loader.
   * Last concurrent call wins; stale responses are discarded.
   * If loading fails, the active locale is unchanged.
   *
   * @throws `LinguaError(E.MISSING_LOCALE)` if the locale is not registered.
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   */
  setLocale(locale: Locale): Promise<void>;
  /**
   * Subscribes to locale/catalog changes.
   * - `{ immediate: true }`: fires immediately and on every change.
   * - `{ signal }`: unsubscribes when the AbortSignal fires.
   *
   * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
   */
  subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
  /** @security Returns raw, unsanitized strings. Sanitize before `innerHTML` insertion. */
  t(key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string;
  /**
   * Translates a plural branch key. `count` is injected automatically.
   *
   * @throws `LinguaError(E.INVALID_COUNT)` if `count` is not finite.
   * @throws `LinguaError(E.COUNT_IN_VARS)` if `options.vars.count` is set.
   * @security Returns raw, unsanitized strings.
   */
  tp(key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpOptions): string;
};

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
  nsStore?: NamespaceStore<M>;
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
  const nsStore: NamespaceStore<M> = createNamespaceStore(() => disposed);

  // ─── Locale state ─────────────────────────────────────────────────────────
  let state: LocaleState = buildState(canonL(cfg.locale ?? 'en'), fallback, caches);

  // ─── Subscribers ──────────────────────────────────────────────────────────
  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();

  const onMissingKey = cfg.onMissingKey ?? ((key: string) => key);
  const onMissingVar = cfg.onMissingVar ?? ((varName: string) => `{${varName}}`);
  const onSubscriberError = cfg.onSubscriberError ?? ((error: unknown) => issue('subscriber error', error));

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
      throw new LinguaError(E.INVALID_COUNT, '`count` must be a finite number.');
    }

    const vars = options?.vars;
    const ordinal = options?.ordinal ?? false;

    if (vars && Object.hasOwn(vars, 'count')) {
      throw new LinguaError(E.COUNT_IN_VARS, '`tp` does not allow `vars.count`; `count` is injected automatically.');
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
    const unsubscribe = (): void => {
      subscribers.delete(callback);
    };

    if (disposed) throw disposedError();

    if (options?.signal?.aborted) return unsubscribe;

    if (options?.immediate === true) {
      try {
        callback(snapshot);
      } catch (error) {
        onSubscriberError(error);

        return unsubscribe;
      }
    }

    subscribers.add(callback);
    options?.signal?.addEventListener('abort', unsubscribe, { once: true });

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
      subscribers.clear();
      catalogStore.dispose();
      nsStore.dispose();
      scopeCache.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    extend(ns: string, factory: NamespaceFactory<M>, loc?: Locale): Promise<void> {
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
          nsStore: nsStore as NamespaceStore<M>,
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
      const base = String(key);

      if (findEntry(base) !== undefined) return true;

      for (const candidate of state.chain) {
        const catalog = catalogStore.resolve(candidate);

        if (!catalog) continue;

        if (catalog.prefixes.has(base)) return true;
      }

      return false;
    },

    isLoaded(loc: Locale): boolean {
      try {
        return catalogStore.isLoaded(canonL(loc));
      } catch {
        return false;
      }
    },

    isNamespaceLoaded(ns: string, loc?: Locale): boolean {
      return nsStore.isLoaded(ns, loc ? canonL(loc) : state.locale);
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

    registerNamespace(ns: string, factory: NamespaceFactory<M>): void {
      nsStore.registerNamespace(ns, factory);
    },

    restoreState(st: I18nState): void {
      checkDisposed(disposed);

      if (!Object.hasOwn(st.catalogs, st.locale)) {
        throw new LinguaError(
          E.RESTORE_NO_LOCALE,
          `restoreState: locale "${st.locale}" has no catalog in the provided state.`,
        );
      }

      const freshEntries = new Map<Locale, CatalogEntry>();

      for (const [loc, flatCatalog] of Object.entries(st.catalogs)) {
        const normalized = canonL(loc);
        const entry = new CatalogEntry();

        entry.setAll(Object.entries(flatCatalog));
        freshEntries.set(normalized, entry);
        nsStore.clearLocale(normalized);
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
        has: (key) => {
          const fullKey = `${pre}.${key}`;

          if (findEntry(fullKey) !== undefined) return true;

          for (const candidate of state.chain) {
            const catalog = catalogStore.resolve(candidate);

            if (!catalog) continue;

            if (catalog.prefixes.has(fullKey)) return true;
          }

          return false;
        },
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
 * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
 * @throws `LinguaError(E.RESTORE_NO_LOCALE)` if the state's locale has no catalog.
 */
export function hydrateI18n(i18n: I18n, state: I18nState): void {
  i18n.restoreState(state);
}
