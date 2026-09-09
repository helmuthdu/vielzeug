/** Base class for all sandbox errors. */
export class SandboxError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when render() does not receive a 'ready' signal from the sandbox document
 * within the timeout window. An injected script may have blocked document initialization.
 */
export class SandboxTimeoutError extends SandboxError {}

/** Thrown when Sandbox configuration cannot produce a valid document or CSP policy. */
export class SandboxConfigurationError extends SandboxError {}
