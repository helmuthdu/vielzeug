import type { Readable } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { Stream, Subscription } from '../types';

import { error } from '../_dev';
import { stream } from '../core';

export type ToSignalOptions<T> = {
  initial: T;
  signal?: AbortSignal;
};

export type SignalBinding<T> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly signal: Readable<T>;
  readonly value: T;
};

export function fromSignal<T>(source: Readable<T>): Stream<T> {
  return stream((sink) => {
    sink.next(source.value);

    return source.subscribe(() => sink.next(source.value));
  });
}

export function toSignal<T>(source: Stream<T>, options: ToSignalOptions<T>): SignalBinding<T> {
  const target = signal(options.initial);
  const controller = new AbortController();
  const subscriptionRef: { current?: Subscription } = {};

  const dispose = (): void => {
    if (controller.signal.aborted) return;

    controller.abort();
    options.signal?.removeEventListener('abort', dispose);
    subscriptionRef.current?.unsubscribe();
  };

  if (options.signal?.aborted) controller.abort();

  subscriptionRef.current = source.subscribe(
    {
      complete: dispose,
      error(reason) {
        error('toSignal source error', reason);
        dispose();
      },
      next(value) {
        target.value = value;
      },
    },
    { signal: controller.signal },
  );

  if (!controller.signal.aborted) options.signal?.addEventListener('abort', dispose, { once: true });

  return {
    get disposalSignal(): AbortSignal {
      return controller.signal;
    },
    dispose,
    get disposed(): boolean {
      return controller.signal.aborted;
    },
    get signal(): Readable<T> {
      return target;
    },
    [Symbol.dispose]: dispose,
    get value(): T {
      return target.value;
    },
  };
}
