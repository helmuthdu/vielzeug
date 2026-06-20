export const isDev = !(globalThis as { __CRAFT_PROD__?: boolean }).__CRAFT_PROD__;

/** @internal @security Messages may include user-supplied data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/craft] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/craft] ${msg}`, ...args);
}
