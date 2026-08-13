import type { Bus, EventKey, EventMap } from '@vielzeug/herald';
import { link } from '../_link';
import { tryCall } from '../_safe';
import { stream } from '../core';
import type { Operator, Stream } from '../types';

export function fromBus<T extends EventMap, K extends EventKey<T>>(bus: Bus<T>, event: K): Stream<T[K]> {
  return stream((sink) => bus.on(event, (payload) => sink.next(payload)));
}

export function toBus<T extends EventMap, K extends EventKey<T>>(bus: Bus<T>, event: K): Operator<T[K], T[K]> {
  return (source) =>
    stream(
      (sink, signal) =>
        link(
          source,
          {
            complete: sink.complete,
            error: sink.error,
            next(value) {
              tryCall(() => {
                bus.emit(event, ...((value === undefined ? [] : [value]) as T[K] extends void ? [] : [T[K]]));
                sink.next(value);
              }, sink.error);
            },
          },
          signal,
        ).unsubscribe,
    );
}
