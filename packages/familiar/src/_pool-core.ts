import { abortError } from '@vielzeug/arsenal';
import { unrefTimer } from './_timers.js';
import { FamiliarInvalidOptionsError, FamiliarTerminatedError, FamiliarTimeoutError } from './errors.js';
import type { DrainOptions, WorkerStats, WorkerStatus } from './types.js';

export const MAX_CONCURRENCY = 512;
export const MAX_TIMEOUT = 2_147_483_647;

export function validatePriority(priority: number): number {
  if (!Number.isFinite(priority)) throw new FamiliarInvalidOptionsError('`priority` must be a finite number');
  return priority;
}

export function validateTimeout(timeout: number | undefined, name = 'timeout'): number | undefined {
  if (timeout !== undefined && (!Number.isInteger(timeout) || timeout < 1 || timeout > MAX_TIMEOUT)) {
    throw new FamiliarInvalidOptionsError(`\`${name}\` must be an integer from 1 through ${MAX_TIMEOUT}`);
  }
  return timeout;
}

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
  priority: number;
  reject(reason: unknown): void;
  resolve(): void;
  sequence: number;
};

export interface PoolCore {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  drain(options?: DrainOptions): Promise<void>;
  readonly drainPromise: Promise<void> | undefined;
  isIdle(): boolean;
  rejectCapacity(reason: unknown): void;
  releaseCapacity(): void;
  settleIdle(): void;
  stats(queued: number): WorkerStats;
  status(): WorkerStatus;
  trackActive(delta: number): void;
  trackCompleted(): void;
  trackFailed(): void;
  waitForCapacity(signal: AbortSignal | undefined, priority: number): Promise<void>;
  waitForIdle(options: DrainOptions): Promise<void>;
}

/**
 * Shared disposal controller, idle/capacity waiters, drain, and stats tracking
 * used by both the single-result pool (`_pool.ts`) and the stream pool
 * (`_stream-pool.ts`). Each pool provides its own `isIdle` predicate and
 * `onDispose`/`onDrainStart` hooks to flush pool-specific pending work.
 */
export function createPoolCore(options: {
  isIdle: () => boolean;
  onDispose: () => void;
  onDrainStart: () => void;
}): PoolCore {
  const disposalController = new AbortController();
  const idleWaiters: IdleWaiter[] = [];
  const capacityWaiters: CapacityWaiter[] = [];
  let active = 0;
  let capacitySequence = 0;
  let completed = 0;
  let failed = 0;
  let drainPromise: Promise<void> | undefined;
  let terminated = false;

  function settleIdle(): void {
    if (!options.isIdle()) return;

    for (const waiter of idleWaiters.splice(0)) {
      if (waiter.timer) clearTimeout(waiter.timer);

      waiter.resolve();
    }
  }

  function waitForIdle(drainOptions: DrainOptions): Promise<void> {
    if (options.isIdle()) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const waiter: IdleWaiter = { reject, resolve };

      if (drainOptions.timeout !== undefined) {
        waiter.timer = setTimeout(() => {
          const index = idleWaiters.indexOf(waiter);

          if (index !== -1) idleWaiters.splice(index, 1);

          reject(new FamiliarTimeoutError(drainOptions.timeout!, 'Drain'));
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

  function waitForCapacity(signal: AbortSignal | undefined, priority: number): Promise<void> {
    if (signal?.aborted) return Promise.reject(abortError(signal));

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const waiter: CapacityWaiter = {
        cleanup() {
          signal?.removeEventListener('abort', onAbort);
        },
        priority,
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
        sequence: capacitySequence++,
      };
      const onAbort = () => waiter.reject(abortError(signal!));

      signal?.addEventListener('abort', onAbort, { once: true });
      capacityWaiters.push(waiter);
      capacityWaiters.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    });
  }

  function dispose(): void {
    if (terminated) return;

    terminated = true;
    disposalController.abort();
    options.onDispose();
    rejectCapacity(new FamiliarTerminatedError());
    settleIdle();
  }

  function drain(drainOptions: DrainOptions = {}): Promise<void> {
    if (terminated) return Promise.resolve();
    try {
      validateTimeout(drainOptions.timeout, 'drain.timeout');
    } catch (error) {
      return Promise.reject(error);
    }

    if (drainPromise) return drainPromise;

    options.onDrainStart();
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

  function trackActive(delta: number): void {
    active += delta;
  }

  function trackCompleted(): void {
    completed += 1;
  }

  function trackFailed(): void {
    failed += 1;
  }

  function stats(queued: number): WorkerStats {
    return { active, completed, failed, queued: queued + capacityWaiters.length };
  }

  function status(): WorkerStatus {
    if (terminated) return 'terminated';

    return active === 0 ? 'idle' : 'running';
  }

  return {
    disposalSignal: disposalController.signal,
    dispose,
    get disposed() {
      return terminated;
    },
    drain,
    get drainPromise() {
      return drainPromise;
    },
    isIdle: options.isIdle,
    rejectCapacity,
    releaseCapacity,
    settleIdle,
    stats,
    status,
    trackActive,
    trackCompleted,
    trackFailed,
    waitForCapacity,
    waitForIdle,
  };
}
