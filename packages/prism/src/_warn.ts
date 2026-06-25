/** @internal */
const isDev = !(globalThis as { __PRISM_PROD__?: boolean }).__PRISM_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 * @security Messages may include user-supplied data (e.g. category names, x-values).
 * Never pass PII, tokens, or secrets as chart data labels.
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/prism] ${msg}`);
}

/**
 * Emits a `console.error` in development builds only.
 * @internal
 */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/prism] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
