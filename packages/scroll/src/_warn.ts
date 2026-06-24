const isDev = !(globalThis as { __SCROLL_PROD__?: boolean }).__SCROLL_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/scroll] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/scroll] ${msg}`, ...args);
}
