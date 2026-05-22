// ── Error catalog ─────────────────────────────────────────────────────────────

export const HeadlessError = {
  MISSING_BOUNDARY: 'BUILDIT_MISSING_BOUNDARY',
  MISSING_HOST: 'BUILDIT_MISSING_HOST',
  MISSING_PANEL: 'BUILDIT_MISSING_PANEL',
  MISSING_REFERENCE: 'BUILDIT_MISSING_REFERENCE',
  MISSING_ROLE: 'BUILDIT_MISSING_ROLE',
} as const;

export type HeadlessErrorCode = (typeof HeadlessError)[keyof typeof HeadlessError];

/**
 * Structured error thrown by `devAssert` and directly instantiable for
 * programmatic error handling via `instanceof HeadlessException`.
 *
 * @example
 * ```ts
 * try { createCheckable({ ... }) }
 * catch (e) {
 *   if (e instanceof HeadlessException && e.code === HeadlessError.MISSING_HOST) { ... }
 * }
 * ```
 */
export class HeadlessException extends Error {
  readonly code: HeadlessErrorCode;

  constructor(code: HeadlessErrorCode, message: string) {
    super(import.meta.env.DEV ? `[buildit ${code}] ${message}` : `[buildit ${code}]`);
    this.code = code;
    this.name = 'HeadlessException';
  }
}

/**
 * Assertion helper with TypeScript type narrowing. Always throws a
 * `HeadlessException` — unlike a warn-and-continue approach, this gives a
 * clear stack trace in both development and production and prevents the app
 * from running in an impossible state.
 *
 * @example
 * ```ts
 * devAssert(!!host, HeadlessError.MISSING_HOST, 'createCheckable: host element is required');
 * ```
 */
export function devAssert(condition: boolean, code: HeadlessErrorCode, message: string): asserts condition {
  if (!condition) throw new HeadlessException(code, message);
}
