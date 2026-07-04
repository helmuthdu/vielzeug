const isDev = !(globalThis as { __CONDUIT_PROD__?: boolean }).__CONDUIT_PROD__;

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/conduit] ${msg}`, ...args);
}
