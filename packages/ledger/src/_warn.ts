/** @internal */
export const isDev = !(globalThis as { __LEDGER_PROD__?: boolean }).__LEDGER_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/ledger] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/ledger] ${msg}`, ...args);
}
