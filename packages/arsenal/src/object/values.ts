import type { Obj } from '../types';

/**
 * Typed wrapper for Object.values.
 */
export function values<T extends Obj>(obj: T): Array<T[keyof T]> {
  return Object.values(obj) as Array<T[keyof T]>;
}
