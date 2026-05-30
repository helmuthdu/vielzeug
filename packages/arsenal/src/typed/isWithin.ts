import { isNumber } from './isNumber';

/**
 * True when value is within min and max, inclusive.
 */
export function isWithin(arg: unknown, min: number, max: number): arg is number {
  return isNumber(arg) && arg >= min && arg <= max;
}
