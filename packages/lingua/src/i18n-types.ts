import type { Locale, Messages } from './_catalog';
import type { LocaleSource } from './_catalog-store';
import type { NamespaceFactory } from './_namespace-store';
import type { Formatter } from './format';

export type { Locale, Messages } from './_catalog';
export type { Loader, LocaleSource } from './_catalog-store';
export type { NamespaceFactory } from './_namespace-store';

export type Unsubscribe = () => void;

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
  /** Segmented interpolation via the same translator closure as `t` — resolves with the live locale, not the snapshot-time one (matches `t`/`tp`). */
  readonly ti: <V>(key: string, vars: Record<string, V>) => Array<string | V>;
  readonly tp: (key: string, count: number, options?: TpOptions) => string;
  /** Segmented plural interpolation — `ti()` semantics applied to a plural branch. See `I18n.tpi`. */
  readonly tpi: <V>(key: string, count: number, options?: TpiOptions<V>) => Array<string | number | V>;
};

/** Shape of the serialised state produced by `getState()`. Pass to `restoreState()` on the client. */
export type I18nState = {
  readonly catalogs: Record<Locale, Record<string, string>>;
  readonly locale: Locale;
  /**
   * State format version — currently always `1`. `restoreState()` rejects any other
   * version, so a future compiled/packed format can be introduced without silently
   * misreading older payloads.
   */
  readonly version: 1;
};

export type SubscribeOptions = {
  immediate?: boolean;
  /** AbortSignal — automatically unsubscribes when the signal is aborted. */
  signal?: AbortSignal;
};

export type TpiOptions<V = unknown> = Omit<TpOptions, 'vars'> & {
  /** Extra interpolation variables, typed like `ti()`'s vars. `count` is injected automatically. */
  vars?: Record<string, V>;
};

export type TpOptions = {
  /** Use ordinal plural rules (1st, 2nd, 3rd) instead of cardinal (default: `false`). */
  ordinal?: boolean;
  /** Inject additional interpolation variables alongside the automatically injected `count`. */
  vars?: TranslateVars;
};

export type HasOptions = {
  /**
   * Which key shape to check:
   * - `'leaf'` (default) — a plain key resolvable by `t()`.
   * - `'branch'` — a prefix with keys beneath it (plural branches, nested sections),
   *   resolvable by `tp()` for plural branches.
   */
  kind?: 'branch' | 'leaf';
};

export type ScopedI18n = {
  /** Intl formatter inherited from the parent instance. Follows locale changes automatically. */
  readonly fmt: Formatter;
  /** True if `key` exists under this scope's prefix — as a leaf (default) or a branch (`{ kind: 'branch' }`). */
  has(key: string, options?: HasOptions): boolean;
  t(key: string, vars?: TranslateVars): string;
  /**
   * Segmented interpolation: like `t()` but returns the template as a mixed array of
   * string segments and typed replacement values (components, elements). Missing key
   * falls back through `onMissingKey`; a missing var keeps its `{placeholder}` segment.
   * Unlike `t()`, a `null` var counts as provided and is embedded as-is.
   */
  ti<V>(key: string, vars: Record<string, V>): Array<string | V>;
  tp(key: string, count: number, options?: TpOptions): string;
  /** Segmented plural interpolation — see `I18n.tpi`. */
  tpi<V>(key: string, count: number, options?: TpiOptions<V>): Array<string | number | V>;
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
  /** Intl formatter bound to this instance's locale. Follows locale changes automatically. */
  readonly fmt: Formatter;
  /**
   * Creates a derived instance that inherits the current catalog snapshot, loaders,
   * namespace registry, and loaded-namespace markers, but has its own locale, fallback chain,
   * and subscribers. Catalog mutations on the fork do not affect the parent.
   *
   * Each catalog entry is shallow-cloned into the fork (so `patch()` on one side never
   * mutates the other) while per-message compiled templates are shared by reference —
   * `fork()` never re-compiles a message, making it cheap for SSR fork-per-request
   * patterns with large catalogs.
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
   * Pass the result to `restoreState()` on the client.
   *
   * **Warning:** Only fully resolved catalogs are included. Loader-only locales not yet
   * preloaded are omitted. Use `i18n.isLoaded(locale)` to verify before calling.
   *
   * **Warning:** The namespace registry is **not** serialized — factory functions cannot
   * be converted to JSON. After `restoreState()`, call `loadNamespace()` with a factory
   * again for each namespace before relying on namespace-patched keys.
   */
  getState(): I18nState;
  /**
   * Returns all registered locales.
   * - Default (no argument): locales in registration order.
   * - `getSupportedLocales({ sorted: true })`: sorted in ascending code-point order.
   */
  getSupportedLocales(options?: { sorted?: boolean }): Locale[];
  /**
   * Returns `true` if the given key exists in the active fallback chain.
   *
   * Default checks for a **leaf** key — resolvable by `t()`. Pass
   * `{ kind: 'branch' }` to check for a **branch** prefix instead (a plural
   * branch resolvable by `tp()`, or any prefix with keys beneath it).
   *
   * @example
   * i18n.has('inbox.title')                    // true for a leaf key
   * i18n.has('inbox')                          // false when `inbox` only has plural sub-keys…
   * i18n.has('inbox', { kind: 'branch' })      // …which this detects
   */
  has(key: MessageBranchKeys<M> | MessageLeafKeys<M> | (string & {}), options?: HasOptions): boolean;
  /**
   * Returns `true` if the catalog for `locale` is fully resolved.
   * Returns `false` for locales registered as async loaders not yet preloaded, and for unknown locales.
   *
   * @throws `LinguaInvalidLocaleError` for an invalid BCP 47 tag — a typo'd locale is a bug,
   * not a `false`.
   */
  isLoaded(locale: Locale): boolean;
  /**
   * Returns `true` if the namespace has been fully loaded for the given locale.
   * Returns `false` if it is not registered or not yet loaded for this locale.
   *
   * @throws `LinguaInvalidLocaleError` for an invalid BCP 47 tag (when `locale` is passed).
   */
  isNamespaceLoaded(ns: string, locale?: Locale): boolean;
  /**
   * Loads a previously registered namespace for the given locale (defaults to the active
   * locale). Pass `factory` to register it first — one call does register + load.
   * Deduplicates concurrent and repeated calls.
   *
   * Re-registering with a **new factory** after the namespace is already loaded updates the
   * registry for future reloads but does **not** reload immediately — the new factory takes
   * effect the next time the namespace marker is cleared (by `register()` or `restoreState()`).
   *
   * @throws `LinguaNamespaceMissingError` if no factory is passed and the namespace was never registered.
   * @throws `LinguaDisposedError` if called on a disposed instance.
   *
   * @example
   * await i18n.loadNamespace('settings', (locale) =>
   *   import(`./locales/${locale}/settings.json`).then((m) => m.default),
   * );
   */
  loadNamespace(ns: string, factory?: NamespaceFactory, locale?: Locale): Promise<void>;
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  /**
   * Registers (or replaces) a locale source. If the source is an async loader, it is loaded
   * immediately and this method returns a Promise that resolves when the load is complete.
   * If the source is a static message object, it is synchronously registered and the returned
   * Promise resolves immediately.
   *
   * Replacing a catalog clears every namespace's loaded-marker for that locale — call
   * `loadNamespace()` again to re-apply them. Note: an *in-flight* namespace factory is
   * not cancelled — if it resolves after the replacement, its keys are patched into the
   * new catalog.
   *
   * @throws `LinguaDisposedError` if called on a disposed instance.
   */
  register(loc: Locale, source: LocaleSource<M>): Promise<void>;
  /**
   * Registers a namespace factory without loading it. Use `loadNamespace()` to trigger loading,
   * or pass the factory to `loadNamespace()` to do both in one call.
   *
   * @throws `LinguaDisposedError` if called on a disposed instance.
   */
  registerNamespace(ns: string, factory: NamespaceFactory): void;
  /**
   * Hydrates this instance with pre-loaded state (e.g. from a server-rendered payload).
   *
   * @remarks The namespace registry is **not** included in `I18nState`. After restoring,
   * call `loadNamespace()` with a factory for each namespace before relying on
   * namespace-patched keys.
   *
   * @remarks Unlike `register()` and construction, this does **not** run the automatic
   * dev-mode plural-form check — the assumption is that `state` was already registered (and
   * therefore already checked) once on whatever system produced it.
   *
   * @throws `LinguaDisposedError` if called on a disposed instance.
   * @throws `LinguaRestoreError` if the state's locale has no catalog, or the state version is unsupported.
   */
  restoreState(state: I18nState): void;
  /**
   * Returns a scoped translator. All `t()` / `tp()` calls are automatically prefixed with `${prefix}.`.
   * The returned object is memoized — calling `scope(prefix)` with the same string always returns the
   * same reference, as long as it's still in the cache (bounded at 128 distinct prefixes; oldest
   * evicts first). Intended for a static, finite set of prefixes (nav sections, form names, ...) —
   * don't pass a dynamic per-item prefix (e.g. `scope(`item.${id}`)` in a list render), or the
   * memoization guarantee stops holding once you exceed the bound.
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
   * Segmented interpolation: like `t()` but returns the template as a mixed array of
   * string segments and typed replacement values (components, elements). Missing key
   * falls back through `onMissingKey`; a missing var keeps its `{placeholder}` segment.
   * Unlike `t()`, a `null` var counts as provided and is embedded as-is.
   */
  ti<V>(key: MessageLeafKeys<M> | (string & {}), vars: Record<string, V>): Array<string | V>;
  /**
   * Translates a plural branch key. `count` is injected automatically.
   *
   * @throws `LinguaInvalidCountError` if `count` is not finite.
   * @throws `LinguaCountInVarsError` if `options.vars.count` is set.
   * @security Returns raw, unsanitized strings.
   */
  tp(key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpOptions): string;
  /**
   * Segmented plural interpolation: CLDR plural selection like `tp()`, but renders the
   * chosen template to a mixed array of string segments and typed values (components,
   * elements) like `ti()`. `count` is injected automatically and appears as a raw
   * number segment (typed values pass through unstringified — format it yourself if
   * you need grouping). Missing branch falls back through `onMissingKey` (one string
   * segment).
   *
   * @throws `LinguaInvalidCountError` if `count` is not finite.
   * @throws `LinguaCountInVarsError` if `options.vars.count` is present.
   */
  tpi<V>(key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpiOptions<V>): Array<string | number | V>;
};
