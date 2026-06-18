// ─── Error codes ──────────────────────────────────────────────────────────────

/** Error code constants for {@link TempoError}. */
export const TempoErrorCode = Object.freeze({
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_TZ: 'INVALID_TZ',
  MISSING_TZ: 'MISSING_TZ',
  UNSUPPORTED_INPUT: 'UNSUPPORTED_INPUT',
} as const satisfies Record<string, string>);

export type TempoErrorCode = (typeof TempoErrorCode)[keyof typeof TempoErrorCode];

// ─── Error class ──────────────────────────────────────────────────────────────

/**
 * Error thrown by tempo when input validation fails.
 * Extends `TypeError` for backward compatibility — existing `catch (e)` blocks continue to work.
 * Use `instanceof TempoError` to distinguish tempo errors from other `TypeError`s.
 *
 * @example
 * ```ts
 * import { parse, TempoError } from '@vielzeug/tempo';
 *
 * try {
 *   parse('not-a-date');
 * } catch (e) {
 *   if (e instanceof TempoError) {
 *     console.log(e.code); // 'INVALID_INPUT'
 *   }
 * }
 * ```
 */
export class TempoError extends TypeError {
  readonly code: TempoErrorCode;

  constructor(code: TempoErrorCode, message: string) {
    super(`[tempo] ${message}`);
    this.name = 'TempoError';
    this.code = code;
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function fail(message: string, code: TempoErrorCode = TempoErrorCode.INVALID_INPUT): never {
  throw new TempoError(code, message);
}
