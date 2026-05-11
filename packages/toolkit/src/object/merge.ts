import type { Obj } from '../types';

import { isArray } from '../typed/isArray';
import { isObject } from '../typed/isObject';

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

function mergeObjects<T extends Obj, U extends Obj>(target: T, source: U): DeepMerge<T, U> {
  if (!isObject(source)) return source as DeepMerge<T, U>;

  const result = { ...target } as DeepMerge<T, U>;

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    (result as any)[key] =
      isArray(sourceValue) && isArray(targetValue)
        ? [...targetValue, ...sourceValue]
        : isObject(sourceValue) && isObject(targetValue)
          ? mergeObjects(targetValue as Obj, sourceValue as Obj)
          : sourceValue;
  }

  return result;
}

/**
 * Deeply merges all provided objects.
 */
export function deepMerge<T extends Obj[]>(...items: [...T]): Merge<T> {
  if (items.length === 0) return {} as Merge<T>;

  return items.reduce((acc, obj) => mergeObjects(acc, obj) as unknown as Merge<T>, {} as Merge<T>);
}

/**
 * Shallowly merges all provided objects.
 */
export function shallowMerge<T extends Obj[]>(...items: [...T]): Merge<T> {
  if (items.length === 0) return {} as Merge<T>;

  return Object.assign({}, ...items) as Merge<T>;
}
