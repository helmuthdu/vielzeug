/** @internal */
const isDev = !(globalThis as { __SIGIL_PROD__?: boolean }).__SIGIL_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 * @security Messages may include user-supplied attribute values or element content.
 * Never pass PII or secrets as component attributes.
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sigil] ${msg}`);
}

/** @internal */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/sigil] ${msg}`, ...args);
}
