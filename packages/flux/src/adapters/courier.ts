import type { Stream } from '../types';

import { stream } from '../core';

type QueryCache = {
  getSnapshot<T>(key: readonly unknown[]): T | null;
  subscribe(key: readonly unknown[], onStoreChange: () => void): () => void;
};

type QueryDefinition = {
  fetch: (...args: never[]) => Promise<unknown>;
  key: readonly unknown[];
};

type QuerySnapshot<T> =
  | {
      readonly data: undefined;
      readonly error: null;
      readonly isFetching: boolean;
      readonly status: 'loading';
      readonly updatedAt: undefined;
    }
  | {
      readonly data: T;
      readonly error: null;
      readonly isFetching: boolean;
      readonly status: 'success';
      readonly updatedAt: number;
    }
  | {
      readonly data: T | undefined;
      readonly error: Error;
      readonly isFetching: false;
      readonly status: 'error';
      readonly updatedAt: number;
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

export function fromQuery<T extends QueryDefinition>(
  cache: QueryCache,
  definition: T,
): Stream<QuerySnapshot<Awaited<ReturnType<T['fetch']>>> | null> {
  return stream((sink) => {
    const snapshot = () => cache.getSnapshot<QuerySnapshot<Awaited<ReturnType<T['fetch']>>>>(definition.key);

    sink.next(snapshot());

    return cache.subscribe(definition.key, () => sink.next(snapshot()));
  });
}
