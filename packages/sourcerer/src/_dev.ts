const isDev = !(globalThis as { __SOURCERER_PROD__?: boolean }).__SOURCERER_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sourcerer] ${msg}`);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
