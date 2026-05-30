import { isNumber } from './isNumber';

/**
 * True when left is less than or equal to right.
 */
export function isLessThanOrEqual(left: unknown, right: number): left is number {
  return isNumber(left) && left <= right;
}
