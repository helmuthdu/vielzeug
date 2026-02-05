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
export function isEqual(a: unknown, b: unknown): boolean {
  return safeIsEqual(a, b, new WeakMap());
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: -
function safeIsEqual(a: unknown, b: unknown, visited: WeakMap<object, object>): boolean {
  // Check for strict equality (handles primitives and references)
  if (a === b) return true;

  // If either is null or not an object, they're not equal
  if (a == null || b == null || typeof a !== typeof b || typeof a !== 'object' || typeof b !== 'object') return false;

  // Check for circular references
  // We only track 'a' because if 'a' is cyclical, 'b' must also be cyclic to be equal
  if (visited.has(a as object)) {
    return visited.get(a as object) === b;
  }
  visited.set(a as object, b as object);

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let idx = 0; idx < a.length; idx++) {
      if (!safeIsEqual(a[idx], b[idx], visited)) return false;
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
    if (
      !Object.hasOwn(b, key) ||
      !safeIsEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], visited)
    )
      return false;
  }

  return true;
}

export const IS_EQUAL_ERROR_MSG = 'Expected two values to be equal';
