/**
 * Internal JSON-domain helpers shared by the patch engine and the merge module.
 * Never re-exported from the package barrel.
 */
import type { JsonObject, JsonValue } from './types';

export function isPlainObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Structural equality over the JSON domain: no NaN/undefined/prototype concerns. */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index] as JsonValue));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key] as JsonValue, b[key] as JsonValue))
    );
  }
  return false;
}
