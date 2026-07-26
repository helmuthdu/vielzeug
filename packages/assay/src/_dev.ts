const isDev = !(globalThis as { __ASSAY_PROD__?: boolean }).__ASSAY_PROD__;

const warnedKeys = new Set<string>();

/**
 * @internal Warn at most once per `key` for the lifetime of the module — used for
 * environment-capability fallbacks (e.g. missing `PointerEvent`/`TouchEvent`), which would
 * otherwise log once per dispatched event in a suite that fires hundreds of them.
 */
export function warnOnce(key: string, msg: string): void {
  if (!isDev || warnedKeys.has(key)) return;

  warnedKeys.add(key);
  console.warn(`[@vielzeug/assay] ${msg}`);
}

/** @internal Test-only — clears "warned once" state so fallback-warning tests can run in any order. */
export function _resetWarnings(): void {
  warnedKeys.clear();
}
