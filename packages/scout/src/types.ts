/**
 * A single field to include in the index.
 * Pass a string key for default options, or an object to set weight and stringify.
 *
 * @example
 * ```ts
 * // Simple — index field 'name' with default weight 1
 * createIndex(users, { fields: ['name'] });
 *
 * // Weighted — 'name' ranks higher than 'bio'
 * createIndex(users, { fields: [{ field: 'name', weight: 2 }, { field: 'bio' }] });
 * ```
 */
export type FieldDef<T> =
  | (keyof T & string)
  | {
      field: keyof T & string;
      /**
       * Custom stringifier for non-string field values.
       * Defaults to `String(value)` for numbers and booleans, empty string otherwise.
       */
      stringify?: (value: unknown) => string;
      /** Finite relative ranking weight greater than `0` (default `1`). Invalid values throw `ScoutConfigurationError`. */
      weight?: number;
    };

/**
 * Shared search-tuning knobs used by `createIndex()` and `search()`.
 */
export type SearchConstraints = {
  /** Finite non-negative integer maximum results returned. Default: `50`. Invalid values throw `ScoutConfigurationError`. */
  limit?: number;
  /**
   * Finite positive integer minimum query length (in characters) before trigram scoring is used.
   * Queries shorter than this value fall back to O(n) substring containment scan.
   * Default: `3`. Increase for large corpora where short queries are too broad;
   * decrease (e.g. `1`) for small corpora or when single-character matching is expected.
   */
  minQueryLength?: number;
  /**
   * Finite minimum overlap-coefficient score in `[0, 1]` for a candidate to appear in results. Default: `0.2`.
   * Higher values require a closer match; lower values are more permissive.
   */
  threshold?: number;
};

/** Options accepted by `createIndex()`. */
export type ScoutIndexOptions<T> = SearchConstraints & {
  /** Fields to index. At least one field is required. */
  fields: ReadonlyArray<FieldDef<T>>;
};

export type CreateSearchOptions = SearchConstraints & { debounce?: number };

export type SearchSnapshot<T> = Readonly<{
  isSearching: boolean;
  query: string;
  results: ReadonlyArray<SearchResult<T>>;
}>;

export type SearchSubscribeOptions = { readonly signal?: AbortSignal };

export type ScoutEvent<T> =
  | { readonly snapshot: SearchSnapshot<T>; readonly type: 'state-change' }
  | { readonly type: 'dispose' };

export type SearchState<T> = {
  [Symbol.dispose](): void;
  clear(): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): SearchSnapshot<T>;
  setQuery(query: string): void;
  subscribe(listener: () => void, options?: SearchSubscribeOptions): () => void;
  tap(handler: (event: ScoutEvent<T>) => void, options?: SearchSubscribeOptions): () => void;
};

/**
 * Per-field literal normalized-token character ranges where the query was found (for highlighting).
 * A fuzzy trigram candidate can have no literal ranges.
 *
 * The generic parameter `F` is the union of valid field names from the index,
 * so `match.field` is constrained to the fields that were actually indexed.
 */
export type FieldMatch<F extends string = string> = {
  /** Field name this match belongs to. */
  field: F;
  /**
   * Matched character ranges `[start, end]` in the **original** (pre-lowercase) field value.
   * Pass these directly to `highlight()` or `highlightField()`.
   */
  ranges: [number, number][];
};

/** A single result from `ScoutIndex.search()`. */
export type SearchResult<T> = {
  /** The original item from the index. */
  item: T;
  /** Per-field literal normalized-token ranges for rendering highlighted snippets. Empty for empty or fuzzy-only queries. */
  matches: FieldMatch<keyof T & string>[];
  /**
   * Weighted overlap-coefficient score in `[0, 1]` — the fraction of the smaller trigram set
   * (almost always the query) found in the larger one. `1` when every trigram of the smaller
   * set is present in the larger set.
   * `1` when query is empty (all items returned with full score).
   */
  score: number;
};

/**
 * A text fragment produced by `highlight()` or `highlightField()`.
 * `text` is unescaped, original field content — see `highlight()`'s JSDoc before
 * rendering it as HTML.
 */
export type HighlightPart = {
  /** Whether this fragment overlapped a match range. */
  highlighted: boolean;
  /** Original text of this fragment. */
  text: string;
};
