/* ============================================
   i18nit - Lightweight, type-safe i18n library
   ============================================ */

/* -------------------- Core Types -------------------- */

export type Locale = string;

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };

export type MessageValue = string | PluralMessages;

export interface Messages {
  [key: string]: MessageValue | Messages;
}

/** Recursive type that extracts all valid dot-notation keys from a Messages shape. */
export type FlatKeys<T extends Messages, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends MessageValue
    ? P extends ''
      ? K
      : `${P}.${K}`
    : T[K] extends Messages
      ? FlatKeys<T[K], P extends '' ? K : `${P}.${K}`>
      : never;
}[keyof T & string];

export type Loader = (locale: Locale) => Promise<Messages>;

export type I18nConfig<T extends Messages = Messages> = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<string, T>;
  loaders?: Record<Locale, Loader>;
};

export type ScopedI18n = {
  t(key: string, vars?: Record<string, unknown>): string;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  namespace(ns: string): NamespacedI18n;
};

export type NamespacedI18n = {
  t(key: string, vars?: Record<string, unknown>): string;
  has(key: string): boolean;
};

/* -------------------- Path Resolution -------------------- */

/**
 * Resolves nested properties using dot notation and bracket notation.
 * Supports: 'user.name', 'items[0]', 'user.items[0].name'
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  // Try direct access first (handles keys with literal dots)
  if (path in obj) return obj[path];

  const parts = path.match(/[^.[\]]+/g) ?? [];
  let value: unknown = obj;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/* -------------------- Intl Caches -------------------- */

const pluralRulesCache = new Map<string, Intl.PluralRules>();
const listFormatCache = new Map<string, Intl.ListFormat>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

function intlCacheKey(locale: string, options?: object): string {
  if (!options) return locale;
  const entries = Object.entries(options).sort(([a], [b]) => a.localeCompare(b));
  return `${locale}:${entries.map(([k, v]) => `${k}=${v}`).join('|')}`;
}

/* -------------------- Helpers -------------------- */

function isMessageValue(value: unknown): value is MessageValue {
  if (typeof value === 'string') return true;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return 'other' in obj && typeof obj.other === 'string' && Object.values(obj).every((v) => typeof v === 'string');
}

function deepMerge(target: Messages, source: Messages): Messages {
  const result = { ...target };
  for (const [key, val] of Object.entries(source)) {
    const existing = result[key];
    if (!isMessageValue(val) && !isMessageValue(existing) && typeof existing === 'object' && existing !== null) {
      result[key] = deepMerge(existing as Messages, val as Messages);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/* -------------------- List Formatting -------------------- */

/**
 * Formats an array as a natural language list using Intl.ListFormat.
 * Automatically handles locale-specific conjunctions and grammar.
 */
function formatList(items: unknown[], locale: string, type: 'conjunction' | 'disjunction'): string {
  if (items.length === 0) return '';

  const stringItems = items.map(String);

  try {
    const cacheKey = `${locale}:${type}`;
    let formatter = listFormatCache.get(cacheKey);
    if (!formatter) {
      formatter = new Intl.ListFormat(locale, { style: 'long', type });
      listFormatCache.set(cacheKey, formatter);
    }
    return formatter.format(stringItems);
  } catch {
    // Fallback for environments without Intl.ListFormat
    if (stringItems.length === 1) return stringItems[0];
    const sep = type === 'conjunction' ? 'and' : 'or';
    if (stringItems.length === 2) return `${stringItems[0]} ${sep} ${stringItems[1]}`;
    return `${stringItems.slice(0, -1).join(', ')} ${sep} ${stringItems.at(-1)}`;
  }
}

/* -------------------- Variable Interpolation -------------------- */

/**
 * Resolves a single interpolation token to a string.
 * Extracted from the regex callback to keep `interpolate` below the complexity ceiling.
 */
function resolveToken(value: unknown, separator: string | undefined, locale: string): string {
  if (value == null) return '';

  if (Array.isArray(value)) {
    if (separator === 'and') return formatList(value, locale, 'conjunction');
    if (separator === 'or') return formatList(value, locale, 'disjunction');
    if (separator !== undefined) return value.map(String).join(separator);
    return value.map(String).join(', ');
  }

  if (typeof value === 'number') {
    try {
      let fmt = numberFormatCache.get(locale);
      if (!fmt) {
        fmt = new Intl.NumberFormat(locale);
        numberFormatCache.set(locale, fmt);
      }
      return fmt.format(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

/**
 * Interpolates variables into a template string.
 *
 * Supported formats:
 * - {name} - Simple variable
 * - {user.name} - Nested property
 * - {items[0]} - Array index
 * - {items} - Array (comma-separated)
 * - {items|and} - Array with locale-aware "and"
 * - {items|or} - Array with locale-aware "or"
 * - {items| - } - Array with custom separator
 * - {items.length} - Array length
 */
function interpolate(template: string, vars: Record<string, unknown>, locale: string): string {
  return template.replace(/\{([\w.[\]]+)(?:\|([^}]+))?\}/g, (_match, key: string, separator?: string) =>
    resolveToken(resolvePath(vars, key), separator, locale),
  );
}

/* -------------------- Pluralization -------------------- */

/**
 * Gets the plural form for a number using Intl.PluralRules.
 * Automatically handles all locale-specific plural rules.
 */
function getPluralForm(locale: Locale, count: number): PluralForm {
  const n = Math.abs(Math.floor(count));

  try {
    let rules = pluralRulesCache.get(locale);
    if (!rules) {
      rules = new Intl.PluralRules(locale);
      pluralRulesCache.set(locale, rules);
    }
    return rules.select(n) as PluralForm;
  } catch {
    // Fallback to English-like behavior
    return n === 1 ? 'one' : 'other';
  }
}

/* -------------------- I18n Class -------------------- */

class I18n<T extends Messages = Messages> {
  #locale: Locale;
  #fallbacks: Locale[];
  #catalogs = new Map<Locale, Messages>();
  #loaders = new Map<Locale, Loader>();
  #loading = new Map<Locale, Promise<void>>();
  #subscribers = new Set<(locale: Locale) => void>();
  #chainCache = new Map<Locale, Locale[]>();

  constructor({ locale = 'en', fallback, messages, loaders }: I18nConfig<T> = {}) {
    this.#locale = locale;
    this.#fallbacks = Array.isArray(fallback) ? fallback : fallback ? [fallback] : [];
    if (messages) for (const [l, m] of Object.entries(messages)) this.#catalogs.set(l, m);
    if (loaders) for (const [l, fn] of Object.entries(loaders)) this.#loaders.set(l, fn);
  }

  /* -------------------- Locale (property) -------------------- */

  get locale(): Locale {
    return this.#locale;
  }

  set locale(value: Locale) {
    if (this.#locale === value) return;
    this.#locale = value;
    this.#notifySubscribers();
  }

  /* -------------------- Message Management -------------------- */

  /**
   * Deep-merges messages into an existing locale catalog.
   */
  add(locale: Locale, messages: Messages): void {
    const existing = this.#catalogs.get(locale) ?? {};
    this.#catalogs.set(locale, deepMerge(existing, messages));
    this.#notifySubscribers(locale);
  }

  /**
   * Replaces all messages for a locale.
   */
  replace(locale: Locale, messages: Messages): void {
    this.#catalogs.set(locale, messages);
    this.#notifySubscribers(locale);
  }

  has(key: string, locale?: Locale): boolean {
    return this.#findMessage(key, locale ?? this.#locale) !== undefined;
  }

  hasLocale(locale: Locale): boolean {
    return this.#catalogs.has(locale);
  }

  /* -------------------- Async Loaders -------------------- */

  async load(locale: Locale): Promise<void> {
    if (this.#loading.has(locale)) return this.#loading.get(locale)!;
    if (this.#catalogs.has(locale)) return;

    const loader = this.#loaders.get(locale);
    if (!loader) return;

    const promise = (async () => {
      try {
        const messages = await loader(locale);
        this.add(locale, messages);
      } catch (error) {
        console.warn(`[i18nit] Failed to load locale '${locale}':`, error);
        throw error;
      } finally {
        this.#loading.delete(locale);
      }
    })();

    this.#loading.set(locale, promise);
    return promise;
  }

  addLoader(locale: Locale, loader: Loader): void {
    this.#loaders.set(locale, loader);
  }

  /* -------------------- Translation -------------------- */

  /**
   * Translates a key with optional interpolation variables.
   * Locale must be loaded first via `load()` or provided via `messages` in config.
   * For a per-call locale override use `scoped(locale).t(key, vars)`.
   */
  t(key: [FlatKeys<T>] extends [never] ? string : FlatKeys<T> & string, vars?: Record<string, unknown>): string {
    return this.#translate(key, vars ?? {}, this.#locale);
  }

  /* -------------------- Formatting Helpers -------------------- */

  number(value: number, options?: Intl.NumberFormatOptions, locale?: Locale): string {
    const loc = locale ?? this.#locale;
    const key = intlCacheKey(loc, options);
    try {
      let fmt = numberFormatCache.get(key);
      if (!fmt) {
        fmt = new Intl.NumberFormat(loc, options);
        numberFormatCache.set(key, fmt);
      }
      return fmt.format(value);
    } catch {
      return String(value);
    }
  }

  date(value: Date | number, options?: Intl.DateTimeFormatOptions, locale?: Locale): string {
    const date = typeof value === 'number' ? new Date(value) : value;
    const loc = locale ?? this.#locale;
    const key = intlCacheKey(loc, options);
    try {
      let fmt = dateFormatCache.get(key);
      if (!fmt) {
        fmt = new Intl.DateTimeFormat(loc, options);
        dateFormatCache.set(key, fmt);
      }
      return fmt.format(date);
    } catch {
      return date.toString();
    }
  }

  /* -------------------- Scoping -------------------- */

  /**
   * Returns a bound interface that translates in the given locale without
   * changing the active locale on the instance. Useful for SSR and
   * multi-locale rendering in a single pass.
   */
  scoped(locale: Locale): ScopedI18n {
    return {
      date: (value, options) => this.date(value, options, locale),
      namespace: (ns) => this.#makeNamespace(ns, locale),
      number: (value, options) => this.number(value, options, locale),
      t: (key, vars) => this.#translate(key, vars ?? {}, locale),
    };
  }

  /**
   * Returns a translator scoped to a key namespace prefix.
   */
  namespace(ns: string): NamespacedI18n {
    return this.#makeNamespace(ns, this.#locale);
  }

  /* -------------------- Subscriptions -------------------- */

  subscribe(handler: (locale: Locale) => void): () => void {
    this.#subscribers.add(handler);
    try {
      handler(this.#locale);
    } catch {
      /* swallow */
    }
    return () => this.#subscribers.delete(handler);
  }

  dispose(): void {
    this.#subscribers.clear();
  }

  /* -------------------- Private -------------------- */

  #makeNamespace(ns: string, locale: Locale): NamespacedI18n {
    return {
      has: (key) => this.has(`${ns}.${key}`, locale),
      t: (key, vars) => {
        const message = this.#findMessage(`${ns}.${key}`, locale);
        if (message === undefined) return `${ns}.${key}`;
        return this.#formatMessage(message, vars ?? {}, locale);
      },
    };
  }

  #notifySubscribers(changedLocale?: Locale): void {
    if (changedLocale) {
      const chain = this.#getLocaleChain(this.#locale);
      if (!chain.includes(changedLocale)) return;
    }
    for (const handler of this.#subscribers) {
      try {
        handler(this.#locale);
      } catch {
        /* swallow */
      }
    }
  }

  #findMessage(key: string, locale: Locale): MessageValue | undefined {
    for (const loc of this.#getLocaleChain(locale)) {
      const messages = this.#catalogs.get(loc);
      if (!messages) continue;
      const value = resolvePath(messages, key);
      if (value !== undefined && isMessageValue(value)) return value;
    }
    return undefined;
  }

  #getLocaleChain(locale: Locale): Locale[] {
    const cached = this.#chainCache.get(locale);
    if (cached) return cached;
    const seen = new Set<Locale>();
    const push = (l: Locale) => {
      seen.add(l);
      const lang = l.split('-')[0];
      if (lang !== l) seen.add(lang);
    };
    push(locale);
    for (const fallback of this.#fallbacks) push(fallback);
    const chain = [...seen];
    this.#chainCache.set(locale, chain);
    return chain;
  }

  #formatMessage(message: MessageValue, vars: Record<string, unknown>, locale: Locale): string {
    if (typeof message !== 'string') {
      const count = Number(vars.count ?? 0);
      const form = count === 0 && message.zero !== undefined ? 'zero' : getPluralForm(locale, count);
      return interpolate(message[form] ?? message.other, vars, locale);
    }
    return interpolate(message, vars, locale);
  }

  #translate(key: string, vars: Record<string, unknown>, locale: Locale): string {
    const message = this.#findMessage(key, locale);
    if (message === undefined) return key;
    return this.#formatMessage(message, vars, locale);
  }
}

/* -------------------- Factory Function -------------------- */

export function createI18n<T extends Messages = Messages>(config?: I18nConfig<T>): I18n<T> {
  return new I18n<T>(config);
}

export type I18nInstance<T extends Messages = Messages> = ReturnType<typeof createI18n<T>>;
