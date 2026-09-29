import type { Schema } from './core';

/**
 * Accepts and drops named keys a record carries from an older schema version, instead of failing
 * `invalid_keys`. One call per removed field: the parsed output never sees the tolerated keys.
 *
 * @example
 * const hunter = tolerate(s.object({ name: s.string() }), 'woundCount');
 */
export function tolerate<Output extends object, Input>(
  schema: Schema<Output, Input>,
  ...keys: string[]
): Schema<Output, Input> {
  const tolerated = new Set(keys);
  return schema.preprocess((value) => {
    if (typeof value !== 'object' || value === null) return value;
    let stripped = false;
    for (const key of Object.keys(value)) {
      if (tolerated.has(key)) {
        stripped = true;
        break;
      }
    }
    if (!stripped) return value;
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (!tolerated.has(key)) next[key] = entry;
    }
    return next;
  });
}
