const isDev = !(globalThis as { __SANDBOX_PROD__?: boolean }).__SANDBOX_PROD__;

export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sandbox] ${msg}`);
}
