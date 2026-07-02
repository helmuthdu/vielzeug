/** Base class for all sandbox errors. */
export class SandboxError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is SandboxError {
    return err instanceof SandboxError;
  }
}
