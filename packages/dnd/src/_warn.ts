const isDev = !(globalThis as { __DND_PROD__?: boolean }).__DND_PROD__;

/** @internal @security Messages may include developer-supplied config values. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/dnd] ${msg}`);
}
