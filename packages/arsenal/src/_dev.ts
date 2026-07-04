const isDev = !(globalThis as { __ARSENAL_PROD__?: boolean }).__ARSENAL_PROD__;

/** @internal @security Messages may include user data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/arsenal] ${msg}`);
}
