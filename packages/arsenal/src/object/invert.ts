/**
 * Inverts key-value pairs.
 */
export function invert<T extends Record<PropertyKey, PropertyKey>>(obj: T): Record<T[keyof T], keyof T> {
  const out = {} as Record<T[keyof T], keyof T>;

  for (const [key, value] of Object.entries(obj) as Array<[keyof T, T[keyof T]]>) {
    out[value] = key;
  }

  return out;
}
