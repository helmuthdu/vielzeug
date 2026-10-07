/**
 * The `tap()` machinery shared by the host and guest handles. Kept private: the
 * public contract is each handle's `tap` method and its event union, not this.
 *
 * Follows the repo observability rules: zero overhead with no tappers, handler
 * errors swallowed, auto-detach on an abort signal, and a no-op unsubscribe once
 * the handle has stopped.
 */
export interface Tappers<E extends { readonly type: string }> {
  /** Emits to every tapper; a no-op when none are registered. */
  emit(event: E): void;
  /** Drops every tapper and makes later `tap` calls no-ops. Idempotent. */
  stop(): void;
  tap(handler: (event: E) => void, options?: { readonly signal?: AbortSignal }): () => void;
}

export function createTappers<E extends { readonly type: string }>(): Tappers<E> {
  const tappers = new Set<(event: E) => void>();
  let stopped = false;

  return {
    emit(event): void {
      if (tappers.size === 0) return;
      for (const tapper of tappers) {
        try {
          tapper(event);
        } catch {
          // Observability must not affect session behavior.
        }
      }
    },
    stop(): void {
      stopped = true;
      tappers.clear();
    },
    tap(handler, options): () => void {
      if (stopped || options?.signal?.aborted) return () => {};
      const detach = (): void => {
        tappers.delete(handler);
      };
      tappers.add(handler);
      options?.signal?.addEventListener('abort', detach, { once: true });
      return detach;
    },
  };
}
