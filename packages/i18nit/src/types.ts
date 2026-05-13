export type Locale = string;
export type Unsubscribe = () => void;

export interface Messages {
  [key: string]: string | Messages;
}
export type TranslateVars = Record<string, unknown>;
export type SubscribeOptions = { immediate?: boolean };

export type Loader<M extends Messages = Messages> = (locale: Locale) => Promise<M>;

export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

export type TranslateOptions = {
  count?: number;
  ordinal?: boolean;
  vars?: TranslateVars;
};

export type MissingInfo =
  | { key: string; locale: Locale; type: 'key' }
  | { key: string; locale: Locale; type: 'var'; varName: string };

export type I18nSnapshot = {
  locale: Locale;
  version: number;
};

// ─── Key inference ────────────────────────────────────────────────────────────
// Depth tuple prevents infinite recursion on recursive `Messages` type.
type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8];

export type MessageLeafKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
  ? never
  : T extends string
    ? P
    : T extends Record<string, unknown>
      ? { [K in string & keyof T]: MessageLeafKeys<T[K], P extends '' ? K : `${P}.${K}`, Depth[D]> }[string & keyof T]
      : never;

export type MessageBranchKeys<T, P extends string = '', D extends number = 7> = [D] extends [0]
  ? never
  : T extends Record<string, unknown>
    ? {
        [K in string & keyof T]: T[K] extends string
          ? never
          : (P extends '' ? K : `${P}.${K}`) | MessageBranchKeys<T[K], P extends '' ? K : `${P}.${K}`, Depth[D]>;
      }[string & keyof T]
    : never;

// ─── Config ───────────────────────────────────────────────────────────────────
export type I18nOptions<M extends Messages = Messages> = {
  /** Locale registry. Values can be static messages or async loaders. */
  catalogs?: Record<Locale, LocaleSource<M>>;
  fallback?: Locale | Locale[];
  locale?: Locale;
  onMissing?: (info: MissingInfo) => string;
};

// ─── Public interface ─────────────────────────────────────────────────────────
export type I18n<M extends Messages = Messages> = {
  getSnapshot(): I18nSnapshot;
  getSupportedLocales(options?: { sorted?: boolean }): Locale[];
  has(key: MessageLeafKeys<M> | MessageBranchKeys<M>): boolean;
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  register(locale: Locale, source: LocaleSource<M>): void;
  setLocale(locale: Locale): Promise<void>;
  /** Store-style subscription for framework adapters. */
  subscribe(listener: () => void, options?: SubscribeOptions): Unsubscribe;
  t(key: MessageLeafKeys<M> | MessageBranchKeys<M>, options?: TranslateOptions): string;
};
