/** @internal */
export const isDev = !(globalThis as { __SCOUT_PROD__?: boolean }).__SCOUT_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/scout] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/scout] ${msg}`, ...args);
}
