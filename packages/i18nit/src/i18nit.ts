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

/**
 * Recursive type that extracts all dot-notation keys from a Messages shape for type-safe translation.
 * Type-safe resolution is provided up to 8 levels of nesting; deeper paths resolve to `string`.
 */
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

/** The `key` parameter type for `t()` — enforces known dot-notation paths when `T` is concrete, allows any string otherwise. */
export type TranslationKeyParam<T extends Messages> = [TranslationKey<T>] extends [never]
  ? string
  : TranslationKey<T> | (string & {});

export type Loader = (locale: Locale) => Promise<Messages>;

/** The reason a `subscribe()` listener was notified. */
export type LocaleChangeReason = 'locale-change' | 'catalog-update';

/** Payload passed to every `subscribe()` listener. */
export type LocaleChangeEvent = { locale: Locale; reason: LocaleChangeReason };

/** Type alias for a `subscribe()` listener function. */
export type LocaleChangeListener = (event: LocaleChangeEvent) => void;

/**
 * Diagnostic event passed to `onDiagnostic`. Each `kind` carries relevant context:
 * - `'subscriber-error'` — a subscriber callback threw; treat as a programming error.
 * - `'loader-error'` — a locale loader rejected; treat as a recoverable I/O failure.
 */
export type DiagnosticEvent =
  | { error: unknown; kind: 'subscriber-error' }
  | { error: unknown; kind: 'loader-error'; locale: Locale };

/** Keys of `T` whose values are nested `Messages` objects (i.e. valid scope targets). */
export type NamespaceKeys<T extends Messages> = string extends keyof T
  ? string
  : {
      [K in keyof T & string]: T[K] extends Messages ? K : never;
    }[keyof T & string];

export type I18nOptions<T extends Messages = Messages> = {
  fallback?: Locale | Locale[];
  loaders?: Record<Locale, Loader>;
  locale?: Locale;
  /**
   * Static message bundles. Each locale can be a full or partial catalog.
   * For a partial secondary locale, annotate it with `DeepPartialMessages<M>` to get compile-time
   * checks that the subset matches the primary locale's shape.
   */
  messages?: Record<string, T | DeepPartialMessages<T>>;
  /**
   * Receives diagnostic events for both subscriber errors and loader failures.
   * `'subscriber-error'` events indicate a programming error in a listener.
   * `'loader-error'` events are recoverable I/O failures and include the failing `locale`.
   * Defaults to `console.error` for subscriber errors and `console.warn` for loader errors.
   */
  onDiagnostic?: (event: DiagnosticEvent) => void;
  onMissing?: (key: string, locale: Locale) => string | undefined;
};

export type BoundI18n<T extends Messages = Messages> = {
  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string;
  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
  has(key: string): boolean;
  /** Like `has()`, but only checks the exact locale without walking the fallback chain. */
  hasOwn(key: string): boolean;
  list(items: unknown[], type?: 'and' | 'or'): string;
  readonly locale: Locale;
  number(value: number, options?: Intl.NumberFormatOptions): string;
  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  /** Returns a translator scoped to a namespace key. Only keys whose values are nested message objects are valid. */
  scope<K extends NamespaceKeys<T>>(ns: K): BoundI18n<T[K] & Messages>;
  t(key: TranslationKeyParam<T>, vars?: Vars): string;
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

  if (!('other' in obj)) return false;

  const keys = Object.keys(obj);

  if (keys.length > PLURAL_FORMS.size) return false;

  return keys.every((k) => PLURAL_FORMS.has(k)) && Object.values(obj).every((v) => typeof v === 'string');
}

function deepMerge(target: Messages, source: Messages): Messages {
  const result = { ...target };

  for (const [key, val] of Object.entries(source)) {
    const existing = result[key];

    if (!isMessageValue(val) && !isMessageValue(existing) && typeof existing === 'object' && existing !== null) {
      result[key] = deepMerge(existing as Messages, val as Messages);
    } else {
      // Clone PluralMessages objects to prevent external mutations from corrupting the catalog.
      result[key] = typeof val === 'object' && val !== null ? ({ ...(val as object) } as MessageValue) : val;
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
  /**
   * #chainCache is safe to cache permanently — #fallbacks is immutable after construction.
   * Note: in long-lived SSR singletons, entries accumulate for every distinct locale string
   * ever passed to withLocale(). The set of distinct locales is normally bounded,
   * but if locales are derived from arbitrary user input, prefer a fresh I18n instance per
   * request or use withLocale() only with known locale tags.
   */
  #chainCache = new Map<Locale, Locale[]>();
  #onMissing?: (key: string, locale: Locale) => string | undefined;
  #onDiagnostic?: (event: DiagnosticEvent) => void;
  #localesCache: Locale[] | null = null;
  #loadersCache: Locale[] | null = null;
  #disposed = false;
  #batchDepth = 0;
  #pendingNotify: LocaleChangeReason | null = null;

  #core!: any; // typed as I18nCore — defined later in this module; initialized in constructor

  // Instance-scoped Intl caches — GC'd with the instance (important for SSR with many locales).
  readonly #pluralRulesCache = new Map<string, Intl.PluralRules>();
  readonly #listFormatCache = new Map<string, Intl.ListFormat>();
  readonly #numberFormatCache = new Map<string, Intl.NumberFormat>();
  readonly #dateFormatCache = new Map<string, Intl.DateTimeFormat>();
  readonly #relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();

  constructor({ fallback, loaders, locale = 'en', messages, onDiagnostic, onMissing }: I18nOptions<T> = {}) {
    this.#locale = locale;
    this.#fallbacks = Array.isArray(fallback) ? fallback : fallback ? [fallback] : [];
    this.#onMissing = onMissing;
    this.#onDiagnostic = onDiagnostic;

    if (messages) {
      for (const [l, m] of Object.entries(messages)) {
        // Deep-clone at init so external mutations to the source object can't corrupt the catalog.
        this.#catalogs.set(l, structuredClone(m) as Messages);
      }
    }

    if (loaders) for (const [l, fn] of Object.entries(loaders)) this.#loaders.set(l, fn);

    this.#core = {
      checkOwn: (key: string, locale: Locale) => {
        const catalog = this.#catalogs.get(locale);

        if (!catalog) return false;

        const value = resolvePath(catalog, key);

        return value !== undefined && isMessageValue(value);
      },
      findMessage: (key: string, locale: Locale) => this.#findMessage(key, locale),
      formatDate: (value: Date | number, options: Intl.DateTimeFormatOptions | undefined, locale: Locale) =>
        this.#date(value, options, locale),
      formatList: (items: unknown[], locale: string, type: 'and' | 'or') => this.#formatList(items, locale, type),
      formatNumber: (value: number, options: Intl.NumberFormatOptions | undefined, locale: Locale) =>
        this.#number(value, options, locale),
      formatRelative: (
        value: number,
        unit: Intl.RelativeTimeFormatUnit,
        options: Intl.RelativeTimeFormatOptions | undefined,
        locale: Locale,
      ) => this.#relative(value, unit, options, locale),
      getLocale: () => this.#locale,
      translate: (key: string, vars: Vars | undefined, locale: Locale) => this.#translate(key, vars, locale),
    };
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

    if (import.meta.env?.DEV && !this.#catalogs.has(value) && this.#loaders.has(value)) {
      console.warn(
        `[i18nit] locale "${value}" has a registered loader but is not loaded. ` +
          'Use setLocale() to load and switch atomically.',
      );
    }

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

  /** Replaces the entire locale catalog for `locale` with a shallow copy of `messages`. */
  replace(locale: Locale, messages: Messages): void {
    this.#catalogs.set(locale, { ...messages });
    this.#localesCache = null;

    if (this.#getLocaleChain(this.#locale).includes(locale)) this.#notify('catalog-update');
  }

  has(key: string): boolean {
    return this.#findMessage(key, this.#locale) !== undefined;
  }

  /** Like `has()`, but only checks the exact locale without walking the fallback chain. */
  hasOwn(key: string): boolean {
    const catalog = this.#catalogs.get(this.#locale);

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

  /** Force-reloads a locale catalog even if already populated. Useful for hot-reload and forced bundle refresh. */
  async reload(locale: Locale): Promise<void> {
    this.#catalogs.delete(locale);
    this.#localesCache = null;
    await this.#loadOne(locale);
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
  t(key: TranslationKeyParam<T>, vars?: Vars): string {
    return this.#translate(key as string, vars, this.#locale);
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
    return new BoundView<T>(this.#core, locale);
  }

  /**
   * Returns a translator scoped to a key namespace prefix. Reacts to locale changes on the
   * instance. When `T` is a concrete message type, the returned `BoundI18n` is narrowed to
   * the subtree type so `t()` autocomplete works within the scope.
   * Only keys whose values are nested message objects are valid scope targets.
   */
  scope<K extends NamespaceKeys<T>>(ns: K): BoundI18n<T[K] & Messages> {
    return new BoundView(this.#core, null, ns) as BoundI18n<T[K] & Messages>;
  }

  /* -------------------- Subscriptions -------------------- */

  /**
   * Executes `fn` while deferring subscriber notifications. A single notification fires
   * after `fn` completes, collapsing any number of `add()` / `replace()` calls made within.
   * Nested `batch()` calls are supported; notification fires when the outermost batch exits.
   * If both a locale change and a catalog update are triggered, `'locale-change'` takes priority.
   */
  batch(fn: () => void): void {
    this.#batchDepth++;

    try {
      fn();
    } finally {
      this.#batchDepth--;

      if (this.#batchDepth === 0 && this.#pendingNotify !== null) {
        const reason = this.#pendingNotify;

        this.#pendingNotify = null;
        this.#notify(reason);
      }
    }
  }

  subscribe(listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe {
    this.#subscribers.add(listener);

    if (immediate) {
      try {
        listener({ locale: this.#locale, reason: 'locale-change' });
      } catch (err) {
        this.#diagnoseSubscriber(err);
      }
    }

    return () => this.#subscribers.delete(listener);
  }

  /** Releases all resources held by this instance. */
  dispose(): void {
    this.#disposed = true;
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

  /**
   * Awaits any in-flight `load()` calls and then releases all resources.
   * Enables `await using i18n = createI18n(...)` in environments that support `Symbol.asyncDispose`.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    await Promise.allSettled([...this.#loading.values()]);
    this.dispose();
  }

  /* -------------------- Private -------------------- */

  #diagnoseSubscriber(error: unknown): void {
    if (this.#onDiagnostic) {
      this.#onDiagnostic({ error, kind: 'subscriber-error' });
    } else {
      console.error('[i18nit] Subscriber threw:', error);
    }
  }

  #diagnoseLoader(error: unknown, locale: Locale): void {
    if (this.#onDiagnostic) {
      this.#onDiagnostic({ error, kind: 'loader-error', locale });
    } else {
      console.warn('[i18nit] Loader error:', error);
    }
  }

  #notify(reason: LocaleChangeReason): void {
    if (this.#batchDepth > 0) {
      // 'locale-change' takes priority over 'catalog-update' if both occur in one batch
      if (this.#pendingNotify !== 'locale-change') this.#pendingNotify = reason;

      return;
    }

    const event: LocaleChangeEvent = { locale: this.#locale, reason };

    for (const listener of this.#subscribers) {
      try {
        listener(event);
      } catch (err) {
        this.#diagnoseSubscriber(err);
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

      const parts = l.split('-');

      for (let i = parts.length - 1; i > 0; i--) {
        seen.add(parts.slice(0, i).join('-'));
      }
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

    if (import.meta.env?.DEV && v.count === undefined) {
      console.warn(`[i18nit] Key "${key}" is a plural message but vars.count is missing. Defaulting to 0.`);
    }

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

        if (!this.#disposed) this.add(locale, messages);
      } catch (error) {
        this.#diagnoseLoader(error, locale);
        throw error;
      } finally {
        this.#loading.delete(locale);
      }
    })();

    this.#loading.set(locale, promise);

    return promise;
  }
}

/* -------------------- Internal Core + BoundView -------------------- */

/**
 * Module-private interface given to every `BoundView` — exposes only the operations views need.
 * Created once per `I18n` instance so `scope()` / `withLocale()` allocate no closures per call.
 */
type I18nCore = {
  checkOwn(key: string, locale: Locale): boolean;
  findMessage(key: string, locale: Locale): MessageValue | undefined;
  formatDate(value: Date | number, options: Intl.DateTimeFormatOptions | undefined, locale: Locale): string;
  formatList(items: unknown[], locale: string, type: 'and' | 'or'): string;
  formatNumber(value: number, options: Intl.NumberFormatOptions | undefined, locale: Locale): string;
  formatRelative(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options: Intl.RelativeTimeFormatOptions | undefined,
    locale: Locale,
  ): string;
  getLocale(): Locale;
  translate(key: string, vars: Vars | undefined, locale: Locale): string;
};

/**
 * Lightweight view over an `I18n` instance, fixed to a locale and/or key namespace prefix.
 * All methods live on the prototype — no closures are allocated per `scope()` / `withLocale()` call.
 */
class BoundView<T extends Messages = Messages> implements BoundI18n<T> {
  readonly #core: I18nCore;
  readonly #fixedLocale: Locale | null;
  readonly #prefix: string | undefined;

  constructor(core: I18nCore, fixedLocale: Locale | null, prefix?: string) {
    this.#core = core;
    this.#fixedLocale = fixedLocale;
    this.#prefix = prefix;
  }

  get locale(): Locale {
    return this.#fixedLocale ?? this.#core.getLocale();
  }

  #key(key: string): string {
    return this.#prefix ? `${this.#prefix}.${key}` : key;
  }

  t(key: TranslationKeyParam<T>, vars?: Vars): string {
    return this.#core.translate(this.#key(key as string), vars, this.locale);
  }

  has(key: string): boolean {
    return this.#core.findMessage(this.#key(key), this.locale) !== undefined;
  }

  hasOwn(key: string): boolean {
    return this.#core.checkOwn(this.#key(key), this.locale);
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return this.#core.formatNumber(value, options, this.locale);
  }

  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this.#core.formatDate(value, options, this.locale);
  }

  list(items: unknown[], type: 'and' | 'or' = 'and'): string {
    return this.#core.formatList(items, this.locale, type);
  }

  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string {
    return this.#core.formatRelative(value, unit, options, this.locale);
  }

  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string {
    return this.#core.formatNumber(value, { ...options, currency, style: 'currency' }, this.locale);
  }

  scope<K extends NamespaceKeys<T>>(ns: K): BoundI18n<T[K] & Messages> {
    return new BoundView(
      this.#core,
      this.#fixedLocale,
      this.#prefix ? `${this.#prefix}.${String(ns)}` : String(ns),
    ) as BoundI18n<T[K] & Messages>;
  }

  withLocale(locale: Locale): BoundI18n<T> {
    return new BoundView<T>(this.#core, locale, this.#prefix);
  }
}

/* -------------------- Factory Function -------------------- */

export function createI18n<T extends Messages = Messages>(config?: I18nOptions<T>): I18n<T> {
  return new I18n<T>(config);
}
