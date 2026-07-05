const isDev = !(globalThis as { __REFINE_PROD__?: boolean }).__REFINE_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 * @security Messages may include user-supplied attribute values or element content.
 * Never pass PII or secrets as component attributes.
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/refine] ${msg}`);
}
