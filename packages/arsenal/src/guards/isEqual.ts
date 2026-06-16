/**
 * Recursively compares two values for deep equality.
 * Supports plain objects, arrays, `Date`, `Map`, `Set`, `RegExp`, and circular references.
 *
 * For one-level-deep reference equality, use `shallowEqual` instead.
 *
 * @example
 * ```ts
 * isEqual([1, 2, 3], [1, 2, 3]); // true
 * isEqual({ a: { b: 2 } }, { a: { b: 2 } }); // true
 * isEqual(new Date('2023-01-01'), new Date('2023-01-01')); // true
 * isEqual(new Map([['k', 1]]), new Map([['k', 1]])); // true
 * ```
 *
 * @param a - First value to compare.
 * @param b - Second value to compare.
 * @returns `true` if the values are deeply equal.
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return safeIsEqual(a, b, new WeakMap());
}

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
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

    return a.every((item, idx) => safeIsEqual(item, b[idx], visited));
  }

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Map comparison
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;

    for (const [k, v] of a) {
      if (!b.has(k) || !safeIsEqual(v, b.get(k), visited)) return false;
    }

    return true;
  }

  // Set comparison — fast path for primitive values, deep for objects
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;

    const bItems = [...b];

    for (const v of a) {
      // O(1) path for primitives — avoid the O(n) .some() scan
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null || v === undefined) {
        if (!b.has(v)) return false;
      } else if (!bItems.some((bv) => safeIsEqual(v, bv, visited))) {
        return false;
      }
    }

    return true;
  }

  // RegExp comparison
  if (a instanceof RegExp || b instanceof RegExp) {
    return a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags;
  }

  // Cross-type guards: Map/Set vs plain objects are never equal
  if (a instanceof Map || b instanceof Map) return false;

  if (a instanceof Set || b instanceof Set) return false;

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
