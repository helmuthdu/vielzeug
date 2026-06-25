const isDev = !(globalThis as { __SCOUT_PROD__?: boolean }).__SCOUT_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/scout] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/scout] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
