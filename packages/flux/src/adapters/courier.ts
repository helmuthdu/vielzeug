import type { Stream } from '../types';

import { stream } from '../core';

type QueryHandle<T> = {
  getSnapshot(): T;
  subscribe(onStoreChange: () => void): () => void;
};

type StreamEvent<T> = { readonly data: T; readonly event: string };

export function fromSse<T>(source: AsyncIterable<StreamEvent<T>>, event: string): Stream<T> {
  return stream((sink, signal) => {
    const iterator = source[Symbol.asyncIterator]();

    void (async () => {
      try {
        while (!signal.aborted) {
          const result = await iterator.next();

          if (result.done) {
            sink.complete();

            return;
          }

          if (result.value.event === event) sink.next(result.value.data);
        }
      } catch (reason) {
        if (!signal.aborted) sink.error(reason);
      }
    })();

    return () => {
      void iterator.return?.();
    };
  });
}

export function fromQuery<T>(query: QueryHandle<T>): Stream<T> {
  return stream((sink) => {
    sink.next(query.getSnapshot());

    return query.subscribe(() => sink.next(query.getSnapshot()));
  });
}
