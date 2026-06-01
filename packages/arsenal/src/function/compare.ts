/**
 * Compares two values and returns a number suitable for use as a sort comparator.
 *
 * - Numbers and Dates: returns `0`, `1`, or `-1`.
 * - Strings: delegates to `String.prototype.localeCompare`, which may return any integer
 *   (not just `0`, `1`, `-1`) depending on locale and engine.
 * - `null` sorts before all non-null values; `undefined` sorts last.
 *
 * @example
 * ```ts
 * compare('a', 'b'); // negative (locale-dependent)
 * compare(1, 2); // -1
 * compare(new Date('2023-01-01'), new Date('2023-01-02')); // -1
 * compare('a', 'a'); // 0
 * compare(1, 1); // 0
 * compare(new Date('2023-01-01'), new Date('2023-01-01')); // 0
 * ```
 *
 * @param a - The first value to compare.
 * @param b - The second value to compare.
 *
 * @returns A negative number, zero, or a positive number.
 */
export const compare = (a: unknown, b: unknown): number => {
  if (a === b) return 0;

  if (a === undefined) return 1;

  if (b === undefined) return -1;

  if (a === null) return b === null ? 0 : -1;

  if (b === null) return 1;

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a > b ? 1 : -1;
  }

  if (a instanceof Date && b instanceof Date) {
    const at = a.getTime();
    const bt = b.getTime();

    return at === bt ? 0 : at > bt ? 1 : -1;
  }

  // For any other types (objects, arrays, functions, etc.), throw to prevent silent bugs
  throw new TypeError(
    `Cannot compare values of type ${typeof a} and ${typeof b}. Use primitive types or explicit comparison functions.`,
  );
};
