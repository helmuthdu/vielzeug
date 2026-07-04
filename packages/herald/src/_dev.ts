const isDev = !(globalThis as { __HERALD_PROD__?: boolean }).__HERALD_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/herald] ${msg}`);
}
