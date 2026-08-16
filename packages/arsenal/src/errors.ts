/** Base class for all arsenal errors. Use `instanceof ArsenalError` to catch any arsenal-originated error. */
export class ArsenalError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when converting a value to or from its serialized form fails — e.g. `memo`'s default
 * cache key (`JSON.stringify`) encountering a circular reference, or `hash` encountering an
 * unsupported class instance with `{ onClassInstance: 'throw' }`.
 */
export class ArsenalSerializationError extends ArsenalError {}
