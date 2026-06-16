/** @internal */
export const isDev = !(globalThis as { __ORBIT_PROD__?: boolean }).__ORBIT_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 * @security Messages may include user-supplied element dimensions or computed styles.
 * Never pass PII or secrets as positioning inputs.
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/orbit] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/orbit] ${msg}`, ...args);
}
