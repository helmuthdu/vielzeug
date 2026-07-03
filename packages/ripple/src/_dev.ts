const isDev = !(globalThis as { __RIPPLE_PROD__?: boolean }).__RIPPLE_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/ripple] ${msg}`);
}
