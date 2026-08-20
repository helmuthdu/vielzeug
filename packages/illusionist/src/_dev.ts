const isDev = !(globalThis as { __ILLUSIONIST_PROD__?: boolean }).__ILLUSIONIST_PROD__;

/** @internal @security Messages may include user data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/illusionist] ${msg}`);
}
