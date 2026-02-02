/**
 * Compares two values and returns:
 * - 0 if they are equal
 * - 1 if the first value is greater
 * - -1 if the second value is greater
 *
 * @example
 * ```ts
 * compare('a', 'b'); // -1
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
 * @returns 0 if equal, 1 if the first value is greater, -1 if the second value is greater.
 */
// biome-ignore lint/suspicious/noExplicitAny: -
export const compare = (a: any, b: any): number => {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  if (a === null) return b === null ? 0 : -1;
  if (b === null) return 1;

  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aString = JSON.stringify(a);
    const bString = JSON.stringify(b);
    return aString.localeCompare(bString);
  }

  return String(a).localeCompare(String(b));
};
