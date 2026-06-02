/**
 * Flattens nested arrays up to the provided depth.
 */
export function flatten<T>(array: unknown[], depth = 1): T[] {
  if (depth < 1) return [...array] as T[];

  const out: unknown[] = [];

  for (const item of array) {
    if (Array.isArray(item)) {
      out.push(...flatten(item, depth - 1));
    } else {
      out.push(item);
    }
  }

  return out as T[];
}
