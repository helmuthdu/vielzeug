import { ArsenalValidationError } from '../errors';
import { isNil } from '../guards/isNil';
import { isNumber } from '../guards/isNumber';
import { isString } from '../guards/isString';
import { similarity } from '../string/similarity';

export type ScoredResult<T> = { item: T; score: number };

export type FuzzyOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>;
  /**
   * Maximum recursive depth for full-tree scanning when `fields` is omitted. Values beyond
   * this depth are not searched. Must be a non-negative integer; silently clamped to
   * `HARD_MAX_SEEK_DEPTH` to bound worst-case recursion on untrusted, deeply-nested input.
   * Default: `10`.
   */
  maxDepth?: number;
  /** When `true`, applies Unicode NFKD normalization before comparison so accented characters match their base form (é ≈ e). Default: `false`. */
  normalize?: boolean;
  threshold?: number;
};

/** Default maximum recursive depth for full-tree scanning when `fields` is omitted and `maxDepth` isn't set. */
const DEFAULT_MAX_SEEK_DEPTH = 10;

/**
 * Hard ceiling for `maxDepth`, regardless of caller input — bounds worst-case recursion depth
 * (and therefore call-stack usage) even when `maxDepth` is attacker-influenced.
 */
const HARD_MAX_SEEK_DEPTH = 1000;

/** @security `maxDepth` may originate from untrusted input reaching a public API — validate and clamp. */
function resolveMaxDepth(maxDepth: number | undefined): number {
  if (maxDepth === undefined) return DEFAULT_MAX_SEEK_DEPTH;

  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new ArsenalValidationError(`fuzzy: maxDepth must be a non-negative integer, got ${maxDepth}`);
  }

  return Math.min(maxDepth, HARD_MAX_SEEK_DEPTH);
}

const normalizeStr = (s: string): string => s.normalize('NFKD').replace(/\p{M}/gu, '');

function seekScore(item: unknown, query: string, normalize: boolean, maxDepth: number, depth = 0): number {
  if (depth > maxDepth) return 0;

  if (isNil(item)) return 0;

  if (isString(item) || isNumber(item)) {
    const a = normalize ? normalizeStr(String(item)) : String(item);

    return similarity(a, query);
  }

  if (Array.isArray(item))
    return (item as unknown[]).reduce<number>(
      (max, v) => Math.max(max, seekScore(v, query, normalize, maxDepth, depth + 1)),
      0,
    );

  if (typeof item === 'object')
    return Object.values(item as Record<string, unknown>).reduce<number>(
      (max, v) => Math.max(max, seekScore(v, query, normalize, maxDepth, depth + 1)),
      0,
    );

  return 0;
}

function seekValue(item: unknown, query: string, threshold: number, normalize: boolean, maxDepth: number): boolean {
  return seekScore(item, query, normalize, maxDepth) >= threshold;
}

/**
 * Performs a fuzzy filter on an array of items using string similarity.
 * Returns items whose similarity to `query` meets `threshold`.
 * When `fields` is provided, only those keys are searched; otherwise all values are scanned.
 *
 * For results sorted by relevance score, use `fuzzyScore`.
 *
 * @example
 * ```ts
 * const data = [{ name: 'John Doe', age: 25 }, { name: 'Jane Doe', age: 30 }];
 *
 * fuzzyFilter(data, 'doe'); // [{ name: 'John Doe' }, { name: 'Jane Doe' }]
 * fuzzyFilter(data, 'john', { fields: ['name'] });
 * ```
 *
 * @param array - The array of items to filter.
 * @param query - The string to search for.
 * @param [options.threshold=0.25] - Similarity threshold between 0 and 1. Higher = stricter.
 * @param [options.fields] - Limit search to these object keys. Searches all values when omitted.
 * @param [options.normalize=false] - NFKD normalization so accented chars match base form (é ≈ e).
 * @param [options.maxDepth=10] - Maximum recursive depth when scanning nested values (ignored when `fields` is set).
 * @throws {ArsenalValidationError} If `maxDepth` is provided and is not a non-negative integer.
 */
export function fuzzyFilter<T>(array: T[], query: string, options: FuzzyOptions<T> = {}): T[] {
  const { fields, normalize = false, threshold = 0.25 } = options;
  const maxDepth = resolveMaxDepth(options.maxDepth);

  if (!query) return [...array];

  const raw = query.trim().toLowerCase();

  if (!raw) return [...array];

  const searchTerm = normalize ? normalizeStr(raw) : raw;

  return array.filter((item) => {
    if (fields && fields.length > 0 && typeof item === 'object' && item !== null) {
      return fields.some((field) =>
        seekValue((item as Record<string, unknown>)[field], searchTerm, threshold, normalize, maxDepth),
      );
    }

    return seekValue(item, searchTerm, threshold, normalize, maxDepth);
  });
}

/**
 * Performs a fuzzy score on an array of items using string similarity.
 * Returns all items with their similarity score, filtered by `threshold`, sorted by score descending.
 * When `query` is empty, all items are returned with score `1`.
 *
 * For a simple filtered list without scores, use `fuzzyFilter`.
 *
 * @example
 * ```ts
 * const data = [{ name: 'John Doe', age: 25 }, { name: 'Jane Doe', age: 30 }];
 *
 * fuzzyScore(data, 'john', { fields: ['name'] });
 * // [{ item: { name: 'John Doe', age: 25 }, score: 0.8 }, ...]
 * ```
 *
 * @param array - The array of items to score.
 * @param query - The string to search for.
 * @param [options.threshold=0.25] - Minimum score to include in results.
 * @param [options.fields] - Limit scoring to these object keys. Scores all values when omitted.
 * @param [options.normalize=false] - NFKD normalization so accented chars match base form (é ≈ e).
 * @param [options.maxDepth=10] - Maximum recursive depth when scanning nested values (ignored when `fields` is set).
 * @throws {ArsenalValidationError} If `maxDepth` is provided and is not a non-negative integer.
 */
export function fuzzyScore<T>(array: T[], query: string, options: FuzzyOptions<T> = {}): ScoredResult<T>[] {
  const { fields, normalize = false, threshold = 0.25 } = options;
  const maxDepth = resolveMaxDepth(options.maxDepth);

  if (!query || !query.trim()) {
    return array.map((item) => ({ item, score: 1 }));
  }

  const raw = query.trim().toLowerCase();
  const searchTerm = normalize ? normalizeStr(raw) : raw;

  const scored = array.map((item) => {
    const score =
      fields && fields.length > 0 && typeof item === 'object' && item !== null
        ? fields.reduce<number>(
            (max, field) =>
              Math.max(max, seekScore((item as Record<string, unknown>)[field], searchTerm, normalize, maxDepth)),
            0,
          )
        : seekScore(item, searchTerm, normalize, maxDepth);

    return { item, score };
  });

  return scored.filter(({ score }) => score >= threshold).sort((a, b) => b.score - a.score);
}

/**
 * Fuzzy-searches an array. In filter mode (default) returns `T[]`.
 * Pass `{ scored: true }` to return `ScoredResult<T>[]` sorted by relevance descending.
 *
 * @example
 * ```ts
 * const users = [{ name: 'Alice' }, { name: 'Bob' }];
 *
 * fuzzy(users, 'ali');                        // [{ name: 'Alice' }]
 * fuzzy(users, 'ali', { scored: true });       // [{ item: { name: 'Alice' }, score: 0.9 }]
 * fuzzy(users, 'ali', { fields: ['name'] });   // field-restricted
 * ```
 */
export function fuzzy<T>(array: T[], query: string, options: FuzzyOptions<T> & { scored: true }): ScoredResult<T>[];
export function fuzzy<T>(array: T[], query: string, options?: FuzzyOptions<T> & { scored?: false }): T[];
export function fuzzy<T>(
  array: T[],
  query: string,
  options: FuzzyOptions<T> & { scored?: boolean } = {},
): T[] | ScoredResult<T>[] {
  const { scored, ...rest } = options;

  return scored ? fuzzyScore(array, query, rest) : fuzzyFilter(array, query, rest);
}
