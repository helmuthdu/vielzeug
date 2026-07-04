/**
 * Property names that must never be used as a bracket-assignment key on a plain object literal —
 * `obj[key] = value` for `key === '__proto__'` invokes `Object.prototype`'s `__proto__` accessor
 * and reassigns `obj`'s own prototype instead of setting an own property. `constructor` and
 * `prototype` are excluded defensively for the same class of risk.
 *
 * Used when copying event-name-keyed `Map` entries into a plain object (`behavior-bus.ts`'s
 * `snapshot()`, `testing/testing.ts`'s `allEmitted()`) — event names ultimately come from a
 * caller-supplied `EventMap` type, but nothing prevents a caller from wiring in a
 * dynamically-determined (e.g. user-supplied) event name at runtime.
 *
 * @internal
 */
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** @internal */
export function isUnsafeObjectKey(key: string): boolean {
  return UNSAFE_OBJECT_KEYS.has(key);
}
