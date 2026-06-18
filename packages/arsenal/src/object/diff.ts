import type { Obj } from '../types';

import { isEqual } from '../guards/isEqual';

export type DiffResult<T extends Obj> = {
  /** Keys present in `after` but not in `before`. */
  added: Array<keyof T & string>;
  /** Keys present in both objects whose values differ. Maps key → `{ before, after }`. */
  changed: { [K in keyof T]?: { after: T[K]; before: T[K] } };
  /** Keys present in `before` but not in `after`. */
  removed: Array<keyof T & string>;
};

/**
 * Computes the structural difference between two plain objects.
 * Returns an `{ added, removed, changed }` result — no sentinel symbols needed.
 *
 * @example
 * ```ts
 * diff({ a: 1, b: 2, c: 3 }, { a: 1, b: 99 });
 * // { added: [], removed: ['c'], changed: { b: { before: 2, after: 99 } } }
 *
 * diff({ x: { n: 1 } }, { x: { n: 2 } });
 * // { added: [], removed: [], changed: { x: { before: { n: 1 }, after: { n: 2 } } } }
 * ```
 *
 * @param before - The original object.
 * @param after - The updated object.
 * @param compareFn - Custom equality function. Defaults to deep `isEqual`.
 */
export function diff<T extends Obj>(
  before: T = {} as T,
  after: T = {} as T,
  compareFn: (a: unknown, b: unknown) => boolean = isEqual,
): DiffResult<T> {
  const added: Array<keyof T & string> = [];
  const removed: Array<keyof T & string> = [];
  const changed: Record<string, { after: unknown; before: unknown }> = {};

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));

  for (const key of afterKeys) {
    if (!beforeKeys.has(key)) {
      added.push(key as keyof T & string);
    } else if (!compareFn(before[key], after[key])) {
      changed[key] = { after: after[key], before: before[key] };
    }
  }

  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      removed.push(key as keyof T & string);
    }
  }

  return { added, changed: changed as DiffResult<T>['changed'], removed };
}

export type ArrayDiff<T> = {
  added: T[];
  removed: T[];
};

export type ArrayDiffOptions<T> = {
  compareFn?: (a: T, b: T) => boolean;
};

/**
 * Computes the set-difference between two arrays.
 * Items present in `after` but not `before` are `added`.
 * Items present in `before` but not `after` are `removed`.
 * Order-independent; uses deep equality by default.
 *
 * @example
 * ```ts
 * diffArrays([1, 2, 3], [2, 3, 4]); // { added: [4], removed: [1] }
 * diffArrays(
 *   [{ id: 1 }, { id: 2 }],
 *   [{ id: 2 }, { id: 3 }],
 *   { compareFn: (a, b) => a.id === b.id },
 * ); // { added: [{ id: 3 }], removed: [{ id: 1 }] }
 * ```
 *
 * @param before - The original array.
 * @param after - The updated array.
 * @param [options.compareFn] - Custom equality function. Defaults to deep `isEqual`.
 * @returns An object with `added` and `removed` arrays.
 */
export function diffArrays<T>(before: T[], after: T[], options?: ArrayDiffOptions<T>): ArrayDiff<T> {
  const compareFn = options?.compareFn ?? ((a: T, b: T) => isEqual(a, b));

  return {
    added: after.filter((item) => !before.some((b) => compareFn(b, item))),
    removed: before.filter((item) => !after.some((a) => compareFn(item, a))),
  };
}
