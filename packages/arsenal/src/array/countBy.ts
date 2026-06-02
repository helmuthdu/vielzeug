import type { Primitive } from '../types';

/**
 * Counts elements in an array by selector output.
 */
export function countBy<T>(array: T[], selector: (item: T) => Primitive): Record<string, number> {
  const out: Record<string, number> = {};

  for (let index = 0; index < array.length; index++) {
    const key = String(selector(array[index]));

    out[key] = (out[key] ?? 0) + 1;
  }

  return out;
}
