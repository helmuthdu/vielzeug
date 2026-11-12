import type { StandardSchemaV1 } from '@vielzeug/spell';

import { parseTrackedRecords } from './csv';
import { TabulaParseError, TabulaRowError, TabulaValidationError } from './errors';
import type { TabulaRecordOptions } from './types';

/**
 * Parse CSV text into typed rows validated by a Standard Schema (v1) — every
 * `@vielzeug/spell` schema qualifies. Combine with spell's coercion builders
 * (`s.coerce.number()` …) to turn the raw string cells into numbers, booleans,
 * or dates in the same pass.
 *
 * All rows are validated before returning: on any failure a
 * {@link TabulaValidationError} collects one {@link TabulaRowError} (1-based
 * `line` + schema issues) per invalid row, so a bad export is reported in full
 * instead of at the first bad cell.
 */
export function parseTypedRecords<T>(
  text: string,
  schema: StandardSchemaV1<Record<string, unknown>, T>,
  options: TabulaRecordOptions = {},
): T[] {
  const values: T[] = [];
  const errors: TabulaRowError[] = [];
  for (const { line, record } of parseTrackedRecords(text, options)) {
    const result = schema['~standard'].validate(record);
    if (result instanceof Promise) {
      throw new TabulaParseError('async schemas are not supported; use a sync schema');
    }
    if (result.issues === undefined) {
      values.push(result.value as T);
    } else {
      errors.push(new TabulaRowError(line, result.issues));
    }
  }
  if (errors.length > 0) throw new TabulaValidationError(errors);
  return values;
}
