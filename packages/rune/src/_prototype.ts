/**
 * Property names that must never be used as a bracket-assignment key on a plain object literal —
 * `obj[key] = value` for `key === '__proto__'` invokes `Object.prototype`'s `__proto__` accessor
 * and reassigns `obj`'s own prototype instead of setting an own property. `constructor` and
 * `prototype` are excluded defensively for the same class of risk.
 *
 * Used when rebuilding a caller-supplied `Bindings` object key-by-key (`logger.ts`'s
 * `serializeErrors()`, `transports.ts`'s `redactObject()`) — bindings/context ultimately come
 * from application code, but nothing prevents an app from passing through attacker-controlled
 * data (e.g. `log.info(JSON.parse(untrustedInput))`).
 *
 * @internal
 */
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** @internal */
export function isUnsafeObjectKey(key: string): boolean {
  return UNSAFE_OBJECT_KEYS.has(key);
}
