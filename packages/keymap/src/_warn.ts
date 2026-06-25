const isDev = !(globalThis as { __KEYMAP_PROD__?: boolean }).__KEYMAP_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/keymap] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/keymap] ${msg}`, ...args);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
