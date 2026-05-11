export type Locale = string;
export type Vars = Record<string, unknown>;
export type Unsubscribe = () => void;

export type Messages = { [key: string]: string | Messages };

type StringKey<T> = Extract<keyof T, string>;
type DotJoin<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;
type PrevDepth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8];

export type MessageLeafKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
  ? never
  : T extends string
    ? P
    : T extends Record<string, unknown>
      ? {
          [K in StringKey<T>]: MessageLeafKeys<T[K], DotJoin<P, K>, PrevDepth[D]>;
        }[StringKey<T>]
      : never;

export type MessageBranchKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
  ? never
  : T extends Record<string, unknown>
    ? {
        [K in StringKey<T>]: T[K] extends string
          ? never
          : DotJoin<P, K> | MessageBranchKeys<T[K], DotJoin<P, K>, PrevDepth[D]>;
      }[StringKey<T>]
    : never;

export type Loader<M extends Messages = Messages> = (locale: Locale) => Promise<M>;

export type LocaleChangeReason = 'locale-change' | 'catalog-update' | 'init';
export type LocaleChangeEvent = { locale: Locale; reason: LocaleChangeReason };

export type DiagnosticEvent =
  | { error: unknown; kind: 'subscriber-error' }
  | { error: unknown; kind: 'loader-error'; locale: Locale };

export type DurationValue = Partial<
  Record<
    | 'years'
    | 'months'
    | 'weeks'
    | 'days'
    | 'hours'
    | 'minutes'
    | 'seconds'
    | 'milliseconds'
    | 'microseconds'
    | 'nanoseconds',
    number
  >
>;

export type DurationFormatOptions = {
  hours?: 'numeric' | '2-digit';
  milliseconds?: 'numeric';
  minutes?: 'numeric' | '2-digit';
  nanoseconds?: 'numeric';
  seconds?: 'numeric' | '2-digit';
  style?: 'digital' | 'long' | 'narrow' | 'short';
};

export type FormatInput =
  | {
      kind: 'number';
      options?: Intl.NumberFormatOptions;
      value: number;
    }
  | {
      currency: string;
      kind: 'currency';
      options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>;
      value: number;
    }
  | {
      kind: 'date';
      options?: Intl.DateTimeFormatOptions;
      value: Date | number;
    }
  | {
      kind: 'relative';
      options?: Intl.RelativeTimeFormatOptions;
      unit: Intl.RelativeTimeFormatUnit;
      value: number;
    }
  | {
      kind: 'list';
      options?: { style?: 'long' | 'short' | 'narrow'; type?: 'and' | 'or' };
      value: unknown[];
    }
  | {
      kind: 'duration';
      options?: DurationFormatOptions;
      value: DurationValue;
    };

export type FormatKind = FormatInput['kind'];

export type I18nOptions<M extends Messages = Messages> = {
  catalogs?: Record<Locale, M | Loader<M>>;
  fallback?: Locale | Locale[];
  locale?: Locale;
  onDiagnostic?: (event: DiagnosticEvent) => void;
  onMissing?: (key: string, locale: Locale) => string;
};

export type I18n<M extends Messages = Messages> = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  dispose(): void;
  format(input: FormatInput): string;
  has<K extends MessageLeafKeys<M>>(key: K): boolean;
  readonly loadableLocales: Locale[];
  readonly loadedLocales: Locale[];
  readonly locale: Locale;
  mergeCatalog(locale: Locale, messages: M): void;
  preload(locale: Locale): Promise<void>;
  setCatalog(locale: Locale, messages: M): void;
  setLoader(locale: Locale, loader: Loader<M>): void;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe;
  t<K extends MessageLeafKeys<M> | MessageBranchKeys<M>>(key: K, vars?: Vars): string;
  tp<K extends MessageBranchKeys<M>>(key: K, count: number, vars?: Vars, ordinal?: boolean): string;
};
