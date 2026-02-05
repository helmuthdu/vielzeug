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
 *
 * @throws {Error} If the item cannot be cloned.
 */
export function clone<T>(item: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(item);
    } catch (error) {
      throw new Error(`Failed to clone item: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  try {
    return JSON.parse(JSON.stringify(item));
  } catch (error) {
    throw new Error(`Failed to clone item using JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}
