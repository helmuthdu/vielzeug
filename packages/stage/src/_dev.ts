const isDev = !(globalThis as { __STAGE_PROD__?: boolean }).__STAGE_PROD__;

/** @internal */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/stage] ${msg}`);
}
