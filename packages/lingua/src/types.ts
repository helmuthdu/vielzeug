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

export type ResourceLoader<C extends Catalog = Catalog> = () => Promise<C>;
export type ResourceSource<C extends Catalog = Catalog> = C | ResourceLoader<C>;
export type ResourceDefinition<C extends Catalog = Catalog> = Record<Locale, ResourceSource<C>>;
/** Resource declarations may contain static catalogs or lazy loaders. */
export type Resources<C extends Catalog = Catalog> = Record<string, ResourceDefinition<C>>;
/** Resolved catalog payload used for SSR serialization and hydration. */
export type LoadedResources<C extends Catalog = Catalog> = Record<string, Record<Locale, C>>;

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

export type SubscribeOptions = {
  immediate?: boolean;
  signal?: AbortSignal;
};

export type I18nOptions<C extends Catalog = Catalog> = TranslatorOptions & {
  resources: Resources<C>;
};

export type I18nState<C extends Catalog = Catalog> = {
  readonly locale: Locale;
  readonly resources: LoadedResources<C>;
  readonly version: 2;
};
