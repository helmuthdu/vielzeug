/**
 * Set to `true` by the Vite `define` config in production builds so that all
 * dev-only `warn()` / `issue()` calls are eliminated by the bundler.
 * When running tests or without a bundler the flag is absent and warnings fire.
 */
const isDev = !(globalThis as { __FLUX_PROD__?: boolean }).__FLUX_PROD__;

/** @internal @security Messages may include user data. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/flux] ${msg}`);
}

/** @internal @security Messages and args may include user data. */
export function issue(msg: string, ...args: unknown[]): void {
  if (isDev) console.error(`[@vielzeug/flux] ${msg}`, ...args);
}
