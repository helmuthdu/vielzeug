const isDev = !(globalThis as { __TEMPO_PROD__?: boolean }).__TEMPO_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/tempo] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/tempo] ${msg}`, ...args);
}
