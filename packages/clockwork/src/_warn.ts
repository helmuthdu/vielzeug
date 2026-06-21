const isDev = !(globalThis as { __CLOCKWORK_PROD__?: boolean }).__CLOCKWORK_PROD__;

export { isDev };

export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/clockwork] ${msg}`);
}
