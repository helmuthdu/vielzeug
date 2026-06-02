import type { Primitive } from '../types';

/**
 * Either adds or removes an item from an array, based on whether it already
 * exists in the array (toggle behaviour).
 *
 * @example
 * ```ts
 * toggle([1, 2, 3], 4) // [1, 2, 3, 4]
 * toggle([1, 2, 3], 2) // [1, 3]
 *
 * toggle(
 *   [{ id: 1 }, { id: 2 }],
 *   { id: 3 },
 *   (obj) => obj.id,
 *   { strategy: 'prepend' }
 * ) // [{ id: 3 }, { id: 1 }, { id: 2 }]
 * ```
 *
 * @param array - The array to modify.
 * @param item - The item to add or remove.
 * @param selector - A function to determine item identity.
 * @param [options] - Options for the toggle operation.
 * @param [options.strategy] - Where to insert when adding: 'prepend' or 'append' (default).
 * @returns A new array with the item toggled.
 */
export function toggle<T>(
  array: T[],
  item: T,
  selector?: (item: T) => Primitive,
  options: { strategy?: 'prepend' | 'append' } = {},
): T[] {
  const { strategy = 'append' } = options;
  const compareFn = selector ? (el: T) => selector(el) === selector(item) : (el: T) => el === item;

  const index = array.findIndex(compareFn);

  if (index !== -1) {
    return [...array.slice(0, index), ...array.slice(index + 1)];
  }

  return strategy === 'prepend' ? [item, ...array] : [...array, item];
}
