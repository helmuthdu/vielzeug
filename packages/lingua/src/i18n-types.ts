import type { Messages } from './_catalog';
import type { LocaleSource } from './_catalog-store';
import type { NamespaceFactory } from './_namespace-store';
import type { Formatter } from './format';

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
   * After disposal, all mutation methods throw `LinguaDisposedError` and translation methods
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
   * @throws `LinguaDisposedError` if called on a disposed instance.
   *
   * @example
   * await i18n.extend('settings', (locale) =>
   *   import(`./locales/${locale}/settings.json`).then((m) => m.default),
   * );
   */
  extend(ns: string, factory: NamespaceFactory, locale?: Locale): Promise<void>;
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
   * @throws `LinguaNamespaceMissingError` if the namespace has not been registered with `registerNamespace()` first.
   * @throws `LinguaDisposedError` if called on a disposed instance.
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
   * @throws `LinguaDisposedError` if called on a disposed instance.
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
   * @throws `LinguaDisposedError` if called on a disposed instance.
   */
  registerNamespace(ns: string, factory: NamespaceFactory): void;
  /**
   * Hydrates this instance with pre-loaded state (e.g. from a server-rendered payload).
   *
   * @remarks The namespace registry is **not** included in `I18nState`. After restoring,
   * call `extend()` for each namespace before relying on namespace-patched keys.
   *
   * @throws `LinguaDisposedError` if called on a disposed instance.
   * @throws `LinguaRestoreError` if the state's locale has no catalog.
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
   * @throws `LinguaMissingLocaleError` if the locale is not registered.
   * @throws `LinguaDisposedError` if called on a disposed instance.
   */
  setLocale(locale: Locale): Promise<void>;
  /**
   * Subscribes to locale/catalog changes.
   * - `{ immediate: true }`: fires immediately and on every change.
   * - `{ signal }`: unsubscribes when the AbortSignal fires.
   *
   * @throws `LinguaDisposedError` if called on a disposed instance.
   */
  subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
  /** @security Returns raw, unsanitized strings. Sanitize before `innerHTML` insertion. */
  t(key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string;
  /**
   * Translates a plural branch key. `count` is injected automatically.
   *
   * @throws `LinguaInvalidCountError` if `count` is not finite.
   * @throws `LinguaCountInVarsError` if `options.vars.count` is set.
   * @security Returns raw, unsanitized strings.
   */
  tp(key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpOptions): string;
};
