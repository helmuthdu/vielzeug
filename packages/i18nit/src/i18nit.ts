export type Locale = string;

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };

export type MessageFunction = (
  vars: Record<string, unknown>,
  helpers: {
    number: (value: number, options?: Intl.NumberFormatOptions) => string;
    date: (value: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  },
) => string;

export type MessageValue = string | PluralMessages | MessageFunction;

export type Messages = Record<string, MessageValue>;

export type TranslateParams = {
  locale?: Locale;
  fallback?: string;
  escape?: boolean;
};

export type I18nConfig = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  messages?: Record<Locale, Messages>;
  loaders?: Record<Locale, () => Promise<Messages>>;
  escape?: boolean;
  missingKey?: (key: string, locale: Locale) => string;
  missingVar?: 'preserve' | 'empty' | 'error';
};

/* Helpers */

const HTML_ENTITIES: Record<string, string> = {
  "'": '&#39;',
  '"': '&quot;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

const escapeHtml = (str: string): string => str.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);

// Resolve nested properties: "a.b", "a[0]", "a.b[0].c"
const resolvePath = (obj: Record<string, unknown>, path: string): unknown => {
  // Try direct access first (supports literal keys with dots)
  if (path in obj) return obj[path];

  // Parse and traverse path
  const parts = path.match(/[^.[\]]+/g) || [];
  let value: unknown = obj;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
};

const interpolate = (
  template: string,
  vars: Record<string, unknown>,
  options: {
    locale?: Locale;
    missingVar?: 'preserve' | 'empty' | 'error';
  } = {},
): string => {
  const missingVar = options.missingVar ?? 'empty';

  return template.replace(/\{([\w.[\]]+)\}/g, (match, key) => {
    const value = resolvePath(vars, key);

    if (value == null) {
      if (missingVar === 'preserve') return match;
      if (missingVar === 'error') throw new Error(`Missing variable: ${key}`);
      return '';
    }

    // Format numbers with locale
    if (typeof value === 'number' && options.locale) {
      try {
        return new Intl.NumberFormat(options.locale).format(value);
      } catch {
        // Fall through to string conversion
      }
    }

    return String(value);
  });
};

/* Pluralization */

type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

const PLURAL_RULES: Record<string, (n: number) => PluralCategory> = {
  // Arabic: complex rules
  ar: (n) => {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const mod100 = n % 100;
    if (mod100 === 0 && n !== 0) return 'zero';
    if (mod100 >= 3 && mod100 <= 10) return 'few';
    if (mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  },
  // English: one/other
  en: (n) => (n === 1 ? 'one' : 'other'),

  // French: one (0-1) / other
  fr: (n) => (n <= 1 ? 'one' : 'other'),

  // Polish: one / few / many
  pl: (n) => {
    if (n === 1) return 'one';
    const mod10 = n % 10;
    const mod100 = n % 100;
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'few';
    return 'many';
  },

  // Russian: similar to Polish
  ru: (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'few';
    if (mod10 === 0 || [5, 6, 7, 8, 9].includes(mod10) || [11, 12, 13, 14].includes(mod100)) return 'many';
    return 'other';
  },
};

const getPluralForm = (locale: Locale, count: number): PluralCategory => {
  const n = Math.abs(Math.floor(count));
  const lang = locale.split('-')[0].toLowerCase();
  const rule = PLURAL_RULES[lang] ?? PLURAL_RULES.en;
  return rule(n);
};

type LocaleChangeHandler = (locale: Locale) => void;

class I18n {
  private locale: Locale;
  private fallbacks: Locale[];
  private catalogs = new Map<Locale, Messages>();
  private loaders = new Map<Locale, () => Promise<Messages>>();
  private loading = new Map<Locale, Promise<void>>();
  private subscribers = new Set<LocaleChangeHandler>();

  private escape: boolean;
  private missingKey: (key: string, locale: Locale) => string;
  private missingVar: 'preserve' | 'empty' | 'error';

  constructor(config: I18nConfig = {}) {
    this.locale = config.locale ?? 'en';
    this.fallbacks = Array.isArray(config.fallback) ? config.fallback : config.fallback ? [config.fallback] : [];

    this.escape = config.escape ?? false;
    this.missingKey = config.missingKey ?? ((key) => key);
    this.missingVar = config.missingVar ?? 'empty';

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

  // Locale Management

  setLocale(locale: Locale): void {
    if (this.locale === locale) return;
    this.locale = locale;
    this.notifySubscribers();
  }

  getLocale(): Locale {
    return this.locale;
  }

  // Message Management

  add(locale: Locale, messages: Messages): void {
    const existing = this.catalogs.get(locale) ?? {};
    this.catalogs.set(locale, { ...existing, ...messages });
    this.notifySubscribers();
  }

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
    return this.findMessage(key, locale) !== undefined;
  }

  // Async Loaders

  async load(locale: Locale): Promise<void> {
    if (this.loading.has(locale)) return this.loading.get(locale);
    if (this.catalogs.has(locale)) return;

    const loader = this.loaders.get(locale);
    if (!loader) return;

    const promise = loader()
      .then((messages) => this.add(locale, messages))
      .finally(() => this.loading.delete(locale));

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

  // Translation

  t(key: string, vars?: Record<string, unknown>, options?: TranslateParams): string {
    const opts = options ?? {};
    const targetLocale = opts.locale ?? this.locale;
    const shouldEscape = opts.escape ?? this.escape;

    const message = this.findMessage(key, targetLocale);
    if (message === undefined) {
      return opts.fallback ?? this.missingKey(key, targetLocale);
    }

    return this.formatMessage(message, vars ?? {}, targetLocale, shouldEscape);
  }

  async tl(key: string, vars?: Record<string, unknown>, options?: TranslateParams): Promise<string> {
    const targetLocale = options?.locale ?? this.locale;

    if (!this.catalogs.has(targetLocale) && this.loaders.has(targetLocale)) {
      try {
        await this.load(targetLocale);
      } catch {
        // Continue with translation even if loading fails
      }
    }

    return this.t(key, vars, options);
  }

  // Formatting Helpers

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

  // Namespaced Translator

  namespace(ns: string) {
    return {
      t: (key: string, vars?: Record<string, unknown>, options?: TranslateParams) =>
        this.t(`${ns}.${key}`, vars, options),
      tl: (key: string, vars?: Record<string, unknown>, options?: TranslateParams) =>
        this.tl(`${ns}.${key}`, vars, options),
    };
  }

  // Subscriptions

  subscribe(handler: LocaleChangeHandler): () => void {
    this.subscribers.add(handler);
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

  // Internal Helpers

  private findMessage(key: string, locale?: Locale): MessageValue | undefined {
    const locales = this.getLocaleChain(locale ?? this.locale);

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

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
  private formatMessage(
    message: MessageValue,
    vars: Record<string, unknown>,
    locale: Locale,
    shouldEscape: boolean,
  ): string {
    // Handle function messages
    if (typeof message === 'function') {
      try {
        const result = message(vars, {
          date: (d, opts) => this.date(d, opts, locale),
          number: (v, opts) => this.number(v, opts, locale),
        });
        return shouldEscape ? escapeHtml(result) : result;
      } catch {
        return '';
      }
    }

    // Handle plural messages
    if (typeof message === 'object' && 'other' in message) {
      const count = Number(vars.count ?? 0);
      const pluralMsg = message as PluralMessages;

      // Prefer an explicit 'zero' form when the count is 0
      let form: PluralForm;
      if (count === 0 && pluralMsg.zero !== undefined) {
        form = 'zero';
      } else {
        form = getPluralForm(locale, count);
      }

      const template = pluralMsg[form] ?? pluralMsg.other;
      const result = interpolate(template, vars, { locale, missingVar: this.missingVar });
      return shouldEscape ? escapeHtml(result) : result;
    }

    // Handle string messages
    if (typeof message === 'string') {
      const result = interpolate(message, vars, { locale, missingVar: this.missingVar });
      return shouldEscape ? escapeHtml(result) : result;
    }

    return '';
  }
}

export function createI18n(config?: I18nConfig): I18n {
  return new I18n(config);
}
