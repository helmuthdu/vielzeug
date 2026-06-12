import type { Primitive } from '../types';

/**
 * Returns a deduplicated union of both arrays.
 */
export function union<T>(source: T[], other: T[], selector?: (item: T) => Primitive): T[] {
  if (!selector) {
    return [...new Set([...source, ...other])];
  }

  const seen = new Set<Primitive>();
  const out: T[] = [];

  for (const item of [...source, ...other]) {
    const key = selector(item) as Primitive;

    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}
