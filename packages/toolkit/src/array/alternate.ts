import type { Primitive } from '../types';

/**
 * Either adds or removes an item from an array, based on whether it already exists in the array.
 *
 * @example
 * ```ts
 * alternate([1, 2, 3], 4) // [1, 2, 3, 4]
 * alternate([1, 2, 3], 2) // [1, 3]
 *
 * alternate(
 *   [{ id: 1 }, { id: 2 }],
 *   { id: 3 },
 *   (obj) => obj.id,
 *   { strategy: 'prepend' }
 * ) // [{ id: 3 }, { id: 1 }, { id: 2 }]
 * ```
 *
 * @param array - The array to modify.
 * @param item - The item to add or remove.
 * @param selector - A function to determine the uniqueness of the item.
 * @param [options] - Options for the alternate operation.
 * @param [options.strategy] - The strategy to use when adding the item ('prepend' or 'append').
 *
 * @returns A new array with the item added or removed.
 */
export function alternate<T>(
  array: T[],
  item: T,
  selector?: (item: T) => Primitive,
  options?: { strategy?: 'prepend' | 'append' },
): T[] {
  const { strategy = 'append' } = options || {};
  const index = array.findIndex((el) => (selector ? selector(el) === selector(item) : el === item));

  if (index !== -1) {
    return [...array.slice(0, index), ...array.slice(index + 1)];
  }

  return strategy === 'prepend' ? [item, ...array] : [...array, item];
}

alternate.fp = true;
