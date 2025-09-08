import { isNumber } from './isNumber';

/**
 * Checks if a value is within a specified range.
 *
 * @example
 * ```ts
 * isWithin(1, 0, 1); // true
 * isWithin(1, 0, 1, false); // false
 * isWithin(0.5, 0, 1); // true
 * ```
 *
 * @param arg - The value to be checked.
 * @param min - The minimum value of the range.
 * @param max - The maximum value of the range.
 * @param inclusive - Whether the range is inclusive or exclusive. (defaults: `true`).
 *
 * @returns `true` if the value is in between, else `false`.
 */
export function isWithin(arg: unknown, min: unknown, max: unknown, inclusive = true): boolean {
  if (!isNumber(arg) || !isNumber(min) || !isNumber(max)) {
    return false;
  }
  return inclusive ? arg >= min && arg <= max : arg > min && arg < max;
}

export const IS_WITHIN_ERROR_MSG = 'Expected a number within a specified range';
