/** Base class for all codex errors. Use `instanceof CodexError` to catch any codex-originated error. */
export class CodexError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static is(err: unknown): err is CodexError {
    return err instanceof CodexError;
  }
}

/** Thrown when an MCP tool receives an invalid or missing argument. */
export class ToolArgError extends CodexError {
  constructor(message: string) {
    super(message);
  }
}
