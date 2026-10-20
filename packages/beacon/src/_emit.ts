/** Shared tap() plumbing: zero overhead when idle, handler errors swallowed, auto-detach on abort. */
export function createTappers<E extends { readonly type: string }>(signal: AbortSignal) {
  const tappers = new Set<(event: E) => void>();

  const emit = (event: E): void => {
    if (tappers.size === 0) return;
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect tour behavior.
      }
    }
  };

  const warn = (error: unknown): void => {
    if (tappers.size === 0) return;
    emit({ error, message: error instanceof Error ? error.message : String(error), type: 'warning' } as unknown as E);
  };

  const tap = (handler: (event: E) => void, options?: { readonly signal?: AbortSignal }): (() => void) => {
    if (signal.aborted || options?.signal?.aborted) return () => {};
    const detach = (): void => {
      tappers.delete(handler);
    };
    tappers.add(handler);
    signal.addEventListener('abort', detach, { once: true });
    options?.signal?.addEventListener('abort', detach, { once: true });

    return detach;
  };

  return { clear: () => tappers.clear(), emit, tap, warn };
}
