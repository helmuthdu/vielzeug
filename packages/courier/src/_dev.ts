const isDev = !(globalThis as { __COURIER_PROD__?: boolean }).__COURIER_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/courier] ${msg}`);
}
