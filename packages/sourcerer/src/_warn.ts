const isDev = !(globalThis as { __SOURCERER_PROD__?: boolean }).__SOURCERER_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sourcerer] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/sourcerer] ${msg}`, ...args);
}
