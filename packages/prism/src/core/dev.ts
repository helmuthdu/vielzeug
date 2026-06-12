const isDev = !(globalThis as { __PRISM_PROD__?: boolean }).__PRISM_PROD__;

export function devWarn(msg: string): void {
  if (isDev) console.warn(`[prism] ${msg}`);
}

export function devError(msg: string): void {
  if (isDev) console.error(`[prism] ${msg}`);
}
