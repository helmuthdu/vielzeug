const isDev = !(globalThis as { __CONDUIT_PROD__?: boolean }).__CONDUIT_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/conduit] ${msg}`);
}

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/conduit] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
