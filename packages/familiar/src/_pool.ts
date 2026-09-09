import { abortError } from '@vielzeug/arsenal';
import { createPoolCore, type PoolCore, type PoolOptions, validatePriority, validateTimeout } from './_pool-core.js';
import { type QueueItem, TaskQueue } from './_queue.js';
import { FamiliarQueueFullError, FamiliarRuntimeError, FamiliarTerminatedError } from './errors.js';
import type { RunOptions, SlotStrategy, WorkerPool } from './types.js';

export type { PoolOptions } from './_pool-core.js';

export function createPool<TInput, TOutput>(
  slots: SlotStrategy<TInput, TOutput>[],
  options: PoolOptions,
): WorkerPool<TInput, TOutput> {
  const freeSlots = [...slots];
  const queue = new TaskQueue<TInput, TOutput>();
  let draining = false;

  const isIdle = (): boolean => freeSlots.length === slots.length && queue.size === 0;

  const core: PoolCore = createPoolCore({
    isIdle,
    onDispose() {
      for (const slot of slots) slot.terminate();

      while (queue.size > 0) {
        const item = queue.shift();

        if (!item) break;

        item.cleanupAbort?.();
        item.reject(new FamiliarTerminatedError());
      }
    },
    onDrainStart() {
      // No pending waiters to reject for the queue-based pool; capacity waiters
      // are rejected by the core's drain().
    },
  });

  function nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (queue.size > 0) {
      const item = queue.shift();

      if (!item) break;

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(abortError(item.signal));
        core.releaseCapacity();
        continue;
      }

      return item;
    }

    core.settleIdle();

    return undefined;
  }

  function drainQueue(): void {
    if (draining || core.disposed) return;

    draining = true;

    while (!core.disposed && freeSlots.length > 0 && queue.size > 0) {
      const next = nextItem();

      if (!next) break;

      const item = next;
      const slot = freeSlots.pop()!;
      const timeout = item.timeout ?? options.defaultTimeout;

      core.trackActive(1);
      core.releaseCapacity();

      const onAbort = () => {
        item.aborted = true;
        slot.cancel(abortError(item.signal!));
      };

      item.cleanupAbort = () => {
        item.signal?.removeEventListener('abort', onAbort);
        item.cleanupAbort = undefined;
      };
      item.signal?.addEventListener('abort', onAbort, { once: true });

      slot.run(item.input, item.transferables, timeout).then(
        (value) => finish(value),
        (error: unknown) => fail(error),
      );

      function finish(value: TOutput): void {
        item.cleanupAbort?.();
        freeSlots.push(slot);
        core.trackActive(-1);
        core.trackCompleted();
        item.resolve(value);
        drainQueue();
        core.settleIdle();
      }

      function fail(error: unknown): void {
        item.cleanupAbort?.();
        freeSlots.push(slot);
        core.trackActive(-1);

        if (!item.aborted && !(error instanceof FamiliarTerminatedError)) core.trackFailed();

        item.reject(error);
        drainQueue();
        core.settleIdle();
      }
    }

    draining = false;
  }

  async function run(input: TInput, runOptions: RunOptions = {}): Promise<TOutput> {
    const { signal } = runOptions;
    const priority = validatePriority(runOptions.priority ?? 0);
    const timeout = validateTimeout(runOptions.timeout);
    const transferables = [...(runOptions.transferables ?? [])];

    if (core.disposed) throw new FamiliarTerminatedError();

    if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

    if (signal?.aborted) throw abortError(signal);

    while (options.onFull === 'wait' && options.maxQueue !== undefined && queue.size >= options.maxQueue) {
      await core.waitForCapacity(signal, priority);

      if (core.disposed) throw new FamiliarTerminatedError();

      if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

      if (signal?.aborted) {
        core.releaseCapacity();
        throw abortError(signal);
      }
    }

    let resolve!: (value: TOutput) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<TOutput>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const item: QueueItem<TInput, TOutput> = { input, priority, reject, resolve, signal, timeout, transferables };

    if (!queue.enqueue(item, options.onFull === 'wait' ? undefined : options.maxQueue)) {
      throw new FamiliarQueueFullError(options.maxQueue!);
    }

    if (signal) {
      const onAbort = () => {
        if (!queue.remove(item)) return;

        item.cleanupAbort?.();
        reject(abortError(signal));
        core.releaseCapacity();
        core.settleIdle();
      };

      item.cleanupAbort = () => {
        signal.removeEventListener('abort', onAbort);
        item.cleanupAbort = undefined;
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }

    drainQueue();

    return promise;
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
    run,
    get stats() {
      return core.stats(queue.size);
    },
    get status() {
      return core.status();
    },
    [Symbol.asyncDispose]: () => core.drain({}),
    [Symbol.dispose]: core.dispose,
  };
}

export type BatchOptions<TInput> = Pick<RunOptions, 'priority' | 'signal' | 'timeout'> & {
  getTransferables?: (input: TInput, index: number) => readonly Transferable[];
};

/** Run related tasks concurrently and yield their results in input order. */
export function runBatch<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  inputs: readonly TInput[],
  options: BatchOptions<TInput> = {},
): AsyncIterable<TOutput> {
  let owner: object | undefined;

  const iterate = async function* (controller: AbortController): AsyncGenerator<TOutput> {
    const tasks: Promise<TOutput>[] = [];
    const onAbort = () => controller.abort(options.signal?.reason);

    if (options.signal?.aborted) controller.abort(options.signal.reason);
    else options.signal?.addEventListener('abort', onAbort, { once: true });

    try {
      for (const [index, input] of inputs.entries()) {
        const task = pool
          .run(input, {
            priority: options.priority,
            signal: controller.signal,
            timeout: options.timeout,
            transferables: options.getTransferables?.(input, index),
          })
          .catch((error: unknown) => {
            controller.abort(error);
            throw error;
          });

        void task.catch(() => undefined);
        tasks.push(task);
      }

      if (tasks.length === 0 && controller.signal.aborted) throw abortError(controller.signal);
      for (const task of tasks) {
        if (controller.signal.aborted) throw abortError(controller.signal);
        const value = await task;
        if (controller.signal.aborted) throw abortError(controller.signal);
        yield value;
      }
    } catch (error) {
      controller.abort(error);
      throw error;
    } finally {
      options.signal?.removeEventListener('abort', onAbort);
      controller.abort(new DOMException('Batch consumer stopped', 'AbortError'));
      await Promise.allSettled(tasks);
    }
  };

  return {
    [Symbol.asyncIterator]() {
      const token = {};
      const controller = new AbortController();
      let iterator: AsyncGenerator<TOutput> | undefined;
      const start = (): AsyncGenerator<TOutput> | undefined => {
        owner ??= token;
        if (owner !== token) return undefined;
        iterator ??= iterate(controller);
        return iterator;
      };

      return {
        next: () =>
          start()?.next() ?? Promise.reject(new FamiliarRuntimeError('Worker batches can only be consumed once')),
        return: async (value?: unknown) => {
          if (!owner || owner !== token) return { done: true, value: value as TOutput };
          controller.abort(new FamiliarTerminatedError('Batch consumer stopped'));
          return iterator?.return(value as TOutput) ?? { done: true, value: value as TOutput };
        },
        throw: async (error?: unknown) => {
          const active = start();
          if (!active) throw new FamiliarRuntimeError('Worker batches can only be consumed once');
          controller.abort(error);
          return active.throw(error);
        },
      };
    },
  };
}
