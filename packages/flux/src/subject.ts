import { assertNonNegativeInteger } from './_numeric';
import { stream } from './core';
import type { Sink, Stream } from './types';

export type ChannelOptions<T> = {
  initial?: T;
  replay?: number;
};

export type Channel<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  send(value: T): void;
  readonly stream: Stream<T>;
};

function replayCapacity<T>(options: ChannelOptions<T>): number {
  const capacity = options.replay ?? ('initial' in options ? 1 : 0);

  assertNonNegativeInteger(capacity, 'Channel replay');

  return capacity;
}

/** Channels own mutable multicast state; disposal is their only terminal event. */
export function createChannel<T>(options: ChannelOptions<T> = {}): Channel<T> {
  const capacity = replayCapacity(options);
  const controller = new AbortController();
  const listeners = new Set<Sink<T>>();
  const replay: T[] = [];

  if ('initial' in options && capacity > 0) replay.push(options.initial as T);

  const source = stream<T>((sink) => {
    for (const value of replay) sink.next(value);

    if (controller.signal.aborted) {
      sink.complete();

      return;
    }

    listeners.add(sink);

    return () => listeners.delete(sink);
  });

  const dispose = (): void => {
    if (controller.signal.aborted) return;

    controller.abort();

    for (const listener of [...listeners]) listener.complete();

    listeners.clear();
  };

  return {
    get disposalSignal(): AbortSignal {
      return controller.signal;
    },
    dispose,
    get disposed(): boolean {
      return controller.signal.aborted;
    },
    send(value: T): void {
      if (controller.signal.aborted) return;

      if (capacity > 0) {
        if (replay.length === capacity) replay.shift();

        replay.push(value);
      }

      for (const listener of [...listeners]) listener.next(value);
    },
    stream: source,
    [Symbol.dispose]: dispose,
  };
}
