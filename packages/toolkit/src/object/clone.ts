/**
 * Creates a deep copy of the provided data using the structuredClone algorithm.
 *
 * @example
 * ```ts
 * const obj = { a: 1, b: { c: 2 } };
 * const dup = clone(obj);
 *
 * dup.b.c = 3;
 * console.log(obj.b.c); // logs 2
 * console.log(dup.b.c); // logs 3
 * ```
 *
 * @param item - The data to clone.
 *
 * @returns A deep copy of the provided data.
 */
export function clone<T>(item: T): T {
  return structuredClone(item);
}
