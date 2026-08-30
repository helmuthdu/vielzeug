import { abortError } from '@vielzeug/arsenal/async';

import { createPoolCore, type PoolCore, type PoolOptions } from './_pool-core';
import { FamiliarQueueFullError, FamiliarTerminatedError } from './errors';
import type { RunOptions, StreamWorkerPool } from './types';
import type { RunningStream } from './worker';

export type StreamSlot<TInput, TChunk> = {
  cancel(reason: unknown): void;
  prime(): Promise<void>;
  stream(input: TInput, options: RunOptions): RunningStream<TChunk>;
  terminate(): void;
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
  let sequence = 0;

  const isIdle = (): boolean => freeSlots.length === slots.length && waiters.length === 0;

  const core: PoolCore = createPoolCore({
    isIdle,
    onDispose() {
      for (const slot of slots) slot.terminate();
      for (const waiter of waiters.splice(0)) waiter.reject(new FamiliarTerminatedError());
    },
    onDrainStart() {
      for (const waiter of waiters.splice(0)) waiter.reject(new FamiliarTerminatedError('Worker is draining'));
    },
  });

  function release(slot: StreamSlot<TInput, TChunk>): void {
    const next = waiters.shift();

    if (next) {
      next.resolve(slot);
      core.releaseCapacity();
    } else {
      freeSlots.push(slot);
    }
  }

  async function acquire(runOptions: RunOptions): Promise<StreamSlot<TInput, TChunk>> {
    if (core.disposed) throw new FamiliarTerminatedError();

    if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

    if (runOptions.signal?.aborted) throw abortError(runOptions.signal);

    while (options.maxQueue !== undefined && waiters.length >= options.maxQueue) {
      if (options.onFull === 'reject') throw new FamiliarQueueFullError(options.maxQueue);

      await core.waitForCapacity(runOptions.signal);

      if (core.disposed) throw new FamiliarTerminatedError();

      if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

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
            core.releaseCapacity();
          }

          reject(reason);
          core.settleIdle();
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

  return {
    get disposalSignal() {
      return core.disposalSignal;
    },
    dispose: core.dispose,
    get disposed() {
      return core.disposed;
    },
    drain: core.drain,
    async prime(): Promise<void> {
      await core.prime(slots);
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
            core.trackActive(1);
            onCancel = () => slot?.cancel(abortError(controller.signal));
            controller.signal.addEventListener('abort', onCancel, { once: true });

            const running = slot.stream(input, {
              ...runOptions,
              signal: controller.signal,
              timeout: runOptions.timeout ?? options.defaultTimeout,
            });

            for await (const value of running.iterable) yield value;
            await running.done;
            core.trackCompleted();
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError' && !(error instanceof FamiliarTerminatedError))
              core.trackFailed();

            throw error;
          } finally {
            runOptions.signal?.removeEventListener('abort', onAbort);

            if (slot) {
              if (onCancel) controller.signal.removeEventListener('abort', onCancel);

              core.trackActive(-1);
              release(slot);
              core.settleIdle();
            }
          }
        },
      };
    },
    get stats() {
      return core.stats(waiters.length);
    },
    get status() {
      return core.status();
    },
    [Symbol.asyncDispose]: () => core.drain({}),
    [Symbol.dispose]: core.dispose,
  };
}
