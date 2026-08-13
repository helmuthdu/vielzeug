import { abortError } from '@vielzeug/arsenal/async';
import { type QueueItem, TaskQueue } from './_queue';
import { unrefTimer } from './_timers';
import { FamiliarQueueFullError, FamiliarTerminatedError, FamiliarTimeoutError } from './errors';
import type {
  BatchOptions,
  DrainOptions,
  RunOptions,
  SlotStrategy,
  TaskGroup,
  TaskGroupOptions,
  WorkerPool,
  WorkerStats,
  WorkerStatus,
} from './types';

export type PoolOptions = {
  concurrency: number;
  defaultTimeout: number | undefined;
  maxQueue: number | undefined;
  onFull: 'reject' | 'wait';
};

type IdleWaiter = {
  reject: (reason: unknown) => void;
  resolve: () => void;
  timer?: ReturnType<typeof setTimeout>;
};

type CapacityWaiter = {
  cleanup(): void;
  reject(reason: unknown): void;
  resolve(): void;
};

export function createPool<TInput, TOutput>(
  slots: SlotStrategy<TInput, TOutput>[],
  options: PoolOptions,
): WorkerPool<TInput, TOutput> {
  const freeSlots = [...slots];
  const queue = new TaskQueue<TInput, TOutput>();
  const disposalController = new AbortController();
  const idleWaiters: IdleWaiter[] = [];
  const capacityWaiters: CapacityWaiter[] = [];
  let active = 0;
  let completed = 0;
  let failed = 0;
  let drainPromise: Promise<void> | undefined;
  let draining = false;
  let terminated = false;

  function isIdle(): boolean {
    return active === 0 && queue.size === 0;
  }

  function settleIdle(): void {
    if (!isIdle()) return;

    for (const waiter of idleWaiters.splice(0)) {
      if (waiter.timer) clearTimeout(waiter.timer);

      waiter.resolve();
    }
  }

  function waitForIdle(drainOptions: DrainOptions = {}): Promise<void> {
    if (isIdle()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const waiter: IdleWaiter = { reject, resolve };

      if (drainOptions.timeout !== undefined) {
        waiter.timer = setTimeout(() => {
          const index = idleWaiters.indexOf(waiter);

          if (index !== -1) idleWaiters.splice(index, 1);

          reject(new FamiliarTimeoutError(drainOptions.timeout!));
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

  function nextItem(): QueueItem<TInput, TOutput> | undefined {
    while (queue.size > 0) {
      const item = queue.shift();

      if (!item) break;

      if (item.signal?.aborted) {
        item.cleanupAbort?.();
        item.reject(abortError(item.signal));
        releaseCapacity();
        continue;
      }

      return item;
    }

    settleIdle();

    return undefined;
  }

  function drainQueue(): void {
    if (draining || terminated) return;

    draining = true;

    while (!terminated && freeSlots.length > 0 && queue.size > 0) {
      const next = nextItem();

      if (!next) break;

      const item = next;
      const slot = freeSlots.pop()!;
      const timeout = item.timeout ?? options.defaultTimeout;

      active += 1;
      releaseCapacity();

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
        active -= 1;
        completed += 1;
        item.resolve(value);
        drainQueue();
        settleIdle();
      }

      function fail(error: unknown): void {
        item.cleanupAbort?.();
        freeSlots.push(slot);
        active -= 1;

        if (!(error instanceof FamiliarTerminatedError) && error?.constructor?.name !== 'AbortError') failed += 1;

        item.reject(error);
        drainQueue();
        settleIdle();
      }
    }

    draining = false;
  }

  async function run(input: TInput, runOptions: RunOptions = {}): Promise<TOutput> {
    const { priority = 0, signal, timeout, transferables = [] } = runOptions;

    if (terminated) throw new FamiliarTerminatedError();

    if (drainPromise) throw new FamiliarTerminatedError('Worker is draining');

    if (signal?.aborted) throw abortError(signal);

    while (options.onFull === 'wait' && options.maxQueue !== undefined && queue.size >= options.maxQueue) {
      await waitForCapacity(signal);

      if (terminated) throw new FamiliarTerminatedError();

      if (drainPromise) throw new FamiliarTerminatedError('Worker is draining');

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
        releaseCapacity();
        settleIdle();
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

  function dispose(): void {
    if (terminated) return;

    terminated = true;
    disposalController.abort();
    for (const slot of slots) slot.terminate();

    while (queue.size > 0) {
      const item = queue.shift();

      if (!item) break;

      item.cleanupAbort?.();
      item.reject(new FamiliarTerminatedError());
    }

    rejectCapacity(new FamiliarTerminatedError());
    settleIdle();
  }

  function drain(drainOptions: DrainOptions = {}): Promise<void> {
    if (terminated) return Promise.resolve();

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
    run,
    get stats(): WorkerStats {
      return { active, completed, failed, queued: queue.size };
    },
    get status(): WorkerStatus {
      if (terminated) return 'terminated';

      return active === 0 ? 'idle' : 'running';
    },
    [Symbol.asyncDispose]: () => drain(),
    [Symbol.dispose]: dispose,
  };
}

export async function* batch<TInput, TOutput>(
  pool: WorkerPool<TInput, TOutput>,
  inputs: readonly TInput[],
  options: BatchOptions = {},
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
