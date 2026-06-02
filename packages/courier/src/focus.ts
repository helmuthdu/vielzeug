/**
 * Binds a query client's refetchStale() method to browser lifecycle events
 * (document visibility and network reconnect), returning a disposer.
 *
 * This is the explicit opt-in replacement for the removed `refetchOnFocus` and
 * `refetchOnReconnect` QueryClientOptions, giving full control over when and
 * where listeners are attached without hidden global side-effects.
 *
 * @example
 * ```ts
 * const qc = createQuery({ staleTime: 30_000 });
 * const unbind = bindRefetch(qc);
 * // later — e.g. in a component teardown or route leave:
 * unbind();
 * ```
 */
export function bindRefetch(qc: { refetchStale(): void }): () => void {
  const disposers: Array<() => void> = [];

  if (typeof document !== 'undefined') {
    const handler = () => {
      if (document.visibilityState === 'visible') qc.refetchStale();
    };

    document.addEventListener('visibilitychange', handler);
    disposers.push(() => document.removeEventListener('visibilitychange', handler));
  }

  if (typeof window !== 'undefined') {
    const handler = () => qc.refetchStale();

    window.addEventListener('online', handler);
    disposers.push(() => window.removeEventListener('online', handler));
  }

  return () => {
    for (const dispose of disposers) dispose();
  };
}
