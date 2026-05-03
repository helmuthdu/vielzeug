import type { AnySchema, RecordOf } from '../types';

export function resolveRecordKey<S extends AnySchema, K extends keyof S>(
  schema: S,
  table: K,
  value: RecordOf<S, K>,
): string | number {
  const keyField = String(schema[table].key);
  const keyValue = (value as Record<string, unknown>)[keyField];

  if (keyValue === undefined || keyValue === null) {
    throw new Error(`Missing required key field "${keyField}" in record for table "${String(table)}"`);
  }

  return keyValue as string | number;
}
