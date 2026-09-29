import { abortError } from '@vielzeug/arsenal';
import { createPoolCore, type PoolCore, type PoolOptions, validatePriority, validateTimeout } from './_pool-core.js';
import { FamiliarRuntimeError, FamiliarTerminatedError } from './errors.js';
import type { RunOptions, StreamWorkerPool } from './types.js';

export type StreamSlot<TInput, TChunk> = {
  cancel(reason: unknown): void;
  /** Wired by the pool factory to report unhandled worker runtime errors through `tap()`. */
  notify?(error: FamiliarRuntimeError): void;
  stream(input: TInput, options: RunOptions): { done: Promise<void>; iterable: AsyncIterable<TChunk> };
  terminate(): void;
};

export function createStreamPool<TInput, TChunk>(
  slots: readonly StreamSlot<TInput, TChunk>[],
  options: PoolOptions,
): StreamWorkerPool<TInput, TChunk> {
  const core: PoolCore<StreamSlot<TInput, TChunk>> = createPoolCore(slots, options);

  for (const slot of slots) slot.notify = (error) => core.emitTap({ error, type: 'worker-error' });

  function runStream(input: TInput, runOptions: RunOptions = {}): AsyncIterable<TChunk> {
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
        const running = await core.acquire({ priority, signal: controller.signal }, (acquired) => {
          slot = acquired;
          core.trackActive(1);
          onCancel = () => slot?.cancel(abortError(controller.signal));
          controller.signal.addEventListener('abort', onCancel, { once: true });

          return acquired.stream(input, { priority, signal: controller.signal, timeout, transferables });
        });

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
          core.release(slot);
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
            if (!owner || owner !== token) return { done: true, value: value as TChunk };
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
    runStream,
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
