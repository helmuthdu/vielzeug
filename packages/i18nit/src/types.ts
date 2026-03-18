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

/** Extracts dot-notation keys from `T` whose final value is `PluralMessages`, for compile-time `count` enforcement. */
export type PluralKeys<T extends Messages, P extends string = '', D extends readonly 0[] = []> = D['length'] extends 8
  ? never
  : {
      [K in keyof T & string]: T[K] extends PluralMessages
        ? P extends ''
          ? K
          : `${P}.${K}`
        : T[K] extends Messages
          ? PluralKeys<T[K], P extends '' ? K : `${P}.${K}`, [...D, 0]>
          : never;
    }[keyof T & string];

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
  /** Translates a plural key — requires `{ count: number }` when `T` is concrete and the key resolves to `PluralMessages`. */
  t<K extends PluralKeys<T>>(key: K, vars: { count: number } & Vars): string;
  t(key: TranslationKeyParam<T>, vars?: Vars): string;
  withLocale(locale: Locale): BoundI18n<T>;
};
