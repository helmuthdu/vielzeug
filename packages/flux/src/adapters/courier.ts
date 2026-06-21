import type { SseSource } from '@vielzeug/courier';

import type { Flux } from '../types';

import { flux } from '../core';

/**
 * Minimal shape of a courier `SyncStore` needed to subscribe to query state changes.
 * Avoids a hard import of `@vielzeug/courier` types that are not in the peer dep.
 *
 * @internal
 */
type SyncStore<T> = {
  peek(): T;
  subscribe(onStoreChange: () => void): () => void;
};

/**
 * Create a `Flux` from an SSE source returned by `streamClient.sse()`.
 * Emits typed SSE events under `event`. The current SSE status is NOT emitted —
 * only data messages are forwarded.
 *
 * @example
 * const events$ = fromSse(stream.sse('/events'), 'message');
 * events$.subscribe((data) => console.log(data));
 */
export function fromSse<TEvents extends Record<string, unknown>, K extends keyof TEvents & string>(
  source: SseSource<TEvents>,
  event: K,
): Flux<TEvents[K]> {
  return flux<TEvents[K]>((observer) => {
    const unsub = source.on(event, (data) => observer.next(data));

    return unsub;
  });
}

/**
 * Create a `Flux` from a courier `SyncStore` (returned by `qc.observe()`).
 * Emits the current state immediately, then on every state change.
 *
 * @example
 * const data$ = fromQuery(qc.observe({ key: ['users'], fn: fetchUsers }));
 * data$.subscribe((state) => console.log(state.status, state.data));
 */
export function fromQuery<T>(store: SyncStore<T>): Flux<T> {
  return flux<T>((observer) => {
    observer.next(store.peek());

    const unsub = store.subscribe(() => {
      observer.next(store.peek());
    });

    return unsub;
  });
}
