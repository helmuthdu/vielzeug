/**
 * Returns `true` if `value` is an `Array`, with an optional item-type guard.
 *
 * @example
 * ```ts
 * isArray([1, 2, 3])          // true
 * isArray('hello')            // false
 * isArray([1, 2, 3], isNumber) // true  — all items pass isNumber
 * isArray([1, 'x'], isNumber)  // false — 'x' fails isNumber
 * ```
 *
 * @param value - The value to check.
 * @param itemGuard - Optional type guard applied to every element.
 */
export function isArray<T = unknown>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;

  if (itemGuard) return value.every(itemGuard);

  return true;
}
