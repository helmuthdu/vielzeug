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
 * Use `instanceof TempoError` to catch any tempo-originated error.
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
export class TempoError extends Error {
  readonly code: TempoErrorCode;

  constructor(code: TempoErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
  }

  static is(err: unknown): err is TempoError {
    return err instanceof TempoError;
  }
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function fail(message: string, code: TempoErrorCode = TempoErrorCode.INVALID_INPUT): never {
  throw new TempoError(code, message);
}
