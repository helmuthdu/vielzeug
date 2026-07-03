const isDev = !(globalThis as { __SANDBOX_PROD__?: boolean }).__SANDBOX_PROD__;

/** @internal @security — some callers interpolate user-supplied values (e.g. namedStyles key) into msg; do not log PII. */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/sandbox] ${msg}`);
}

/** @internal — Run fn only in dev builds. Use when dev-only logic goes beyond a single warn() / error() call. */
export function devOnly(fn: () => void): void {
  if (isDev) fn();
}
