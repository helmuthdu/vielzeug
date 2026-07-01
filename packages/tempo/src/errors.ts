/** Base class for all tempo errors. Use `instanceof TempoError` to catch any tempo-originated error. */
export class TempoError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is TempoError {
    return err instanceof TempoError;
  }
}

/** Thrown when a date/time input string or value cannot be parsed. */
export class TempoInvalidInputError extends TempoError {}

/** Thrown when the provided timezone identifier is unknown or invalid. */
export class TempoInvalidTzError extends TempoError {}

/** Thrown when an operation requires a timezone but none was supplied. */
export class TempoMissingTzError extends TempoError {}

/** Thrown when an input type is not supported by the called operation. */
export class TempoUnsupportedInputError extends TempoError {}

// ─── Error helpers ────────────────────────────────────────────────────────────

type TempoErrorCtor = new (message: string) => TempoError;

export function fail(message: string, Class: TempoErrorCtor = TempoInvalidInputError): never {
  throw new Class(message);
}
