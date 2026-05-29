export const linguaTypes = `
declare module '/lingua' {
  export type Locale = string;
  export type Unsubscribe = () => void;
  export type TranslateVars = Record<string, unknown>;

  export interface Messages {
    [key: string]: string | Messages;
  }

  export type Loader<M extends Messages = Messages> = () => Promise<M>;
  export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

  export type PluralTranslateOptions = {
    ordinal?: boolean;
    vars?: TranslateVars;
  };

  export type SupportedLocalesOptions = {
    sorted?: boolean;
  };

  export type SubscribeOptions = {
    immediate?: boolean;
  };

  export type MissingInfo =
    | { key: string; locale: Locale; type: 'key' }
    | { key: string; locale: Locale; type: 'var'; varName: string };

  export type I18nSnapshot = {
    readonly locale: Locale;
    readonly version: number;
  };

  export type AnyKey = string & {};

  type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

  export type MessageLeafKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
    ? never
    : T extends string
      ? P
      : T extends Record<string, unknown>
        ? {
            [K in string & keyof T]: MessageLeafKeys<T[K], P extends '' ? K : \`${'${P}.${K}'}\`, Depth[D]>;
          }[string & keyof T]
        : never;

  export type MessageBranchKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
    ? never
    : T extends Record<string, unknown>
      ? {
          [K in string & keyof T]: T[K] extends string
            ? never
            : (P extends '' ? K : \`${'${P}.${K}'}\`) | MessageBranchKeys<T[K], P extends '' ? K : \`${'${P}.${K}'}\`, Depth[D]>;
        }[string & keyof T]
      : never;

  export type ScopedI18n = {
    has(key: string): boolean;
    t(key: string, vars?: TranslateVars): string;
    tp(key: string, count: number, options?: PluralTranslateOptions): string;
  };

  export type I18nOptions<M extends Messages = Messages> = {
    catalogs?: Record<Locale, LocaleSource<M>>;
    fallback?: Locale | Locale[];
    locale?: Locale;
    onMissing?: (info: MissingInfo) => string;
    onSubscriberError?: (error: unknown) => void;
  };

  export type I18n<M extends Messages = Messages> = {
    readonly fmt: import('/lingua/format').Formatter;
    getSnapshot(): I18nSnapshot;
    getSupportedLocales(options?: SupportedLocalesOptions): Locale[];
    has(key: MessageLeafKeys<M> | AnyKey): boolean;
    readonly locale: Locale;
    merge(locale: Locale, source: LocaleSource<M>): Promise<void>;
    preload(locale: Locale): Promise<void>;
    register(locale: Locale, source: LocaleSource<M>): void;
    scope(prefix: MessageBranchKeys<M> | AnyKey): ScopedI18n;
    setLocale(locale: Locale): Promise<void>;
    subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
    t(key: MessageLeafKeys<M> | AnyKey, vars?: TranslateVars): string;
    tp(key: MessageBranchKeys<M> | AnyKey, count: number, options?: PluralTranslateOptions): string;
  };

  export function createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>;
  export function createI18n(options?: I18nOptions<Messages>): I18n<Messages>;
}

declare module '/lingua/format' {
  export type DurationValue = Partial<
    Record<'days' | 'hours' | 'microseconds' | 'milliseconds' | 'minutes' | 'months' | 'nanoseconds' | 'seconds' | 'weeks' | 'years', number>
  >;

  export type DurationFormatOptions = {
    hours?: '2-digit' | 'numeric';
    minutes?: '2-digit' | 'numeric';
    seconds?: '2-digit' | 'numeric';
    style?: 'digital' | 'long' | 'narrow' | 'short';
  };

  export type ListFormatOptions = {
    style?: 'long' | 'narrow' | 'short';
    type?: 'and' | 'or';
  };

  export type Formatter = {
    clear(): void;
    currency(value: number, currency: string, options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'>): string;
    date(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
    duration(value: DurationValue, options?: DurationFormatOptions): string;
    list(value: Array<string | number | boolean>, options?: ListFormatOptions): string;
    number(value: number, options?: Intl.NumberFormatOptions): string;
    relative(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions): string;
  };

  export function createFormatter(source: string | (() => string)): Formatter;
}
`;
