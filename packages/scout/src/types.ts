import type { Computed, Signal } from '@vielzeug/ripple';

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
      /** Relative ranking weight (default `1`). Higher promotes matches on this field. */
      weight?: number;
    };

/**
 * Shared search-tuning knobs used by `createIndex()`, `search()`, `createSearch()`,
 * and `createReactiveSearch()`.
 */
export type SearchConstraints = {
  /** Maximum results returned. Default: `50`. Negative values are clamped to `0`. */
  limit?: number;
  /**
   * Minimum query length (in characters) before trigram scoring is used.
   * Queries shorter than this value fall back to O(n) substring containment scan.
   * Default: `3`. Increase for large corpora where short queries are too broad;
   * decrease (e.g. `1`) for small corpora or when single-character matching is expected.
   */
  minQueryLength?: number;
  /**
   * Minimum Dice similarity score `[0, 1]` for a candidate to appear in results. Default: `0.2`.
   * Higher values require a closer match; lower values are more permissive.
   */
  threshold?: number;
};

/** Options accepted by `createIndex()`. */
export type ScoutIndexOptions<T> = SearchConstraints & {
  /** Fields to index. At least one field is required. */
  fields: ReadonlyArray<FieldDef<T>>;
};

/** Options accepted by `createSearch()` and `createReactiveSearch()`. */
export type CreateSearchOptions = SearchConstraints & {
  /**
   * Milliseconds to wait after a `query` change before updating `results`. Default: `200`.
   * Pass `0` for immediate synchronous updates (no `isSearching` flash).
   */
  debounce?: number;
};

/**
 * Per-field character ranges where the query was found (for highlighting).
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
  /** Per-field match ranges for rendering highlighted snippets. Empty when query is empty. */
  matches: FieldMatch<keyof T & string>[];
  /**
   * Weighted Dice similarity score in `[0, 1]`.
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

/**
 * Reactive search state returned by `createSearch()`.
 * Dispose when done to release all reactive subscriptions.
 */
export type SearchState<T> = {
  [Symbol.dispose](): void;
  /**
   * Resets `query` to `''` and cancels any pending debounce.
   * `results` and `isSearching` are updated synchronously.
   * @throws {ScoutDisposedError} If called after `dispose()`.
   */
  clear(): void;
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie other lifecycles to this search. */
  readonly disposalSignal: AbortSignal;
  /** Releases all reactive subscriptions created by this search state. */
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  /**
   * `true` during the debounce window — between when `query` changes and when `results` updates.
   * Always `false` when `debounce` is `0`.
   */
  readonly isSearching: Computed<boolean>;
  /**
   * Writable signal holding the current search query.
   * Set `.value` to trigger a (debounced) search.
   */
  readonly query: Signal<string>;
  /**
   * Read-only computed that holds the latest search results.
   * Updated after the debounce delay whenever `query` changes.
   */
  readonly results: Computed<SearchResult<T>[]>;
};
