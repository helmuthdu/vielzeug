const isDev = !(globalThis as { __CONDUIT_PROD__?: boolean }).__CONDUIT_PROD__;

export function warn(msg: string, ...args: unknown[]): void {
  if (isDev) console.warn(`[@vielzeug/conduit] ${msg}`, ...args);
}
