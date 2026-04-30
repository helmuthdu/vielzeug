import type { AnySchema } from '../types';

/* -------------------- Schema key helpers -------------------- */

export function resolveRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  value: Record<string, unknown>,
): string | number {
  const keyField = String(schema[table].key);
  const keyValue = value[keyField];

  if (keyValue === undefined || keyValue === null) {
    throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
  }

  return keyValue as string | number;
}
