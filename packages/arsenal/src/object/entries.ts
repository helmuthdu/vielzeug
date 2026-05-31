import type { Obj } from '../types';

/**
 * Typed wrapper for Object.entries.
 */
export function entries<T extends Obj>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}
