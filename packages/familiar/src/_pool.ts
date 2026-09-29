import { abortError } from '@vielzeug/arsenal';
import { createPoolCore, type PoolCore, type PoolOptions, validatePriority, validateTimeout } from './_pool-core.js';
import { FamiliarRuntimeError, FamiliarTerminatedError } from './errors.js';
import type { RunOptions, SlotStrategy, WorkerPool } from './types.js';

export type { PoolOptions } from './_pool-core.js';

export function createPool<TInput, TOutput>(
  slots: readonly SlotStrategy<TInput, TOutput>[],
  options: PoolOptions,
): WorkerPool<TInput, TOutput> {
  const core: PoolCore<SlotStrategy<TInput, TOutput>> = createPoolCore(slots, options);

  for (const slot of slots) slot.notify = (error) => core.emitTap({ error, type: 'worker-error' });

  function run(input: TInput, runOptions: RunOptions = {}): Promise<TOutput> {
    let priority: number;
    let timeout: number | undefined;
    let transferables: Transferable[];

    try {
      priority = validatePriority(runOptions.priority ?? 0);
      timeout = validateTimeout(runOptions.timeout) ?? options.defaultTimeout;
      transferables = [...(runOptions.transferables ?? [])];
    } catch (error) {
      return Promise.reject(error);
    }

    return core.acquire({ priority, signal: runOptions.signal }, (slot) => {
      core.trackActive(1);

      const onAbort = () => slot.cancel(abortError(runOptions.signal!));
      runOptions.signal?.addEventListener('abort', onAbort, { once: true });

      const finish = async (): Promise<TOutput> => {
        try {
          const value = await slot.run(input, transferables, timeout);

          core.trackCompleted();

          return value;
        } catch (error) {
          if (!runOptions.signal?.aborted && !(error instanceof FamiliarTerminatedError)) core.trackFailed();

          throw error;
        } finally {
          runOptions.signal?.removeEventListener('abort', onAbort);
          core.trackActive(-1);
          core.release(slot);
          core.settleIdle();
        }
      };

      return finish();
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
    run,
    get stats() {
      return core.stats();
    },
    get status() {
      return core.status();
    },
    tap: core.tap,
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
