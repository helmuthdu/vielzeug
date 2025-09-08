import { isEqual } from '../typed/isEqual';
import { isObject } from '../typed/isObject';
import type { Obj } from '../types';

/**
 * Computes the difference between two objects.
 *
 * @example
 * ```ts
 * const obj1 = { a: 1, b: 2, c: 3 };
 * const obj2 = { b: 2, c: 3, d: 4 };
 *
 * diff(obj1, obj2); // { d: 4 }
 * ```
 *
 * @param curr - The current object.
 * @param prev - The previous object.
 * @param [compareFn] - A custom function to compare values.
 * @returns An object containing new/modified properties.
 */
export function diff<T extends Obj>(
  curr?: T,
  prev?: T,
  compareFn: (a: unknown, b: unknown) => boolean = isEqual,
): Partial<T> {
  if (!curr && !prev) return {} as Partial<T>;

  const result: Record<string, unknown> = {};

  for (const key of new Set([...Object.keys(curr ?? {}), ...Object.keys(prev ?? {})])) {
    const _curr = curr?.[key];
    const _prev = prev?.[key];

    if (isObject(_curr) && isObject(_prev)) {
      const nestedDiff = diff(_curr, _prev, compareFn) as Partial<T[keyof T]>;
      if (Object.keys(nestedDiff).length > 0) {
        result[key] = nestedDiff;
      }
    } else if (!compareFn(_curr, _prev)) {
      result[key] = _curr;
    }
  }

  return result as Partial<T>;
}
