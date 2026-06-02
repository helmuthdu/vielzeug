/**
 * Zips multiple arrays by index.
 */
export function zip<T extends readonly unknown[][]>(
  ...arrays: T
): Array<{ [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never }> {
  if (arrays.length === 0) return [];

  const length = Math.max(...arrays.map((arr) => arr.length));
  const out = new Array(length);

  for (let index = 0; index < length; index++) {
    out[index] = arrays.map((array) => array[index]);
  }

  return out as Array<{ [K in keyof T]: T[K] extends readonly (infer U)[] ? U | undefined : never }>;
}
