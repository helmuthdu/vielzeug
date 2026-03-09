/* ============================================
   i18nit - Lightweight, type-safe i18n library
   ============================================ */

/* -------------------- Core Types -------------------- */

export type Locale = string;
export type Unsubscribe = () => void;

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type PluralMessages = Partial<Record<PluralForm, string>> & { other: string };

export type MessageValue = string | PluralMessages;

export type Messages = { [key: string]: MessageValue | Messages };

export type Vars = Record<string, unknown>;

/**
 * Recursively makes all message keys optional, allowing partial locale catalogs.
 * Use when a secondary locale only translates a subset of the primary locale's messages.
 */
export type DeepPartialMessages<T extends Messages> = {
  [K in keyof T]?: T[K] extends MessageValue
    ? MessageValue
    : T[K] extends Messages
      ? DeepPartialMessages<T[K]>
      : MessageValue;
};

/** Recursive type that extracts all dot-notation keys from a Messages shape for type-safe translation. */
export type TranslationKey<
  T extends Messages,
  P extends string = '',
  D extends readonly 0[] = [],
> = D['length'] extends 8
  ? string
  : {
      [K in keyof T & string]: T[K] extends MessageValue
        ? P extends ''
          ? K
          : `${P}.${K}`
        : T[K] extends Messages
          ? TranslationKey<T[K], P extends '' ? K : `${P}.${K}`, [...D, 0]>
          : never;
    }[keyof T & string];

export type Loader = (locale: Locale) => Promise<Messages>;

/** The reason a `subscribe()` listener was notified. */
export type LocaleChangeReason = 'locale-change' | 'catalog-update';

/** Payload passed to every `subscribe()` listener. */
export type LocaleChangeEvent = { locale: Locale; reason: LocaleChangeReason };

export type I18nOptions<T extends Messages = Messages> = {
  locale?: Locale;
  fallback?: Locale | Locale[];
  /**
   * Static message bundles. Each locale can be a full or partial catalog.
   * For a partial secondary locale, annotate it with `DeepPartialMessages<M>` to get compile-time
   * checks that the subset matches the primary locale's shape.
   */
  messages?: Record<string, T>;
  loaders?: Record<Locale, Loader>;
  onMissing?: (key: string, locale: Locale) => string | undefined;
  /** Called for subscriber errors and loader failures. Defaults to `console.error`/`console.warn`. */
  onError?: (err: unknown, context: 'subscriber' | 'loader') => void;
};

export type BoundI18n<T extends Messages = Messages> = {
  readonly locale: Locale;
  t(key: [TranslationKey<T>] extends [never] ? string : TranslationKey<T> | (string & {}), vars?: Vars): string;
  has(key: string): boolean;
  /** Like `has()`, but only checks the exact locale without walking the fallback chain. */
  hasOwn(key: string): boolean;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  list(items: unknown[], type?: 'and' | 'or'): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string;
  scope<K extends keyof T & string>(ns: K): T[K] extends Messages ? BoundI18n<T[K]> : BoundI18n<Messages>;
  withLocale(locale: Locale): BoundI18n<T>;
};

/* -------------------- Path Resolution -------------------- */

/**
 * Resolves nested properties using dot notation and bracket notation.
 * Supports: 'user.name', 'items[0]', 'user.items[0].name'
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  // Try direct access first (handles keys with literal dots)
  if (path in obj) return obj[path];

  const parts = path.match(/[^.[\]]+/gu) ?? [];
  let value: unknown = obj;

  for (const part of parts) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/* -------------------- Intl Cache Helpers -------------------- */

function intlFmt<F extends object>(cache: Map<string, F>, key: string, build: () => F): F {
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = build();
    cache.set(key, fmt);
  }
  return fmt;
}

function intlKey(locale: string, options?: object): string {
  return options ? `${locale}:${JSON.stringify(options, Object.keys(options).sort())}` : locale;
}

/* -------------------- Helpers -------------------- */

const PLURAL_FORMS = new Set<string>(['zero', 'one', 'two', 'few', 'many', 'other']);

function isMessageValue(value: unknown): value is MessageValue {
  if (typeof value === 'string') return true;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    'other' in obj &&
    Object.keys(obj).every((k) => PLURAL_FORMS.has(k)) &&
    Object.values(obj).every((v) => typeof v === 'string')
  );
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

/* -------------------- I18n Class -------------------- */

export class I18n<T extends Messages = Messages> implements BoundI18n<T> {
  #locale: Locale;
  #fallbacks: Locale[];
  #catalogs = new Map<Locale, Messages>();
  #loaders = new Map<Locale, Loader>();
  #loading = new Map<Locale, Promise<void>>();
  #subscribers = new Set<(event: LocaleChangeEvent) => void>();
  // #chainCache is safe to cache permanently — #fallbacks is immutable after construction.
  #chainCache = new Map<Locale, Locale[]>();
  #onMissing?: (key: string, locale: Locale) => string | undefined;
  #onError?: (err: unknown, context: 'subscriber' | 'loader') => void;
  #localesCache: Locale[] | null = null;
  #loadersCache: Locale[] | null = null;

  // Instance-scoped Intl caches — GC'd with the instance (important for SSR with many locales).
  readonly #pluralRulesCache = new Map<string, Intl.PluralRules>();
  readonly #listFormatCache = new Map<string, Intl.ListFormat>();
  readonly #numberFormatCache = new Map<string, Intl.NumberFormat>();
  readonly #dateFormatCache = new Map<string, Intl.DateTimeFormat>();
  readonly #relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

  constructor({ locale = 'en', fallback, messages, loaders, onMissing, onError }: I18nOptions<T> = {}) {
    this.#locale = locale;
    this.#fallbacks = Array.isArray(fallback) ? fallback : fallback ? [fallback] : [];
    this.#onMissing = onMissing;
    this.#onError = onError;
    if (messages) {
      for (const [l, m] of Object.entries(messages)) {
        // Deep-clone at init so external mutations to the source object can't corrupt the catalog.
        this.#catalogs.set(l, structuredClone(m) as Messages);
      }
    }
    if (loaders) for (const [l, fn] of Object.entries(loaders)) this.#loaders.set(l, fn);
  }

  /* -------------------- Locale -------------------- */

  get locale(): Locale {
    return this.#locale;
  }

  get locales(): Locale[] {
    this.#localesCache ??= [...this.#catalogs.keys()];
    return this.#localesCache;
  }

  set locale(value: Locale) {
    if (this.#locale === value) return;
    this.#locale = value;
    this.#notify('locale-change');
  }

  async setLocale(locale: Locale): Promise<void> {
    if (locale === this.#locale) return;
    await this.load(locale);
    this.locale = locale;
  }

  /* -------------------- Message Management -------------------- */

  /** Deep-merges messages into an existing locale catalog. */
  add(locale: Locale, messages: Messages): void {
    const existing = this.#catalogs.get(locale) ?? {};
    this.#catalogs.set(locale, deepMerge(existing, messages));
    this.#localesCache = null;
    if (this.#getLocaleChain(this.#locale).includes(locale)) this.#notify('catalog-update');
  }

  /** Replaces the entire locale catalog with a deep clone of `messages` to prevent external mutation. */
  replace(locale: Locale, messages: Messages): void {
    this.#catalogs.set(locale, structuredClone(messages));
    this.#localesCache = null;
    if (this.#getLocaleChain(this.#locale).includes(locale)) this.#notify('catalog-update');
  }

  has(key: string, locale?: Locale): boolean {
    return this.#findMessage(key, locale ?? this.#locale) !== undefined;
  }

  /** Like `has()`, but only checks the exact locale without walking the fallback chain. */
  hasOwn(key: string, locale?: Locale): boolean {
    const catalog = this.#catalogs.get(locale ?? this.#locale);
    if (!catalog) return false;
    const value = resolvePath(catalog, key);
    return value !== undefined && isMessageValue(value);
  }

  hasLocale(locale: Locale): boolean {
    return this.#catalogs.has(locale);
  }

  /* -------------------- Async Loaders -------------------- */

  async load(...locales: Locale[]): Promise<void> {
    await Promise.all(locales.map((locale) => this.#loadOne(locale)));
  }

  registerLoader(locale: Locale, loader: Loader): void {
    this.#loaders.set(locale, loader);
    this.#loadersCache = null;
  }

  /** Returns the locale keys for which a loader has been registered. */
  get loadableLocales(): Locale[] {
    this.#loadersCache ??= [...this.#loaders.keys()];
    return this.#loadersCache;
  }

  /* -------------------- Translation -------------------- */

  /**
   * Translates a key with optional interpolation variables.
   * Locale must be loaded first via `load()` or provided via `messages` in config.
   * For a per-call locale override use `withLocale(locale).t(key, vars)`.
   */
  t(key: [TranslationKey<T>] extends [never] ? string : TranslationKey<T> | (string & {}), vars?: Vars): string {
    return this.#translate(key, vars, this.#locale);
  }

  /* -------------------- Formatting Helpers -------------------- */

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return this.#number(value, options, this.#locale);
  }

  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this.#date(value, options, this.#locale);
  }

  list(items: unknown[], type: 'and' | 'or' = 'and'): string {
    return this.#formatList(items, this.#locale, type);
  }

  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string {
    return this.#relative(value, unit, options, this.#locale);
  }

  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string {
    return this.#number(value, { ...options, currency, style: 'currency' }, this.#locale);
  }

  /* -------------------- Scoping -------------------- */

  /**
   * Returns a bound interface that translates in the given locale without
   * changing the active locale on the instance. Useful for SSR and
   * multi-locale rendering in a single pass.
   */
  withLocale(locale: Locale): BoundI18n<T> {
    return this.#makeBound(locale) as BoundI18n<T>;
  }

  /**
   * Returns a translator scoped to a key namespace prefix. Reacts to locale changes on the
   * instance. When `T` is a concrete message type, the returned `BoundI18n` is narrowed to
   * the subtree type so `t()` autocomplete works within the scope.
   */
  scope<K extends keyof T & string>(ns: K): T[K] extends Messages ? BoundI18n<T[K]> : BoundI18n<Messages> {
    return this.#makeBound(null, ns) as T[K] extends Messages ? BoundI18n<T[K]> : BoundI18n<Messages>;
  }

  /* -------------------- Subscriptions -------------------- */

  subscribe(listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe {
    this.#subscribers.add(listener);
    if (immediate) {
      try {
        listener({ locale: this.#locale, reason: 'locale-change' });
      } catch (err) {
        this.#handleError(err, 'subscriber');
      }
    }
    return () => this.#subscribers.delete(listener);
  }

  /** Releases all resources held by this instance. */
  dispose(): void {
    this.#subscribers.clear();
    this.#catalogs.clear();
    this.#loaders.clear();
    this.#loading.clear();
    this.#chainCache.clear();
    this.#localesCache = null;
    this.#loadersCache = null;
  }

  /** Enables `using i18n = createI18n(...)` for deterministic resource release. */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /* -------------------- Private -------------------- */

  #makeBound(locale: Locale | null, prefix?: string): BoundI18n<Messages> {
    const loc = (): Locale => locale ?? this.#locale;
    return {
      currency: (value, cur, options) => this.#number(value, { ...options, currency: cur, style: 'currency' }, loc()),
      date: (value, options) => this.#date(value, options, loc()),
      has: (key) => this.has(prefix ? `${prefix}.${key}` : key, loc()),
      hasOwn: (key) => this.hasOwn(prefix ? `${prefix}.${key}` : key, loc()),
      list: (items, type) => this.#formatList(items, loc(), type ?? 'and'),
      get locale() {
        return loc();
      },
      number: (value, options) => this.#number(value, options, loc()),
      relative: (value, unit, options) => this.#relative(value, unit, options, loc()),
      scope: (ns) => this.#makeBound(locale, prefix ? `${prefix}.${ns}` : ns),
      t: (key, vars) => this.#translate(prefix ? `${prefix}.${key}` : key, vars, loc()),
      withLocale: (l) => this.#makeBound(l, prefix),
    };
  }

  #handleError(err: unknown, context: 'subscriber' | 'loader'): void {
    if (this.#onError) {
      this.#onError(err, context);
    } else if (context === 'loader') {
      console.warn('[i18nit] Loader error:', err);
    } else {
      console.error('[i18nit] Subscriber threw:', err);
    }
  }

  #notify(reason: LocaleChangeReason): void {
    const event: LocaleChangeEvent = { locale: this.#locale, reason };
    for (const listener of this.#subscribers) {
      try {
        listener(event);
      } catch (err) {
        this.#handleError(err, 'subscriber');
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

  #translate(key: string, vars: Vars | undefined, locale: Locale): string {
    const message = this.#findMessage(key, locale);
    if (message === undefined) return this.#onMissing?.(key, locale) ?? key;
    if (typeof message === 'string') return this.#interpolate(message, vars ?? {}, locale);
    const v = vars ?? {};
    const count = Number(v.count ?? 0);
    const form = count === 0 && message.zero !== undefined ? 'zero' : this.#getPluralForm(locale, count);
    return this.#interpolate(message[form] ?? message.other, v, locale);
  }

  #getPluralForm(locale: Locale, count: number): PluralForm {
    const n = Math.floor(Math.abs(count));
    try {
      return intlFmt(this.#pluralRulesCache, locale, () => new Intl.PluralRules(locale)).select(n) as PluralForm;
    } catch {
      return n === 1 ? 'one' : 'other';
    }
  }

  #formatList(items: unknown[], locale: string, type: 'and' | 'or'): string {
    if (items.length === 0) return '';
    const stringItems = items.map(String);
    const intlType = type === 'and' ? 'conjunction' : 'disjunction';
    try {
      return intlFmt(
        this.#listFormatCache,
        `${locale}:${intlType}`,
        () => new Intl.ListFormat(locale, { style: 'long', type: intlType }),
      ).format(stringItems);
    } catch {
      // Fallback for environments without Intl.ListFormat
      if (stringItems.length === 1) return stringItems[0];
      if (stringItems.length === 2) return `${stringItems[0]} ${type} ${stringItems[1]}`;
      return `${stringItems.slice(0, -1).join(', ')} ${type} ${stringItems.at(-1)}`;
    }
  }

  #resolveToken(value: unknown, separator: string | undefined, locale: string): string {
    if (value == null) return '';
    if (Array.isArray(value)) {
      if (separator === 'and') return this.#formatList(value, locale, 'and');
      if (separator === 'or') return this.#formatList(value, locale, 'or');
      if (separator !== undefined) return value.map(String).join(separator);
      return value.map(String).join(', ');
    }
    if (typeof value === 'number') {
      try {
        return intlFmt(this.#numberFormatCache, locale, () => new Intl.NumberFormat(locale)).format(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  /**
   * Interpolates variables into a template string. Supports Unicode variable names
   * via `\p{ID_Continue}` so non-ASCII identifiers like `{prénom}` or `{名前}` work correctly.
   *
   * Supported formats: `{name}` · `{user.name}` · `{items[0]}` · `{items}` ·
   * `{items|and}` · `{items|or}` · `{items| - }` · `{items.length}`
   */
  #interpolate(template: string, vars: Vars, locale: string): string {
    if (!template.includes('{')) return template;
    return template.replace(
      /\{([\p{ID_Continue}\-.[\]]+)(?:\|([^}]+))?\}/gu,
      (_match, key: string, separator?: string) => this.#resolveToken(resolvePath(vars, key), separator, locale),
    );
  }

  #number(value: number, options: Intl.NumberFormatOptions | undefined, locale: Locale): string {
    try {
      return intlFmt(
        this.#numberFormatCache,
        intlKey(locale, options),
        () => new Intl.NumberFormat(locale, options),
      ).format(value);
    } catch {
      return String(value);
    }
  }

  #date(value: Date | number, options: Intl.DateTimeFormatOptions | undefined, locale: Locale): string {
    const d = typeof value === 'number' ? new Date(value) : value;
    try {
      return intlFmt(
        this.#dateFormatCache,
        intlKey(locale, options),
        () => new Intl.DateTimeFormat(locale, options),
      ).format(d);
    } catch {
      return d.toString();
    }
  }

  #relative(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options: Intl.RelativeTimeFormatOptions | undefined,
    locale: Locale,
  ): string {
    try {
      return intlFmt(
        this.#relativeTimeFormatCache,
        intlKey(locale, options),
        () => new Intl.RelativeTimeFormat(locale, options),
      ).format(value, unit);
    } catch {
      return String(value);
    }
  }

  #loadOne(locale: Locale): Promise<void> {
    if (this.#loading.has(locale)) return this.#loading.get(locale)!;
    if (this.#catalogs.has(locale)) return Promise.resolve();

    const loader = this.#loaders.get(locale);
    if (!loader) return Promise.resolve();

    const promise = (async () => {
      try {
        const messages = await loader(locale);
        this.add(locale, messages);
      } catch (error) {
        this.#handleError(error, 'loader');
        throw error;
      } finally {
        this.#loading.delete(locale);
      }
    })();

    this.#loading.set(locale, promise);
    return promise;
  }
}

/* -------------------- Factory Function -------------------- */

export function createI18n<T extends Messages = Messages>(config?: I18nOptions<T>): I18n<T> {
  return new I18n<T>(config);
}
