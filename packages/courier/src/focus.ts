import { warn } from './_dev';

/**
 * Binds a query client's refetchStale() method to browser lifecycle events
 * (document visibility and network reconnect), returning a disposer.
 *
 * This is the explicit opt-in replacement for the removed `refetchOnFocus` and
 * `refetchOnReconnect` QueryClientOptions, giving full control over when and
 * where listeners are attached without hidden global side-effects.
 *
 * In a non-browser environment (no `document`/`window`, e.g. SSR) this is a no-op — a dev
 * warning is logged and the returned disposer does nothing when called.
 *
 * @example
 * ```ts
 * const qc = createQuery({ staleTime: 30_000 });
 * const unbind = bindRefetch(qc);
 * // later — e.g. in a component teardown or route leave:
 * unbind();
 * ```
 */
export function bindRefetch(qc: { refetchStale(): void }, opts?: { signal?: AbortSignal }): () => void {
  const disposers: Array<() => void> = [];
  const hasDocument = typeof document !== 'undefined';
  const hasWindow = typeof window !== 'undefined';

  if (!hasDocument && !hasWindow) {
    warn('bindRefetch() called with no document/window in scope — no listeners attached');
  }

  if (hasDocument) {
    const handler = () => {
      if (document.visibilityState === 'visible') qc.refetchStale();
    };

    document.addEventListener('visibilitychange', handler);
    disposers.push(() => document.removeEventListener('visibilitychange', handler));
  }

  if (hasWindow) {
    const handler = () => qc.refetchStale();

    window.addEventListener('online', handler);
    disposers.push(() => window.removeEventListener('online', handler));
  }

  const unbind = () => {
    for (const dispose of disposers) dispose();
    disposers.length = 0;
  };

  opts?.signal?.addEventListener('abort', unbind, { once: true });

  return unbind;
}
