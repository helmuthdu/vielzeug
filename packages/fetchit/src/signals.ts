export function timeoutSignal(timeoutMs: number, external?: AbortSignal | null): AbortSignal | undefined {
  if (timeoutMs === 0 || timeoutMs === Number.POSITIVE_INFINITY) {
    return external ?? undefined;
  }

  const t = AbortSignal.timeout(timeoutMs);

  return external ? AbortSignal.any([t, external]) : t;
}
