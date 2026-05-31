import type {
  BehaviorBus,
  BehaviorBusOptions,
  BehaviorInitial,
  BusOptions,
  EmissionErrorContext,
  EventKey,
  EventMap,
  Listener,
  SubscribeOptions,
  Unsubscribe,
} from './types';

import { makeBusDelegate } from './_delegate';
import { createBus } from './bus';

/**
 * Creates a bus that replays the last known value(s) for each event to new subscribers.
 *
 * When a listener subscribes via `on()` or `once()`, it immediately receives the current
 * buffered value(s) for that event (if any have been emitted or were provided as initial values).
 * `events()`, `wait()`, and `waitAny()` behave like a regular bus — no replay.
 *
 * @param initial - Optional map of event names to their starting values.
 * @param options - Bus options plus optional `replay` count (default: 1).
 *
 * @example
 * const bus = createBehaviorBus<{ count: number }>({ count: 0 });
 * bus.on('count', (n) => console.log(n)); // logs 0 immediately
 * bus.emit('count', 1);
 * bus.on('count', (n) => console.log(n)); // logs 1 immediately (latest value)
 *
 * @example — replay window
 * const bus = createBehaviorBus<{ msg: string }>({}, { replay: 3 });
 * bus.emit('msg', 'a'); bus.emit('msg', 'b'); bus.emit('msg', 'c');
 * bus.on('msg', console.log); // logs 'a', 'b', 'c' synchronously
 */
export function createBehaviorBus<T extends EventMap>(
  initial?: BehaviorInitial<T>,
  options?: BehaviorBusOptions<T>,
): BehaviorBus<T> {
  // F4: replay window — number of most-recent values replayed to new subscribers.
  const replayCount = options?.replay ?? 1;

  // R4: Pass options through to createBus unchanged (no onDispatch interception).
  // Capture values by wrapping emit() instead.
  const { replay: _replay, ...busOptions } = options ?? {};
  const bus = createBus<T>(busOptions as BusOptions<T>);

  // Replay buffers: Map<eventKey, last N payloads>. Seeded from initial values.
  const buffers = new Map<string, unknown[]>(Object.entries(initial ?? {}).map(([k, v]) => [k, [v]]));

  // Wrap listener calls during synchronous replay so that throws are routed through
  // options.onError when configured — matching the behaviour of live emit() calls.
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

  // R4: Wrap emit() to capture current values before dispatching to listeners.
  // This is explicit and decoupled from onDispatch — current() always returns the latest value
  // for the currently-dispatching event, even inside a listener callback.
  function emit<K extends EventKey<T>>(event: K, ...args: T[K] extends void ? [] : [T[K]]): number {
    const payload = (args as unknown[])[0];
    const buf = buffers.get(event as string) ?? [];

    buf.push(payload);

    if (buf.length > replayCount) buf.shift();

    buffers.set(event as string, buf);

    return bus.emit(event, ...(args as []));
  }

  function getCurrent<K extends EventKey<T>>(event: K): T[K] | undefined {
    const buf = buffers.get(event as string);

    return buf !== undefined && buf.length > 0 ? (buf[buf.length - 1] as T[K]) : undefined;
  }

  // F2 (via on()): Replay buffered values synchronously to new subscribers.
  // For `once: true`, only the latest value is replayed (preserves the "fires exactly once" contract).
  // For regular subscriptions with replay > 1, all buffered values are replayed in order.
  function on<K extends EventKey<T>>(event: K, listener: Listener<T[K]>, opts?: SubscribeOptions): Unsubscribe {
    if (bus.disposed || opts?.signal?.aborted) return () => {};

    const buf = buffers.get(event as string);

    if (buf?.length) {
      if (opts?.once) {
        // Replay latest value only — preserves the "fires exactly once" contract.
        callSafeReplay(listener as Listener<unknown>, event, buf[buf.length - 1] as T[K]);

        return () => {};
      }

      for (const value of buf) {
        callSafeReplay(listener as Listener<unknown>, event, value as T[K]);
      }
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

  function dispose(): void {
    bus.dispose();
    buffers.clear();
  }

  // R5: Use makeBusDelegate to avoid enumerating every Bus<T> method.
  // Override only the four methods that differ from the underlying bus.
  const delegate = makeBusDelegate<T>(bus) as BehaviorBus<T>;

  delegate.current = getCurrent;
  delegate.dispose = dispose;
  delegate.emit = emit as Bus<T>['emit'];
  delegate.on = on;
  delegate.once = once;
  delegate[Symbol.dispose] = dispose;

  return delegate;
}
