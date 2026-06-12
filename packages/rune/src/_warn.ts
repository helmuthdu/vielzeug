const isDev = !(globalThis as { __RUNE_PROD__?: boolean }).__RUNE_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/rune] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/rune] ${msg}`, ...args);
}
