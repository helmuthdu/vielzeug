import { similarity } from '../string/similarity';
import { isArray } from '../typed/isArray';
import { isNil } from '../typed/isNil';
import { isNumber } from '../typed/isNumber';
import { isObject } from '../typed/isObject';
import { isString } from '../typed/isString';

/**
 * Internal helper used by {@link search}.
 * Recursively checks if an object contains a value similar to the search string.
 *
 * @param item - The object to search within.
 * @param query - The search string (already lowercased by the caller).
 * @param tone - The similarity threshold (0, 1] — validated by the caller.
 *
 * @returns Whether the object contains a matching value.
 */
export function seek<T>(item: T, query: string, tone: number): boolean {
  if (isNil(item)) return false;

  if (isString(item) || isNumber(item)) {
    return similarity(String(item), query) >= tone;
  }

  if (isArray(item)) {
    return (item as unknown[]).some((value) => seek(value, query, tone));
  }

  if (isObject(item)) {
    return Object.values(item as Record<string, unknown>).some((value) =>
      isNil(value) ? false : seek(value, query, tone),
    );
  }

  return false;
}
