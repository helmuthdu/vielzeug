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

export type TranslateOptions = {
  locale?: Locale;
  escape?: boolean;
};

export type Loader = (locale: Locale) => Promise<Messages>;

export type I18nConfig = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<Locale, Messages>;
  loaders?: Record<Locale, Loader>;
  escape?: boolean;
};

export type Namespace = {
  t(key: string, vars?: Record<string, unknown>, opts?: TranslateOptions): string;
  has(key: string, locale?: Locale): boolean;
};

/* -------------------- Path Resolution -------------------- */

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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
  return template.replace(/\{([\w.[\]]+)(?:\|([^}]+))?\}/g, (_match, key: string, separator?: string) => {
    const value = resolvePath(vars, key);

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
  });
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

export class I18n {
  #locale: Locale;
  #fallbacks: Locale[];
  #escape: boolean;
  #catalogs = new Map<Locale, Messages>();
  #loaders = new Map<Locale, Loader>();
  #loading = new Map<Locale, Promise<void>>();
  #subscribers = new Set<(locale: Locale) => void>();

  // biome-ignore lint/suspicious/noShadowRestrictedNames: constructor parameter shadows the global `Loader` type, but it's clear from context and doesn't cause issues.
  constructor({ locale = 'en', fallback, messages, loaders, escape = false }: I18nConfig = {}) {
    this.#locale = locale;
    this.#fallbacks = Array.isArray(fallback) ? fallback : fallback ? [fallback] : [];
    this.#escape = escape;
    if (messages) for (const [l, m] of Object.entries(messages)) this.#catalogs.set(l, m);
    if (loaders) for (const [l, fn] of Object.entries(loaders)) this.#loaders.set(l, fn);
  }

  /* -------------------- Locale Management -------------------- */

  setLocale(locale: Locale): void {
    if (this.#locale === locale) return;
    this.#locale = locale;
    this.#notifySubscribers();
  }

  getLocale(): Locale {
    return this.#locale;
  }

  /* -------------------- Message Management -------------------- */

  /**
   * Adds messages to a locale (deep-merges with existing).
   */
  add(locale: Locale, messages: Messages): void {
    const existing = this.#catalogs.get(locale) ?? {};
    this.#catalogs.set(locale, deepMerge(existing, messages));
    this.#notifySubscribers();
  }

  /**
   * Sets messages for a locale (replaces existing).
   */
  set(locale: Locale, messages: Messages): void {
    this.#catalogs.set(locale, messages);
    this.#notifySubscribers();
  }

  getMessages(locale: Locale): Messages | undefined {
    return this.#catalogs.get(locale);
  }

  hasLocale(locale: Locale): boolean {
    return this.#catalogs.has(locale);
  }

  getLocales(): Locale[] {
    return [...this.#catalogs.keys()];
  }

  has(key: string, locale?: Locale): boolean {
    return this.#findMessage(key, locale ?? this.#locale) !== undefined;
  }

  /* -------------------- Async Loaders -------------------- */

  async load(locale: Locale): Promise<void> {
    // Return existing loading promise
    if (this.#loading.has(locale)) return this.#loading.get(locale)!;

    // Already loaded
    if (this.#catalogs.has(locale)) return;

    const loader = this.#loaders.get(locale);
    if (!loader) return;

    const promise = (async () => {
      try {
        const messages = await loader(locale);
        this.add(locale, messages);
      } catch (error) {
        console.warn(`[I18n] Failed to load locale '${locale}':`, error);
        throw error;
      } finally {
        this.#loading.delete(locale);
      }
    })();

    this.#loading.set(locale, promise);
    return promise;
  }

  register(locale: Locale, loader: Loader): void {
    this.#loaders.set(locale, loader);
  }

  async hasAsync(key: string, locale?: Locale): Promise<boolean> {
    const targetLocale = locale ?? this.#locale;
    const chain = this.#getLocaleChain(targetLocale);

    await Promise.all(
      chain.filter((loc) => !this.#catalogs.has(loc) && this.#loaders.has(loc)).map((loc) => this.load(loc)),
    );

    return this.has(key, targetLocale);
  }

  /**
   * Load multiple locales in parallel.
   * Useful for preloading all needed locales at app startup.
   */
  async loadAll(locales: Locale[]): Promise<void> {
    await Promise.all(locales.map((locale) => this.load(locale)));
  }

  /* -------------------- Translation -------------------- */

  /**
   * Translates a key with optional variables and options.
   * Synchronous - locale must be loaded first via load() or provided in config.
   */
  t(key: string, vars?: Record<string, unknown>, opts?: TranslateOptions): string {
    const targetLocale = opts?.locale ?? this.#locale;
    const shouldEscape = opts?.escape ?? this.#escape;

    const message = this.#findMessage(key, targetLocale);
    if (message === undefined) return key;

    const result = this.#formatMessage(message, vars ?? {}, targetLocale);
    return shouldEscape ? escapeHtml(result) : result;
  }

  /* -------------------- Formatting Helpers -------------------- */

  number(value: number, options?: Intl.NumberFormatOptions, locale?: Locale): string {
    const loc = locale ?? this.#locale;
    const key = `${loc}:${JSON.stringify(options ?? null)}`;
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
    const key = `${loc}:${JSON.stringify(options ?? null)}`;
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

  /* -------------------- Namespaced Translator -------------------- */

  namespace(ns: string): Namespace {
    return {
      has: (key: string, locale?: Locale) => this.has(`${ns}.${key}`, locale),
      t: (key: string, vars?: Record<string, unknown>, opts?: TranslateOptions) => this.t(`${ns}.${key}`, vars, opts),
    };
  }

  /* -------------------- Subscriptions -------------------- */

  subscribe(handler: (locale: Locale) => void): () => void {
    this.#subscribers.add(handler);

    // Call handler immediately with the current locale
    try {
      handler(this.#locale);
    } catch {
      // Ignore handler errors
    }

    return () => this.#subscribers.delete(handler);
  }

  #notifySubscribers(): void {
    for (const handler of this.#subscribers) {
      try {
        handler(this.#locale);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /* -------------------- Internal Helpers -------------------- */

  #findMessage(key: string, locale: Locale): MessageValue | undefined {
    const locales = this.#getLocaleChain(locale);

    for (const loc of locales) {
      const messages = this.#catalogs.get(loc);
      if (!messages) continue;

      const value = resolvePath(messages, key);

      if (value !== undefined && isMessageValue(value)) {
        return value;
      }
    }

    return undefined;
  }

  #getLocaleChain(locale: Locale): Locale[] {
    const seen = new Set<Locale>();
    const push = (l: Locale) => {
      seen.add(l);
      const lang = l.split('-')[0];
      if (lang !== l) seen.add(lang);
    };

    push(locale);
    for (const fallback of this.#fallbacks) push(fallback);

    return [...seen];
  }

  #formatMessage(message: MessageValue, vars: Record<string, unknown>, locale: Locale): string {
    if (typeof message !== 'string') {
      const count = Number(vars.count ?? 0);
      const form = count === 0 && message.zero !== undefined ? 'zero' : getPluralForm(locale, count);
      return interpolate(message[form] ?? message.other, vars, locale);
    }
    return interpolate(message, vars, locale);
  }
}

/* -------------------- Factory Function -------------------- */

export function createI18n(config?: I18nConfig): I18n {
  return new I18n(config);
}
