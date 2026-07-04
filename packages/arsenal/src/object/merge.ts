import type { Obj } from '../types';

import { isUnsafeKey } from '../_common/unsafePaths';
import { isPlainObject } from '../guards/isPlainObject';

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
  if (!isPlainObject(source)) return source as DeepMerge<T, U>;

  const result = { ...target } as DeepMerge<T, U>;

  for (const key of Object.keys(source)) {
    // Guard against prototype pollution: skip dangerous keys
    if (isUnsafeKey(key)) {
      continue;
    }

    const sourceValue = source[key];
    const targetValue = result[key];

    (result as Record<string, unknown>)[key] =
      Array.isArray(sourceValue) && Array.isArray(targetValue)
        ? options.arrayStrategy === 'concat'
          ? [...targetValue, ...sourceValue]
          : sourceValue
        : isPlainObject(sourceValue) && isPlainObject(targetValue)
          ? mergeObjects(targetValue as Obj, sourceValue as Obj, options)
          : sourceValue;
  }

  return result;
}

/**
 * Deeply merges two or more objects. Arrays in source objects **replace** the target array by default.
 * Pass `{ arrayStrategy: 'concat' }` as the last argument to concatenate arrays instead.
 *
 * @example
 * ```ts
 * deepMerge({ a: 1, b: { x: 1 } }, { b: { y: 2 }, c: 3 });
 * // { a: 1, b: { x: 1, y: 2 }, c: 3 }
 *
 * deepMerge({ tags: ['a'] }, { tags: ['b'] });
 * // { tags: ['b'] }  ← arrays replaced
 *
 * deepMerge({ tags: ['a'] }, { tags: ['b'] }, { arrayStrategy: 'concat' });
 * // { tags: ['a', 'b'] }
 * ```
 */
export function deepMerge<T extends Obj[]>(...args: [...T] | [...T, DeepMergeOptions]): Merge<T> {
  const lastArg = args[args.length - 1];
  const hasOptions =
    args.length > 0 &&
    typeof lastArg === 'object' &&
    lastArg !== null &&
    !Array.isArray(lastArg) &&
    'arrayStrategy' in lastArg &&
    Object.keys(lastArg).length === 1 &&
    ((lastArg as DeepMergeOptions).arrayStrategy === 'concat' ||
      (lastArg as DeepMergeOptions).arrayStrategy === 'replace');

  const options: DeepMergeOptions = hasOptions ? (lastArg as DeepMergeOptions) : {};
  const items = (hasOptions ? args.slice(0, -1) : args) as Obj[];

  if (items.length === 0) return {} as Merge<T>;

  return items.reduce((acc: Obj, obj: Obj) => mergeObjects(acc, obj, options) as Obj, {} as Obj) as unknown as Merge<T>;
}

/**
 * Shallowly merges two or more objects. Later sources win for duplicate keys.
 * Dangerous keys (`__proto__`, `constructor`, `prototype`) are always skipped.
 *
 * @example
 * ```ts
 * shallowMerge({ a: 1, b: { x: 1 } }, { b: { y: 2 } });
 * // { a: 1, b: { y: 2 } }  ← nested object replaced, not merged
 *
 * shallowMerge(defaults, overrides, extras);
 * ```
 */
export function shallowMerge<T extends Obj[]>(...items: [...T]): Merge<T> {
  if (items.length === 0) return {} as Merge<T>;

  const result: Obj = {};

  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (isUnsafeKey(key)) continue;

      result[key] = item[key];
    }
  }

  return result as Merge<T>;
}
