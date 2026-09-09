import { toIterator } from './_iterator.js';
import type { AsyncIterableOptions, Stream } from './types.js';

/** Converts a push stream into an async iterable with an explicit overflow policy. */
export function toAsyncIterable<T>(source: Stream<T>, options: AsyncIterableOptions): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return toIterator(source, options);
    },
  };
}
