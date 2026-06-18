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
  export type NamespaceFactory<M extends Messages = Messages> = (locale: Locale) => Promise<M>;

  export type TpOptions = {
    ordinal?: boolean;
    vars?: TranslateVars;
  };

  export type SubscribeOptions = {
    immediate?: boolean;
    signal?: AbortSignal;
  };

  export type I18nSnapshot = {
    readonly locale: Locale;
  };

  export type I18nState = {
    readonly catalogs: Record<Locale, Record<string, string>>;
    readonly locale: Locale;
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
    readonly fmt: import('/lingua/format').Formatter;
    has(key: string): boolean;
    t(key: string, vars?: TranslateVars): string;
    tp(key: string, count: number, options?: TpOptions): string;
  };

  export type I18nOptions<M extends Messages = Messages> = {
    catalogs?: Record<Locale, LocaleSource<M>>;
    fallback?: Locale | Locale[];
    locale?: Locale;
    onMissingKey?: (key: string, locale: Locale) => string;
    onMissingVar?: (varName: string, key: string, locale: Locale) => string;
    onSubscriberError?: (error: unknown) => void;
  };

  export type I18n<M extends Messages = Messages> = {
    [Symbol.dispose](): void;
    readonly disposalSignal: AbortSignal;
    dispose(): void;
    readonly disposed: boolean;
    extend(ns: string, factory: NamespaceFactory<M>, locale?: Locale): Promise<void>;
    readonly fmt: import('/lingua/format').Formatter;
    fork(overrides?: Omit<I18nOptions<M>, 'catalogs'>): I18n<M>;
    getSnapshot(): I18nSnapshot;
    getSupportedLocales(sorted?: boolean): Locale[];
    has(key: MessageLeafKeys<M> | MessageBranchKeys<M> | AnyKey): boolean;
    isLoaded(locale: Locale): boolean;
    isRegistered(locale: Locale): boolean;
    readonly locale: Locale;
    preload(locale: Locale): Promise<void>;
    register(locale: Locale, source: LocaleSource<M>): void;
    scope(prefix: MessageBranchKeys<M> | AnyKey): ScopedI18n;
    setLocale(locale: Locale): Promise<void>;
    subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
    t(key: MessageLeafKeys<M> | AnyKey, vars?: TranslateVars): string;
    tp(key: MessageBranchKeys<M> | AnyKey, count: number, options?: TpOptions): string;
  };

  export type ErrorCode = string;

  export class LinguaError extends Error {
    readonly code: ErrorCode;
    readonly name: 'LinguaError';
    constructor(code: ErrorCode, message: string);
  }

  export const E: {
    readonly COUNT_IN_VARS: 'lingua/E003';
    readonly DISPOSED: 'lingua/E007';
    readonly INVALID_COUNT: 'lingua/E002';
    readonly INVALID_LOCALE: 'lingua/E004';
    readonly MISSING_LOCALE: 'lingua/E001';
    readonly NAMESPACE_MISSING: 'lingua/E005';
    readonly RESTORE_NO_LOCALE: 'lingua/E006';
  };

  export function createI18n<M extends Messages>(options: I18nOptions<M>): I18n<M>;
  export function createI18n(options?: I18nOptions<Messages>): I18n<Messages>;

  export function serializeI18n(i18n: I18n): I18nState;
  export function hydrateI18n(i18n: I18n, state: I18nState): void;
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
