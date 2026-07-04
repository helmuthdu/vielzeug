import type { Flux, Observer, Unsubscribe } from './types';

import { error, warn } from './_dev';
import { makeAsyncIterator } from './_iterator';
import { clampPositiveInt } from './_numeric';
import { makePipe } from './_pipe';

const NOOP: Unsubscribe = () => {};

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
  fail(err: unknown): void;
}

/**
 * A `BehaviorSubject` is a `Subject` that replays the latest value to
 * any new subscriber immediately on subscription.
 */
export interface BehaviorSubject<T> extends Subject<T> {
  /** The current (latest emitted) value. */
  readonly value: T;
}

/**
 * A `ReplaySubject` is a `Subject` that replays the last N emitted values
 * to any new subscriber immediately on subscription.
 */
export interface ReplaySubject<T> extends Subject<T> {
  /** Snapshot of the current replay buffer (up to `bufferSize` entries). */
  readonly buffer: readonly T[];
}

// ── Shared internals ──────────────────────────────────────────────────────────

interface SubjectCore<T> {
  ac: AbortController;
  broadcast(fn: (obs: Observer<T>) => void): void;
  doSubscribe(observerOrNext: Observer<T> | ((value: T) => void), signal?: AbortSignal): Unsubscribe;
  subscribers: Set<Observer<T>>;
}

function makeCore<T>(): SubjectCore<T> {
  const ac = new AbortController();
  const subscribers = new Set<Observer<T>>();

  function broadcast(fn: (obs: Observer<T>) => void): void {
    for (const obs of [...subscribers]) {
      try {
        fn(obs);
      } catch (err) {
        error('Subscriber threw during broadcast', err);
      }
    }
  }

  function doSubscribe(observerOrNext: Observer<T> | ((value: T) => void), signal?: AbortSignal): Unsubscribe {
    const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

    if (ac.signal.aborted || signal?.aborted) {
      try {
        observer.complete?.();
      } catch {
        /* empty */
      }

      return NOOP;
    }

    subscribers.add(observer);

    const unsub = (): void => {
      subscribers.delete(observer);

      if (signal) signal.removeEventListener('abort', unsub);
    };

    if (signal) signal.addEventListener('abort', unsub, { once: true });

    return unsub;
  }

  return { ac, broadcast, doSubscribe, subscribers };
}

// Safely emit initial replay values; re-check disposed after sync replay.
function replaySubscribe<T>(
  core: SubjectCore<T>,
  replay: () => void,
  observerOrNext: Observer<T> | ((value: T) => void),
  signal?: AbortSignal,
): Unsubscribe {
  const observer: Observer<T> = typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

  if (core.ac.signal.aborted || signal?.aborted) {
    try {
      observer.complete?.();
    } catch {
      /* empty */
    }

    return NOOP;
  }

  replay();

  // Re-check: the synchronous replay may have triggered a dispose.
  if (core.ac.signal.aborted) {
    try {
      observer.complete?.();
    } catch {
      /* empty */
    }

    return NOOP;
  }

  return core.doSubscribe(observer, signal);
}

/**
 * Shared `dispose()` implementation for every `Subject` variant: aborts the core,
 * notifies all active subscribers with `complete()`, and clears the subscriber set.
 * Reused instead of being copy-pasted per factory.
 * @internal
 */
function makeDispose<T>(core: SubjectCore<T>): () => void {
  return () => {
    if (core.ac.signal.aborted) return;

    core.ac.abort();
    core.broadcast((obs) => obs.complete?.());
    core.subscribers.clear();
  };
}

/**
 * Shared `fail()` implementation for every `Subject` variant: aborts the core,
 * notifies all active subscribers with `error()`, and clears the subscriber set.
 * Reused instead of being copy-pasted per factory.
 * @internal
 */
function makeFail<T>(core: SubjectCore<T>): (err: unknown) => void {
  return (err) => {
    if (core.ac.signal.aborted) return;

    core.ac.abort();
    core.broadcast((obs) => obs.error?.(err));
    core.subscribers.clear();
  };
}

// ── createSubject ─────────────────────────────────────────────────────────────

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
  const core = makeCore<T>();
  const dispose = makeDispose(core);
  const fail = makeFail(core);

  const subject: Subject<T> = {
    complete: dispose,

    get disposalSignal(): AbortSignal {
      return core.ac.signal;
    },

    dispose,

    get disposed(): boolean {
      return core.ac.signal.aborted;
    },

    emit(value: T): void {
      if (core.ac.signal.aborted) return;

      core.broadcast((obs) => obs.next(value));
    },

    fail,

    pipe: makePipe(() => subject),

    subscribe(observerOrNext, signal) {
      return core.doSubscribe(observerOrNext, signal);
    },

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return makeAsyncIterator<T>((obs) => core.doSubscribe(obs));
    },

    [Symbol.dispose](): void {
      dispose();
    },
  };

  return subject;
}

// ── createBehaviorSubject ─────────────────────────────────────────────────────

/**
 * Creates a new `BehaviorSubject<T>` with an initial value.
 * Late subscribers immediately receive the current value on subscribe.
 *
 * @example
 * const count = createBehaviorSubject(0);
 * count.subscribe((n) => console.log(n)); // logs 0 immediately
 * count.emit(1);                          // logs 1
 */
export function createBehaviorSubject<T>(initial: T): BehaviorSubject<T> {
  const core = makeCore<T>();
  const dispose = makeDispose(core);
  const fail = makeFail(core);
  let current = initial;

  const subject: BehaviorSubject<T> = {
    complete: dispose,

    get disposalSignal(): AbortSignal {
      return core.ac.signal;
    },

    dispose,

    get disposed(): boolean {
      return core.ac.signal.aborted;
    },

    emit(value: T): void {
      if (core.ac.signal.aborted) return;

      current = value;
      core.broadcast((obs) => obs.next(value));
    },

    fail,

    pipe: makePipe(() => subject),

    subscribe(observerOrNext, signal) {
      return replaySubscribe(
        core,
        () => {
          const observer: Observer<T> =
            typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

          try {
            observer.next(current);
          } catch (err) {
            error('BehaviorSubject: subscriber threw during initial replay', err);
          }
        },
        observerOrNext,
        signal,
      );
    },

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return makeAsyncIterator<T>((obs) =>
        replaySubscribe(
          core,
          () => {
            try {
              obs.next(current);
            } catch (err) {
              error('BehaviorSubject: subscriber threw during initial replay', err);
            }
          },
          obs,
        ),
      );
    },

    [Symbol.dispose](): void {
      dispose();
    },

    get value(): T {
      return current;
    },
  };

  return subject;
}

// ── createReplaySubject ───────────────────────────────────────────────────────

/**
 * Creates a `ReplaySubject<T>` that buffers up to `bufferSize` values and
 * replays them in order to any new subscriber immediately on subscription.
 *
 * @example
 * const history = createReplaySubject<string>(3);
 * history.emit('a');
 * history.emit('b');
 * history.subscribe(console.log); // logs 'a', 'b' immediately
 */
export function createReplaySubject<T>(bufferSize: number): ReplaySubject<T> {
  const core = makeCore<T>();
  const dispose = makeDispose(core);
  const fail = makeFail(core);
  const { clamped, value: max } = clampPositiveInt(bufferSize);
  const buf: T[] = [];

  if (clamped) {
    warn(`createReplaySubject: bufferSize must be a finite integer >= 1, got ${bufferSize} — clamped to ${max}`);
  }

  const subject: ReplaySubject<T> = {
    get buffer(): readonly T[] {
      return buf;
    },

    complete: dispose,

    get disposalSignal(): AbortSignal {
      return core.ac.signal;
    },

    dispose,

    get disposed(): boolean {
      return core.ac.signal.aborted;
    },

    emit(value: T): void {
      if (core.ac.signal.aborted) return;

      if (buf.length >= max) buf.shift();

      buf.push(value);
      core.broadcast((obs) => obs.next(value));
    },

    fail,

    pipe: makePipe(() => subject),

    subscribe(observerOrNext, signal) {
      return replaySubscribe(
        core,
        () => {
          const observer: Observer<T> =
            typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext;

          for (const v of buf) {
            try {
              observer.next(v);
            } catch (err) {
              error('ReplaySubject: subscriber threw during replay', err);
            }
          }
        },
        observerOrNext,
        signal,
      );
    },

    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return makeAsyncIterator<T>((obs) =>
        replaySubscribe(
          core,
          () => {
            for (const v of buf) {
              try {
                obs.next(v);
              } catch (err) {
                error('ReplaySubject: subscriber threw during replay', err);
              }
            }
          },
          obs,
        ),
      );
    },

    [Symbol.dispose](): void {
      dispose();
    },
  };

  return subject;
}
