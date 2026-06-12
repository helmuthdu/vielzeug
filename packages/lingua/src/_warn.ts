const isDev = !(globalThis as { __LINGUA_PROD__?: boolean }).__LINGUA_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/lingua] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/lingua] ${msg}`, ...args);
}
