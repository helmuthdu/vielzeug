export type Locale = string;
export type Unsubscribe = () => void;

export interface Messages {
  [key: string]: string | Messages;
}
export type TranslateVars = Record<string, unknown>;

export type Loader<M extends Messages = Messages> = (locale: Locale) => Promise<M>;

export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

export type PluralTranslateOptions = {
  ordinal?: boolean;
  vars?: TranslateVars;
};

export type SupportedLocalesOptions = {
  sorted?: boolean;
};

export type MissingInfo =
  | { key: string; locale: Locale; type: 'key' }
  | { key: string; locale: Locale; type: 'var'; varName: string };

export type I18nSnapshot = {
  readonly locale: Locale;
  readonly version: number;
};

export type AnyKey = string & {};

export type SubscribeOptions = {
  immediate?: boolean;
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
/**
 * Configuration for i18n instances.
 * When `M` is not explicitly provided, it defaults to the broad `Messages` type,
 * allowing heterogeneous catalogs. When `M` is explicit, strict type checking applies.
 */
export type I18nOptions<M extends Messages = Messages> = {
  /** Locale registry. Values can be static messages or async loaders. */
  catalogs?: Record<Locale, LocaleSource<M>>;
  fallback?: Locale | Locale[];
  locale?: Locale;
  onMissing?: (info: MissingInfo) => string;
  onSubscriberError?: (error: unknown) => void;
};

// ─── Public interface ─────────────────────────────────────────────────────────
export type I18n<M extends Messages = Messages> = {
  /** Snapshot version starts at 0 and increments by 1 per observable change. */
  getSnapshot(): I18nSnapshot;
  getSupportedLocales(options?: SupportedLocalesOptions): Locale[];
  /** Check if a key exists. Accepts literal keys from M, or any dynamic string. */
  has(key: MessageLeafKeys<M> | AnyKey): boolean;
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  register(locale: Locale, source: LocaleSource<M>): void;
  setLocale(locale: Locale): Promise<void>;
  /**
   * Subscribes to locale/catalog changes.
   * - Default: callback runs only on changes.
   * - `{ immediate: true }`: callback runs immediately with current snapshot and on every change.
   */
  subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
  /** Get a translation. Accepts literal keys from M, or any dynamic string. */
  t(key: MessageLeafKeys<M> | AnyKey, vars?: TranslateVars): string;
  /** Get a pluralized translation from branch keys. */
  tp(key: MessageBranchKeys<M> | AnyKey, count: number, options?: PluralTranslateOptions): string;
};
