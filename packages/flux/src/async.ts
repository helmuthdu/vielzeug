import { toIterator } from './_iterator';
import type { AsyncIterableOptions, Stream } from './types';

/** Converts a push stream into an async iterable with an explicit overflow policy. */
export function toAsyncIterable<T>(source: Stream<T>, options: AsyncIterableOptions): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return toIterator(source, options);
    },
  };
}
