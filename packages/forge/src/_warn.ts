const isDev = !(globalThis as { __FORGE_PROD__?: boolean }).__FORGE_PROD__;

/** @internal @security Messages may include user-supplied form field paths. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/forge] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/forge] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
