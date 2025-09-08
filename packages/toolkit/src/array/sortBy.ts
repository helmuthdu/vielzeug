import { compareBy } from '../function/compareBy';

/**
 * Sorts an array of objects based on multiple selectors.
 *
 * @example
 * ```ts
 * const data = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 },
 *   { name: 'Alice', age: 25 },
 *   { name: 'Bob', age: 30 },
 *   { name: 'Charlie', age: 30 },
 * ].sortBy(data, { name: 'asc', age: 'desc' }); // [ { name: 'Alice', age: 30 }, { name: 'Alice', age: 25 }, { name: 'Bob', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Charlie', age: 35 }, { name: 'Charlie', age: 30 } ]
 * ```
 *
 * @param array - The array to sort.
 * @param selectors - An object where keys are the properties to sort by and values are 'asc' or 'desc'.
 * @returns A new sorted array.
 */
export const sortBy = <T>(array: T[], selectors: Partial<Record<keyof T, 'asc' | 'desc'>>) => {
  return [...array].sort(compareBy(selectors));
};
