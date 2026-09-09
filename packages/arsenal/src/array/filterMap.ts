/**
 * Maps and filters in one pass. Returning `undefined` drops an item.
 *
 * Allocates a new array for the result.
 */
export function filterMap<T, R>(
  array: readonly T[],
  callback: (item: T, index: number, array: readonly T[]) => R | undefined,
): R[] {
  const result: R[] = [];

  for (let index = 0; index < array.length; index++) {
    const value = callback(array[index], index, array);

    if (value !== undefined) {
      result.push(value);
    }
  }

  return result;
}
