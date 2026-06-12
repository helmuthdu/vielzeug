import type { Obj } from '../types';

import { isPlainObject } from '../typed/isPlainObject';

/**
 * Fills in `undefined` properties in `target` with values from `sources`. First source wins
 * — unlike `shallowMerge`, already-set keys are never overwritten.
 *
 * @example
 * ```ts
 * defaults({ a: 1, b: undefined }, { a: 99, b: 2, c: 3 });
 * // { a: 1, b: 2, c: 3 }
 * ```
 *
 * @param target - The object to fill in.
 * @param sources - One or more partial objects supplying default values.
 * @returns A new object with missing keys filled from `sources`.
 */
export function defaults<T extends Obj>(target: T, ...sources: Array<Partial<T>>): T {
  const out = { ...target };

  for (const source of sources) {
    if (!isPlainObject(source)) continue;

    for (const key of Object.keys(source) as Array<keyof T>) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

      if (out[key] === undefined) {
        out[key] = source[key] as T[keyof T];
      }
    }
  }

  return out;
}
