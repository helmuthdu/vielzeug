/**
 * Scheduler.postTask helper for environments with or without native support.
 *
 * `new Scheduler()` guarantees that `globalThis.scheduler.postTask` exists,
 * using the native API when available and installing a small fallback otherwise.
 *
 * `polyfillScheduler()` remains available when explicit installation is preferred.
 *
 * The polyfill provides:
 * - Delayed execution via the `delay` option
 * - AbortSignal support for cancellation
 * - Priority hint support (though priorities are not enforced in the polyfill)
 *
 * @example
 * ```ts
 * import { Scheduler } from '@vielzeug/toolkit';
 *
 * const scheduler = new Scheduler();
 * await scheduler.postTask(() => console.log('hello'), { delay: 100 });
 * ```
 */

export type TaskPriority = 'background' | 'user-blocking' | 'user-visible';

export type SchedulerLike = {
  postTask<T>(
    callback: () => T | PromiseLike<T>,
    options?: { delay?: number; priority?: TaskPriority; signal?: AbortSignal },
  ): Promise<T>;
};

type SchedulerGlobal = { scheduler?: SchedulerLike };

function createPolyfill(): SchedulerLike {
  return {
    postTask: <T>(
      callback: () => T | PromiseLike<T>,
      options?: { delay?: number; priority?: TaskPriority; signal?: AbortSignal },
    ) => {
      const delay = options?.delay ?? 0;
      const signal = options?.signal;

      return new Promise<T>((resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason);

          return;
        }

        const id = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);

          try {
            resolve(callback());
          } catch (error) {
            reject(error);
          }
        }, delay);

        const onAbort = () => {
          clearTimeout(id);
          reject(signal!.reason);
        };

        signal?.addEventListener('abort', onAbort, { once: true });
      });
    },
  };
}

/**
 * Install the scheduler polyfill if not natively supported.
 *
 * Safe to call multiple times - it only installs if not already present.
 */
export function polyfillScheduler(): void {
  if ('scheduler' in globalThis) {
    return;
  }

  Object.defineProperty(globalThis, 'scheduler', {
    configurable: true,
    value: createPolyfill(),
    writable: true,
  });
}

/**
 * Lightweight scheduler wrapper.
 *
 * Creating an instance guarantees that a scheduler exists (native or polyfilled)
 * and exposes a stable postTask API.
 */
export class Scheduler implements SchedulerLike {
  #scheduler: SchedulerLike;

  constructor() {
    const g = globalThis as unknown as SchedulerGlobal;

    if (g.scheduler === undefined) {
      polyfillScheduler();
    }

    this.#scheduler = (globalThis as unknown as SchedulerGlobal).scheduler!;
  }

  postTask<T>(
    callback: () => T | PromiseLike<T>,
    options?: { delay?: number; priority?: TaskPriority; signal?: AbortSignal },
  ): Promise<T> {
    return this.#scheduler.postTask(callback, options);
  }
}
