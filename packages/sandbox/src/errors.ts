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

/**
 * Thrown when render() does not receive a 'ready' signal from the sandbox document
 * within the timeout window. The document is most likely missing the bridge script —
 * use buildDocument() to generate documents that include it.
 */
export class SandboxTimeoutError extends SandboxError {}
