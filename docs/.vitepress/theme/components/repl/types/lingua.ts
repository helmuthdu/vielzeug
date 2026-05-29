export const linguaTypes = `
declare module '/lingua' {
  export type Locale = string;
  export type Unsubscribe = () => void;
  export type TranslateVars = Record<string, unknown>;

  export interface Messages {
    [key: string]: string | Messages;
  }

  export type Loader<M extends Messages = Messages> = (locale: Locale) => Promise<M>;
  export type LocaleSource<M extends Messages = Messages> = M | Loader<M>;

  export type LeafTranslateOptions = {
    vars?: TranslateVars;
  };

  export type BranchTranslateOptions = {
    count: number;
    ordinal?: boolean;
    vars?: TranslateVars;
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

  type Depth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8];

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

  export type I18nOptions<M extends Messages = Messages> = {
    catalogs?: Record<Locale, LocaleSource<M>>;
    fallback?: Locale | Locale[];
    locale?: Locale;
    onMissing?: (info: MissingInfo) => string;
  };

  export type I18n<M extends Messages = Messages> = {
    getSnapshot(): I18nSnapshot;
    getSupportedLocales(): Locale[];
    has(key: MessageLeafKeys<M> | AnyKey): boolean;
    readonly locale: Locale;
    preload(locale: Locale): Promise<void>;
    register(locale: Locale, source: LocaleSource<M>): void;
    setLocale(locale: Locale): Promise<void>;
    subscribe(callback: (snapshot: I18nSnapshot) => void, options?: SubscribeOptions): Unsubscribe;
    t(key: MessageLeafKeys<M> | AnyKey, options?: LeafTranslateOptions): string;
    t(key: MessageBranchKeys<M> | AnyKey, options: BranchTranslateOptions): string;
  };

  export function createI18n<M extends Messages>(config: I18nOptions<M>): I18n<M>;
  export function createI18n(
    config?: Omit<I18nOptions<Messages>, 'catalogs'> & { catalogs?: Record<Locale, LocaleSource<Messages>> },
  ): I18n<Messages>;
}
`;
