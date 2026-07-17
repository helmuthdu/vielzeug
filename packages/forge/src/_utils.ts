import { devOnly, warn } from './_dev';
import { ForgeConfigError } from './errors';

export { flattenPaths as flattenValues, isPlainObject, unflattenPaths as unflattenValues } from '@vielzeug/arsenal';

const UNSAFE = new Set(['__proto__', 'constructor', 'prototype']);

/** Returns `true` when a dot-notation path contains no prototype-polluting segments. */
export function isSafeKey(path: string): boolean {
  return path.split('.').every((segment) => !UNSAFE.has(segment));
}

/** R2: Single assertion helper — replaces 5 copy-pasted guard blocks. */
export function assertSafeKey(key: string): void {
  warnIfDeepPathTypeFallback(key);

  if (!isSafeKey(key))
    throw new ForgeConfigError(`Unsafe key '${key}': segments __proto__, constructor, and prototype are reserved.`);
}

const warnedDeepPaths = new Set<string>();

/**
 * FlatKeyOf intentionally caps recursive path typing depth for TS performance.
 * Warn once per deep key in dev so callers notice when path type inference likely fell back to `string`.
 */
function warnIfDeepPathTypeFallback(key: string): void {
  if (!key.includes('.')) return;

  const depth = key.split('.').length;

  if (depth <= 5 || warnedDeepPaths.has(key)) return;

  warnedDeepPaths.add(key);

  devOnly(() => {
    warn(`Path '${sanitizeForLog(key, 120)}' exceeds typed depth limits and may be treated as an untyped string path.`);
  });
}

/**
 * Strips control characters (which could otherwise inject terminal escape sequences into
 * `console.warn` output) and caps length before interpolating caller-controlled text into a
 * dev warning. Mirrors the sanitization already applied to field keys in `warnIfArrayItemKey`.
 */
export function sanitizeForLog(text: string, maxLength = 200): string {
  return text.replace(/\p{C}/gu, '?').slice(0, maxLength);
}

/**
 * Merges multiple AbortSignals into one that aborts when any of them aborts.
 * Nullish values are silently ignored.
 * Returns `undefined` when no non-null signals are provided.
 *
 * @internal Inlined here — `anySignal` was removed from `@vielzeug/arsenal`.
 */
export function anySignal(...signals: ReadonlyArray<AbortSignal | null | undefined>): AbortSignal | undefined {
  const active = signals.filter((s): s is AbortSignal => s != null);

  if (active.length === 0) return undefined;

  if (active.length === 1) return active[0];

  return AbortSignal.any(active);
}
