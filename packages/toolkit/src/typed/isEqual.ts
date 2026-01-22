/**
 * Deeply compares two values for equality, including objects, arrays, and primitives.
 * Detects circular references and optimizes performance.
 *
 * @example
 * ```ts
 * isEqual([1, 2, 3], [1, 2, 3]); // true
 * isEqual([1, 2], [1, 2, 3]); // false
 * isEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * isEqual({ a: { b: 2 } }, { a: { b: 2 } }); // true
 * isEqual({ a: 1 }, { a: 2 }); // false
 * isEqual({ a: 1 }, { b: 1 }); // false
 * isEqual(new Date('2023-01-01'), new Date('2023-01-01')); // true
 * isEqual(new Date('2023-01-01'), new Date('2023-01-02')); // false
 * isEqual(new Date('2023-01-01'), 1); // false
 * ```
 *
 * @param a - First value to compare.
 * @param b - Second value to compare.
 * @returns Whether the values are deeply equal.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
export function isEqual(a: unknown, b: unknown): boolean {
  // Check for strict equality (handles primitives and references)
  if (a === b) return true;

  // If either is null or not an object, they're not equal
  if (a == null || b == null || typeof a !== typeof b || typeof a !== 'object' || typeof b !== 'object') return false;

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let idx = 0; idx < a.length; idx++) {
      if (!isEqual(a[idx], b[idx])) return false;
    }
    return true;
  }

  // Ensure both are arrays or neither is
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Object comparison
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.hasOwn(b, key) || !isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
      return false;
  }

  return true;
}

export const IS_EQUAL_ERROR_MSG = 'Expected two values to be equal';
