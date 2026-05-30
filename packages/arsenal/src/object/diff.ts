import type { Obj } from '../types';

import { isEqual } from '../typed/isEqual';
import { isObject } from '../typed/isObject';

/** Sentinel value returned by `diff` when a key exists in `prev` but not in `curr`. */
export const DELETED: unique symbol = Symbol('deleted');

export type DiffResult<T extends Obj> = { [K in keyof T]?: T[K] | typeof DELETED };

/**
 * Computes the difference between two objects.
 *
 * Keys present in `prev` but absent in `curr` are marked with the `DELETED` sentinel.
 *
 * @example
 * ```ts
 * import { diff, DELETED } from '@vielzeug/arsenal';
 *
 * diff({ a: 1, b: 2, c: 3 }, { a: 1, b: 2 }); // { c: DELETED }
 * diff({ a: 1, b: 2 }, { a: 1, b: 99 });       // { b: 99 }
 * ```
 *
 * @param before - The previous (original) object.
 * @param after - The current (updated) object.
 * @param [compareFn] - A custom function to compare values.
 * @returns An object containing new/modified/deleted properties.
 */
export function diff<T extends Obj>(
  before?: T,
  after?: T,
  compareFn: (a: unknown, b: unknown) => boolean = isEqual,
): DiffResult<T> {
  if (after == null && before == null) return {};

  const result: Record<string, unknown> = {};

  for (const key of new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])) {
    const _after = after?.[key];
    const _before = before?.[key];

    if (isObject(_after) && isObject(_before)) {
      const nestedDiff = diff(_before as Obj, _after as Obj, compareFn);

      if (Object.keys(nestedDiff).length > 0) {
        result[key] = nestedDiff;
      }
    } else if (!compareFn(_after, _before)) {
      const wasDeleted = before != null && key in before && (after == null || !(key in after));

      result[key] = wasDeleted ? DELETED : _after;
    }
  }

  return result as DiffResult<T>;
}

export type ArrayDiff<T> = {
  added: T[];
  removed: T[];
};

/**
 * Computes the set-difference between two arrays.
 * Items present in `after` but not `before` are `added`.
 * Items present in `before` but not `after` are `removed`.
 *
 * @example
 * ```ts
 * diffArrays([1, 2, 3], [2, 3, 4]); // { added: [4], removed: [1] }
 * diffArrays(
 *   [{ id: 1 }, { id: 2 }],
 *   [{ id: 2 }, { id: 3 }],
 *   (a, b) => a.id === b.id,
 * ); // { added: [{ id: 3 }], removed: [{ id: 1 }] }
 * ```
 *
 * @param before - The original array.
 * @param after - The updated array.
 * @param [compareFn] - Custom equality comparator. Defaults to deep equality.
 * @returns An object with `added` and `removed` arrays.
 */
export function diffArrays<T>(
  before: T[],
  after: T[],
  compareFn: (a: T, b: T) => boolean = (a, b) => isEqual(a, b),
): ArrayDiff<T> {
  return {
    added: after.filter((item) => !before.some((b) => compareFn(b, item))),
    removed: before.filter((item) => !after.some((a) => compareFn(item, a))),
  };
}
