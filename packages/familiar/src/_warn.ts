const isDev = !(globalThis as { __FAMILIAR_PROD__?: boolean }).__FAMILIAR_PROD__;

export function warn(msg: string, ...args: unknown[]): void {
  if (isDev) console.warn(`[@vielzeug/familiar] ${msg}`, ...args);
}
