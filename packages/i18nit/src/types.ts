export type Locale = string;
export type Vars = Record<string, unknown>;
export type Unsubscribe = () => void;

export type Messages = { [key: string]: string | Messages };
export type Loader = (locale: Locale) => Promise<Messages>;

export type LocaleChangeReason = 'locale-change' | 'catalog-update' | 'init';
export type LocaleChangeEvent = { locale: Locale; reason: LocaleChangeReason };

export type DiagnosticEvent =
  | { error: unknown; kind: 'subscriber-error' }
  | { error: unknown; kind: 'loader-error'; locale: Locale };

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
    };

export type FormatKind = FormatInput['kind'];

export type I18nOptions = {
  fallback?: Locale | Locale[];
  loaders?: Record<Locale, Loader>;
  locale?: Locale;
  messages?: Record<string, Messages>;
  onDiagnostic?: (event: DiagnosticEvent) => void;
  onMissing?: (key: string, locale: Locale) => string;
};

export type I18n = {
  [Symbol.asyncDispose](): Promise<void>;
  [Symbol.dispose](): void;
  dispose(): void;
  format(input: FormatInput): string;
  has(key: string): boolean;
  readonly loadableLocales: Locale[];
  readonly loadedLocales: Locale[];
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  setCatalog(locale: Locale, messages: Messages): void;
  setLoader(locale: Locale, loader: Loader): void;
  setLocale(locale: Locale): Promise<void>;
  subscribe(listener: (event: LocaleChangeEvent) => void, immediate?: boolean): Unsubscribe;
  t(key: string, vars?: Vars): string;
  tp(key: string, count: number, vars?: Vars): string;
};
