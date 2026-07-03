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

/**
 * Machine-readable reason for a failed MCP tool call, alongside the human-readable message.
 * Lets an AI client branch on outcome (e.g. retry on none of these vs. try a different slug on
 * NOT_FOUND) instead of string-matching `message`.
 */
export type ToolErrorCode = 'INVALID_ARG' | 'NOT_FOUND' | 'UNAVAILABLE';

/**
 * Thrown by tool `run()` implementations for any expected failure (bad argument, unknown
 * slug/tag, missing bundled data). `registerTools()` catches this exclusively — via
 * `instanceof CodexError`, not a `ToolError`-specific check — and turns it into a structured
 * `{ code, message }` MCP error result. Anything else that throws is a real bug and is left to
 * propagate as a protocol-level error instead of being silently swallowed.
 */
export class ToolError extends CodexError {
  readonly code: ToolErrorCode;

  constructor(code: ToolErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
