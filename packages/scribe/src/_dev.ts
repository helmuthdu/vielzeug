const isDev = !(globalThis as { __SCRIBE_PROD__?: boolean }).__SCRIBE_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/scribe] ${msg}`);
}
