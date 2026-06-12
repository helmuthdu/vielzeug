import { similarity } from '../string/similarity';
import { isNil } from '../typed/isNil';
import { isNumber } from '../typed/isNumber';
import { isString } from '../typed/isString';

export type ScoredResult<T> = { item: T; score: number };

export type SearchOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>;
  mode?: 'filter' | 'scored';
  threshold?: number;
};

const MAX_SEEK_DEPTH = 10;

function seekValue(item: unknown, query: string, threshold: number, depth = 0): boolean {
  if (depth > MAX_SEEK_DEPTH) return false;

  if (isNil(item)) return false;

  if (isString(item) || isNumber(item)) return similarity(String(item), query) >= threshold;

  if (Array.isArray(item)) return (item as unknown[]).some((v) => seekValue(v, query, threshold, depth + 1));

  if (typeof item === 'object')
    return Object.values(item as Record<string, unknown>).some((v) =>
      isNil(v) ? false : seekValue(v, query, threshold, depth + 1),
    );

  return false;
}

function seekScore(item: unknown, query: string, depth = 0): number {
  if (depth > MAX_SEEK_DEPTH) return 0;

  if (isNil(item)) return 0;

  if (isString(item) || isNumber(item)) return similarity(String(item), query);

  if (Array.isArray(item))
    return (item as unknown[]).reduce<number>((max, v) => Math.max(max, seekScore(v, query, depth + 1)), 0);

  if (typeof item === 'object')
    return Object.values(item as Record<string, unknown>).reduce<number>(
      (max, v) => Math.max(max, seekScore(v, query, depth + 1)),
      0,
    );

  return 0;
}

/**
 * Performs a fuzzy search on an array of items using string similarity.
 * When `fields` is provided, only those keys are searched; otherwise all values are scanned.
 *
 * Use `mode: 'scored'` to return results with a similarity score sorted by relevance.
 *
 * @example
 * ```ts
 * const data = [{ name: 'John Doe', age: 25 }, { name: 'Jane Doe', age: 30 }];
 *
 * // Search all values
 * search(data, 'doe'); // [{ name: 'John Doe' }, { name: 'Jane Doe' }]
 *
 * // Search only specific fields
 * search(data, 'john', { fields: ['name'] });
 *
 * // Scored mode — results are sorted by relevance
 * search(data, 'john', { mode: 'scored' });
 * // [{ item: { name: 'John Doe', age: 25 }, score: 0.8 }, ...]
 * ```
 *
 * @param array - The array of items to search.
 * @param query - The string to search for.
 * @param [options.threshold=0.25] - Similarity threshold between 0 and 1. Higher = stricter match.
 * @param [options.fields] - Limit search to these object keys. Searches all values when omitted.
 * @param [options.mode='filter'] - 'filter' returns T[], 'scored' returns ScoredResult<T>[] sorted by score.
 *
 * @returns The filtered/scored array of items that match the search string.
 */
export function search<T>(array: T[], query: string, options: SearchOptions<T> & { mode: 'scored' }): ScoredResult<T>[];
export function search<T>(array: T[], query: string, options?: SearchOptions<T>): T[];
export function search<T>(array: T[], query: string, options: SearchOptions<T> = {}): T[] | ScoredResult<T>[] {
  const { fields, mode = 'filter', threshold = 0.25 } = options;

  if (mode === 'scored') {
    if (!query || !query.trim()) {
      return array.map((item) => ({ item, score: 1 }));
    }

    const searchTerm = query.trim().toLowerCase();

    const scored = array.map((item) => {
      const score =
        fields && fields.length > 0 && typeof item === 'object' && item !== null
          ? fields.reduce<number>(
              (max, field) => Math.max(max, seekScore((item as Record<string, unknown>)[field], searchTerm)),
              0,
            )
          : seekScore(item, searchTerm);

      return { item, score };
    });

    return scored.filter(({ score }) => score >= threshold).sort((a, b) => b.score - a.score);
  }

  if (!query) return [...array];

  const searchTerm = query.trim().toLowerCase();

  if (!searchTerm) return [...array];

  return array.filter((item) => {
    if (fields && fields.length > 0 && typeof item === 'object' && item !== null) {
      return fields.some((field) => seekValue((item as Record<string, unknown>)[field], searchTerm, threshold));
    }

    return seekValue(item, searchTerm, threshold);
  });
}
