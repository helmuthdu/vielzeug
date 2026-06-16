/**
 * Returns `true` if `value` is a plain object — one with `Object.prototype` or `null` as its
 * prototype. Class instances, `Map`, `Set`, `Array` and other built-ins all return `false`.
 *
 * @example
 * ```ts
 * isPlainObject({})          // true
 * isPlainObject({ a: 1 })    // true
 * isPlainObject(Object.create(null)) // true
 * isPlainObject(new Map())   // false
 * isPlainObject([])          // false
 * isPlainObject(null)        // false
 * ```
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') return false;

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
