/**
 * Path segments that must be rejected in any dot-notation traversal or mutation
 * to prevent prototype pollution reads and writes.
 * @internal
 */
export const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Returns `true` if every dot-notation segment in `key` is safe to use as a
 * plain-object property.
 *
 * @example
 * ```ts
 * isSafePath('user.name')           // true
 * isSafePath('__proto__.polluted')  // false
 * ```
 */
export function isSafePath(key: string): boolean {
  return key.split('.').every((s) => !UNSAFE_PATH_SEGMENTS.has(s));
}

/**
 * Returns `true` if `key` is one of the dangerous own-property names that can be used to
 * pollute `Object.prototype` (`__proto__`, `constructor`, `prototype`). Use this for plain
 * (non-dotted) property keys — e.g. object keys being copied or reassigned. For dotted paths,
 * use `isSafePath` instead.
 *
 * @example
 * ```ts
 * isUnsafeKey('name')        // false
 * isUnsafeKey('__proto__')   // true
 * ```
 */
export function isUnsafeKey(key: PropertyKey): boolean {
  return typeof key === 'string' && UNSAFE_PATH_SEGMENTS.has(key);
}
