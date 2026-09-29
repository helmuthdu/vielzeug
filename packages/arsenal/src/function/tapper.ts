import type { Unsubscribe } from '../types';

const noop = (): void => {};

/** Shared runtime-observation hub used by `tap()` methods across `@vielzeug/*` packages. */
export interface Tapper<Event> {
  /** Remove all handlers (call from `dispose()`). */
  clear(): void;
  /** Deliver an event to every handler. Handler errors are swallowed; zero cost when idle. */
  emit(event: Event): void;
  /** Number of registered handlers. */
  readonly size: number;
  /** Register a handler; auto-detaches when `signal` aborts. Returns an unsubscribe function. */
  tap(handler: (event: Event) => void, options?: { readonly signal?: AbortSignal }): Unsubscribe;
}

/**
 * Minimal tapper hub: a handler set with swallow-on-error dispatch, optional
 * `AbortSignal` auto-detach, and a zero-overhead guard when no handlers exist.
 *
 * @example
 * ```ts
 * const tappers = tapper<MyEvent>();
 * const unsubscribe = tappers.tap((event) => console.debug(event), { signal });
 * tappers.emit({ type: 'started' });
 * ```
 */
export function tapper<Event>(): Tapper<Event> {
  const handlers = new Set<(event: Event) => void>();

  return {
    clear(): void {
      handlers.clear();
    },
    emit(event: Event): void {
      if (handlers.size === 0) return;
      for (const handler of [...handlers]) {
        try {
          handler(event);
        } catch {
          // Observability must never affect package behavior.
        }
      }
    },
    get size(): number {
      return handlers.size;
    },
    tap(handler: (event: Event) => void, options?: { readonly signal?: AbortSignal }): Unsubscribe {
      const signal = options?.signal;
      if (signal?.aborted) return noop;

      handlers.add(handler);

      const detach = (): void => {
        handlers.delete(handler);
        signal?.removeEventListener('abort', detach);
      };

      signal?.addEventListener('abort', detach, { once: true });

      return detach;
    },
  };
}
