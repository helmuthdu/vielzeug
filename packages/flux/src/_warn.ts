const isDev = !(globalThis as { __FLUX_PROD__?: boolean }).__FLUX_PROD__;

/** @internal @security Messages may include user data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/flux] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/flux] ${msg}`, ...args);
}
