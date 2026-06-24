const isDev = !(globalThis as { __COURIER_PROD__?: boolean }).__COURIER_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/courier] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/courier] ${msg}`, ...args);
}
