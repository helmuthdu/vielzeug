/** Base class for all arsenal errors. Use `instanceof ArsenalError` to catch any arsenal-originated error. */
export class ArsenalError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is ArsenalError {
    return err instanceof ArsenalError;
  }
}

/**
 * Thrown when a function argument or option is invalid — wrong type, out of range, or an
 * otherwise-unusable value (e.g. a negative `concurrency`, a non-finite `range` bound, an
 * oversized `similarity` input).
 */
export class ArsenalValidationError extends ArsenalError {}

/**
 * Thrown when converting a value to or from its serialized form fails — e.g. `memo`'s default
 * cache key (`JSON.stringify`) encountering a circular reference, or `hash` encountering an
 * unsupported class instance with `{ onClassInstance: 'throw' }`.
 */
export class ArsenalSerializationError extends ArsenalError {}
