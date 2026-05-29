/**
 * Scheduler.postTask helper for environments with or without native support.
 *
 * `new Scheduler()` provides a `postTask` method backed by the native
 * `globalThis.scheduler` when available, or a private polyfill instance
 * otherwise — without modifying `globalThis`.
 *
 * `polyfillScheduler()` remains available when explicit global installation is preferred.
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
 * Creating an instance uses the native `globalThis.scheduler` when available
 * and falls back to a private polyfill instance — without modifying
 * `globalThis`. Call {@link polyfillScheduler} explicitly if you want to
 * install the polyfill as a global side-effect.
 */
export class Scheduler implements SchedulerLike {
  #scheduler: SchedulerLike;

  constructor() {
    const g = globalThis as unknown as SchedulerGlobal;

    this.#scheduler = g.scheduler ?? createPolyfill();
  }

  postTask<T>(
    callback: () => T | PromiseLike<T>,
    options?: { delay?: number; priority?: TaskPriority; signal?: AbortSignal },
  ): Promise<T> {
    return this.#scheduler.postTask(callback, options);
  }
}
