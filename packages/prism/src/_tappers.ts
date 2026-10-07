/**
 * Shared `tap()` machinery for chart handles.
 *
 * @internal Private to the package: consumers observe charts through
 * `ChartHandle.tap()`, never through this module.
 */

export interface Tappers<E extends { readonly type: string }> {
  /** Delivers `event` to every registered handler, swallowing handler errors. */
  emit(event: E): void;
  /** Clears every handler; later `tap()` calls return a no-op unsubscribe. */
  stop(): void;
  tap(handler: (event: E) => void, options?: { readonly signal?: AbortSignal }): () => void;
}

export function createTappers<E extends { readonly type: string }>(): Tappers<E> {
  const tappers = new Set<(event: E) => void>();
  let stopped = false;

  return {
    emit(event) {
      // Zero-overhead guard: observation costs nothing while nobody is watching.
      if (tappers.size === 0) return;

      for (const handler of tappers) {
        try {
          handler(event);
        } catch {
          // Observability must never affect chart behavior.
        }
      }
    },
    stop() {
      stopped = true;
      tappers.clear();
    },
    tap(handler, options) {
      if (stopped || options?.signal?.aborted) return () => {};

      tappers.add(handler);

      const detach = (): void => {
        tappers.delete(handler);
      };

      options?.signal?.addEventListener('abort', detach, { once: true });

      return detach;
    },
  };
}
