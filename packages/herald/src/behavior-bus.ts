import type { InternalBusOptions } from './bus';
import type {
  BehaviorBus,
  BehaviorBusOptions,
  BehaviorInitial,
  EmissionErrorContext,
  EventKey,
  EventMap,
  Listener,
  SubscribeOptions,
  Unsubscribe,
} from './types';

import { makeBusDelegate } from './_delegate';
import { createBus, noop } from './bus';

/**
 * Creates a bus that replays the last known value for each event to new subscribers.
 *
 * When a listener subscribes via `on()` or `once()`, it immediately receives the current
 * buffered value for that event (if any have been emitted or were provided as initial values).
 * `events()`, `wait()`, and `waitAny()` behave like a regular bus — no replay.
 *
 * @param initial - Optional map of event names to their starting values.
 * @param options - Standard bus options.
 *
 * @example
 * const bus = createBehaviorBus<{ count: number }>({ count: 0 });
 * bus.on('count', (n) => console.log(n)); // logs 0 immediately
 * bus.emit('count', 1);
 * bus.on('count', (n) => console.log(n)); // logs 1 immediately (latest value)
 */
export function createBehaviorBus<T extends EventMap>(
  initial?: BehaviorInitial<T>,
  options?: BehaviorBusOptions<T>,
): BehaviorBus<T> {
  // Flat buffer: one value per event key.
  // Seeded from initial values; updated via _onDispatch when dispatch actually runs.
  const buffers = new Map<string, unknown>(Object.entries(initial ?? {}).filter(([, v]) => v !== undefined));

  // _onDispatch fires after middleware passes (dispatch guaranteed to run).
  // This replaces the sentinel-middleware + mutable-flag pattern.
  const bus = createBus<T>({
    ...options,
    _onDispatch: (event: EventKey<T>, payload: unknown) => {
      buffers.set(event as string, payload);
    },
  } as InternalBusOptions<T>);

  // Wrap listener calls during synchronous replay so throws route through onError when set.
  function callSafeReplay(listener: Listener<unknown>, event: EventKey<T>, value: unknown): void {
    try {
      listener(value);
    } catch (err) {
      if (options?.onError) {
        options.onError({ err, event, payload: value, timestamp: Date.now() } as EmissionErrorContext<T>);
      } else {
        throw err;
      }
    }
  }

  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe {
    if (bus.disposed || opts?.signal?.aborted) return noop;

    if (buffers.has(event as string)) {
      const value = buffers.get(event as string) as T[K];

      if (opts?.once) {
        callSafeReplay(listener as Listener<unknown>, event, value);

        return noop;
      }

      callSafeReplay(listener as Listener<unknown>, event, value);
    }

    return bus.on(event, listener, opts);
  }

  function once<K extends EventKey<T>>(
    event: K,
    listener: Listener<T[K]>,
    opts?: { signal?: AbortSignal },
  ): Unsubscribe {
    return on(event, listener, { once: true, signal: opts?.signal });
  }

  function current<K extends EventKey<T>>(event: K): T[K] | undefined {
    return buffers.has(event as string) ? (buffers.get(event as string) as T[K]) : undefined;
  }

  function reset(event?: EventKey<T>): void {
    if (event !== undefined) buffers.delete(event as string);
    else buffers.clear();
  }

  function snapshot(): Partial<T> {
    const result: Partial<T> = {};

    for (const [key, value] of buffers) {
      (result as Record<string, unknown>)[key] = value;
    }

    return result;
  }

  function dispose(): void {
    bus.dispose();
    buffers.clear();
  }

  const delegate = makeBusDelegate<T>(bus) as BehaviorBus<T>;

  delegate.current = current;
  delegate.dispose = dispose;
  delegate.on = on;
  delegate.once = once;
  delegate.reset = reset;
  delegate.snapshot = snapshot;
  delegate[Symbol.dispose] = dispose;

  return delegate;
}
