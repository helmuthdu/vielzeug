const isDev = !(globalThis as { __CONDUIT_PROD__?: boolean }).__CONDUIT_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/conduit] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/conduit] ${msg}`, ...args);
}
