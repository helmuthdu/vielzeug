import type { Observer, Stream, Subscription } from './types';

/** Every operator forwards its own lifetime to every upstream subscription. */
export function link<T>(source: Stream<T>, observer: Observer<T>, signal: AbortSignal): Subscription {
  return source.subscribe(observer, { signal });
}
