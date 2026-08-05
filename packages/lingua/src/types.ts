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
export type CatalogLoader<C extends Catalog = Catalog> = () => Promise<C>;
export type CatalogSource<C extends Catalog = Catalog> = C | CatalogLoader<C>;
/** Locale declarations may contain static catalogs or lazy loaders. */
export type CatalogSources<C extends Catalog = Catalog> = Record<Locale, CatalogSource<C>>;
/** Resolved catalog payload used for SSR serialization and hydration. */
export type LoadedCatalogs<C extends Catalog = Catalog> = Catalogs<C>;

export type MessageKey<
  C,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends string | PluralMessage
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: MessageKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

export type TextKey<
  C,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends string
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: TextKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

export type PluralKey<
  C,
  Prefix extends string = '',
  Depth extends readonly unknown[] = readonly [1, 1, 1, 1, 1, 1],
> = Depth extends readonly [unknown, ...infer Rest]
  ? C extends PluralMessage
    ? Prefix
    : C extends Catalog
      ? {
          [K in string & keyof C]: PluralKey<C[K], Prefix extends '' ? K : `${Prefix}.${K}`, Rest>;
        }[string & keyof C]
      : never
  : never;

export type Values = Record<string, unknown>;

export type TranslateOptions = {
  values?: Values;
};

export type PluralOptions = TranslateOptions & {
  count: number;
  ordinal?: boolean;
};

export type TranslatorOptions = {
  fallback?: Locale | readonly Locale[];
  locale?: Locale;
  onMissingKey?: (key: string, locale: Locale) => string;
  onMissingValue?: (name: string, key: string, locale: Locale) => string;
};

/** Options for a translator built from one immutable locale catalog. */
export type CatalogTranslatorOptions = Omit<TranslatorOptions, 'fallback'>;

export type SubscribeOptions = {
  immediate?: boolean;
  signal?: AbortSignal;
};

export type TranslationStoreOptions<C extends Catalog = Catalog> = TranslatorOptions & {
  catalogs: CatalogSources<C>;
};

export type TranslationState<C extends Catalog = Catalog> = {
  readonly catalogs: LoadedCatalogs<C>;
  readonly locale: Locale;
  readonly version: 3;
};
