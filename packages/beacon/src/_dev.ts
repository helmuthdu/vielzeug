const isDev = !(globalThis as { __BEACON_PROD__?: boolean }).__BEACON_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/beacon] ${msg}`);
}

/** @internal Multi-step development-only logic; skipped entirely in production builds. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
