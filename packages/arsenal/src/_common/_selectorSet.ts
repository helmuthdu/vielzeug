import type { Primitive } from '../types';

/**
 * Builds a `Set` of `selector(item)` results for O(1) membership checks — shared by
 * `intersection()` and `difference()`.
 *
 * Module-private: underscore-prefixed file is excluded from barrel exports.
 * @internal
 */
export function toSelectorSet<T>(items: readonly T[], selector: (item: T) => Primitive): Set<Primitive> {
  return new Set(items.map((item) => selector(item)));
}

/**
 * Returns `items` with duplicate `selector(item)` results removed, preserving the first
 * occurrence of each key — shared by `union()` and `uniq()`.
 *
 * Module-private: underscore-prefixed file is excluded from barrel exports.
 * @internal
 */
export function dedupeBySelector<T>(items: readonly T[], selector: (item: T) => Primitive): T[] {
  const seen = new Set<Primitive>();
  const out: T[] = [];

  for (const item of items) {
    const key = selector(item);

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}
