import type { BoundI18n, Locale, MessageValue, Messages, NamespaceKeys, TranslationKeyParam, Vars } from './types';

/* -------------------- I18nCore -------------------- */

/**
 * Module-private interface given to every `BoundView` — exposes only the operations views need.
 * Created once per `I18n` instance so `scope()` / `withLocale()` allocate no closures per call.
 */
export type I18nCore = {
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

/* -------------------- BoundView -------------------- */

/**
 * Lightweight view over an `I18n` instance, fixed to a locale and/or key namespace prefix.
 * All methods live on the prototype — no closures are allocated per `scope()` / `withLocale()` call.
 */
export class BoundView<T extends Messages = Messages> implements BoundI18n<T> {
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
