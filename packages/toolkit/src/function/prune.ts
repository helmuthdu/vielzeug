import { isArray } from '../typed/isArray';
import { isEmpty } from '../typed/isEmpty';
import { isNil } from '../typed/isNil';
import { isObject } from '../typed/isObject';
import { isString } from '../typed/isString';

/**
 * Removes all nullable and empty values from strings, arrays, or objects.
 *
 * - For strings: Removes leading/trailing whitespace and returns undefined if empty
 * - For arrays: Recursively removes null, undefined, empty strings, and empty objects/arrays
 * - For objects: Recursively removes properties with null, undefined, empty strings, and empty objects/arrays
 *
 * @example
 * ```ts
 * prune('  hello  '); // 'hello'
 * prune('   '); // undefined
 * prune([1, null, '', 2, undefined, 3]); // [1, 2, 3]
 * prune({ a: 1, b: null, c: '', d: 2 }); // { a: 1, d: 2 }
 * prune({ a: { b: null, c: '' }, d: 1 }); // { d: 1 }
 * ```
 *
 * @param value - The value to prune (can be string, array, object, or any other type)
 * @returns The pruned value, or undefined if the result would be empty
 */
export function prune<T>(value: T): T | undefined {
  // Handle null/undefined
  if (isNil(value)) {
    return undefined;
  }

  // Handle strings
  if (isString(value)) {
    const trimmed = value.trim();
    return (trimmed === '' ? undefined : trimmed) as T | undefined;
  }

  // Handle arrays
  if (isArray(value)) {
    const cleaned = value.map((item) => prune(item)).filter((item) => !isEmpty(item));

    return (cleaned.length === 0 ? undefined : cleaned) as T | undefined;
  }

  // Handle objects
  if (isObject(value)) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      const cleanedValue = prune(val);

      // Skip nil, empty strings, and empty arrays/objects
      if (!isEmpty(cleanedValue)) {
        cleaned[key] = cleanedValue;
      }
    }

    return (Object.keys(cleaned).length === 0 ? undefined : cleaned) as T | undefined;
  }

  // For other types (numbers, booleans, etc.), return as-is
  return value;
}
