import type { AnySchema, JsonSchema } from '../core';

export type { JsonSchema } from '../core';

/**
 * Standalone alias for `schema.schema()`.
 * Returns the JSON Schema representation of the given schema.
 */
export function schema(s: AnySchema): JsonSchema {
  return s.schema();
}
