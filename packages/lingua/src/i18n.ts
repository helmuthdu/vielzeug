import { issue } from './_warn';
import { createFormatter, type Formatter } from './format';
import {
  compileTemplate,
  type CompiledTemplate,
  INTERPOLATION_PATTERN,
  parsePipePlural,
  renderTemplate,
} from './template';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = string;
export type Unsubscribe = () => void;

export interface Messages {
  [key: string]: string | Messages;
}

export type TranslateVars = Record<string, unknown>;
export type Loader<M extends Messages = Messages> = () => Promise<M>;
export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

/**
 * Factory function that returns translations for a given locale within a namespace.
 *
 * Accepted return forms:
 * - `M` — a static message object resolved synchronously
 * - `() => Promise<M>` — an async loader function (the `Loader<M>` pattern)
 * - `Promise<M>` — a raw promise (e.g. from an async factory)
 *
 * @example
 * i18n.registerNamespace('settings', (locale) =>
 *   import(`./locales/${locale}/settings.json`).then((m) => m.default),
 * );
 */
export type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => LocaleSource<M> | Promise<M>;

export type I18nSnapshot = {
  readonly locale: Locale;
  readonly version: number;
};

/** Shape of the serialised state produced by `getState()`. Pass to `restoreState()` on the client. */
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
  /**
   * Returns a bound translation function for a specific key within this scope.
   * Caches the key lookup and invalidates on any catalog or locale change.
   * Equivalent to `i18n.bind('prefix.key')`.
   */
  bind(key: string): (vars?: TranslateVars) => string;
  /**
   * Returns a bound plural-translation function for a specific branch key within this scope.
   * Equivalent to `i18n.bindPlural('prefix.key')`.
   */
  bindPlural(key: string): (count: number, options?: TpOptions) => string;
  /** Intl formatter inherited from the parent instance. Follows locale changes automatically. */
  readonly fmt: Formatter;
  has(key: string): boolean;
  t(key: string, vars?: TranslateVars): string;
  tp(key: string, count: number, options?: TpOptions): string;
};

export type ValidationWarning = {
  form: string;
  key: string;
  locale: Locale;
};

// ─── Key inference ────────────────────────────────────────────────────────────
// Depth tuple prevents infinite recursion on recursive `Messages` type.
// Real-world catalogs rarely exceed 3 levels; depth 4 is sufficient.
type Depth = [never, 0, 1, 2, 3];

export type MessageLeafKeys<T, P extends string = '', D extends number = 4> = [D] extends [0]
  ? never
  : T extends string
    ? P
    : T extends Record<string, unknown>
      ? { [K in string & keyof T]: MessageLeafKeys<T[K], P extends '' ? K : `${P}.${K}`, Depth[D]> }[string & keyof T]
      : never;

export type MessageBranchKeys<T, P extends string = '', D extends number = 4> = [D] extends [0]
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
  /**
   * Pre-compile message templates at registration time.
   * Skips the regex on every `t()` call — beneficial for high-frequency renders.
   * Default: `false`.
   */
  compile?: boolean;
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
   * Override in production to route errors to a structured logger rather than the browser console,
   * to avoid accidentally leaking stack traces or internal state via console output.
   */
  onSubscriberError?: (error: unknown) => void;
};

// ─── Public interface ─────────────────────────────────────────────────────────

export type I18n<M extends Messages = Messages> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /**
   * Returns a bound translation function for a specific key.
   * The returned function caches the key lookup and invalidates on any catalog or locale change,
   * making it suitable for hot-path render loops where key-string allocation matters.
   *
   * @example
   * const greet = i18n.bind('greeting');
   * users.forEach(u => greet({ name: u.name }));
   */
  bind(key: MessageLeafKeys<M> | (string & {})): (vars?: TranslateVars) => string;
  /**
   * Returns a bound plural-translation function for a specific branch key.
   * Mirrors `bind()` for plural keys — useful for hot-path plural renders such as
   * notification counts or reactive list sizes.
   *
   * The returned function caches the plural-form lookup and invalidates on any catalog or locale change.
   *
   * @example
   * const inbox = i18n.bindPlural('inbox');
   * inbox(0);  // => 'No messages'
   * inbox(3);  // => '3 messages'
   * inbox(1, { ordinal: true }); // ordinal plural
   */
  bindPlural(key: MessageBranchKeys<M> | (string & {})): (count: number, options?: TpOptions) => string;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this instance. */
  readonly disposalSignal: AbortSignal;
  /**
   * Disposes this i18n instance: removes all subscribers and clears catalog, loader, and namespace state.
   * After calling `dispose()`, translation methods fall back to `onMissingKey` for every key
   * (returning the key string by default). Predicate methods (`isLoaded`, `isRegistered`) return `false`.
   * The instance should not be used after disposal.
   *
   * Primarily useful for long-lived SPA instances that are replaced at runtime (e.g. route-level
   * i18n instances) to prevent subscriber and catalog memory from accumulating.
   */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /** Intl formatter bound to this instance's locale. Follows locale changes automatically. */
  readonly fmt: Formatter;
  /**
   * Creates a derived instance that inherits the current catalog snapshot, loaders,
   * and namespace registry, but has its own locale, fallback chain, and subscribers.
   * Catalog mutations on the fork do not affect the parent.
   *
   * Namespace registrations made on the parent **before** forking are copied to the fork.
   * Registrations made after the fork are not propagated in either direction.
   *
   * All overrides in `I18nOptions` except `catalogs` and `compile` are accepted:
   * `locale`, `fallback`, `onMissingKey`, `onMissingVar`, `onSubscriberError`.
   * Unspecified fields inherit from the parent's configuration.
   *
   * Useful for SSR (one fork per request) and testing (custom onMissingKey).
   *
   * @example
   * // SSR: per-request locale without touching the shared instance
   * const reqI18n = i18n.fork({ locale: req.locale });
   *
   * // Tests: assert on missing-key behaviour without polluting the shared instance
   * const testI18n = i18n.fork({ onMissingKey: k => `MISSING:${k}` });
   */
  fork(overrides?: Omit<I18nOptions<M>, 'catalogs' | 'compile'>): I18n<M>;
  /** Snapshot version starts at 0 and increments by 1 per observable change. */
  getSnapshot(): I18nSnapshot;
  /**
   * Serialises the currently loaded catalogs and active locale into a plain object.
   * Pass the result to `restoreState()` to hydrate a client-side instance without re-fetching.
   *
   * **Warning:** Only fully resolved catalogs are included. Locales registered as async loaders
   * that have not yet been `preload()`ed are silently omitted. Use `isLoaded(locale)` to verify
   * before calling `getState()` in SSR to avoid silent hydration gaps.
   *
   * @example
   * // Server:
   * const state = i18n.getState();
   * // Client:
   * i18n.restoreState(state);
   */
  getState(): I18nState;
  /**
   * Returns all registered locales.
   * - Default (no argument): locales in registration order.
   * - `getSupportedLocales(true)`: sorted in ascending code-point order (not locale-aware).
   */
  getSupportedLocales(sorted?: boolean): Locale[];
  /**
   * Returns `true` if the given leaf key exists in the active fallback chain.
   *
   * **Pipe-plural keys:** pipe-delimited shorthand (e.g. `'One|{count}'`) is expanded into
   * sub-keys at registration time (e.g. `inbox.one`, `inbox.other`). Calling `has('inbox')`
   * returns `false` because the base key is no longer present — use `hasBranch('inbox')` or
   * `has('inbox.one')` to check for plural branches.
   */
  has(key: MessageLeafKeys<M> | (string & {})): boolean;
  /**
   * Returns `true` if any CLDR plural form (`zero`, `one`, `two`, `few`, `many`, `other`) exists
   * under the given branch key in the active fallback chain.
   *
   * Useful for checking whether a plural branch (including pipe-plural expanded keys) exists
   * without knowing which exact forms are present.
   *
   * @example
   * // catalog: { inbox: 'One message|{count} messages' }  (expands to inbox.one / inbox.other)
   * i18n.has('inbox')        // false — base key was expanded away
   * i18n.hasBranch('inbox')  // true  — inbox.one / inbox.other exist
   */
  hasBranch(key: MessageBranchKeys<M> | (string & {})): boolean;
  /**
   * Returns `true` if the catalog for `locale` is fully resolved (i.e. not still a pending loader).
   * Use this to avoid a redundant `preload()` call when you already know the locale is ready.
   *
   * Note: returns `false` for locales that were registered but never loaded, and also for
   * unregistered locales.
   */
  isLoaded(locale: Locale): boolean;
  /**
   * Returns `true` if `locale` is in the known locale registry — either as a resolved catalog
   * or as a pending async loader. Returns `false` for locales that have never been registered.
   *
   * Use this to distinguish:
   * - `isRegistered(l)` — locale is known (may or may not be loaded yet)
   * - `isLoaded(l)` — locale is known **and** fully resolved
   *
   * @example
   * if (!i18n.isRegistered('fr')) throw new Error('fr locale not configured');
   * if (!i18n.isLoaded('fr')) await i18n.preload('fr');
   */
  isRegistered(locale: Locale): boolean;
  /**
   * Loads a registered namespace's translations for a locale and merges them into the catalog.
   * Deduplicates concurrent and repeated calls — the namespace source is loaded at most once per locale.
   * Defaults to the active locale when `locale` is omitted.
   *
   * @example
   * i18n.registerNamespace('settings', (locale) =>
   *   import(`./locales/${locale}/settings.json`).then((m) => m.default),
   * );
   * await i18n.loadNamespace('settings');       // active locale
   * await i18n.loadNamespace('settings', 'de'); // pre-load for a specific locale
   */
  loadNamespace(ns: string, locale?: Locale): Promise<void>;
  readonly locale: Locale;
  /**
   * Merges additional messages into a locale's catalog without replacing existing keys.
   * Accepts a partial overlay — only the provided keys are merged; existing keys are preserved.
   * If the locale has a pending dynamic load in progress, merge waits for it to complete first.
   *
   * **Note:** `source` accepts any `Messages`-shaped object, intentionally looser than `M`, so
   * partial overlays do not need to satisfy the full catalog shape. Calling `register()` after
   * a merge replaces the entire catalog, discarding all merged keys.
   *
   * **Concurrency note:** `merge()` waits for in-flight `preload()` tasks but does not
   * coordinate with concurrent `loadNamespace()` tasks for the same locale. If both run
   * concurrently on the same locale, the final key set is non-deterministic for overlapping
   * keys — last write wins.
   */
  merge(locale: Locale, source: LocaleSource<Messages>): Promise<void>;
  preload(locale: Locale): Promise<void>;
  register(locale: Locale, source: LocaleSource<M>): void;
  /**
   * Registers a per-locale namespace source. `source` is a factory function that receives
   * the target locale and returns a `LocaleSource` for that locale's namespace messages.
   * Factories may also return a `Promise<M>` directly (async factory pattern).
   */
  registerNamespace(ns: string, factory: NamespaceFactory<M>): void;
  /**
   * Hydrates the instance with pre-loaded state (e.g. from a server-rendered payload).
   * Replaces catalogs for the locales in the state and sets the active locale.
   * Notifies subscribers once after restoring.
   *
   * @example
   * i18n.restoreState(window.__I18N_STATE__);
   */
  restoreState(state: I18nState): void;
  /**
   * Returns a scoped translator. All `t()` and `tp()` calls are automatically prefixed
   * with `${prefix}.`, reducing repetition within a message namespace.
   * The `fmt` property exposes the same formatter as the parent instance.
   *
   * **Note:** returns a new object on every call — store the result in a variable rather
   * than calling `scope()` inline on each render.
   *
   * @example
   * const nav = i18n.scope('nav');
   * nav.t('home');        // i18n.t('nav.home')
   * nav.tp('items', 3);   // i18n.tp('nav.items', 3)
   * nav.fmt.number(1234); // same as i18n.fmt.number(1234)
   */
  scope(prefix: MessageBranchKeys<M> | (string & {})): ScopedI18n;
  /**
   * Switches the active locale. Loads the locale if it is registered as an async loader.
   *
   * If multiple `setLocale()` calls are made concurrently, only the **last** call applies
   * (stale locale responses are discarded).
   *
   * If loading fails, the active locale is **not changed** — it remains at its previous value.
   *
   * @throws `[lingua/E001]` if the locale is not registered (neither a static catalog nor a loader).
   */
  setLocale(locale: Locale): Promise<void>;
  /**
   * Subscribes to locale/catalog changes.
   * - Default: callback runs only on changes.
   * - `{ immediate: true }`: callback runs immediately with the current snapshot and on every change.
   * - `{ signal }`: unsubscribes automatically when the AbortSignal fires.
   *
   * @note When `{ immediate: true }` is passed and the callback throws synchronously on the first
   * call, `onSubscriberError` is invoked and the subscription is **not** registered — the callback
   * will not fire on future changes. This prevents a broken callback from being called repeatedly.
   */
  subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
  /**
   * @security Returns a raw, unsanitized string. If catalog content originates from an
   * untrusted source, sanitize before inserting into the DOM via `innerHTML`. `.textContent` is always safe.
   */
  t(key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string;
  /**
   * Translates a plural branch key. `count` is injected automatically — do not include it in `options.vars`.
   *
   * For cardinal plurals, `count=0` checks `${key}.zero` before the CLDR-selected form.
   * Ordinal plurals follow CLDR exclusively.
   *
   * When the active catalog is missing a key, the fallback chain is searched locale by locale.
   * Each locale's own CLDR plural rules are used when resolving from that locale's catalog,
   * so cross-locale fallbacks produce grammatically correct plural forms.
   *
   * Pipe-delimited shorthand in the catalog is expanded at registration time:
   * `{ inbox: 'One message|{count} messages' }` → `{ inbox: { one: '...', other: '...' } }`.
   *
   * @security Returns a raw, unsanitized string. If `options.vars` values originate from
   * untrusted input, sanitize the output before inserting into the DOM via `innerHTML`.
   * `.textContent` is always safe.
   */
  tp(key: MessageBranchKeys<M> | (string & {}), count: number, options?: TpOptions): string;
};

// ─── Internals ────────────────────────────────────────────────────────────────

// Module-level canonical-locale cache — Intl.getCanonicalLocales is pure.
// Bounded at CANON_CACHE_MAX to prevent unbounded growth from dynamic locale strings.
//
// Note: this cache is shared across ALL createI18n() instances in the same module scope
// (typical for a browser SPA or Node process). This is intentional — Intl.getCanonicalLocales
// is a pure function and the cache is only a performance aid.
// In test environments with heavy isolation requirements, the cache is bounded by CANON_CACHE_MAX
// and cannot grow beyond that size, so no cleanup is needed between test runs.
const CANON_CACHE_MAX = 256;
const canonCache = new Map<string, string>();

// Module-level plural-rules cache — Intl.PluralRules is locale+type keyed and pure.
// Sharing across instances avoids duplicating PluralRules objects in SSR fork-per-request workloads.
// Bounded by PLURAL_CACHE_MAX to prevent unbounded growth from exotic locale tags.
const PLURAL_CACHE_MAX = 128;
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function canon(locale: string): string {
  const cached = canonCache.get(locale);

  if (cached !== undefined) return cached;

  let canonical: string | undefined;

  try {
    [canonical] = Intl.getCanonicalLocales(locale);
  } catch {
    // Invalid BCP 47 tag — canonical stays undefined, guard below throws.
  }

  if (!canonical) throw new Error(`[lingua/E004] Invalid BCP 47 locale tag: "${locale}".`);

  if (canonCache.size >= CANON_CACHE_MAX) canonCache.delete(canonCache.keys().next().value as string);

  canonCache.set(locale, canonical);

  return canonical;
}

// CatalogEntry encapsulates the string/compiled-template invariant.
// Every mutation goes through `set()` so the compiled map stays in sync with strings.
class CatalogEntry {
  readonly compiled: Map<string, CompiledTemplate> | undefined;
  readonly strings = new Map<string, string>();

  constructor(withCompile: boolean) {
    this.compiled = withCompile ? new Map() : undefined;
  }

  get(key: string): { compiled?: CompiledTemplate; message: string } | undefined {
    const message = this.strings.get(key);

    if (message === undefined) return undefined;

    return { compiled: this.compiled?.get(key), message };
  }

  set(key: string, value: string): void {
    this.strings.set(key, value);
    this.compiled?.set(key, compileTemplate(value));
  }

  setAll(flat: Iterable<[string, string]>): void {
    for (const [k, v] of flat) this.set(k, v);
  }
}

function buildLocaleChain(locale: Locale, fallback: Locale[]): { chain: Locale[]; set: Set<Locale> } {
  const set = new Set<Locale>();

  for (const value of [locale, ...fallback]) {
    set.add(value);

    const parts = value.split('-');

    for (let i = parts.length - 1; i > 0; i--) {
      set.add(parts.slice(0, i).join('-'));
    }
  }

  return { chain: [...set], set };
}

// Keys that could pollute Object prototypes if a catalog arrives from untrusted JSON.
// Using a Map for storage prevents actual pollution, but we skip these keys as
// defense-in-depth in case a plain-object path is introduced in future.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// CLDR plural form suffixes — used by hasBranch() to check for plural-branch presence.
const CLDR_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

function flattenStrings(messages: Messages, result = new Map<string, string>(), prefix?: string): Map<string, string> {
  for (const [key, value] of Object.entries(messages)) {
    if (UNSAFE_KEYS.has(key)) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      const plural = parsePipePlural(value);

      if (plural) {
        flattenStrings(plural, result, fullKey);
      } else {
        result.set(fullKey, value);
      }
    } else {
      flattenStrings(value as Messages, result, fullKey);
    }
  }

  return result;
}

function selectPluralForm(locale: Locale, count: number, ordinal: boolean): string {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = pluralRulesCache.get(key);

  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });

    if (pluralRulesCache.size >= PLURAL_CACHE_MAX)
      pluralRulesCache.delete(pluralRulesCache.keys().next().value as string);

    pluralRulesCache.set(key, rules);
  }

  return rules.select(count);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Overload: explicit type parameter (strict typing) */
export function createI18n<M extends Messages>(config: I18nOptions<M>): I18n<M>;
/** Overload: no type parameter (loose typing, allows heterogeneous catalogs) */
export function createI18n(config?: I18nOptions<Messages>): I18n<Messages>;
export function createI18n<M extends Messages = Messages>(config?: I18nOptions<M>): I18n<M> {
  const cfg: I18nOptions<M> = config ?? {};
  const withCompile = cfg.compile === true;
  let locale = canon(cfg.locale ?? 'en');
  const fallback = Array.isArray(cfg.fallback) ? cfg.fallback.map(canon) : cfg.fallback ? [canon(cfg.fallback)] : [];

  // Catalog state: separate maps for resolved catalogs and pending loaders.
  const catalogs = new Map<Locale, CatalogEntry>();
  const loaders = new Map<Locale, Loader<M>>();
  const loadingTasks = new Map<Locale, Promise<void>>();

  // Tracks all known locales in registration order for getSupportedLocales().
  const knownLocales = new Set<Locale>();

  // Namespace state.
  // Task key uses null-byte separator — illegal in BCP 47 tags and conventional namespace names.
  const namespaceRegistry = new Map<string, NamespaceFactory<M>>();
  const loadedNamespaces = new Set<string>(); // `${ns}\x00${locale}`
  const namespaceTasks = new Map<string, Promise<void>>();

  const subscribers = new Set<(snapshot: I18nSnapshot) => void>();

  const onMissingKey = cfg.onMissingKey ?? ((key: string) => key);
  const onMissingVar = cfg.onMissingVar ?? ((varName: string) => `{${varName}}`);
  const onSubscriberError = cfg.onSubscriberError ?? ((error: unknown) => issue('subscriber error', error));

  let version = 0;
  let snapshot: I18nSnapshot = { locale, version };
  let { chain: activeChain, set: activeChainSet } = buildLocaleChain(locale, fallback);
  let switchId = 0;

  // Eagerly initialized — fmt always follows the instance locale via the getter.
  const fmt = createFormatter(() => locale);

  const bump = (): void => {
    version++;
    snapshot = { locale, version };

    const listeners = [...subscribers];

    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        onSubscriberError(error);
      }
    }
  };

  // Single-pass entry lookup: returns message + compiled template in one chain traversal (R4).
  const findEntry = (key: string): { compiled?: CompiledTemplate; message: string } | undefined => {
    for (const candidate of activeChain) {
      const found = catalogs.get(candidate)?.get(key);

      if (found !== undefined) return found;
    }

    return undefined;
  };

  const interpolate = (
    key: string,
    found: { compiled?: CompiledTemplate; message: string },
    vars: TranslateVars | undefined,
  ): string => {
    if (found.compiled) return renderTemplate(found.compiled, vars, key, locale, onMissingVar);

    return found.message.replace(INTERPOLATION_PATTERN, (_match, varName: string) => {
      const value = vars?.[varName];

      return value == null ? onMissingVar(varName, key, locale) : String(value);
    });
  };

  const registerInternal = (loc: Locale, source: LocaleSource<M>): void => {
    const normalized = canon(loc);

    // Clear any in-progress load — new source supersedes it.
    loadingTasks.delete(normalized);
    knownLocales.add(normalized);

    // Clear namespace loaded-markers so they can be re-applied after this
    // catalog replacement. register() replaces everything, so namespaces
    // loaded into this locale's old catalog must be re-loaded.
    for (const key of [...loadedNamespaces]) {
      if (key.endsWith(`\x00${normalized}`)) loadedNamespaces.delete(key);
    }

    if (typeof source === 'function') {
      loaders.set(normalized, source as Loader<M>);
      catalogs.delete(normalized);
    } else {
      loaders.delete(normalized);

      const entry = new CatalogEntry(withCompile);

      entry.setAll(flattenStrings(source as M));
      catalogs.set(normalized, entry);
    }

    if (activeChainSet.has(normalized)) bump();
  };

  if (cfg.catalogs) {
    for (const [loc, source] of Object.entries(cfg.catalogs)) {
      const normalized = canon(loc);

      knownLocales.add(normalized);

      if (typeof source === 'function') {
        loaders.set(normalized, source as Loader<M>);
      } else {
        const entry = new CatalogEntry(withCompile);

        entry.setAll(flattenStrings(source as M));
        catalogs.set(normalized, entry);
      }
    }
  }

  const preload = (loc: Locale): Promise<void> => {
    const normalized = canon(loc);

    if (catalogs.has(normalized)) return Promise.resolve();

    const loader = loaders.get(normalized);

    if (!loader) return Promise.reject(new Error(`[lingua/E001] Missing locale source for "${normalized}".`));

    const existing = loadingTasks.get(normalized);

    if (existing) return existing;

    const task = loader().then(
      (messages) => {
        // Stale check: loader was replaced by a subsequent register() call.
        if (loaders.get(normalized) !== loader) return;

        loaders.delete(normalized);

        const entry = new CatalogEntry(withCompile);

        entry.setAll(flattenStrings(messages));
        catalogs.set(normalized, entry);
        loadingTasks.delete(normalized);

        if (activeChainSet.has(normalized)) bump();
      },
      (error: unknown) => {
        // Only clear the task if the loader hasn't been replaced, so a new
        // in-progress load isn't accidentally discarded.
        if (loaders.get(normalized) === loader) loadingTasks.delete(normalized);

        throw error;
      },
    );

    loadingTasks.set(normalized, task);

    return task;
  };

  const merge = async (loc: Locale, source: LocaleSource<Messages>): Promise<void> => {
    const normalized = canon(loc);

    // Wait for any pending dynamic load to complete first so base catalog keys
    // are not overwritten by the merge source.
    if (loaders.has(normalized)) await preload(normalized);

    const mergeMessages = typeof source === 'function' ? await (source as Loader<Messages>)() : (source as Messages);
    const mergeFlat = flattenStrings(mergeMessages);
    const existing = catalogs.get(normalized);

    if (existing) {
      existing.setAll(mergeFlat);
    } else {
      const entry = new CatalogEntry(withCompile);

      entry.setAll(mergeFlat);
      catalogs.set(normalized, entry);
    }

    knownLocales.add(normalized);

    if (activeChainSet.has(normalized)) bump();
  };

  const translate = (key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string => {
    const base = String(key);
    const found = findEntry(base);

    if (!found) return onMissingKey(base, locale);

    return interpolate(base, found, vars);
  };

  const translatePlural: I18n<M>['tp'] = (
    key: MessageBranchKeys<M> | (string & {}),
    count: number,
    options?: TpOptions,
  ): string => {
    if (!Number.isFinite(count)) {
      throw new TypeError('[lingua/E002] `count` must be a finite number.');
    }

    const vars = options?.vars;
    const ordinal = options?.ordinal ?? false;

    if (vars && Object.hasOwn(vars, 'count')) {
      throw new Error('[lingua/E003] `tp` does not allow `vars.count`; `count` is injected automatically.');
    }

    const base = String(key);
    const mergedVars = vars ? { count, ...vars } : { count };

    // Walk the fallback chain locale by locale, selecting the CLDR plural form using
    // each locale's own rules. This ensures that when a translation is resolved from a
    // fallback locale, its plural category is chosen correctly (e.g. Russian count=5 uses
    // 'many', not English 'other').
    for (const candidate of activeChain) {
      const catalog = catalogs.get(candidate);

      if (!catalog) continue;

      const form = selectPluralForm(candidate, count, ordinal);

      // Priority order for cardinal count=0:
      //   1. explicit .zero override (locale-independent zero string)
      //   2. CLDR-selected form (only when different from 'zero', e.g. Russian 'many')
      //   3. .other fallback
      // For all other counts (and ordinals): CLDR form → .other fallback.
      const keys =
        !ordinal && count === 0
          ? form === 'zero'
            ? [`${base}.zero`, `${base}.other`]
            : [`${base}.zero`, `${base}.${form}`, `${base}.other`]
          : [`${base}.${form}`, `${base}.other`];

      for (const k of keys) {
        const found = catalog.get(k);

        if (found !== undefined) {
          return interpolate(k, found, mergedVars);
        }
      }
    }

    return onMissingKey(base, locale);
  };

  const subscribeInternal = (callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe => {
    const unsubscribe = (): void => {
      subscribers.delete(callback);
    };

    // If the signal is already aborted, skip adding the listener entirely.
    if (options?.signal?.aborted) return unsubscribe;

    // Fire the immediate callback *before* registering the subscriber.
    // If it throws, onSubscriberError handles it and we return early — the
    // subscriber is never added, so it cannot throw again on future bumps.
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

  let disposed = false;
  const disposeController = new AbortController();

  return {
    bind(key: MessageLeafKeys<M> | (string & {})): (vars?: TranslateVars) => string {
      const base = String(key);
      let snapshotRef = snapshot;
      let cached = findEntry(base);

      return (vars?: TranslateVars): string => {
        // Invalidate on any catalog or locale change (bump() replaces snapshot reference).
        if (snapshot !== snapshotRef) {
          snapshotRef = snapshot;
          cached = findEntry(base);
        }

        if (!cached) return onMissingKey(base, locale);

        return interpolate(base, cached, vars);
      };
    },

    bindPlural(key: MessageBranchKeys<M> | (string & {})): (count: number, options?: TpOptions) => string {
      const base = String(key);

      // bindPlural delegates to translatePlural on every call — no per-key caching needed
      // because plural resolution depends on both key and count (unlike bind()).
      return (count: number, options?: TpOptions): string => translatePlural(base, count, options);
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
    },

    get disposed(): boolean {
      return disposed;
    },

    fmt,

    /**
     * Creates an isolated child instance. Inherits resolved catalogs, pending loaders, and the
     * namespace registry, but has its own locale, fallback chain, version counter, and subscribers.
     *
     * @note Namespace load markers are **not** copied. If the parent has already loaded a namespace,
     * the fork will re-load it when `loadNamespace()` is called. Pre-call `loadNamespace()` on the
     * fork after forking, or pre-load before forking, to avoid unnecessary re-fetches in SSR.
     */
    fork(overrides?: Omit<I18nOptions<M>, 'catalogs' | 'compile'>): I18n<M> {
      const forkedCatalogs: Record<Locale, LocaleSource<M>> = {};

      // Snapshot all currently resolved catalogs as plain-object sources.
      // entry.strings is already a flat dot-key → string map, which is a valid Messages
      // (all leaves are strings). createI18n will re-flatten it — that loop is a no-op
      // since every value is already a string leaf.
      for (const [loc, entry] of catalogs) {
        forkedCatalogs[loc] = Object.fromEntries(entry.strings) as unknown as M;
      }

      // Preserve loaders for locales that haven't been resolved yet.
      for (const [loc, loader] of loaders) {
        forkedCatalogs[loc] = loader;
      }

      const child = createI18n<M>({
        catalogs: forkedCatalogs,
        compile: withCompile,
        fallback: overrides?.fallback ?? (fallback.length > 0 ? fallback : undefined),
        locale: overrides?.locale ?? locale,
        onMissingKey: overrides?.onMissingKey ?? cfg.onMissingKey,
        onMissingVar: overrides?.onMissingVar ?? cfg.onMissingVar,
        onSubscriberError: overrides?.onSubscriberError ?? cfg.onSubscriberError,
      });

      // Copy the namespace registry so the fork can call loadNamespace() independently.
      for (const [ns, factory] of namespaceRegistry) {
        child.registerNamespace(ns, factory);
      }

      return child;
    },

    getSnapshot() {
      return snapshot;
    },

    getState(): I18nState {
      const catalogsOut: Record<Locale, Record<string, string>> = {};

      for (const [loc, entry] of catalogs) {
        catalogsOut[loc] = Object.fromEntries(entry.strings);
      }

      return { catalogs: catalogsOut, locale };
    },

    getSupportedLocales(sorted?: boolean): Locale[] {
      const locales = [...knownLocales];

      // Code-point sort: deterministic across all environments and locales.
      return sorted === true ? locales.sort() : locales;
    },

    has(key: MessageLeafKeys<M> | (string & {})): boolean {
      return findEntry(String(key)) !== undefined;
    },

    hasBranch(key: MessageBranchKeys<M> | (string & {})): boolean {
      const base = `${String(key)}.`;

      for (const candidate of activeChain) {
        const catalog = catalogs.get(candidate);

        if (!catalog) continue;

        for (const form of CLDR_FORMS) {
          if (catalog.strings.has(`${base}${form}`)) return true;
        }
      }

      return false;
    },

    isLoaded(loc: Locale): boolean {
      try {
        return catalogs.has(canon(loc));
      } catch {
        return false;
      }
    },

    isRegistered(loc: Locale): boolean {
      try {
        return knownLocales.has(canon(loc));
      } catch {
        return false;
      }
    },

    loadNamespace(ns: string, loc?: Locale): Promise<void> {
      const normalized = loc ? canon(loc) : locale;
      const taskKey = `${ns}\x00${normalized}`;

      if (loadedNamespaces.has(taskKey)) return Promise.resolve();

      const existing = namespaceTasks.get(taskKey);

      if (existing) return existing;

      const factory = namespaceRegistry.get(ns);

      if (!factory) return Promise.reject(new Error(`[lingua/E005] Namespace "${ns}" is not registered.`));

      const raw = factory(normalized);
      // Normalize: factory may return LocaleSource<M> or Promise<M> directly.
      const isPromise = raw != null && typeof (raw as { then?: unknown }).then === 'function';
      const source: LocaleSource<M> = isPromise ? () => raw as Promise<M> : (raw as LocaleSource<M>);
      const task = merge(normalized, source).then(
        () => {
          loadedNamespaces.add(taskKey);
          namespaceTasks.delete(taskKey);
        },
        (err: unknown) => {
          namespaceTasks.delete(taskKey);
          throw err;
        },
      );

      namespaceTasks.set(taskKey, task);

      return task;
    },

    get locale(): Locale {
      return locale;
    },

    merge,

    preload,

    register: registerInternal,

    registerNamespace(ns: string, factory: NamespaceFactory<M>): void {
      namespaceRegistry.set(ns, factory);
    },

    restoreState(state: I18nState): void {
      if (!Object.hasOwn(state.catalogs, state.locale)) {
        throw new Error(`[lingua/E006] restoreState: locale "${state.locale}" has no catalog in the provided state.`);
      }

      for (const [loc, flatCatalog] of Object.entries(state.catalogs)) {
        const normalized = canon(loc);
        const entry = new CatalogEntry(withCompile);

        entry.setAll(Object.entries(flatCatalog));
        knownLocales.add(normalized);
        catalogs.set(normalized, entry);

        // Clear namespace loaded-markers for this locale so namespaces can be
        // re-applied after catalog replacement, consistent with register().
        for (const key of [...loadedNamespaces]) {
          if (key.endsWith(`\x00${normalized}`)) loadedNamespaces.delete(key);
        }
      }

      const normalized = canon(state.locale);

      locale = normalized;
      knownLocales.add(normalized);
      ({ chain: activeChain, set: activeChainSet } = buildLocaleChain(locale, fallback));
      fmt.clear();
      bump();
    },

    scope(prefix: MessageBranchKeys<M> | (string & {})): ScopedI18n {
      const pre = String(prefix);

      return {
        bind: (key) => {
          const fullKey = `${pre}.${key}`;
          let snapshotRef = snapshot;
          let cached = findEntry(fullKey);

          return (vars?: TranslateVars): string => {
            if (snapshot !== snapshotRef) {
              snapshotRef = snapshot;
              cached = findEntry(fullKey);
            }

            if (!cached) return onMissingKey(fullKey, locale);

            return interpolate(fullKey, cached, vars);
          };
        },
        bindPlural: (key) => {
          const fullKey = `${pre}.${key}`;

          return (count: number, options?: TpOptions): string => translatePlural(fullKey, count, options);
        },
        fmt,
        has: (key) => findEntry(`${pre}.${key}`) !== undefined,
        t: (key, vars?) => translate(`${pre}.${key}`, vars),
        tp: (key, count, options?) => translatePlural(`${pre}.${key}`, count, options),
      };
    },

    async setLocale(next: Locale): Promise<void> {
      const normalized = canon(next);

      if (locale === normalized) return;

      const id = ++switchId;

      await preload(normalized);

      if (id !== switchId) return;

      locale = normalized;
      ({ chain: activeChain, set: activeChainSet } = buildLocaleChain(locale, fallback));
      // Evict stale Intl instances from the previous locale so caches don't grow unboundedly.
      fmt.clear();
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Typed identity helper for `registerNamespace()` factories.
 *
 * Wraps a namespace factory with an explicit catalog type `M` so TypeScript validates
 * that the factory's return type satisfies the full catalog shape. Without this helper,
 * `registerNamespace` accepts any `Messages`-shaped return value.
 *
 * @example
 * import type { MyMessages } from './locales/en/settings.json';
 *
 * i18n.registerNamespace(
 *   'settings',
 *   createNamespace<MyMessages>((locale) =>
 *     import(`./locales/${locale}/settings.json`).then((m) => m.default),
 *   ),
 * );
 */
export function createNamespace<M extends Messages = Messages>(factory: NamespaceFactory<M>): NamespaceFactory<M> {
  return factory;
}
