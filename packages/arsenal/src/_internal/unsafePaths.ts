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
