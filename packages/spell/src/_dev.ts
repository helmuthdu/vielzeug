const isDev = !(globalThis as { __SPELL_PROD__?: boolean }).__SPELL_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/spell] ${msg}`);
}
