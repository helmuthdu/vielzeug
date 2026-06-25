const isDev = !(globalThis as { __ORBIT_PROD__?: boolean }).__ORBIT_PROD__;

/** @internal @security Messages may include user-supplied element dimensions or computed styles. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/orbit] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/orbit] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
