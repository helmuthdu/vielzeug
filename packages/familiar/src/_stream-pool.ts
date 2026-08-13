import { abortError } from '@vielzeug/arsenal/async';

import type { PoolOptions } from './_pool';
import { unrefTimer } from './_timers';
import { FamiliarQueueFullError, FamiliarTerminatedError, FamiliarTimeoutError } from './errors';
import type { DrainOptions, RunOptions, StreamWorkerPool, WorkerStats, WorkerStatus } from './types';
import type { RunningStream } from './worker';

export type StreamSlot<TInput, TChunk> = {
  cancel(reason: unknown): void;
  prime(): Promise<void>;
  stream(input: TInput, options: RunOptions): RunningStream<TChunk>;
  terminate(): void;
};

type CapacityWaiter = {
  cleanup(): void;
  reject(reason: unknown): void;
  resolve(): void;
};

type Waiter<TSlot> = {
  cleanup(): void;
  priority: number;
  reject(reason: unknown): void;
  resolve(slot: TSlot): void;
  sequence: number;
  signal?: AbortSignal;
};

export function createStreamPool<TInput, TChunk>(
  slots: StreamSlot<TInput, TChunk>[],
  options: PoolOptions,
): StreamWorkerPool<TInput, TChunk> {
  const freeSlots = [...slots];
  const waiters: Waiter<StreamSlot<TInput, TChunk>>[] = [];
  const capacityWaiters: CapacityWaiter[] = [];
  const disposalController = new AbortController();
  const idleWaiters: Array<() => void> = [];
  let active = 0;
  let completed = 0;
  let failed = 0;
  let sequence = 0;
  let terminated = false;
  let drainPromise: Promise<void> | undefined;

  function idle(): boolean {
    return active === 0 && waiters.length === 0;
  }

  function settleIdle(): void {
    if (!idle()) return;

    for (const resolve of idleWaiters.splice(0)) resolve();
  }

  function waitForIdle(options: DrainOptions): Promise<void> {
    if (idle()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      idleWaiters.push(resolve);

      if (options.timeout !== undefined) {
        const timer = setTimeout(() => {
          const index = idleWaiters.indexOf(resolve);

          if (index !== -1) idleWaiters.splice(index, 1);

          reject(new FamiliarTimeoutError(options.timeout!));
        }, options.timeout);

        unrefTimer(timer);
      }
    });
  }

  function releaseCapacity(): void {
    capacityWaiters.shift()?.resolve();
  }

  function rejectCapacity(reason: unknown): void {
    for (const waiter of capacityWaiters.splice(0)) waiter.reject(reason);
  }

  function waitForCapacity(signal: AbortSignal | undefined): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError(signal));

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const waiter: CapacityWaiter = {
        cleanup() {
          signal?.removeEventListener('abort', onAbort);
        },
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
      };
      const onAbort = () => waiter.reject(abortError(signal!));

      signal?.addEventListener('abort', onAbort, { once: true });
      capacityWaiters.push(waiter);
    });
  }

  function release(slot: StreamSlot<TInput, TChunk>): void {
    const next = waiters.shift();

    if (next) {
      next.resolve(slot);
      releaseCapacity();
    } else {
      freeSlots.push(slot);
    }
  }

  async function acquire(runOptions: RunOptions): Promise<StreamSlot<TInput, TChunk>> {
    if (terminated) throw new FamiliarTerminatedError();

    if (drainPromise) throw new FamiliarTerminatedError('Worker is draining');

    if (runOptions.signal?.aborted) throw abortError(runOptions.signal);

    while (options.maxQueue !== undefined && waiters.length >= options.maxQueue) {
      if (options.onFull === 'reject') throw new FamiliarQueueFullError(options.maxQueue);

      await waitForCapacity(runOptions.signal);

      if (terminated) throw new FamiliarTerminatedError();

      if (drainPromise) throw new FamiliarTerminatedError('Worker is draining');

      if (runOptions.signal?.aborted) throw abortError(runOptions.signal);
    }

    const free = freeSlots.pop();

    if (free) return free;

    return new Promise<StreamSlot<TInput, TChunk>>((resolve, reject) => {
      const waiter: Waiter<StreamSlot<TInput, TChunk>> = {
        cleanup() {
          waiter.signal?.removeEventListener('abort', onAbort);
        },
        priority: runOptions.priority ?? 0,
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
        resolve(slot) {
          waiter.cleanup();
          resolve(slot);
        },
        sequence: sequence++,
        signal: runOptions.signal,
      };
      const onAbort = () => waiter.reject(abortError(waiter.signal!));

      waiter.signal?.addEventListener('abort', onAbort, { once: true });
      waiters.push(waiter);
      waiters.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    });
  }

  function dispose(): void {
    if (terminated) return;

    terminated = true;
    disposalController.abort();
    for (const slot of slots) slot.terminate();
    for (const waiter of waiters.splice(0)) waiter.reject(new FamiliarTerminatedError());
    rejectCapacity(new FamiliarTerminatedError());
    settleIdle();
  }

  function drain(drainOptions: DrainOptions = {}): Promise<void> {
    if (terminated) return Promise.resolve();

    if (drainPromise) return drainPromise;

    for (const waiter of waiters.splice(0)) waiter.reject(new FamiliarTerminatedError('Worker is draining'));
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
    get disposalSignal() {
      return disposalController.signal;
    },
    dispose,
    get disposed() {
      return terminated;
    },
    drain,
    async prime(): Promise<void> {
      await Promise.all(slots.map((slot) => slot.prime()));
    },
    runStream(input, runOptions = {}): AsyncIterable<TChunk> {
      const controller = new AbortController();
      const onAbort = () => controller.abort(runOptions.signal?.reason);

      runOptions.signal?.addEventListener('abort', onAbort, { once: true });

      return {
        [Symbol.asyncIterator]: async function* () {
          let slot: StreamSlot<TInput, TChunk> | undefined;
          let onCancel: (() => void) | undefined;

          try {
            slot = await acquire({ ...runOptions, signal: controller.signal });
            active += 1;
            onCancel = () => slot?.cancel(abortError(controller.signal));
            controller.signal.addEventListener('abort', onCancel, { once: true });

            const running = slot.stream(input, {
              ...runOptions,
              signal: controller.signal,
              timeout: runOptions.timeout ?? options.defaultTimeout,
            });

            for await (const value of running.iterable) yield value;
            await running.done;
            completed += 1;
          } catch (error) {
            if (error?.constructor?.name !== 'AbortError' && !(error instanceof FamiliarTerminatedError)) failed += 1;

            throw error;
          } finally {
            runOptions.signal?.removeEventListener('abort', onAbort);

            if (slot) {
              if (onCancel) controller.signal.removeEventListener('abort', onCancel);

              active -= 1;
              release(slot);
              settleIdle();
            }
          }
        },
      };
    },
    get stats(): WorkerStats {
      return { active, completed, failed, queued: waiters.length };
    },
    get status(): WorkerStatus {
      if (terminated) return 'terminated';

      return active === 0 ? 'idle' : 'running';
    },
    [Symbol.asyncDispose]: () => drain(),
    [Symbol.dispose]: dispose,
  };
}
