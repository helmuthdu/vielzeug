/** Base class for all herald errors. Use `instanceof HeraldError` to catch any herald-originated error. */
export class HeraldError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is HeraldError {
    return err instanceof HeraldError;
  }
}

/** Thrown when an operation is attempted on a disposed event bus. */
export class BusDisposedError extends HeraldError {
  constructor(busName?: string) {
    super(busName ? `Bus "${busName}" is disposed` : 'Bus is disposed');
  }
}
