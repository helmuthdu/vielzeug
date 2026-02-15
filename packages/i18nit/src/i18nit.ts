/* ============================================
   i18nit - Lightweight, type-safe i18n library
   ============================================ */

/* -------------------- Core Types -------------------- */

export type Locale = string;

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };

export type MessageValue = string | PluralMessages;

export type Messages = Record<string, MessageValue>;

export type TranslateOptions = {
  locale?: Locale;
  escape?: boolean;
};

export type I18nConfig = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<Locale, Messages>;
  loaders?: Record<Locale, () => Promise<Messages>>;
  escape?: boolean;
};

/* -------------------- Path Resolution -------------------- */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Resolves nested properties using dot notation and bracket notation.
 * Supports: 'user.name', 'items[0]', 'user.items[0].name'
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  // Try direct access first (handles keys with dots)
  if (path in obj) return obj[path];

  // Parse path segments
  const parts = path.match(/[^.[\]]+/g) || [];
  let value: unknown = obj;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;

    if (Array.isArray(value)) {
      const index = Number(part);
      if (Number.isNaN(index) || index < 0 || index >= value.length) {
        return undefined;
      }
      value = value[index];
    } else {
      value = (value as Record<string, unknown>)[part];
    }
  }

  return value;
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
    const formatter = new Intl.ListFormat(locale, { style: 'long', type });
    return formatter.format(stringItems);
  } catch {
    // Fallback for environments without Intl.ListFormat
    if (stringItems.length === 1) return stringItems[0];
    if (stringItems.length === 2) {
      const separator = type === 'conjunction' ? 'and' : 'or';
      return `${stringItems[0]} ${separator} ${stringItems[1]}`;
    }
    const separator = type === 'conjunction' ? 'and' : 'or';
    const last = stringItems.pop()!;
    return `${stringItems.join(', ')} ${separator} ${last}`;
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
    // Handle .length property
    const isLength = key.endsWith('.length');
    const actualKey = isLength ? key.slice(0, -7) : key;

    const value = resolvePath(vars, actualKey);

    // Missing variables are replaced with empty string
    if (value == null) return '';

    // Handle arrays
    if (Array.isArray(value)) {
      if (isLength) return String(value.length);

      if (separator !== undefined) {
        if (separator === 'and') return formatList(value, locale, 'conjunction');
        if (separator === 'or') return formatList(value, locale, 'disjunction');
        return value.map(String).join(separator);
      }

      return value.map(String).join(', ');
    }

    // Format numbers with locale
    if (typeof value === 'number') {
      try {
        return new Intl.NumberFormat(locale).format(value);
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
    const rules = new Intl.PluralRules(locale);
    return rules.select(n) as PluralForm;
  } catch {
    // Fallback to English-like behavior
    return n === 1 ? 'one' : 'other';
  }
}

/* -------------------- I18n Class -------------------- */

class I18n {
  private locale: Locale;
  private fallbacks: Locale[];
  private escape: boolean;
  private catalogs = new Map<Locale, Messages>();
  private loaders = new Map<Locale, () => Promise<Messages>>();
  private loading = new Map<Locale, Promise<void>>();
  private subscribers = new Set<(locale: Locale) => void>();

  constructor(config: I18nConfig = {}) {
    this.locale = config.locale ?? 'en';
    this.fallbacks = Array.isArray(config.fallback) ? config.fallback : config.fallback ? [config.fallback] : [];
    this.escape = config.escape ?? false;

    if (config.messages) {
      for (const [locale, messages] of Object.entries(config.messages)) {
        this.catalogs.set(locale, messages);
      }
    }

    if (config.loaders) {
      for (const [locale, loader] of Object.entries(config.loaders)) {
        this.loaders.set(locale, loader);
      }
    }
  }

  /* -------------------- Locale Management -------------------- */

  setLocale(locale: Locale): void {
    if (this.locale === locale) return;
    this.locale = locale;
    this.notifySubscribers();
  }

  getLocale(): Locale {
    return this.locale;
  }

  /* -------------------- Message Management -------------------- */

  /**
   * Adds messages to a locale (merges with existing).
   */
  add(locale: Locale, messages: Messages): void {
    const existing = this.catalogs.get(locale) ?? {};
    this.catalogs.set(locale, { ...existing, ...messages });
    this.notifySubscribers();
  }

  /**
   * Sets messages for a locale (replaces existing).
   */
  set(locale: Locale, messages: Messages): void {
    this.catalogs.set(locale, messages);
    this.notifySubscribers();
  }

  getMessages(locale: Locale): Messages | undefined {
    return this.catalogs.get(locale);
  }

  hasLocale(locale: Locale): boolean {
    return this.catalogs.has(locale);
  }

  has(key: string, locale?: Locale): boolean {
    return this.findMessage(key, locale ?? this.locale) !== undefined;
  }

  /* -------------------- Async Loaders -------------------- */

  async load(locale: Locale): Promise<void> {
    // Return existing loading promise
    if (this.loading.has(locale)) return this.loading.get(locale);

    // Already loaded
    if (this.catalogs.has(locale)) return;

    const loader = this.loaders.get(locale);
    if (!loader) return;

    const promise = (async () => {
      try {
        const messages = await loader();
        this.add(locale, messages);
      } catch (error) {
        console.warn(`[I18n] Failed to load locale '${locale}':`, error);
        throw error;
      } finally {
        this.loading.delete(locale);
      }
    })();

    this.loading.set(locale, promise);
    return promise;
  }

  register(locale: Locale, loader: () => Promise<Messages>): void {
    this.loaders.set(locale, loader);
  }

  async hasAsync(key: string, locale?: Locale): Promise<boolean> {
    const targetLocale = locale ?? this.locale;

    if (!this.catalogs.has(targetLocale) && this.loaders.has(targetLocale)) {
      await this.load(targetLocale);
    }

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
  t(key: string, vars?: Record<string, unknown>, options?: TranslateOptions): string {
    const targetLocale = options?.locale ?? this.locale;
    const shouldEscape = options?.escape ?? this.escape;

    const message = this.findMessage(key, targetLocale);
    if (message === undefined) return key;

    const result = this.formatMessage(message, vars ?? {}, targetLocale);
    return shouldEscape ? escapeHtml(result) : result;
  }

  /* -------------------- Formatting Helpers -------------------- */

  number(value: number, options?: Intl.NumberFormatOptions, locale?: Locale): string {
    try {
      return new Intl.NumberFormat(locale ?? this.locale, options).format(value);
    } catch {
      return String(value);
    }
  }

  date(value: Date | number, options?: Intl.DateTimeFormatOptions, locale?: Locale): string {
    const date = typeof value === 'number' ? new Date(value) : value;
    try {
      return new Intl.DateTimeFormat(locale ?? this.locale, options).format(date);
    } catch {
      return date.toString();
    }
  }

  /* -------------------- Namespaced Translator -------------------- */

  namespace(ns: string) {
    return {
      t: (key: string, vars?: Record<string, unknown>, options?: TranslateOptions) =>
        this.t(`${ns}.${key}`, vars, options),
    };
  }

  /* -------------------- Subscriptions -------------------- */

  subscribe(handler: (locale: Locale) => void): () => void {
    this.subscribers.add(handler);

    // Call handler immediately with the current locale
    try {
      handler(this.locale);
    } catch {
      // Ignore handler errors
    }

    return () => this.subscribers.delete(handler);
  }

  private notifySubscribers(): void {
    for (const handler of this.subscribers) {
      try {
        handler(this.locale);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /* -------------------- Internal Helpers -------------------- */

  private findMessage(key: string, locale: Locale): MessageValue | undefined {
    const locales = this.getLocaleChain(locale);

    for (const loc of locales) {
      const messages = this.catalogs.get(loc);
      if (!messages) continue;

      const value = resolvePath(messages, key);
      if (value !== undefined) return value as MessageValue;
    }

    return undefined;
  }

  private getLocaleChain(locale: Locale): Locale[] {
    const chain: Locale[] = [locale];

    // Add base language (e.g., 'en' from 'en-US')
    const lang = locale.split('-')[0];
    if (lang !== locale) chain.push(lang);

    // Add fallback locales
    for (const fallback of this.fallbacks) {
      chain.push(fallback);
      const fallbackLang = fallback.split('-')[0];
      if (fallbackLang !== fallback) chain.push(fallbackLang);
    }

    return chain;
  }

  private formatMessage(message: MessageValue, vars: Record<string, unknown>, locale: Locale): string {
    // Plural messages
    if (typeof message === 'object' && 'other' in message) {
      const count = Number(vars.count ?? 0);
      const pluralMsg = message as PluralMessages;

      // Prefer an explicit 'zero' form
      let form: PluralForm;
      if (count === 0 && pluralMsg.zero !== undefined) {
        form = 'zero';
      } else {
        form = getPluralForm(locale, count);
      }

      const template = pluralMsg[form] ?? pluralMsg.other;
      return interpolate(template, vars, locale);
    }

    // String messages
    if (typeof message === 'string') {
      return interpolate(message, vars, locale);
    }

    return '';
  }
}

/* -------------------- Factory Function -------------------- */

export function createI18n(config?: I18nConfig): I18n {
  return new I18n(config);
}
