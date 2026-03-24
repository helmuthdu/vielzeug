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
 * import { diff, DELETED } from '@vielzeug/toolkit';
 *
 * diff({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 }); // { c: DELETED }
 * diff({ a: 1, b: 99 }, { a: 1, b: 2 });       // { b: 99 }
 * ```
 *
 * @param curr - The current object.
 * @param prev - The previous object.
 * @param [compareFn] - A custom function to compare values.
 * @returns An object containing new/modified/deleted properties.
 */
export function diff<T extends Obj>(
  curr?: T,
  prev?: T,
  compareFn: (a: unknown, b: unknown) => boolean = isEqual,
): DiffResult<T> {
  if (!curr && !prev) return {};

  const result: Record<string, unknown> = {};

  for (const key of new Set([...Object.keys(curr ?? {}), ...Object.keys(prev ?? {})])) {
    const _curr = curr?.[key];
    const _prev = prev?.[key];

    if (isObject(_curr) && isObject(_prev)) {
      const nestedDiff = diff(_curr as Obj, _prev as Obj, compareFn);

      if (Object.keys(nestedDiff).length > 0) {
        result[key] = nestedDiff;
      }
    } else if (!compareFn(_curr, _prev)) {
      const wasDeleted = prev != null && key in prev && (curr == null || !(key in curr));

      result[key] = wasDeleted ? DELETED : _curr;
    }
  }

  return result as DiffResult<T>;
}
