const isDev = !(globalThis as { __SIGIL_PROD__?: boolean }).__SIGIL_PROD__;

/** @internal @security Messages may include user-supplied payload sizes. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sigil] ${msg}`);
}

/** @internal — Run fn only in dev builds. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
