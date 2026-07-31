import type { Flux } from '../types';

import { flux } from '../core';

/**
 * Minimal shape of a courier query handle needed to subscribe to state changes.
 * Avoids a hard import of `@vielzeug/courier` types that are not in the peer dep.
 *
 * @internal
 */
type QueryHandle<T> = {
  getSnapshot(): T;
  subscribe(onStoreChange: () => void): () => void;
};

type StreamEvent<T> = { readonly data: T; readonly event: string };

/**
 * Create a `Flux` from Courier's SSE AsyncIterable and emit events with the selected name.
 *
 * @example
 * const events$ = fromSse(courier.events('/events'), 'message');
 * events$.subscribe((data) => console.log(data));
 */
export function fromSse<T>(source: AsyncIterable<StreamEvent<T>>, event: string): Flux<T> {
  return flux<T>((observer) => {
    let cancelled = false;
    const iterator = source[Symbol.asyncIterator]();

    void (async () => {
      try {
        while (!cancelled) {
          const next = await iterator.next();

          if (next.done) {
            observer.complete?.();

            return;
          }

          if (next.value.event === event) observer.next(next.value.data);
        }
      } catch (error) {
        if (!cancelled) observer.error?.(error);
      }
    })();

    return () => {
      cancelled = true;
      void iterator.return?.();
    };
  });
}

/**
 * Create a `Flux` from a courier query handle.
 * Emits the current state immediately, then on every state change.
 *
 * @example
 * const data$ = fromQuery(courier.queries.create({ key: ['users'], fetch: fetchUsers }));
 * data$.subscribe((state) => console.log(state.status, state.data));
 */
export function fromQuery<T>(query: QueryHandle<T>): Flux<T> {
  return flux<T>((observer) => {
    observer.next(query.getSnapshot());

    const unsub = query.subscribe(() => {
      observer.next(query.getSnapshot());
    });

    return unsub;
  });
}
