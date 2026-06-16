const isDev = !(globalThis as { __WARD_PROD__?: boolean }).__WARD_PROD__;

export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/ward] ${msg}`);
}

export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/ward] ${msg}`, ...args);
}
