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
    : C extends PluralMessage
      ? never
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

// ─── Rich content ─────────────────────────────────────────────────────────────

/**
 * One renderable piece of a message produced by `parts()`, in render order.
 *
 * Text segments are never empty (the compiled template records no empty runs), and a value
 * used twice produces two value segments. A value is never stringified, escaped, or merged
 * with its neighbors: rich renderers map segments straight to framework nodes. `V` defaults
 * to `string`; pass your node type (`ReactNode`, vnodes, …) to keep values type-safe.
 */
export type Segment<V = string> =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'value'; readonly name: string; readonly value: V };

export type PartsOptions<V = string> = {
  values?: Record<string, V>;
};

export type PluralPartsOptions<V = string> = PartsOptions<V> & {
  count: number;
  ordinal?: boolean;
};

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

type CatalogLoader<C extends Catalog> = (locale: Locale) => Promise<C> | C;

export type I18nOptions<C extends Catalog = Catalog> = {
  readonly fallback?: Locale | readonly Locale[];
  readonly locale?: Locale;
  readonly missing?: MissingStrategy;
} & (
  | {
      readonly catalogs: Catalogs<C>;
      readonly loadCatalog?: CatalogLoader<C>;
    }
  | {
      readonly catalogs?: Catalogs<C>;
      readonly loadCatalog: CatalogLoader<C>;
    }
);

export type SubscribeOptions = {
  immediate?: boolean;
  signal?: AbortSignal;
};

/** Serialized loaded catalogs for SSR transfer. Hydrate by passing `catalogs` and `locale` to `createI18n`. */
export type SerializedI18n<C extends Catalog = Catalog> = {
  readonly catalogs: Catalogs<C>;
  readonly locale: Locale;
};
