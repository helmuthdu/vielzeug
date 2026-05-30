import { isNumber } from './isNumber';

/**
 * True when left is greater than right.
 */
export function isGreaterThan(left: unknown, right: number): left is number {
  return isNumber(left) && left > right;
}
