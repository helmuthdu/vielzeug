import { WILDCARD } from './constants';

/**
 * Matches a rule pattern against a concrete value string.
 * Works for both resource patterns and action patterns (action hierarchy).
 *
 * Matching rules (evaluated in order):
 * 1. `WILDCARD` (`*`) matches any value string.
 * 2. An exact string matches itself.
 * 3. A colon-namespaced pattern ending in `:*` (e.g. `posts:*` or `read:*`)
 *    matches any string that starts with the given namespace prefix followed by `:`.
 *    Example: `posts:*` matches `posts:123`, `posts:draft:42`, etc.
 *             `read:*`  matches `read:own`, `read:all`, etc.
 *
 * @example
 * matchesPattern('*',        'posts:123')  // true  — global wildcard
 * matchesPattern('posts',    'posts')       // true  — exact
 * matchesPattern('posts:*',  'posts:123')  // true  — namespace wildcard
 * matchesPattern('posts:*',  'comments:1') // false — different namespace
 * matchesPattern('posts:42', 'posts:42')   // true  — exact namespaced id
 * matchesPattern('read:*',   'read:own')   // true  — action namespace wildcard
 * matchesPattern('read:*',   'write:all')  // false — different action namespace
 */
export function matchesPattern(pattern: string, value: string): boolean {
  if (pattern === WILDCARD) return true;

  if (pattern === value) return true;

  // Namespace wildcard: "namespace:*" matches "namespace:anything"
  if (pattern.endsWith(':*')) {
    const ns = pattern.slice(0, -1); // keep the trailing colon as prefix delimiter

    return value.startsWith(ns);
  }

  return false;
}

/**
 * Returns true if every concrete value that matches `narrow` also matches `broad`.
 * This is the coverage relation used for rule conflict detection.
 *
 * Pattern hierarchy (most to least permissive): `*` > `ns:*` > exact
 *
 * Unlike `matchesPattern(broad, narrow)` — which works accidentally — this
 * function explicitly documents and tests the coverage semantics so it remains
 * correct if new pattern syntax is added in the future.
 *
 * @example
 * patternCovers('*',       'posts:*')   // true  — * covers everything
 * patternCovers('posts:*', 'posts:123') // true  — namespace covers exact
 * patternCovers('posts:*', 'posts:*')  // true  — same pattern covers itself
 * patternCovers('posts:*', '*')         // false — namespace does not cover global wildcard
 * patternCovers('posts',   'posts:*')   // false — exact does not cover namespace
 */
export function patternCovers(broad: string, narrow: string): boolean {
  // Global wildcard covers everything
  if (broad === WILDCARD) return true;

  // Nothing else covers global wildcard
  if (narrow === WILDCARD) return false;

  // Namespace wildcard: covers any value starting with the same namespace prefix,
  // including nested namespace wildcards ("posts:*" covers "posts:sub:*") and exact IDs.
  if (broad.endsWith(':*')) {
    return narrow.startsWith(broad.slice(0, -1));
  }

  // Exact only covers itself
  return broad === narrow;
}
