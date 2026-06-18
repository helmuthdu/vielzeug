/** @internal */
export const isDev = !(globalThis as { __SPELL_PROD__?: boolean }).__SPELL_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/spell] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/spell] ${msg}`, ...args);
}
