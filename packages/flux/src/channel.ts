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
  const hasInitial = 'initial' in options;
  const capacity = options.replay ?? (hasInitial ? 1 : 0);

  assertNonNegativeInteger(capacity, 'Channel replay');

  if (hasInitial && capacity === 0) {
    throw new RangeError(
      'Channel replay cannot be 0 when initial is provided — the initial value would be immediately dropped',
    );
  }

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
    // Disposed channels complete new subscribers immediately without replaying
    // retained values — a late subscriber never observes stale state.
    if (controller.signal.aborted) {
      sink.complete();

      return;
    }

    for (const value of replay) sink.next(value);

    listeners.add(sink);

    return () => listeners.delete(sink);
  });

  const dispose = (): void => {
    if (controller.signal.aborted) return;

    controller.abort();

    for (const listener of [...listeners]) listener.complete();

    listeners.clear();
  };

  let dispatching = false;
  const pending: T[] = [];

  const flush = (): void => {
    dispatching = true;

    try {
      while (pending.length > 0) {
        const value = pending.shift()!;

        if (capacity > 0) {
          if (replay.length === capacity) replay.shift();

          replay.push(value);
        }

        for (const listener of [...listeners]) listener.next(value);
      }
    } finally {
      dispatching = false;
    }
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

      pending.push(value);

      // Reentrant sends (a listener calling `send` while receiving a previous
      // value) are queued so every listener observes one global FIFO order.
      if (!dispatching) flush();
    },
    stream: source,
    [Symbol.dispose]: dispose,
  };
}
