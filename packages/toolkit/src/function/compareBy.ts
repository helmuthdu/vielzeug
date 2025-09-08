import { compare } from './compare';

/**
 * Compares two objects based on multiple selectors.
 * The comparison is done in the order of the selectors provided.
 * Each selector can be 'asc' for ascending or 'desc' for descending order.
 *
 * @example
 * ```ts
 * const compareByNameAndAge = compareBy<{ name: string; age: number }>({
 *   name: 'asc',
 *   age: 'desc',
 * });
 *
 * const a = { name: 'Alice', age: 30 };
 * const b = { name: 'Bob', age: 25 };
 *
 * console.log(compareByNameAndAge(a, b)); // -1 (Alice < Bob)
 * ```
 *
 * @param selectors - An object where keys are properties to compare and values are 'asc' or 'desc'.
 *
 * @returns A comparison function that can be used with array sorting methods.
 */
export const compareBy = <T>(selectors: Partial<Record<keyof T, 'asc' | 'desc'>>) => {
  const entries = Object.entries(selectors) as [keyof T, 'asc' | 'desc'][];

  return (a: T, b: T) => {
    for (const [key, direction] of entries) {
      const v1 = a[key];
      const v2 = b[key];
      const dir = direction === 'desc' ? -1 : 1;

      const cmp = compare(v1, v2);
      if (cmp !== 0) return cmp * dir;
    }

    return 0;
  };
};
