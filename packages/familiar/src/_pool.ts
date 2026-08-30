import { abortError } from '@vielzeug/arsenal/async';
import { createPoolCore, type PoolCore, type PoolOptions } from './_pool-core';
import { type QueueItem, TaskQueue } from './_queue';
import { FamiliarQueueFullError, FamiliarTerminatedError } from './errors';
import type { RunOptions, SlotStrategy, TaskGroup, TaskGroupOptions, WorkerPool } from './types';

export type { PoolOptions } from './_pool-core';

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

      const onAbort = () => slot.cancel(abortError(item.signal!));

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

        if (!(error instanceof FamiliarTerminatedError) && error instanceof Error && error.name !== 'AbortError')
          core.trackFailed();

        item.reject(error);
        drainQueue();
        core.settleIdle();
      }
    }

    draining = false;
  }

  async function run(input: TInput, runOptions: RunOptions = {}): Promise<TOutput> {
    const { priority = 0, signal, timeout, transferables = [] } = runOptions;

    if (core.disposed) throw new FamiliarTerminatedError();

    if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

    if (signal?.aborted) throw abortError(signal);

    while (options.onFull === 'wait' && options.maxQueue !== undefined && queue.size >= options.maxQueue) {
      await core.waitForCapacity(signal);

      if (core.disposed) throw new FamiliarTerminatedError();

      if (core.drainPromise) throw new FamiliarTerminatedError('Worker is draining');

      if (signal?.aborted) throw abortError(signal);
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
    async prime(): Promise<void> {
      await core.prime(slots);
    },
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

export async function* batch<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  inputs: readonly TInput[],
  options: RunOptions = {},
): AsyncIterable<TOutput> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(options.signal?.reason);

  options.signal?.addEventListener('abort', onAbort, { once: true });

  const tasks = inputs.map((input) => pool.run(input, { ...options, signal: controller.signal }));

  try {
    for (const task of tasks) yield await task;
  } catch (error) {
    controller.abort(error);
    await Promise.allSettled(tasks);
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    controller.abort();
    await Promise.allSettled(tasks);
  }
}

export function createTaskGroup<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  name: string | undefined = undefined,
  options: TaskGroupOptions = {},
): TaskGroup<TInput, TOutput> {
  const controller = new AbortController();
  const tasks = new Set<Promise<TOutput>>();
  let size = 0;
  const onAbort = () => controller.abort(options.signal?.reason);

  options.signal?.addEventListener('abort', onAbort, { once: true });

  return {
    abort(reason?: unknown): void {
      controller.abort(reason);
    },
    async drain(): Promise<PromiseSettledResult<TOutput>[]> {
      return Promise.allSettled([...tasks]);
    },
    get name() {
      return name;
    },
    get pending() {
      return tasks.size;
    },
    run(input, runOptions = {}): Promise<TOutput> {
      const task = pool.run(input, { ...runOptions, signal: controller.signal });

      size += 1;
      tasks.add(task);
      void task.finally(() => tasks.delete(task));

      return task;
    },
    get size() {
      return size;
    },
  };
}
