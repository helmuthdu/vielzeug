const isDev = !(globalThis as { __SCOUT_PROD__?: boolean }).__SCOUT_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/scout] ${msg}`);
}
