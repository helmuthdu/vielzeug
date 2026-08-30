import type { AsyncState, QueryCache, QueryDefinition } from '@vielzeug/courier';
import { stream } from '../core';
import type { Stream } from '../types';

export function fromQuery<T>(cache: QueryCache, definition: QueryDefinition<T>): Stream<AsyncState<T> | null> {
  return stream((sink) => {
    const snapshot = () => cache.getSnapshot<T>(definition.key);

    sink.next(snapshot());

    return cache.subscribe(definition.key, () => sink.next(snapshot()));
  });
}
