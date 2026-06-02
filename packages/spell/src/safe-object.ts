export const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isUnsafeObjectKey(key: string): boolean {
  return UNSAFE_OBJECT_KEYS.has(key);
}

export function defineOwnProperty<T>(target: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

export function objectFromEntries<T>(entries: Iterable<readonly [string, T]>): Record<string, T> {
  const out: Record<string, T> = {};

  for (const [key, value] of entries) defineOwnProperty(out, key, value);

  return out;
}

export function cloneRecord<T>(source: Record<string, T>): Record<string, T> {
  return objectFromEntries(Object.entries(source));
}
