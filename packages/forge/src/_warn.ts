/** @internal */
export const isDev = !(globalThis as { __FORGE_PROD__?: boolean }).__FORGE_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 * @security Messages may include user-supplied form field paths.
 * Never pass PII or secrets as field keys.
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/forge] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/forge] ${msg}`, ...args);
}
