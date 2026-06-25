/** Base class for all orbit errors. Use `instanceof OrbitError` to catch any orbit-originated error. */
export class OrbitError extends Error {
  constructor(message = 'an unexpected error occurred', opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is OrbitError {
    return err instanceof OrbitError;
  }
}

/** Thrown when a middleware pipeline is configured incorrectly. */
export class OrbitConfigError extends OrbitError {}
