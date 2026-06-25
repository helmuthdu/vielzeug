// Internal — not part of the public API surface directly.
// LinguaError and error code constants are re-exported from index.ts.

/** String-literal union of all error codes emitted by @vielzeug/lingua. */
export const E = {
  COUNT_IN_VARS: 'E003',
  DISPOSED: 'E007',
  INVALID_COUNT: 'E002',
  INVALID_LOCALE: 'E004',
  MISSING_LOCALE: 'E001',
  NAMESPACE_MISSING: 'E005',
  RESTORE_NO_LOCALE: 'E006',
} as const;

export type ErrorCode = (typeof E)[keyof typeof E];

/**
 * Error thrown by all lingua runtime methods.
 * Match by `instanceof LinguaError` or by the stable `.code` property.
 *
 * @example
 * try {
 *   await i18n.setLocale('xx');
 * } catch (e) {
 *   if (e instanceof LinguaError && e.code === E.MISSING_LOCALE) { ... }
 * }
 */
export class LinguaError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
  }

  static is(err: unknown): err is LinguaError {
    return err instanceof LinguaError;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function disposedError(): LinguaError {
  return new LinguaError(E.DISPOSED, 'Operation called on a disposed i18n instance.');
}

export function checkDisposed(disposed: boolean): void {
  if (disposed) throw disposedError();
}

export function checkDisposedAsync(disposed: boolean): Promise<never> | null {
  return disposed ? Promise.reject(disposedError()) : null;
}
