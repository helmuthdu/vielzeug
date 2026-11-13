/**
 * A single field to include in the index.
 * Pass a string key for default options, or an object to set weight and stringify.
 *
 * @example
 * ```ts
 * // Simple: index field 'name' with default weight 1
 * createIndex(users, { fields: ['name'] });
 *
 * // Weighted: 'name' ranks higher than 'bio'
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
      /** Finite relative ranking weight greater than `0` (default `1`). Invalid values throw `ScoutConfigError`. */
      weight?: number;
    };

/**
 * Shared search-tuning knobs used by `createIndex()` and `search()`.
 */
export type SearchConstraints = {
  /** Finite non-negative integer maximum results returned. Default: `50`. Invalid values throw `ScoutConfigError`. */
  limit?: number;
  /**
   * Finite positive integer minimum query length (in characters) before trigram scoring is used.
   * Queries shorter than this value fall back to O(n) substring containment scan.
   * Default: `3`. Increase for large corpora where short queries are too broad;
   * decrease (e.g. `1`) for small corpora or when single-character matching is expected.
   */
  minQueryLength?: number;
  /**
   * Finite minimum query-coverage score in `[0, 1]` for a candidate to appear in results. Default: `0.2`.
   * Coverage is the fraction of the query's trigrams found in a field, so higher values require a
   * closer match and lower values are more permissive.
   */
  threshold?: number;
};

/** Options accepted by `createIndex()`. */
export type ScoutIndexOptions<T> = SearchConstraints & {
  /** Fields to index. At least one field is required. */
  fields: ReadonlyArray<FieldDef<T>>;
  /**
   * Stable identity for items, used by `add()`, `remove()`, `reindex()`, and `setItems()` to
   * recognize items across object generations. Essential for immutable data: with a key,
   * `setItems()` given fresh copies of unchanged items performs no re-index and fires no
   * notification, and `remove()`/`reindex()` accept any object carrying the same key.
   * Must be consistent and referentially stable for a given logical item. Two different items
   * sharing one key (at construction or in one `setItems()` batch) throw `ScoutConfigError`.
   *
   * @default (item) => item
   */
  key?: (item: T) => unknown;
};

export type CreateSearchOptions = SearchConstraints & { debounce?: number };

export type SearchSnapshot<T> = Readonly<{
  isSearching: boolean;
  query: string;
  results: ReadonlyArray<SearchResult<T>>;
}>;

export type SearchSubscribeOptions = { readonly signal?: AbortSignal };

export type SearchState<T> = {
  [Symbol.dispose](): void;
  clear(): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  getSnapshot(): SearchSnapshot<T>;
  setQuery(query: string): void;
  subscribe(listener: () => void, options?: SearchSubscribeOptions): () => void;
};

/**
 * Per-field literal match ranges where the query was found (for highlighting).
 * A fuzzy trigram candidate can have no literal ranges.
 *
 * The generic parameter `F` is the union of valid field names from the index,
 * so `match.field` is constrained to the fields that were actually indexed.
 */
export type FieldMatch<F extends string = string> = {
  /** Field name this match belongs to. */
  field: F;
  /**
   * Matched `[start, end)` positions in the **original** field value: literal matches are
   * found in the normalized text and mapped back through the normalization offset map.
   * Pass these directly to `highlight()` or `highlightField()`.
   */
  ranges: [number, number][];
};

/** A single result from `ScoutIndex.search()`. */
export type SearchResult<T> = {
  /** The original item from the index. */
  item: T;
  /** Per-field literal match ranges in the original field values, for rendering highlighted snippets. Empty for empty or fuzzy-only queries. */
  matches: FieldMatch<keyof T & string>[];
  /**
   * Weighted query-coverage score in `[0, 1]`: the fraction of the query's trigrams found in the
   * best-matching field (or the whole record joined as one text), scaled by that field's relative
   * weight. `1` when every query trigram is present in a maximum-weight field.
   * `1` when query is empty (all items returned with full score).
   */
  score: number;
};

/**
 * A text fragment produced by `highlight()` or `highlightField()`.
 * `text` is unescaped, original field content: see `highlight()`'s JSDoc before
 * rendering it as HTML.
 */
export type HighlightPart = {
  /** Whether this fragment overlapped a match range. */
  highlighted: boolean;
  /** Original text of this fragment. */
  text: string;
};
