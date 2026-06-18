import { CatalogEntry, type Messages, flattenStrings } from './_catalog';
import { type LocaleCaches, buildLocaleChain, canon, createLocaleCaches, selectPluralForm } from './_chain';
import { E, LinguaError, checkDisposed, checkDisposedAsync, disposedError } from './_errors';
import { issue } from './_warn';
import { type Formatter, createFormatter } from './format';
import { type CompiledTemplate, renderTemplate } from './template';

export { E, LinguaError } from './_errors';
export type { ErrorCode } from './_errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = string;
export type Unsubscribe = () => void;

export type { Messages } from './_catalog';

export type TranslateVars = Record<string, unknown>;
export type Loader<M extends Messages = Messages> = () => Promise<M>;
export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

/**
 * Factory function that returns translations for a given locale within a namespace.
 * Must return a `Promise<M>` — use `async () => import(...)` or `() => fetch(...).then(...)`.
 *
 * @example
 * i18n.extend('settings', (locale) =>
 *   import(`./locales/${locale}/settings.json`).then((m) => m.default),
 * );
 */
export type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => Promise<M>;

export type I18nSnapshot = {
  readonly locale: Locale;
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
   * Passing a new factory after the namespace is already loaded updates the registry for
   * future reloads (e.g. after `register()` replaces the catalog) but does **not** reload
   * the namespace immediately. The new factory takes effect the next time the namespace
   * marker is cleared (by a `register()` or `hydrateI18n()` call).
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
   * Returns `true` if `locale` is in the known locale registry — either resolved or pending loader.
   * Returns `false` for locales that have never been registered.
   */
  isRegistered(locale: Locale): boolean;
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  register(locale: Locale, source: LocaleSource<M>): void;
  /**
   * Returns a scoped translator. All `t()` / `tp()` calls are automatically prefixed with `${prefix}.`.
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
  const { chain, set } = buildLocaleChain(locale, fallback);

  void caches; // caches used at call-site; passed for future use

  return { chain, chainSet: set, locale };
}

// ─── Plural key priority ──────────────────────────────────────────────────────
// R10: Explicit, readable plural key resolution order.
// Cardinal zero: try .zero override first, then CLDR form, then .other as final fallback.
// Ordinal / non-zero: try CLDR form, then .other as final fallback.
function pluralKeyPriority(base: string, form: string, count: number, ordinal: boolean): string[] {
  const keys: string[] = [];

  if (!ordinal && count === 0) keys.push(`${base}.zero`);

  if (form !== 'zero' || ordinal) keys.push(`${base}.${form}`);

  if (form !== 'other') keys.push(`${base}.other`);

  return keys;
}

// ─── Symbol keys for internal SSR bridge ─────────────────────────────────────
// Defined before _createI18nImpl so the object literal can reference them.

const _GET_STATE = Symbol('lingua.getState');
const _RESTORE_STATE = Symbol('lingua.restoreState');

type I18nWithSsr<M extends Messages = Messages> = I18n<M> & {
  [_GET_STATE](): I18nState;
  [_RESTORE_STATE](state: I18nState): void;
};

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
  catalogSeed?: Map<Locale, CatalogEntry>;
  loadedNamespaces?: Map<string, Set<string>>;
  namespaceRegistry?: Map<string, NamespaceFactory<M>>;
};

function _createI18nImpl<M extends Messages = Messages>(config?: I18nOptions<M>, _seed?: I18nSeed<M>): I18nWithSsr<M> {
  const cfg: I18nOptions<M> = config ?? {};

  // ─── Per-instance caches (R8: no shared module-level state) ───────────────
  const caches: LocaleCaches = createLocaleCaches();

  const canonL = (loc: string) => canon(loc, caches);

  const fallback = Array.isArray(cfg.fallback) ? cfg.fallback.map(canonL) : cfg.fallback ? [canonL(cfg.fallback)] : [];

  // ─── Locale state ─────────────────────────────────────────────────────────
  let state: LocaleState = buildState(canonL(cfg.locale ?? 'en'), fallback, caches);

  // ─── Catalog state ────────────────────────────────────────────────────────
  const catalogs = new Map<Locale, CatalogEntry>();
  const loaders = new Map<Locale, Loader<M>>();
  const loadingTasks = new Map<Locale, Promise<void>>();
  const knownLocales = new Set<Locale>();

  // ─── Namespace state ──────────────────────────────────────────────────────
  // Two-level Map<namespace, Set<locale>> — no encoded composite keys.
  // Seeded from parent on fork so already-loaded namespaces are not re-fetched.
  const namespaceRegistry = new Map<string, NamespaceFactory<M>>(_seed?.namespaceRegistry);
  const loadedNamespaces = new Map<string, Set<string>>();
  const namespaceTasks = new Map<string, Map<string, Promise<void>>>();

  if (_seed?.loadedNamespaces) {
    for (const [ns, localeSet] of _seed.loadedNamespaces) {
      loadedNamespaces.set(ns, new Set(localeSet));
    }
  }

  // ─── Disposal ─────────────────────────────────────────────────────────────
  let disposed = false;
  const disposeController = new AbortController();

  // ─── Subscribers ──────────────────────────────────────────────────────────
  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();

  const onMissingKey = cfg.onMissingKey ?? ((key: string) => key);
  const onMissingVar = cfg.onMissingVar ?? ((varName: string) => `{${varName}}`);
  const onSubscriberError = cfg.onSubscriberError ?? ((error: unknown) => issue('subscriber error', error));

  let snapshot: I18nSnapshot = { locale: state.locale };

  // Lazy formatter — avoids Intl overhead for SSR forks that only need t().
  let _fmt: Formatter | undefined;

  // Scope cache — stable object references per prefix for reactive framework renders.
  const scopeCache = new Map<string, ScopedI18n>();

  const getFormatter = (): Formatter => {
    if (!_fmt) _fmt = createFormatter(() => state.locale);

    return _fmt;
  };

  // ─── Internal helpers ──────────────────────────────────────────────────────

  const _registerRaw = (normalized: Locale, flat: Map<string, string>): void => {
    let entry = catalogs.get(normalized);

    if (!entry) {
      entry = new CatalogEntry();
      catalogs.set(normalized, entry);
    }

    entry.setAll(flat);
  };

  const bump = (): void => {
    snapshot = { locale: state.locale };

    const listeners = [...subscribers];

    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        onSubscriberError(error);
      }
    }
  };

  // Single-pass entry lookup across the active fallback chain.
  const findEntry = (key: string): { compiled: CompiledTemplate; message: string } | undefined => {
    for (const candidate of state.chain) {
      const found = catalogs.get(candidate)?.get(key);

      if (found !== undefined) return found;
    }

    return undefined;
  };

  const interpolate = (
    key: string,
    found: { compiled: CompiledTemplate; message: string },
    vars: TranslateVars | undefined,
  ): string => renderTemplate(found.compiled, vars, key, state.locale, onMissingVar);

  const registerInternal = (loc: Locale, source: LocaleSource<M>): void => {
    checkDisposed(disposed);

    const normalized = canonL(loc);

    loadingTasks.delete(normalized);
    knownLocales.add(normalized);

    // Clear namespace loaded-markers for this locale so namespaces can be re-applied
    // after catalog replacement.
    for (const localeSet of loadedNamespaces.values()) {
      localeSet.delete(normalized);
    }

    if (typeof source === 'function') {
      loaders.set(normalized, source as Loader<M>);
      catalogs.delete(normalized);
    } else {
      loaders.delete(normalized);
      catalogs.delete(normalized);
      _registerRaw(normalized, flattenStrings(source as M));
    }

    if (state.chainSet.has(normalized)) bump();
  };

  if (_seed?.catalogSeed) {
    for (const [loc, entry] of _seed.catalogSeed) {
      catalogs.set(loc, entry.clone());
      knownLocales.add(loc);
    }
  }

  if (cfg.catalogs) {
    for (const [loc, source] of Object.entries(cfg.catalogs)) {
      const normalized = canonL(loc);

      knownLocales.add(normalized);

      if (typeof source === 'function') {
        loaders.set(normalized, source as Loader<M>);
      } else {
        _registerRaw(normalized, flattenStrings(source as M));
      }
    }
  }

  const preload = (loc: Locale): Promise<void> => {
    const early = checkDisposedAsync(disposed);

    if (early) return early;

    const normalized = canonL(loc);

    if (catalogs.has(normalized)) return Promise.resolve();

    const loader = loaders.get(normalized);

    if (!loader) return Promise.reject(new LinguaError(E.MISSING_LOCALE, `Missing locale source for "${normalized}".`));

    const existing = loadingTasks.get(normalized);

    if (existing) return existing;

    const task = loader().then(
      (messages) => {
        if (loaders.get(normalized) !== loader) return;

        loaders.delete(normalized);
        _registerRaw(normalized, flattenStrings(messages));
        loadingTasks.delete(normalized);

        if (state.chainSet.has(normalized)) bump();
      },
      (error: unknown) => {
        if (loaders.get(normalized) === loader) loadingTasks.delete(normalized);

        throw error;
      },
    );

    loadingTasks.set(normalized, task);

    return task;
  };

  // patchInternal is used by extend() only.
  const patchInternal = async (loc: Locale, messages: Messages): Promise<void> => {
    const early = checkDisposedAsync(disposed);

    if (early) return early;

    const normalized = canonL(loc);

    if (loaders.has(normalized)) {
      await preload(normalized);

      if (disposed) return;
    }

    _registerRaw(normalized, flattenStrings(messages));
    knownLocales.add(normalized);

    if (state.chainSet.has(normalized)) bump();
  };

  const translate = (key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string => {
    const base = String(key);
    const found = findEntry(base);

    if (!found) return onMissingKey(base, state.locale);

    return interpolate(base, found, vars);
  };

  const translatePlural: I18n<M>['tp'] = (
    key: MessageBranchKeys<M> | (string & {}),
    count: number,
    options?: TpOptions,
  ): string => {
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
      const catalog = catalogs.get(candidate);

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

  // R9: switchGen replaces pendingSwitch + stateAtCall pattern.
  // Monotonically-increasing integer — "last writer wins" for concurrent setLocale() calls.
  let switchGen = 0;

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
    // Symbol-keyed SSR methods — not on the I18n interface, consumed by serializeI18n/hydrateI18n.
    [_GET_STATE](): I18nState {
      const catalogsOut: Record<Locale, Record<string, string>> = {};

      for (const [loc, entry] of catalogs) {
        catalogsOut[loc] = Object.fromEntries([...entry.entries.entries()].map(([k, { message }]) => [k, message]));
      }

      return { catalogs: catalogsOut, locale: state.locale };
    },

    [_RESTORE_STATE](st: I18nState): void {
      checkDisposed(disposed);

      if (!Object.hasOwn(st.catalogs, st.locale)) {
        throw new LinguaError(
          E.RESTORE_NO_LOCALE,
          `restoreState: locale "${st.locale}" has no catalog in the provided state.`,
        );
      }

      for (const [loc, flatCatalog] of Object.entries(st.catalogs)) {
        const normalized = canonL(loc);
        const entry = new CatalogEntry();

        entry.setAll(Object.entries(flatCatalog));
        knownLocales.add(normalized);
        catalogs.set(normalized, entry);

        for (const localeSet of loadedNamespaces.values()) {
          localeSet.delete(normalized);
        }
      }

      const normalized = canonL(st.locale);

      state = buildState(normalized, fallback, caches);
      knownLocales.add(normalized);
      _fmt?.clear();
      bump();
    },

    get disposalSignal(): AbortSignal {
      return disposeController.signal;
    },

    dispose(): void {
      if (disposed) return;

      disposed = true;
      disposeController.abort();
      subscribers.clear();
      catalogs.clear();
      loaders.clear();
      loadingTasks.clear();
      knownLocales.clear();
      namespaceRegistry.clear();
      loadedNamespaces.clear();
      namespaceTasks.clear();
      scopeCache.clear();
    },

    get disposed(): boolean {
      return disposed;
    },

    extend(ns: string, factory: NamespaceFactory<M>, loc?: Locale): Promise<void> {
      checkDisposed(disposed);

      namespaceRegistry.set(ns, factory);

      const normalized = loc ? canonL(loc) : state.locale;

      if (loadedNamespaces.get(ns)?.has(normalized)) return Promise.resolve();

      const nsTasks = namespaceTasks.get(ns);
      const existing = nsTasks?.get(normalized);

      if (existing) return existing;

      const task = factory(normalized)
        .then((messages) => patchInternal(normalized, messages as Messages))
        .then(
          () => {
            let localeSet = loadedNamespaces.get(ns);

            if (!localeSet) {
              localeSet = new Set();
              loadedNamespaces.set(ns, localeSet);
            }

            localeSet.add(normalized);
            namespaceTasks.get(ns)?.delete(normalized);
          },
          (err: unknown) => {
            namespaceTasks.get(ns)?.delete(normalized);
            throw err;
          },
        );

      if (!namespaceTasks.has(ns)) namespaceTasks.set(ns, new Map());

      namespaceTasks.get(ns)!.set(normalized, task);

      return task;
    },

    get fmt(): Formatter {
      return getFormatter();
    },

    fork(overrides?: Omit<I18nOptions<M>, 'catalogs'>): I18n<M> {
      const loaderCatalogs: Record<Locale, LocaleSource<M>> = {};

      for (const [loc, loader] of loaders) {
        loaderCatalogs[loc] = loader;
      }

      return _createI18nImpl(
        {
          catalogs: loaderCatalogs,
          fallback: overrides?.fallback ?? (fallback.length > 0 ? fallback : undefined),
          locale: overrides?.locale ?? state.locale,
          onMissingKey: overrides?.onMissingKey ?? cfg.onMissingKey,
          onMissingVar: overrides?.onMissingVar ?? cfg.onMissingVar,
          onSubscriberError: overrides?.onSubscriberError ?? cfg.onSubscriberError,
        },
        {
          catalogSeed: new Map(catalogs),
          loadedNamespaces: new Map([...loadedNamespaces.entries()].map(([ns, set]) => [ns, new Set(set)])),
          namespaceRegistry: new Map(namespaceRegistry),
        },
      );
    },

    getSnapshot() {
      return snapshot;
    },

    getSupportedLocales(sorted?: boolean): Locale[] {
      const locales = [...knownLocales];

      return sorted === true ? locales.sort() : locales;
    },

    has(key: MessageLeafKeys<M> | MessageBranchKeys<M> | (string & {})): boolean {
      const base = String(key);

      if (findEntry(base) !== undefined) return true;

      for (const candidate of state.chain) {
        const catalog = catalogs.get(candidate);

        if (!catalog) continue;

        if (catalog.prefixes.has(base)) return true;
      }

      return false;
    },

    isLoaded(loc: Locale): boolean {
      try {
        return catalogs.has(canonL(loc));
      } catch {
        return false;
      }
    },

    isRegistered(loc: Locale): boolean {
      try {
        return knownLocales.has(canonL(loc));
      } catch {
        return false;
      }
    },

    get locale(): Locale {
      return state.locale;
    },

    preload,

    register: registerInternal,

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
            const catalog = catalogs.get(candidate);

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

      // R9: monotonic generation counter — last writer wins.
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
 * **Warning:** Only fully resolved catalogs are included. Loader-only locales not yet
 * preloaded are omitted. Use `i18n.isLoaded(locale)` to verify before calling.
 *
 * **Warning:** The namespace registry is **not** serialized — factory functions cannot
 * be converted to JSON. After `hydrateI18n()`, call `extend()` again for each namespace
 * before relying on namespace-patched keys.
 */
export function serializeI18n(i18n: I18n): I18nState {
  return (i18n as I18nWithSsr)[_GET_STATE]();
}

/**
 * Hydrates an i18n instance with pre-loaded state (e.g. from a server-rendered payload).
 *
 * @remarks The namespace registry is **not** included in `I18nState`. After hydrating,
 * call `extend()` for each namespace before relying on namespace-patched keys.
 *
 * @throws `LinguaError(E.DISPOSED)` if called on a disposed instance.
 * @throws `LinguaError(E.RESTORE_NO_LOCALE)` if the state's locale has no catalog.
 */
export function hydrateI18n(i18n: I18n, state: I18nState): void {
  (i18n as I18nWithSsr)[_RESTORE_STATE](state);
}
