export type ClockworkErrorCode =
  | 'INVALID_AFTER_DELAY'
  | 'INVALID_CONTEXT'
  | 'INVALID_DEFINITION'
  | 'INVALID_EFFECT'
  | 'INVALID_INITIAL_STATE'
  | 'INVALID_INVOKE'
  | 'INVALID_MAX_TRANSITIONS'
  | 'INVALID_SNAPSHOT_STATE'
  | 'INVALID_TRANSITION'
  | 'INVALID_TRANSITION_LIMIT'
  | 'UNKNOWN_TARGET';

/** A Clockwork failure with a stable machine-readable code and contextual details. */
export class ClockworkError extends Error {
  readonly code: ClockworkErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: ClockworkErrorCode, message: string, details: Record<string, unknown> = {}, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    this.code = code;
    this.details = Object.freeze({ ...details });
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(error: unknown): error is ClockworkError {
    return error instanceof ClockworkError;
  }
}
