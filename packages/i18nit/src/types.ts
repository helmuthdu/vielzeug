import type { Formatter } from './format';

export type Locale = string;
export type Unsubscribe = () => void;

export interface Messages {
  [key: string]: string | Messages;
}
export type TranslateVars = Record<string, unknown>;

export type Loader<M extends Messages = Messages> = () => Promise<M>;

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

export type ScopedI18n = {
  has(key: string): boolean;
  t(key: string, vars?: TranslateVars): string;
  tp(key: string, count: number, options?: PluralTranslateOptions): string;
};

// ─── Key inference ────────────────────────────────────────────────────────────
// Depth tuple prevents infinite recursion on recursive `Messages` type.
type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7];

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
  /** Locale registry. Values can be static message objects or async loaders. */
  catalogs?: Record<Locale, LocaleSource<M>>;
  /** Locale(s) to search when the active locale is missing a key. Subtags are expanded automatically (e.g. `en-US` → `en`). */
  fallback?: Locale | Locale[];
  /** Initial active locale. Defaults to `"en"`. Canonicalized via `Intl.getCanonicalLocales`. */
  locale?: Locale;
  /**
   * Called when a key or interpolation variable is missing.
   * Defaults: missing key → returns the key string; missing var → returns `{varName}`.
   *
   * @security The default handler returns `info.key` verbatim. Do not render the return
   * value as HTML if translation keys are constructed from untrusted user input.
   */
  onMissing?: (info: MissingInfo) => string;
  /** Called when a subscriber callback throws. Defaults to a no-op. */
  onSubscriberError?: (error: unknown) => void;
};

// ─── Public interface ─────────────────────────────────────────────────────────
export type I18n<M extends Messages = Messages> = {
  /** Intl formatter bound to this instance's locale. Follows locale changes automatically. */
  readonly fmt: Formatter;
  /** Snapshot version starts at 0 and increments by 1 per observable change. */
  getSnapshot(): I18nSnapshot;
  getSupportedLocales(options?: SupportedLocalesOptions): Locale[];
  /** Check if a key exists. Accepts literal keys from M, or any dynamic string. */
  has(key: MessageLeafKeys<M> | AnyKey): boolean;
  readonly locale: Locale;
  preload(locale: Locale): Promise<void>;
  register(locale: Locale, source: LocaleSource<M>): void;
  /**
   * Returns a scoped translator. All `t()` and `tp()` calls on the returned object are
   * automatically prefixed with `${prefix}.`, reducing repetition within a message namespace.
   *
   * @example
   * const nav = i18n.scope('nav');
   * nav.t('home');        // i18n.t('nav.home')
   * nav.tp('items', 3);  // i18n.tp('nav.items', 3)
   */
  scope(prefix: MessageBranchKeys<M> | AnyKey): ScopedI18n;
  setLocale(locale: Locale): Promise<void>;
  /**
   * Subscribes to locale/catalog changes.
   * - Default: callback runs only on changes.
   * - `{ immediate: true }`: callback runs immediately with current snapshot and on every change.
   */
  subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
  /**
   * Get a translation. Accepts literal keys from M, or any dynamic string.
   *
   * @security Returns a raw, unsanitized string. If catalog content originates from an
   * untrusted source (user-generated content, external CMS), sanitize before inserting
   * into the DOM via `innerHTML`. Rendering via `.textContent` is always safe.
   */
  t(key: MessageLeafKeys<M> | AnyKey, vars?: TranslateVars): string;
  /**
   * Get a pluralized translation from a branch key.
   *
   * For cardinal plurals, `count=0` always checks `${key}.zero` before falling back to the
   * CLDR-selected plural form (e.g. `.other`). This lets any locale define an explicit zero
   * message regardless of whether its CLDR rules include a `zero` category.
   *
   * Ordinal plurals follow CLDR exclusively (no `.zero` override).
   *
   * @security Returns a raw, unsanitized string — see `t()` for guidance on safe rendering.
   */
  tp(key: MessageBranchKeys<M> | AnyKey, count: number, options?: PluralTranslateOptions): string;
};
