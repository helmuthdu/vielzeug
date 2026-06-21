import type { Readable } from '@vielzeug/ripple';

import { signal } from '@vielzeug/ripple';

import type { Flux } from '../types';

import { issue } from '../_warn';
import { flux } from '../core';

/**
 * Create a `Flux` that emits a new value every time a ripple `Reactive` changes.
 * The current value is emitted immediately on subscribe.
 *
 * @example
 * const count = signal(0);
 * const count$ = fromSignal(count);
 * count$.subscribe((n) => console.log(n)); // logs 0 immediately, then on every change
 */
export function fromSignal<T>(source: Readable<T>): Flux<T> {
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
   * Optional `AbortSignal` that stops tracking independently of disposal.
   * Useful when the caller does not own the flux's lifetime.
   */
  signal?: AbortSignal;
};

/**
 * A handle returned by `toSignal()` that wraps a ripple signal updated by a `Flux`.
 * Exposes `value` (reactive — usable in ripple `effect()` calls) and `dispose()` to
 * stop tracking. The underlying signal retains its last value after disposal.
 */
export type SignalBinding<T> = {
  /** ES2026 `using` compatible disposal. */
  [Symbol.dispose](): void;
  /** AbortSignal that aborts when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Stop tracking the source `Flux` and freeze the signal value. */
  dispose(): void;
  /** `true` after `dispose()` is called. */
  readonly disposed: boolean;
  /** The underlying ripple `Readable<T>` for use with ripple operators. */
  readonly signal: Readable<T>;
  /** The current tracked value (reactive — reads track in ripple effects). */
  readonly value: T;
};

/**
 * Create a `SignalBinding<T>` whose value is updated by each emission from a `Flux`.
 * The binding starts with `opts.initial` and updates reactively as the flux emits.
 *
 * Call `dispose()` to stop tracking; the last value remains readable after disposal.
 *
 * @example
 * const latest = toSignal(count$, { initial: 0 });
 * effect(() => console.log(latest.value)); // reactive — re-runs on flux emissions
 * latest.dispose(); // stop tracking
 */
export function toSignal<T>(source: Flux<T>, opts: ToSignalOptions<T>): SignalBinding<T> {
  const sig = signal<T>(opts.initial);
  const ac = new AbortController();

  const unsub = source.subscribe(
    {
      error(err) {
        issue('toSignal: source errored — signal value may be stale', err);
      },
      next(v) {
        sig.value = v;
      },
    },
    opts.signal,
  );

  const dispose = (): void => {
    if (ac.signal.aborted) return;

    ac.abort();
    unsub();
  };

  return {
    get disposalSignal(): AbortSignal {
      return ac.signal;
    },
    dispose,
    get disposed(): boolean {
      return ac.signal.aborted;
    },
    get signal(): Readable<T> {
      return sig;
    },
    [Symbol.dispose](): void {
      dispose();
    },
    get value(): T {
      return sig.value;
    },
  };
}
