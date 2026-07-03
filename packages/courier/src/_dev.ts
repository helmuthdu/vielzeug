const isDev = !(globalThis as { __COURIER_PROD__?: boolean }).__COURIER_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/courier] ${msg}`);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
