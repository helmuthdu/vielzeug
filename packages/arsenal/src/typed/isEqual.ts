/**
 * Compares two values for equality.
 *
 * - `depth: 'deep'` (default) — recursive deep comparison. Supports plain objects, arrays,
 *   `Date`, `Map`, `Set`, and circular references.
 * - `depth: 'shallow'` — one-level-deep comparison. Nested objects are compared by reference.
 *
 * @example
 * ```ts
 * // Deep (default)
 * isEqual([1, 2, 3], [1, 2, 3]); // true
 * isEqual({ a: { b: 2 } }, { a: { b: 2 } }); // true
 * isEqual(new Date('2023-01-01'), new Date('2023-01-01')); // true
 *
 * // Shallow
 * const inner = { x: 1 };
 * isEqual({ a: inner }, { a: inner }, { depth: 'shallow' }); // true
 * isEqual({ a: { x: 1 } }, { a: { x: 1 } }, { depth: 'shallow' }); // false — different refs
 * isEqual([1, 2, 3], [1, 2, 3], { depth: 'shallow' }); // true
 * ```
 *
 * @param a - First value to compare.
 * @param b - Second value to compare.
 * @param options - Comparison options.
 * @returns Whether the values are equal.
 */
export function isEqual(a: unknown, b: unknown, options?: { depth?: 'deep' | 'shallow' }): boolean {
  return options?.depth === 'shallow' ? shallowCompare(a, b) : safeIsEqual(a, b, new WeakMap());
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

function shallowCompare(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;

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
    if (!Object.prototype.hasOwnProperty.call(bObj, key) || !Object.is(aObj[key], bObj[key])) return false;
  }

  return true;
}
