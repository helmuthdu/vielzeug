/**
 * Compares two values for shallow equality.
 *
 * - Primitives are compared with `Object.is`.
 * - Arrays are compared element-by-element with `Object.is` (one level deep).
 * - Objects are compared key-by-key with `Object.is` on each value (one level deep).
 * - Different types (e.g. array vs object) return `false`.
 *
 * For recursive deep equality, use `isEqual`.
 *
 * @example
 * ```ts
 * const inner = { x: 1 };
 * shallowEqual({ a: inner }, { a: inner }); // true  — same reference
 * shallowEqual({ a: { x: 1 } }, { a: { x: 1 } }); // false — different refs
 * shallowEqual([1, 2, 3], [1, 2, 3]); // true
 * shallowEqual(1, 1); // true
 * ```
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if the values are shallowly equal.
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);

  if (isArrayA !== isArrayB) return false;

  if (isArrayA && isArrayB) {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }

    return true;
  }

  const aKeys = Object.keys(a as Record<string, unknown>);
  const bObj = b as Record<string, unknown>;
  const aObj = a as Record<string, unknown>;

  if (aKeys.length !== Object.keys(bObj).length) return false;

  for (const key of aKeys) {
    if (!Object.hasOwn(bObj, key) || !Object.is(aObj[key], bObj[key])) return false;
  }

  return true;
}
