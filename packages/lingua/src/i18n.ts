import { createFormatter, type Formatter } from './format';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Locale = string;
export type Unsubscribe = () => void;

export interface Messages {
  [key: string]: string | Messages;
}

export type TranslateVars = Record<string, unknown>;
export type Loader<M extends Messages = Messages> = () => Promise<M>;
export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

// A namespace factory may return either a LocaleSource or a raw Promise<M>.
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

export type ScopedI18n = {
  has(key: string): boolean;
  t(key: string, vars?: TranslateVars): string;
  tp(key: string, count: number, vars?: TranslateVars, ordinal?: boolean): string;
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

// ─── Pipe-plural shorthand (F1) ───────────────────────────────────────────────
// A leaf string containing '|' is parsed as a pipe-delimited plural shorthand.
// Supported part counts and their form mappings (positional, left-to-right):
//   2 parts → one | other
//   3 parts → zero | one | other
//   6 parts → zero | one | two | few | many | other
// Any other part count is treated as a plain string with no expansion.

const PIPE_FORM_MAPS: Readonly<Record<number, readonly string[]>> = {
  2: ['one', 'other'],
  3: ['zero', 'one', 'other'],
  6: ['zero', 'one', 'two', 'few', 'many', 'other'],
};

function parsePipePlural(value: string): Messages | null {
  const pipeIdx = value.indexOf('|');

  if (pipeIdx === -1) return null;

  const parts = value.split('|');
  const forms = PIPE_FORM_MAPS[parts.length];

  if (!forms) return null;

  // An empty part is almost certainly a catalog authoring error.
  // Treat the whole value as a plain string rather than silently producing an empty form.
  if (parts.some((p) => p.trim() === '')) return null;

  const result: Messages = {};

  for (let i = 0; i < parts.length; i++) {
    result[forms[i]] = parts[i];
  }

  return result;
}

// ─── Template compilation ─────────────────────────────────────────────────────
// When `compile: true` is passed in I18nOptions, message strings are parsed once
// into a pre-compiled form: an array of static strings and variable names.
// Rendering a compiled template skips the regex entirely.

type TemplatePart = string | { var: string };
type CompiledTemplate = TemplatePart[];

const INTERPOLATION_PATTERN = /\{([\p{ID_Continue}-]+)\}/gu;

function compileTemplate(template: string): CompiledTemplate {
  const parts: CompiledTemplate = [];
  let lastIndex = 0;

  for (const match of template.matchAll(INTERPOLATION_PATTERN)) {
    const { index } = match;
    const start = index ?? 0;

    if (start > lastIndex) {
      parts.push(template.slice(lastIndex, start));
    }

    parts.push({ var: match[1] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < template.length) {
    parts.push(template.slice(lastIndex));
  }

  return parts;
}

function renderTemplate(
  parts: CompiledTemplate,
  vars: TranslateVars | undefined,
  key: string,
  locale: Locale,
  onMissingVar: (varName: string, key: string, locale: Locale) => string,
): string {
  let result = '';

  for (const part of parts) {
    if (typeof part === 'string') {
      result += part;
    } else {
      const value = vars?.[part.var];

      result += value == null ? onMissingVar(part.var, key, locale) : String(value);
    }
  }

  return result;
}

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
  /** Called when a subscriber callback throws. Defaults to `console.error`. */
  onSubscriberError?: (error: unknown) => void;
};

// ─── Public interface ─────────────────────────────────────────────────────────

export type I18n<M extends Messages = Messages> = {
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
   * @example
   * // Server:
   * const state = i18n.getState();
   * // Client:
   * i18n.restoreState(state);
   */
  getState(): I18nState;
  getSupportedLocales(sorted?: boolean): Locale[];
  has(key: MessageLeafKeys<M> | (string & {})): boolean;
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
   *
   * If the locale has a pending dynamic load in progress, `merge` waits for it to complete
   * first so no base catalog keys are lost.
   *
   * **Calling `register()` after `merge()`** replaces the entire catalog, discarding merged keys.
   */
  merge(locale: Locale, source: LocaleSource<M>): Promise<void>;
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
   *
   * @example
   * const nav = i18n.scope('nav');
   * nav.t('home');       // i18n.t('nav.home')
   * nav.tp('items', 3);  // i18n.tp('nav.items', 3)
   */
  scope(prefix: MessageBranchKeys<M> | (string & {})): ScopedI18n;
  setLocale(locale: Locale): Promise<void>;
  /**
   * Subscribes to locale/catalog changes.
   * - Default: callback runs only on changes.
   * - `{ immediate: true }`: callback runs immediately with the current snapshot and on every change.
   * - `{ signal }`: unsubscribes automatically when the AbortSignal fires.
   */
  subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
  /**
   * @security Returns a raw, unsanitized string. If catalog content originates from an
   * untrusted source, sanitize before inserting into the DOM via `innerHTML`. `.textContent` is always safe.
   */
  t(key: MessageLeafKeys<M> | (string & {}), vars?: TranslateVars): string;
  /**
   * Translates a plural branch key. `count` is injected automatically — do not include it in `vars`.
   *
   * For cardinal plurals, `count=0` checks `${key}.zero` before the CLDR-selected form.
   * Ordinal plurals follow CLDR exclusively.
   *
   * Pipe-delimited shorthand in the catalog is expanded at registration time:
   * `{ inbox: 'One message|{count} messages' }` → `{ inbox: { one: '...', other: '...' } }`.
   *
   * @security Returns a raw, unsanitized string — see `t()` for guidance on safe rendering.
   */
  tp(key: MessageBranchKeys<M> | (string & {}), count: number, vars?: TranslateVars, ordinal?: boolean): string;
};

// ─── Internals ────────────────────────────────────────────────────────────────

// Module-level canonical-locale cache — Intl.getCanonicalLocales is pure.
// Bounded at CANON_CACHE_MAX to prevent unbounded growth from dynamic locale strings.
const CANON_CACHE_MAX = 256;
const canonCache = new Map<string, string>();

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

  if (canonCache.size >= CANON_CACHE_MAX) canonCache.clear();

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

function flattenStrings(messages: Messages, result = new Map<string, string>(), prefix?: string): Map<string, string> {
  for (const [key, value] of Object.entries(messages)) {
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

function selectPluralForm(
  cache: Map<string, Intl.PluralRules>,
  locale: Locale,
  count: number,
  ordinal: boolean,
): string {
  const key = `${locale}:${ordinal ? 'ordinal' : 'cardinal'}`;
  let rules = cache.get(key);

  if (!rules) {
    rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
    cache.set(key, rules);
  }

  return rules.select(count);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Overload: explicit type parameter (strict typing) */
export function createI18n<M extends Messages>(config: I18nOptions<M>): I18n<M>;
/** Overload: no type parameter (loose typing, allows heterogeneous catalogs) */
export function createI18n(config?: I18nOptions<Messages>): I18n<Messages>;
export function createI18n<M extends Messages = Messages>(config?: I18nOptions<M>): I18n<M> {
  const cfg = (config ?? {}) as I18nOptions<M>;
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
  const pluralCache = new Map<string, Intl.PluralRules>();

  const onMissingKey = cfg.onMissingKey ?? ((key: string) => key);
  const onMissingVar = cfg.onMissingVar ?? ((varName: string) => `{${varName}}`);
  const onSubscriberError =
    cfg.onSubscriberError ?? ((error: unknown) => console.error('[lingua] subscriber error', error));

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
      const typedSource = source as LocaleSource<M>;

      knownLocales.add(normalized);

      if (typeof typedSource === 'function') {
        loaders.set(normalized, typedSource as Loader<M>);
      } else {
        const entry = new CatalogEntry(withCompile);

        entry.setAll(flattenStrings(typedSource as M));
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

  const merge = async (loc: Locale, source: LocaleSource<M>): Promise<void> => {
    const normalized = canon(loc);

    // Wait for any pending dynamic load to complete first so base catalog keys
    // are not overwritten by the merge source.
    if (loaders.has(normalized)) await preload(normalized);

    const mergeMessages = typeof source === 'function' ? await (source as Loader<M>)() : (source as M);
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

  const translatePlural = (
    key: MessageBranchKeys<M> | (string & {}),
    count: number,
    vars?: TranslateVars,
    ordinal = false,
  ): string => {
    if (!Number.isFinite(count)) {
      throw new TypeError('[lingua/E002] `count` must be a finite number.');
    }

    if (vars && Object.hasOwn(vars, 'count')) {
      throw new Error('[lingua/E003] `tp` does not allow `vars.count`; `count` is injected automatically.');
    }

    const base = String(key);
    const form = selectPluralForm(pluralCache, locale, count, ordinal);

    // Determine the candidate key, then explicitly fall back to `.other` (R8).
    const primaryKey = !ordinal && count === 0 ? `${base}.zero` : `${base}.${form}`;
    let resolvedKey = primaryKey;
    let found = findEntry(primaryKey);

    if (!found) {
      resolvedKey = `${base}.other`;
      found = findEntry(resolvedKey);
    }

    if (!found) return onMissingKey(base, locale);

    return interpolate(resolvedKey, found, vars ? { ...vars, count } : { count });
  };

  const subscribeInternal = (callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe => {
    subscribers.add(callback);

    if (options?.immediate === true) {
      try {
        callback(snapshot);
      } catch (error) {
        onSubscriberError(error);
      }
    }

    const unsubscribe = (): void => {
      subscribers.delete(callback);
    };

    options?.signal?.addEventListener('abort', unsubscribe, { once: true });

    return unsubscribe;
  };

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

    fmt,

    fork(overrides?: Omit<I18nOptions<M>, 'catalogs' | 'compile'>): I18n<M> {
      const forkedCatalogs: Record<Locale, LocaleSource<M>> = {};

      // Snapshot all currently resolved catalogs as plain-object sources.
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
      const source: LocaleSource<M> = raw instanceof Promise ? () => raw as Promise<M> : (raw as LocaleSource<M>);
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
      for (const [loc, flatCatalog] of Object.entries(state.catalogs)) {
        const normalized = canon(loc);
        const entry = new CatalogEntry(withCompile);

        entry.setAll(Object.entries(flatCatalog));
        knownLocales.add(normalized);
        catalogs.set(normalized, entry);
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
        has: (key) => findEntry(`${pre}.${key}`) !== undefined,
        t: (key, vars?) => translate(`${pre}.${key}`, vars),
        tp: (key, count, vars?, ordinal?) => translatePlural(`${pre}.${key}`, count, vars, ordinal),
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

    t: translate,
    tp: translatePlural,
  };
}
