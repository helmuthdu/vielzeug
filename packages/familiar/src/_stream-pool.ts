import { abortError } from '@vielzeug/arsenal';
import { createPoolCore, type PoolCore, type PoolOptions, validatePriority, validateTimeout } from './_pool-core.js';
import { FamiliarQueueFullError, FamiliarRuntimeError, FamiliarTerminatedError } from './errors.js';
import type { RunOptions, StreamWorkerPool } from './types.js';
import type { RunningStream } from './worker.js';

export type StreamSlot<TInput, TChunk> = {
  cancel(reason: unknown): void;
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

      await core.waitForCapacity(runOptions.signal, runOptions.priority ?? 0);

      if (core.disposed) throw new FamiliarTerminatedError();

      if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

      if (runOptions.signal?.aborted) {
        core.releaseCapacity();
        throw abortError(runOptions.signal);
      }
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
    runStream(input, runOptions = {}): AsyncIterable<TChunk> {
      const priority = validatePriority(runOptions.priority ?? 0);
      const timeout = validateTimeout(runOptions.timeout) ?? options.defaultTimeout;
      const transferables = [...(runOptions.transferables ?? [])];
      let owner: object | undefined;

      const iterate = async function* (controller: AbortController): AsyncGenerator<TChunk> {
        const onAbort = () => controller.abort(runOptions.signal?.reason);
        let slot: StreamSlot<TInput, TChunk> | undefined;
        let onCancel: (() => void) | undefined;

        if (runOptions.signal?.aborted) controller.abort(runOptions.signal.reason);
        else runOptions.signal?.addEventListener('abort', onAbort, { once: true });

        try {
          slot = await acquire({ priority, signal: controller.signal, timeout, transferables });
          core.trackActive(1);
          onCancel = () => slot?.cancel(abortError(controller.signal));
          controller.signal.addEventListener('abort', onCancel, { once: true });

          const running = slot.stream(input, { priority, signal: controller.signal, timeout, transferables });

          for await (const value of running.iterable) yield value;
          await running.done;
          core.trackCompleted();
        } catch (error) {
          if (slot && !controller.signal.aborted && !(error instanceof FamiliarTerminatedError)) core.trackFailed();
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
      };

      return {
        [Symbol.asyncIterator]() {
          const token = {};
          const controller = new AbortController();
          let iterator: AsyncGenerator<TChunk> | undefined;
          const start = (): AsyncGenerator<TChunk> | undefined => {
            owner ??= token;
            if (owner !== token) return undefined;
            iterator ??= iterate(controller);
            return iterator;
          };

          return {
            next: () =>
              start()?.next() ?? Promise.reject(new FamiliarRuntimeError('Worker streams can only be consumed once')),
            return: async (value?: unknown) => {
              if (!owner) return { done: true, value: value as TChunk };
              if (owner !== token) return { done: true, value: value as TChunk };
              controller.abort(new FamiliarTerminatedError('Stream consumer stopped'));
              return iterator?.return(value as TChunk) ?? { done: true, value: value as TChunk };
            },
            throw: async (error?: unknown) => {
              const active = start();
              if (!active) throw new FamiliarRuntimeError('Worker streams can only be consumed once');
              controller.abort(error);
              return active.throw(error);
            },
          };
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
