import { isUnsafeKey } from '../_common/unsafePaths';

/**
 * Inverts key-value pairs, so each value becomes a key and each key becomes its value.
 * Entries whose value is a dangerous key (`__proto__`, `constructor`, `prototype`) are skipped
 * to avoid prototype pollution. If multiple keys share the same value, the last one wins.
 *
 * @example
 * ```ts
 * invert({ a: 'x', b: 'y' }); // { x: 'a', y: 'b' }
 * ```
 *
 * @param obj - The source object. Values must be valid property keys (string, number, or symbol).
 * @returns A new object with keys and values swapped.
 */
export function invert<T extends Record<PropertyKey, PropertyKey>>(obj: T): Record<T[keyof T], keyof T> {
  const out = {} as Record<T[keyof T], keyof T>;

  for (const [key, value] of Object.entries(obj) as Array<[keyof T, T[keyof T]]>) {
    if (isUnsafeKey(value)) continue;

    out[value] = key;
  }

  return out;
}
