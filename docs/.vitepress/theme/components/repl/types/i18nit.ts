export const i18nitTypes = `
declare module '@vielzeug/i18nit' {
  export type Locale = string;
  export type Vars = Record<string, unknown>;
  export type Unsubscribe = () => void;
  export type Messages = { [key: string]: string | Messages };
  export type Loader = (locale: Locale) => Promise<Messages>;

  export type FormatInput =
    | { kind: 'number'; value: number; options?: Intl.NumberFormatOptions }
    | { kind: 'currency'; value: number; currency: string; options?: Omit<Intl.NumberFormatOptions, 'currency' | 'style'> }
    | { kind: 'date'; value: Date | number; options?: Intl.DateTimeFormatOptions }
    | { kind: 'relative'; value: number; unit: Intl.RelativeTimeFormatUnit; options?: Intl.RelativeTimeFormatOptions }
    | { kind: 'list'; value: unknown[]; options?: { style?: 'long' | 'short' | 'narrow'; type?: 'and' | 'or' } };

  export type I18nOptions = {
    locale?: Locale;
    fallback?: Locale | Locale[];
    messages?: Record<string, Messages>;
    loaders?: Record<Locale, Loader>;
    onMissing?: (key: string, locale: Locale) => string;
    onDiagnostic?: (event: unknown) => void;
  };

  export type I18n = {
    readonly locale: Locale;
    readonly loadedLocales: Locale[];
    readonly loadableLocales: Locale[];
    t(key: string, vars?: Vars): string;
    tp(key: string, count: number, vars?: Vars): string;
    has(key: string): boolean;
    format(input: FormatInput): string;
    setLocale(locale: Locale): Promise<void>;
    preload(locale: Locale): Promise<void>;
    setCatalog(locale: Locale, messages: Messages): void;
    setLoader(locale: Locale, loader: Loader): void;
    subscribe(listener: (event: { locale: Locale; reason: 'locale-change' | 'catalog-update' | 'init' }) => void, immediate?: boolean): Unsubscribe;
    dispose(): void;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
  };

  export function createI18n(config?: I18nOptions): I18n;
  export function isLoaderError(event: unknown): boolean;
  export function isSubscriberError(event: unknown): boolean;
}
`;
