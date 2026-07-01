// isDev uses import.meta.env.PROD which Vite replaces at build time — dead-code eliminated in production bundles.
const isDev = !(import.meta as { env?: { PROD?: boolean } }).env?.PROD;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sandbox] ${msg}`);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
