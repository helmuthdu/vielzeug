import { abortError, tapper } from '@vielzeug/arsenal';
import { unrefTimer } from './_timers.js';
import {
  FamiliarInvalidOptionsError,
  FamiliarQueueFullError,
  type FamiliarRuntimeError,
  FamiliarTerminatedError,
  FamiliarTimeoutError,
} from './errors.js';
import type { DrainOptions, FamiliarTapEvent, WorkerStats, WorkerStatus } from './types.js';

export const MAX_CONCURRENCY = 512;
export const MAX_TIMEOUT = 2_147_483_647;

export function validatePriority(priority: number): number {
  if (!Number.isFinite(priority)) throw new FamiliarInvalidOptionsError('`priority` must be a finite number');
  return priority;
}

export function validateTimeout(timeout: number | undefined, name = 'timeout'): number | undefined {
  if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_TIMEOUT)) {
    throw new FamiliarInvalidOptionsError(`\`${name}\` must be an integer from 1 through ${MAX_TIMEOUT}`);
  }
  return timeout;
}

export type PoolOptions = {
  defaultTimeout: number | undefined;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
};

export type AcquireOptions = {
  priority: number;
  signal?: AbortSignal;
};

/**
 * A pool slot: tearable on disposal, with an optional channel for reporting
 * unhandled runtime errors. Pool factories wire `notify` to the core's tap so
 * slot owners can emit without holding a pool reference.
 */
export type PoolSlot = {
  notify?(error: FamiliarRuntimeError): void;
  terminate(): void;
};

type IdleWaiter = {
  reject: (reason: unknown) => void;
  resolve: () => void;
  timer?: ReturnType<typeof setTimeout>;
};

type CapacityWaiter = {
  cleanup(): void;
  priority: number;
  reject(reason: unknown): void;
  resolve(): void;
  sequence: number;
};

type SlotWaiter<TSlot> = {
  cleanup(): void;
  priority: number;
  reject(reason: unknown): void;
  start(slot: TSlot): void;
  sequence: number;
  signal?: AbortSignal;
};

export interface PoolCore<TSlot> {
  /**
   * Acquire a free slot and hand it to `fn`, which runs the acquired work.
   * `fn` is invoked synchronously both for an immediately free slot and when
   * a release hands the next waiter its slot, so dispatch never lags a
   * release by a microtask. Honors priority, FIFO order, abort, and `maxQueue`
   * admission; failures surface as a rejected promise. Without `fn`, resolves
   * with the slot instead.
   */
  acquire(options: AcquireOptions): Promise<TSlot>;
  acquire<R>(options: AcquireOptions, fn: (slot: TSlot) => R | Promise<R>): Promise<R>;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  drain(options?: DrainOptions): Promise<void>;
  readonly drainPromise: Promise<void> | undefined;
  emitTap(event: FamiliarTapEvent): void;
  /** Return a slot to the pool, handing it to the highest-priority waiter if any. */
  release(slot: TSlot): void;
  settleIdle(): void;
  stats(): WorkerStats;
  status(): WorkerStatus;
  tap(handler: (event: FamiliarTapEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  trackActive(delta: number): void;
  trackCompleted(): void;
  trackFailed(): void;
}

/**
 * The single slot scheduler shared by the result pool and the stream pool:
 * free-slot fast path, priority/FIFO waiter queue, `maxQueue` admission with
 * capacity waiters, idle/drain tracking, stats, disposal, and tap observation.
 * The two pools differ only in what they do with an acquired slot.
 */
export function createPoolCore<TSlot extends PoolSlot>(slots: readonly TSlot[], options: PoolOptions): PoolCore<TSlot> {
  const freeSlots = [...slots];
  const waiters: SlotWaiter<TSlot>[] = [];
  const idleWaiters: IdleWaiter[] = [];
  const capacityWaiters: CapacityWaiter[] = [];
  const tappers = tapper<FamiliarTapEvent>();
  const disposalController = new AbortController();
  let active = 0;
  let waiterSequence = 0;
  let capacitySequence = 0;
  let completed = 0;
  let failed = 0;
  let drainPromise: Promise<void> | undefined;
  let terminated = false;

  function isIdle(): boolean {
    return freeSlots.length === slots.length && waiters.length === 0;
  }

  function settleIdle(): void {
    if (!isIdle()) return;

    for (const waiter of idleWaiters.splice(0)) {
      if (waiter.timer) clearTimeout(waiter.timer);

      waiter.resolve();
    }
  }

  function waitForIdle(drainOptions: DrainOptions): Promise<void> {
    if (isIdle()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const waiter: IdleWaiter = { reject, resolve };

      if (drainOptions.timeout !== undefined) {
        waiter.timer = setTimeout(() => {
          const index = idleWaiters.indexOf(waiter);

          if (index !== -1) idleWaiters.splice(index, 1);

          reject(new FamiliarTimeoutError(drainOptions.timeout!, 'Drain'));
        }, drainOptions.timeout);
        unrefTimer(waiter.timer);
      }

      idleWaiters.push(waiter);
    });
  }

  function releaseCapacity(): void {
    capacityWaiters.shift()?.resolve();
  }

  function rejectCapacity(reason: unknown): void {
    for (const waiter of capacityWaiters.splice(0)) waiter.reject(reason);
  }

  function waitForCapacity(signal: AbortSignal | undefined, priority: number): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError(signal));

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const waiter: CapacityWaiter = {
        cleanup() {
          signal?.removeEventListener('abort', onAbort);
        },
        priority,
        reject(reason) {
          if (settled) return;

          settled = true;
          waiter.cleanup();

          const index = capacityWaiters.indexOf(waiter);

          if (index !== -1) capacityWaiters.splice(index, 1);

          reject(reason);
        },
        resolve() {
          if (settled) return;

          settled = true;
          waiter.cleanup();
          resolve();
        },
        sequence: capacitySequence++,
      };
      const onAbort = () => waiter.reject(abortError(signal!));

      signal?.addEventListener('abort', onAbort, { once: true });
      capacityWaiters.push(waiter);
      capacityWaiters.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    });
  }

  function acquire<R>(acquireOptions: AcquireOptions, fn?: (slot: TSlot) => R | Promise<R>): Promise<R | TSlot> {
    const { priority, signal } = acquireOptions;

    if (signal?.aborted) return Promise.reject(abortError(signal));

    return (async () => {
      for (;;) {
        if (terminated) throw new FamiliarTerminatedError();

        if (drainPromise) throw new FamiliarTerminatedError('Worker is draining');

        if (options.maxQueue === undefined || waiters.length < options.maxQueue) {
          return admit(acquireOptions, (fn ?? ((slot) => slot)) as (slot: TSlot) => R | Promise<R>);
        }

        if (options.onFull === 'reject') throw new FamiliarQueueFullError(options.maxQueue);

        await waitForCapacity(signal, priority);

        if (signal?.aborted) {
          releaseCapacity();
          throw abortError(signal);
        }
      }
    })();
  }

  function admit<R>(acquireOptions: AcquireOptions, fn: (slot: TSlot) => R | Promise<R>): Promise<R> {
    const { priority, signal } = acquireOptions;

    const free = freeSlots.pop();

    if (free) {
      try {
        return Promise.resolve(fn(free));
      } catch (error) {
        // A synchronous throw must not strand the slot: idle would never settle.
        release(free);
        settleIdle();

        return Promise.reject(error);
      }
    }

    return new Promise<R>((resolve, reject) => {
      const waiter: SlotWaiter<TSlot> = {
        cleanup() {
          waiter.signal?.removeEventListener('abort', onAbort);
        },
        priority,
        reject(reason) {
          waiter.cleanup();

          const index = waiters.indexOf(waiter);

          if (index !== -1) {
            waiters.splice(index, 1);
            releaseCapacity();
          }

          reject(reason);
          settleIdle();
        },
        sequence: waiterSequence++,
        signal,
        start(slot) {
          waiter.cleanup();

          try {
            resolve(fn(slot));
          } catch (error) {
            release(slot);
            settleIdle();
            reject(error);
          }
        },
      };
      const onAbort = () => waiter.reject(abortError(waiter.signal!));

      waiter.signal?.addEventListener('abort', onAbort, { once: true });
      waiters.push(waiter);
      waiters.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    });
  }

  function release(slot: TSlot): void {
    const next = waiters.shift();

    if (next) {
      next.start(slot);
      releaseCapacity();
    } else {
      freeSlots.push(slot);
    }
  }

  function dispose(): void {
    if (terminated) return;

    terminated = true;
    disposalController.abort();

    for (const slot of slots) slot.terminate();

    for (const waiter of waiters.splice(0)) waiter.reject(new FamiliarTerminatedError());

    rejectCapacity(new FamiliarTerminatedError());
    settleIdle();
    tappers.emit({ type: 'dispose' });
    tappers.clear();
  }

  function drain(drainOptions: DrainOptions = {}): Promise<void> {
    if (terminated) return Promise.resolve();
    try {
      validateTimeout(drainOptions.timeout, 'drain.timeout');
    } catch (error) {
      return Promise.reject(error);
    }

    if (drainPromise) return drainPromise;

    rejectCapacity(new FamiliarTerminatedError('Worker is draining'));
    drainPromise = waitForIdle(drainOptions).then(
      () => dispose(),
      (error: unknown) => {
        dispose();
        throw error;
      },
    );

    return drainPromise;
  }

  return {
    acquire,
    disposalSignal: disposalController.signal,
    dispose,
    get disposed() {
      return terminated;
    },
    drain,
    get drainPromise() {
      return drainPromise;
    },
    emitTap(event) {
      tappers.emit(event);
    },
    release,
    settleIdle,
    stats() {
      return { active, completed, failed, queued: waiters.length + capacityWaiters.length };
    },
    status() {
      if (terminated) return 'terminated';

      return active === 0 ? 'idle' : 'running';
    },
    tap(handler, tapOptions) {
      if (terminated) return () => undefined;

      return tappers.tap(handler, tapOptions);
    },
    trackActive(delta: number) {
      active += delta;
    },
    trackCompleted() {
      completed += 1;
    },
    trackFailed() {
      failed += 1;
    },
  };
}
