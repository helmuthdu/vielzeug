import { assert } from '../function/assert';
import { IS_ARRAY_ERROR_MSG, isArray } from '../typed/isArray';

/**
 * Transposes an array of tuples into tuple arrays.
 */
export function unzip<T extends readonly unknown[]>(rows: readonly T[]): { [K in keyof T]: Array<T[K]> } {
  assert(isArray(rows), IS_ARRAY_ERROR_MSG, { args: { rows }, type: TypeError });

  if (rows.length === 0) return [] as unknown as { [K in keyof T]: Array<T[K]> };

  const width = rows[0].length;
  const out = Array.from({ length: width }, () => [] as unknown[]);

  for (const row of rows) {
    for (let index = 0; index < width; index++) {
      out[index].push(row[index]);
    }
  }

  return out as { [K in keyof T]: Array<T[K]> };
}
