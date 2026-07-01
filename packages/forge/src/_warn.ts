const isDev = !(globalThis as { __FORGE_PROD__?: boolean }).__FORGE_PROD__;

/** @internal @security Messages may include user-supplied form field paths. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/forge] ${msg}`);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
