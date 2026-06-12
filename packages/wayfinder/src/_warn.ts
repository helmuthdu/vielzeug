const isDev = !(globalThis as { __WAYFINDER_PROD__?: boolean }).__WAYFINDER_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/wayfinder] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/wayfinder] ${msg}`, ...args);
}
