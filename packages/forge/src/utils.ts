/**
 * Key segments that must never appear in a dot-notation field path.
 * They target prototype-chain properties and can corrupt objects if used as plain-object keys.
 */
export const UNSAFE_KEY_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** Returns true if every segment of a dot-notation key is safe to use as a plain-object property name. */
export function isSafeKey(key: string): boolean {
  return key.split('.').every((s) => !UNSAFE_KEY_SEGMENTS.has(s));
}

export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype;
}

/**
 * Flattens a nested object into a map of dot-notation keys.
 * Silently skips any key whose name is in UNSAFE_KEY_SEGMENTS.
 * Depth-limited to 10 levels to prevent call-stack exhaustion from adversarial input.
 */
export function flattenValues(obj: Record<string, unknown>, prefix = '', depth = 0): Record<string, unknown> {
  if (depth > 10) return {};

  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (UNSAFE_KEY_SEGMENTS.has(key)) continue;

    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(val)) {
      Object.assign(result, flattenValues(val, fullKey, depth + 1));
    } else {
      result[fullKey] = val;
    }
  }

  return result;
}

/**
 * Reconstructs a nested object from a map of dot-notation keys.
 * Any key whose path includes an unsafe segment is skipped — `isSafeKey` is the single
 * defence point, so plain bracket assignment is safe here.
 */
export function unflattenValues(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');

    if (parts.some((p) => UNSAFE_KEY_SEGMENTS.has(p))) continue;

    let obj = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!isPlainObject(obj[parts[i]])) {
        obj[parts[i]] = {};
      }

      obj = obj[parts[i]] as Record<string, unknown>;
    }

    obj[parts[parts.length - 1]] = val;
  }

  return result;
}
