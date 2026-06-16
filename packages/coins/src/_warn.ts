const isDev = !(globalThis as { __COINS_PROD__?: boolean }).__COINS_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/coins] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/coins] ${msg}`, ...args);
}
