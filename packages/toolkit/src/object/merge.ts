import { isArray } from '../typed/isArray';
import { isObject } from '../typed/isObject';
import type { Obj } from '../types';

// #region MergeStrategy
type MergeStrategy =
  | 'deep'
  | 'shallow'
  | 'lastWins'
  | 'arrayConcat'
  | 'arrayReplace'
  // biome-ignore lint/suspicious/noExplicitAny: -
  | ((target: any, source: any) => any);
// #endregion MergeStrategy

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

/**
 * Merges multiple objects based on a specified merge strategy.
 *
 * @example
 * ```ts
 * const obj1 = { a: 1, b: { x: 10, y: "hello" }, c: [1] };
 * const obj2 = { b: { y: 20, z: true }, c: [2] };
 * const obj3 = { d: false, c: [3] };
 *
 * merge("deep", obj1, obj2, obj3); // { a: 1, b: { x: 10, y: 20, z: true }, c: [1, 2, 3], d: false }
 * merge("shallow", obj1, obj2, obj3); // { a: 1, b: { y: 20, z: true }, c: [3], d: false }
 * ```
 *
 * @param [strategy='deep'] - The merging strategy to use.
 * @param items - The objects to merge.
 * @returns A new merged object.
 */
export function merge<T extends Obj[]>(strategy: MergeStrategy = 'deep', ...items: [...T]): Merge<T> {
  if (items.length === 0) return {} as Merge<T>;

  if (strategy === 'shallow') {
    return Object.assign({}, ...items) as Merge<T>;
  }

  return items.reduce((acc, obj) => deepMerge(acc, obj, strategy) as unknown as Merge<T>, {} as Merge<T>);
}

/**
 * Deeply merges two objects based on the provided strategy.
 *
 * - Uses **direct property access** for performance.
 * - **Avoids redundant deep merging** where unnecessary.
 * - Optimized **array merging strategies**.
 *
 * @param target - The target object.
 * @param source - The source object.
 * @param strategy - The merge strategy.
 * @returns A new merged object.
 */
function deepMerge<T extends Obj, U extends Obj>(target: T, source: U, strategy: MergeStrategy): DeepMerge<T, U> {
  if (!isObject(source)) return source as DeepMerge<T, U>;

  const result = { ...target } as DeepMerge<T, U>;

  for (const key in source) {
    if (!Object.hasOwn(source, key)) continue; // Prevent prototype pollution

    const sourceValue = source[key];
    const targetValue = result[key];

    // biome-ignore lint/suspicious/noExplicitAny: -
    (result as any)[key] =
      isArray(sourceValue) && isArray(targetValue)
        ? handleArrayMerge(targetValue, sourceValue, strategy)
        : isObject(sourceValue) && isObject(targetValue)
          ? deepMerge(targetValue, sourceValue, strategy)
          : applyMergeStrategy(targetValue, sourceValue, strategy);
  }

  return result;
}

/**
 * Optimized array merge based on strategy.
 *
 * - `"arrayConcat"` → Concatenates arrays.
 * - `"arrayReplace"` → Replaces the existing array.
 * - Default: **Unique merge** (Set-based optimization).
 */
function handleArrayMerge<T, U>(targetArray: T[] | undefined, sourceArray: U[], strategy: MergeStrategy): (T | U)[] {
  if (!targetArray) return sourceArray;
  // biome-ignore lint/suspicious/noExplicitAny: -
  if (strategy === 'arrayConcat') return targetArray.concat(sourceArray as any);
  if (strategy === 'arrayReplace') return sourceArray;
  return Array.from(new Set([...targetArray, ...sourceArray])); // Unique merge
}

/**
 * Determines the appropriate value to assign based on the merge strategy.
 *
 * - `"lastWins"` → Overwrites with the latest value.
 * - Custom functions → Allows user-defined behavior.
 */
function applyMergeStrategy<T, U>(target: T, source: U, strategy: MergeStrategy): T | U {
  if (typeof strategy === 'function') return strategy(target, source);
  return strategy === 'lastWins' || source !== undefined ? source : target;
}
