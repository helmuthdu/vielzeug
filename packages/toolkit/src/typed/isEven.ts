/**
 * Checks if a number is even.
 *
 * @param {number} arg - The number to check.
 *
 * @returns {boolean} - Returns true if the number is even, otherwise false.
 */
export function isEven(arg: unknown): arg is number {
  return typeof arg === 'number' && Number.isFinite(arg) && Number.isInteger(arg) && arg % 2 === 0;
}
