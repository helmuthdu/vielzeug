/** Base class for all sandbox errors. Use `instanceof SandboxError` to catch any sandbox-originated error. */
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

/** Thrown when a method is called on a disposed sandbox instance. */
export class SandboxDisposedError extends SandboxError {}

/** Thrown when the sandbox iframe fails to initialize or respond within the expected timeout. */
export class SandboxTimeoutError extends SandboxError {}
