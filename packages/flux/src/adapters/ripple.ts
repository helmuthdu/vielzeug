import type { ReadonlySignal, Signal } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { Flux } from '../types';

import { issue } from '../_warn';
import { flux } from '../core';

/**
 * Create a `Flux` that emits a new value every time a ripple `ReadonlySignal` changes.
 * The current value is emitted immediately on subscribe.
 *
 * @example
 * const count = signal(0);
 * const count$ = fromSignal(count);
 * count$.subscribe((n) => console.log(n)); // logs 0 immediately, then on every change
 */
export function fromSignal<T>(source: ReadonlySignal<T>): Flux<T> {
  return flux<T>((observer) => {
    observer.next(source.value);

    const subscription = source.subscribe(() => {
      observer.next(source.value);
    });

    return () => subscription.dispose();
  });
}

export type ToSignalOptions<T> = {
  /** Initial value before the first emission. */
  initial: T;
  /**
   * Optional `AbortSignal` that stops the flux subscription independently
   * of signal disposal. Useful when you do not own the signal's lifetime.
   */
  signal?: AbortSignal;
};

/**
 * Create a ripple `Signal` whose value is updated by each emission from a `Flux`.
 * The signal starts with `opts.initial` and is automatically updated as the flux emits.
 *
 * The returned signal is owned by the caller — call `dispose()` to stop tracking.
 *
 * @example
 * const latest = toSignal(count$, { initial: 0 });
 * effect(() => console.log(latest.value));
 */
export function toSignal<T>(source: Flux<T>, opts: ToSignalOptions<T>): Signal<T> {
  const sig = signal<T>(opts.initial);
  const unsub = source.subscribe({
    error(err) {
      issue('toSignal: source errored — signal value may be stale', err);
    },
    next(v) {
      if (!sig.disposed) sig.value = v;
    },
  });

  if (opts.signal) {
    if (opts.signal.aborted) {
      unsub();
    } else {
      opts.signal.addEventListener('abort', unsub, { once: true });
    }
  }

  const originalDispose = sig.dispose.bind(sig);

  sig.dispose = (): void => {
    unsub();
    originalDispose();
  };

  return sig;
}
