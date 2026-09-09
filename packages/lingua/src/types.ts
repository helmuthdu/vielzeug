export type Locale = string;

export type PluralCategory = Intl.LDMLPluralRule;

/** Explicit plural message. Grouping objects never have plural semantics. */
export type PluralMessage = {
  readonly plural: Partial<Record<PluralCategory, string>>;
};

export type CatalogNode = Catalog | PluralMessage | string;

export type Catalog = {
  readonly [key: string]: CatalogNode;
};

export type Catalogs<C extends Catalog = Catalog> = Record<Locale, C>;

/** Traverses a catalog type and collects dotted paths to nodes matching `Leaf`. */
type CatalogPaths<
  C,
  Leaf,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends Leaf
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: CatalogPaths<C[K], Leaf, Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

export type MessageKey<C> = CatalogPaths<C, string | PluralMessage>;
export type TextKey<C> = CatalogPaths<C, string>;
export type PluralKey<C> = CatalogPaths<C, PluralMessage>;

export type Values = Record<string, unknown>;

export type TranslateOptions = {
  values?: Values;
};

export type PluralOptions = TranslateOptions & {
  count: number;
  ordinal?: boolean;
};

// ─── Rich parts (discriminated union) ─────────────────────────────────────────

export type TextPart = { readonly type: 'text'; readonly value: string };

export type ValuePart<V> = { readonly type: 'value'; readonly value: V };

export type Part<V> = TextPart | ValuePart<V>;

// ─── Missing strategy ─────────────────────────────────────────────────────────

export type MissingInfo = {
  readonly key: string;
  readonly locale: Locale;
  readonly name?: string;
};

export type MissingHandler = (info: MissingInfo) => string;

export type MissingStrategy = 'throw' | 'key' | MissingHandler;

// ─── Options ──────────────────────────────────────────────────────────────────

export type TranslatorOptions = {
  readonly locale?: Locale;
  readonly missing?: MissingStrategy;
};

type I18nCommonOptions = {
  readonly fallback?: Locale | readonly Locale[];
  readonly locale?: Locale;
  readonly missing?: MissingStrategy;
};

type CatalogLoader<C extends Catalog> = (locale: Locale) => Promise<C> | C;

export type I18nOptions<C extends Catalog = Catalog> = I18nCommonOptions &
  (
    | {
        readonly catalogs: Catalogs<C>;
        readonly loadCatalog?: CatalogLoader<C>;
        readonly state?: never;
      }
    | {
        readonly catalogs?: never;
        readonly loadCatalog?: CatalogLoader<C>;
        readonly state: TranslationState<C>;
      }
    | {
        readonly catalogs?: never;
        readonly loadCatalog: CatalogLoader<C>;
        readonly state?: never;
      }
  );

export type SubscribeOptions = {
  immediate?: boolean;
  signal?: AbortSignal;
};

export type TranslationState<C extends Catalog = Catalog> = {
  readonly catalogs: Catalogs<C>;
  readonly locale: Locale;
  readonly version: 4;
};
