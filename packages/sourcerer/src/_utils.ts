import { backoff, hash, retry } from '@vielzeug/arsenal';

import { devOnly, warn } from './_dev';

export { retry };

// Internal stable-key helper — used by source factories, not exposed as public API.
export const defaultKeyOf = hash;

/** Extracts a user-facing error message from a caught exception. */
export const extractError = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message;

  if (typeof reason === 'string' && reason.length > 0) return reason;

  return 'Request failed';
};

/** Default exponential backoff: 1 s, 2 s, 4 s, … capped at 30 s. Receives a 0-indexed failure count. */
export const defaultRetryDelay = (attempt: number): number => backoff(attempt);

/**
 * Strips control characters (which could otherwise inject terminal escape sequences into
 * `console.warn`/`console.debug` output) and caps length before interpolating caller- or
 * user-controlled text into a dev warning. Same approach as `@vielzeug/forge`'s
 * `sanitizeForLog` — duplicated rather than shared, per this repo's zero-cross-package-utility
 * convention for internal-only helpers.
 */
export function sanitizeForLog(text: string, maxLength = 200): string {
  return text.replace(/\p{C}/gu, '?').slice(0, maxLength);
}

const warnedClamps = new Set<string>();

/**
 * Coerces a user-supplied `limit`/`page`/target value to a positive integer, warning once per
 * `(apiLabel, fieldName)` call site in dev when the raw input needed clamping (negative, zero,
 * or non-finite) — every source factory previously did `Math.max(1, Math.trunc(value))`
 * silently, so a typo'd or miscalculated config value (e.g. `limit: -1`) produced no signal at
 * all. The once-per-call-site de-dup matters here specifically because `limit`/`page` reach this
 * function via `patch()`, which realistically sits behind live UI (a numeric input, a stepper) —
 * without it, a single persistently-invalid bound value would re-warn on every keystroke.
 * Fractional inputs (e.g. `2.5`) are truncated without a warning — that's a harmless
 * normalization, not a likely mistake.
 */
export function clampPositiveInt(value: number, apiLabel: string, fieldName: string): number {
  const clamped = Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;

  if (!Number.isFinite(value) || value < 1) {
    const key = `${apiLabel}:${fieldName}`;

    if (!warnedClamps.has(key)) {
      warnedClamps.add(key);
      devOnly(() =>
        warn(`${apiLabel}: ${fieldName} ${value} is invalid — clamped to ${clamped}. Must be a positive integer.`),
      );
    }
  }

  return clamped;
}
