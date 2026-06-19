import type { Flux, Observer, Operator, Unsubscribe } from './types';

import { issue } from './_warn';
import { FluxDisposedError } from './errors';

/**
 * A `Subject` is both a `Flux` and a manual emission handle.
 * Calling `emit()` pushes a value to all active subscribers.
 *
 * A Subject is hot — all subscribers share the same emission sequence.
 * Subscribers that subscribe after an emission will NOT receive past values.
 * Use `BehaviorSubject` to replay the latest value to late subscribers.
 */
export interface Subject<T> extends Flux<T> {
  /** `true` after `dispose()` or `complete()` is called. */
  readonly disposed: boolean;
  /** Emit a complete signal to all subscribers and dispose the subject. */
  complete(): void;
  /** Push a value to all active subscribers. */
  emit(value: T): void;
  /** Push an error to all active subscribers and dispose the subject. */
  error(err: unknown): void;
}

/**
 * A `BehaviorSubject` is a `Subject` that replays the latest value to
 * any new subscriber immediately on subscription.
 */
export interface BehaviorSubject<T> extends Subject<T> {
  /** The current (latest emitted) value. */
  readonly value: T;
}

export type BehaviorSubjectOptions<T> = {
  initial: T;
};

function makeSubject<T>(): Subject<T> {
  const ac = new AbortController();
  const subscribers = new Set<Observer<T>>();

  function broadcast(fn: (obs: Observer<T>) => void): void {
    for (const obs of [...subscribers]) {
      try {
        fn(obs);
      } catch (err) {
        issue('Subscriber threw during broadcast', err);
      }
    }
  }

  const subject: Subject<T> = {
    complete(): void {
      if (ac.signal.aborted) return;

      ac.abort();
      broadcast((obs) => obs.complete?.());
      subscribers.clear();
    },

    get disposalSignal(): AbortSignal {
      return ac.signal;
    },

    dispose(): void {
      if (ac.signal.aborted) return;

      ac.abort();
      subscribers.clear();
    },

    get disposed(): boolean {
      return ac.signal.aborted;
    },

    emit(value: T): void {
      if (ac.signal.aborted) return;

      broadcast((obs) => obs.next(value));
    },

    error(err: unknown): void {
      if (ac.signal.aborted) return;

      ac.abort();
      broadcast((obs) => obs.error?.(err));
      subscribers.clear();
    },

    pipe(...operators: Operator[]): Flux<unknown> {
      return operators.reduce((f: Flux<unknown>, op) => op(f), this as Flux<unknown>);
    },

    subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Unsubscribe {
      if (ac.signal.aborted) throw new FluxDisposedError();

      const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

      subscribers.add(observer);

      return (): void => {
        subscribers.delete(observer);
      };
    },

    [Symbol.dispose](): void {
      this.dispose();
    },
  };

  return subject;
}

/**
 * Creates a new `Subject<T>`.
 *
 * @example
 * const events = createSubject<string>();
 * events.subscribe((s) => console.log(s));
 * events.emit('hello');
 * events.dispose();
 */
export function createSubject<T>(): Subject<T> {
  return makeSubject<T>();
}

/**
 * Creates a new `BehaviorSubject<T>` with an initial value.
 * Late subscribers immediately receive the current value on subscribe.
 *
 * @example
 * const count = createBehaviorSubject({ initial: 0 });
 * count.subscribe((n) => console.log(n)); // logs 0 immediately
 * count.emit(1);                          // logs 1
 */
export function createBehaviorSubject<T>(opts: BehaviorSubjectOptions<T>): BehaviorSubject<T> {
  const base = makeSubject<T>();
  let current = opts.initial;

  const subject: BehaviorSubject<T> = {
    complete(): void {
      base.complete();
    },

    get disposalSignal(): AbortSignal {
      return base.disposalSignal;
    },

    dispose(): void {
      base.dispose();
    },

    get disposed(): boolean {
      return base.disposed;
    },

    emit(value: T): void {
      current = value;
      base.emit(value);
    },

    error(err: unknown): void {
      base.error(err);
    },

    pipe(...operators: Operator[]): Flux<unknown> {
      return operators.reduce((f: Flux<unknown>, op) => op(f), this as Flux<unknown>);
    },

    subscribe(observerOrNext: Observer<T> | ((value: T) => void)): Unsubscribe {
      if (base.disposed) throw new FluxDisposedError();

      const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

      try {
        observer.next(current);
      } catch (err) {
        issue('BehaviorSubject: subscriber threw during initial replay', err);
      }

      return base.subscribe(observer);
    },

    [Symbol.dispose](): void {
      this.dispose();
    },

    get value(): T {
      return current;
    },
  };

  return subject;
}
