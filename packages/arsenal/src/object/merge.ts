import type { Obj } from '../types';

import { isObject } from '../typed/isObject';

export type DeepMergeOptions = {
  /** How to handle arrays when both source and target contain one. Default: `'replace'`. */
  arrayStrategy?: 'concat' | 'replace';
};

type DeepMerge<T, U> = T extends Obj
  ? U extends Obj
    ? {
        [K in keyof T | keyof U]: K extends keyof T
          ? K extends keyof U
            ? DeepMerge<T[K], U[K]>
            : T[K]
          : K extends keyof U
            ? U[K]
            : never;
      }
    : U
  : U;

type Merge<T extends Obj[]> = T extends [infer First, ...infer Rest]
  ? First extends Obj
    ? Rest extends Obj[]
      ? DeepMerge<First, Merge<Rest>>
      : First
    : Obj
  : Obj;

function mergeObjects<T extends Obj, U extends Obj>(target: T, source: U, options: DeepMergeOptions): DeepMerge<T, U> {
  if (!isObject(source)) return source as DeepMerge<T, U>;

  const result = { ...target } as DeepMerge<T, U>;

  for (const key of Object.keys(source)) {
    // Guard against prototype pollution: skip dangerous keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    const sourceValue = source[key];
    const targetValue = result[key];

    (result as any)[key] =
      Array.isArray(sourceValue) && Array.isArray(targetValue)
        ? options.arrayStrategy === 'concat'
          ? [...targetValue, ...sourceValue]
          : sourceValue
        : isObject(sourceValue) && isObject(targetValue)
          ? mergeObjects(targetValue as Obj, sourceValue as Obj, options)
          : sourceValue;
  }

  return result;
}

/**
 * Deeply merges all provided objects. Arrays in source objects **replace** the target array.
 * Use `deepMergeWith({ arrayStrategy: 'concat' })` to concatenate arrays instead.
 *
 * @example
 * ```ts
 * deepMerge({ a: 1, b: { x: 1 } }, { b: { y: 2 }, c: 3 });
 * // { a: 1, b: { x: 1, y: 2 }, c: 3 }
 *
 * deepMerge({ tags: ['a'] }, { tags: ['b'] });
 * // { tags: ['b'] }  ← arrays replaced
 * ```
 */
export function deepMerge<T extends Obj[]>(...items: [...T]): Merge<T> {
  if (items.length === 0) return {} as Merge<T>;

  return items.reduce(
    (acc, obj) => mergeObjects(acc, obj as Obj, { arrayStrategy: 'replace' }) as unknown as Merge<T>,
    {} as Merge<T>,
  );
}

/**
 * Returns a configured `deepMerge` function with the given options.
 *
 * @example
 * ```ts
 * const merge = deepMergeWith({ arrayStrategy: 'concat' });
 * merge({ tags: ['a'] }, { tags: ['b'] }); // { tags: ['a', 'b'] }
 * ```
 */
export function deepMergeWith(options: DeepMergeOptions) {
  return function <T extends Obj[]>(...items: [...T]): Merge<T> {
    if (items.length === 0) return {} as Merge<T>;

    return items.reduce((acc, obj) => mergeObjects(acc, obj as Obj, options) as unknown as Merge<T>, {} as Merge<T>);
  };
}

/**
 * Shallowly merges all provided objects. Later sources win for duplicate keys.
 *
 * @example
 * ```ts
 * shallowMerge({ a: 1, b: { x: 1 } }, { b: { y: 2 } });
 * // { a: 1, b: { y: 2 } }  ← nested object replaced, not merged
 * ```
 */
export function shallowMerge<T extends Obj[]>(...items: [...T]): Merge<T> {
  if (items.length === 0) return {} as Merge<T>;

  return Object.assign({}, ...items) as Merge<T>;
}
