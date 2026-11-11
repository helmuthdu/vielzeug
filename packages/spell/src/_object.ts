import { isPlainObject } from '@vielzeug/arsenal';

const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Keys that would mutate a prototype when assigned through `obj[key] = value`. */
export function isUnsafeObjectKey(key: string): boolean {
  return UNSAFE_OBJECT_KEYS.has(key);
}

/** Assigns an own enumerable property without triggering inherited setters such as `__proto__`. */
export function defineOwnProperty<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, value, writable: true });
}

export function objectFromEntries<T>(entries: Iterable<readonly [string, T]>): Record<string, T> {
  const out: Record<string, T> = {};

  for (const [key, value] of entries) defineOwnProperty(out, key, value);

  return out;
}

/** Deep-copies arrays, plain objects, dates, maps, and sets; returns every other value as-is. */
export function materialize<T>(value: T): T {
  if (Array.isArray(value)) return value.map(materialize) as T;

  if (value instanceof Date) return new Date(value.getTime()) as T;

  if (value instanceof Map) return new Map([...value].map(([k, v]) => [materialize(k), materialize(v)])) as T;

  if (value instanceof Set) return new Set([...value].map(materialize)) as T;

  if (isPlainObject(value)) {
    return objectFromEntries(Object.entries(value).map(([key, entry]) => [key, materialize(entry)])) as T;
  }

  return value;
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;

  for (const child of Object.values(value)) deepFreeze(child);

  return Object.freeze(value);
}
