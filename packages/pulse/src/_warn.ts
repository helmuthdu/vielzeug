const isDev = !(globalThis as { __PULSE_PROD__?: boolean }).__PULSE_PROD__;

/** @internal */
export { isDev };

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/pulse] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/pulse] ${msg}`, ...args);
}
