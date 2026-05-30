import { similarity } from '../string/similarity';
import { isNil } from '../typed/isNil';
import { isNumber } from '../typed/isNumber';
import { isString } from '../typed/isString';

export type SearchOptions<T> = {
  fields?: ReadonlyArray<keyof T & string>;
  threshold?: number;
};

function seekValue(item: unknown, query: string, threshold: number): boolean {
  if (isNil(item)) return false;

  if (isString(item) || isNumber(item)) return similarity(String(item), query) >= threshold;

  if (Array.isArray(item)) return (item as unknown[]).some((v) => seekValue(v, query, threshold));

  if (typeof item === 'object')
    return Object.values(item as Record<string, unknown>).some((v) =>
      isNil(v) ? false : seekValue(v, query, threshold),
    );

  return false;
}

/**
 * Performs a fuzzy search on an array of items using string similarity.
 * When `fields` is provided, only those keys are searched; otherwise all values are scanned.
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
 * ```
 *
 * @param array - The array of items to search.
 * @param query - The string to search for.
 * @param [options.threshold=0.25] - Similarity threshold between 0 and 1. Higher = stricter match.
 * @param [options.fields] - Limit search to these object keys. Searches all values when omitted.
 *
 * @returns The filtered array of items that match the search string.
 */
export function search<T>(array: T[], query: string, options: SearchOptions<T> = {}): T[] {
  const { fields, threshold = 0.25 } = options;

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
