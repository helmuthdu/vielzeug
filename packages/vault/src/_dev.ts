const isDev = !(globalThis as { __VAULT_PROD__?: boolean }).__VAULT_PROD__;

/** @internal */
export function error(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/vault] ${msg}`, ...args);
}
