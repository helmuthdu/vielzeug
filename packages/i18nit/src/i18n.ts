import type {
  BoundI18n,
  DiagnosticEvent,
  I18nOptions,
  Loader,
  Locale,
  LocaleChangeEvent,
  LocaleChangeReason,
  MessageValue,
  Messages,
  NamespaceKeys,
  TranslationKeyParam,
  Unsubscribe,
  Vars,
} from './types';

import { BoundView, type I18nCore } from './core';
import { BoundedMap, deepMerge, isMessageValue, resolvePath } from './helpers';
import { interpolate } from './interpolate';
import {
  type IntlCaches,
  formatDate,
  formatList,
  formatNumber,
  formatRelative,
  getPluralForm,
  makeIntlCaches,
} from './intl';

export class I18n<T extends Messages = Messages> implements BoundI18n<T> {
  #locale: Locale;
  #fallbacks: Locale[];
  #catalogs = new Map<Locale, Messages>();
  #loaders = new Map<Locale, Loader>();
  #loading = new Map<Locale, Promise<void>>();
  #subscribers = new Set<(event: LocaleChangeEvent) => void>();
  /** Bounded at 128 entries — prevents unbounded growth when locale tags come from user input. */
  #chainCache = new BoundedMap<Locale, Locale[]>(128);
  #onMissing?: (key: string, locale: Locale) => string | undefined;
  #onDiagnostic?: (event: DiagnosticEvent) => void;
  #localesCache: Locale[] | null = null;
  #loadersCache: Locale[] | null = null;
  #disposed = false;
  #batchDepth = 0;
  #pendingNotify: LocaleChangeReason | null = null;
  #core: I18nCore;

  // Instance-scoped Intl caches — GC'd with the instance (important for SSR with many locales).
  readonly #caches: IntlCaches = makeIntlCaches();

  /** Internal BoundView — I18n delegates its BoundI18n surface here to avoid duplicating every method. */
  readonly #view: BoundView<T>;

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
      formatDate: (value, options, locale) => formatDate(this.#caches, value, options, locale),
      formatList: (items, locale, type) => formatList(this.#caches, items, locale, type),
      formatNumber: (value, options, locale) => formatNumber(this.#caches, value, options, locale),
      formatRelative: (value, unit, options, locale) => formatRelative(this.#caches, value, unit, options, locale),
      getLocale: () => this.#locale,
      translate: (key, vars, locale) => this.#translate(key, vars, locale),
    };

    this.#view = new BoundView<T>(this.#core, null);
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

  /** Replaces the entire locale catalog for `locale` with a deep clone of `messages`. */
  replace(locale: Locale, messages: Messages): void {
    this.#catalogs.set(locale, structuredClone(messages));
    this.#localesCache = null;

    if (this.#getLocaleChain(this.#locale).includes(locale)) this.#notify('catalog-update');
  }

  has(key: string): boolean {
    return this.#view.has(key);
  }

  /** Like `has()`, but only checks the exact locale without walking the fallback chain. */
  hasOwn(key: string): boolean {
    return this.#view.hasOwn(key);
  }

  hasLocale(locale: Locale): boolean {
    return this.#catalogs.has(locale);
  }

  /* -------------------- Async Loaders -------------------- */

  async load(...locales: Locale[]): Promise<void> {
    await Promise.all(locales.map((locale) => this.#loadOne(locale)));
  }

  /**
   * Force-reloads a locale catalog even if already populated. Useful for hot-reload and forced bundle refresh.
   * No-op (with a dev warning) when no loader is registered for the locale, to prevent silently clearing the catalog.
   */
  async reload(locale: Locale): Promise<void> {
    if (!this.#loaders.has(locale)) {
      if (import.meta.env?.DEV) {
        console.warn(`[i18nit] reload("${locale}") skipped — no loader registered for this locale.`);
      }

      return;
    }

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

  /* -------------------- BoundI18n surface (delegated to #view) -------------------- */

  /**
   * Translates a key with optional interpolation variables.
   * Locale must be loaded first via `load()` or provided via `messages` in config.
   * For a per-call locale override use `withLocale(locale).t(key, vars)`.
   */
  t(key: TranslationKeyParam<T>, vars?: Vars): string {
    return this.#view.t(key, vars);
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return this.#view.number(value, options);
  }

  date(value: Date | number, options?: Intl.DateTimeFormatOptions): string {
    return this.#view.date(value, options);
  }

  list(items: unknown[], type: 'and' | 'or' = 'and'): string {
    return this.#view.list(items, type);
  }

  relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string {
    return this.#view.relative(value, unit, options);
  }

  currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'style' | 'currency'>): string {
    return this.#view.currency(value, currency, options);
  }

  /**
   * Returns a bound interface that translates in the given locale without
   * changing the active locale on the instance. Useful for SSR and
   * multi-locale rendering in a single pass.
   */
  withLocale(locale: Locale): BoundI18n<T> {
    return this.#view.withLocale(locale);
  }

  /**
   * Returns a translator scoped to a key namespace prefix. Reacts to locale changes on the
   * instance. When `T` is a concrete message type, the returned `BoundI18n` is narrowed to
   * the subtree type so `t()` autocomplete works within the scope.
   * Only keys whose values are nested message objects are valid scope targets.
   */
  scope<K extends NamespaceKeys<T>>(ns: K): BoundI18n<T[K] & Messages> {
    return this.#view.scope(ns);
  }

  /* -------------------- Subscriptions -------------------- */

  /**
   * Executes `fn` while deferring subscriber notifications. A single notification fires
   * after `fn` completes, collapsing any number of `add()` / `replace()` calls made within.
   * Nested `batch()` calls are supported; notification fires when the outermost batch exits.
   * If both a locale change and a catalog update are triggered, `'locale-change'` takes priority.
   *
   * @remarks
   * `batch()` is synchronous. Async operations (e.g. `load()`) started inside `fn` complete
   * after the batch exits and will notify subscribers individually. To batch-load multiple
   * locales and notify once, await `load()` before entering the batch:
   * ```ts
   * await i18n.load('fr', 'de');
   * i18n.batch(() => { i18n.locale = 'fr'; });
   * ```
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

    if (typeof message === 'string') return interpolate(message, vars ?? {}, locale, this.#caches);

    const v = vars ?? {};

    if (import.meta.env?.DEV && v.count === undefined) {
      console.warn(`[i18nit] Key "${key}" is a plural message but vars.count is missing. Defaulting to 0.`);
    }

    const count = Number(v.count ?? 0);
    const form = count === 0 && message.zero !== undefined ? 'zero' : getPluralForm(this.#caches, locale, count);

    return interpolate(message[form] ?? message.other, v, locale, this.#caches);
  }

  #loadOne(locale: Locale): Promise<void> {
    if (this.#loading.has(locale)) return this.#loading.get(locale)!;

    if (this.#catalogs.has(locale)) return Promise.resolve();

    const loader = this.#loaders.get(locale);

    if (!loader) return Promise.resolve();

    const promise = (async () => {
      try {
        const messages = await loader(locale);

        // Use replace() so the loader result is the authoritative catalog for this locale,
        // not merged on top of any pre-seeded static messages.
        if (!this.#disposed) this.replace(locale, messages);
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

export function createI18n<T extends Messages = Messages>(config?: I18nOptions<T>): I18n<T> {
  return new I18n<T>(config);
}
