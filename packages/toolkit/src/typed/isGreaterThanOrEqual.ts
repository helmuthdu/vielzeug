import { isNumber } from './isNumber';

/**
 * True when left is greater than or equal to right.
 */
export function isGreaterThanOrEqual(left: unknown, right: number): left is number {
  return isNumber(left) && left >= right;
}
