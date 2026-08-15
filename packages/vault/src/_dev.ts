const isDev = !(globalThis as { __VAULT_PROD__?: boolean }).__VAULT_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/vault] ${msg}`);
}

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/vault] ${msg}`, ...args);
}
