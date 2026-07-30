const isDev = !(globalThis as { __ORE_PROD__?: boolean }).__ORE_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/ore] ${msg}`);
}

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/ore] ${msg}`, ...args);
}
