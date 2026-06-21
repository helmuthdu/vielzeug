/** @internal */
export const isDev = !(globalThis as { __KEYMAP_PROD__?: boolean }).__KEYMAP_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/keymap] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/keymap] ${msg}`, ...args);
}
