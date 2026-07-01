const isDev = !(globalThis as { __DND_PROD__?: boolean }).__DND_PROD__;

/** @internal @security Messages may include developer-supplied config values. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/dnd] ${msg}`);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
