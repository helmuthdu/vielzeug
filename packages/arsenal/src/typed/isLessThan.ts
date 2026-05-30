import { isNumber } from './isNumber';

/**
 * True when left is less than right.
 */
export function isLessThan(left: unknown, right: number): left is number {
  return isNumber(left) && left < right;
}
