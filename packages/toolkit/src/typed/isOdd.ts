/**
 * Checks if a number is odd.
 *
 * @param {number} arg - The number to check.
 *
 * @returns {boolean} - Returns true if the number is odd, otherwise false.
 */
export function isOdd(arg: unknown): arg is number {
  return typeof arg === 'number' && Number.isFinite(arg) && Number.isInteger(arg) && arg % 2 !== 0;
}
