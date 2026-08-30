import { backoff } from '@vielzeug/arsenal/async';
import { asJsonValue, failureFrom, isAbortError, runValidate } from './_json.ts';
import { PostmasterDisposedError, PostmasterError, PostmasterJobError } from './errors.ts';
import {
  claimJob,
  completeJob,
  deadLetterJob,
  enqueueJob,
  releaseJob,
  removeJob,
  renewLeaseJob,
  rescheduleJob,
  retryJob,
  toEntry,
} from './store-ops.ts';
import type {
  CreatePostmasterOptions,
  EnqueueOptions,
  EntryFilter,
  FlushResult,
  InferJobPayload,
  JobContext,
  JobDefinition,
  JobDefinitions,
  Postmaster,
  PostmasterEntry,
  PostmasterEvent,
  PostmasterStats,
  RemoveResult,
  RetryResult,
  StoredJob,
} from './types.ts';

type ExecutionResult = Omit<FlushResult, 'processed'> & { processed: boolean };
type MutableFlushResult = { -readonly [K in keyof FlushResult]: FlushResult[K] };

const emptyResult = (): FlushResult => ({ completed: 0, deadLettered: 0, processed: 0, retryScheduled: 0 });

function assertLeaseDuration(value: number): void {
  if (!Number.isInteger(value) || value < 1_000) {
    throw new PostmasterError('leaseDuration must be a positive integer of at least 1000ms');
  }
}

function assertAvailableAt(value: number | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(value)) {
    throw new PostmasterError('availableAt must be a finite non-negative safe integer');
  }
  return value;
}

export function createPostmaster<J extends JobDefinitions>(options: CreatePostmasterOptions<J>): Postmaster<J> {
  const { clock = Date.now, jobs, leaseDuration = 30_000, signal, store } = options;
  assertLeaseDuration(leaseDuration);

  const controller = new AbortController();
  const ownerId = crypto.randomUUID();
  const tappers = new Set<(event: PostmasterEvent) => void>();
  let disposed = false;
  let started = false;
  let running: Promise<void> | undefined;
  let wakeTimer: ReturnType<typeof setTimeout> | undefined;
  const activeEntries = new Map<string, StoredJob>();
  let flushPromise: Promise<FlushResult> | undefined;

  const error = (reason: unknown): void => {
    const value = reason instanceof Error ? reason : new Error(String(reason));
    emitTap({ error: value, type: 'processor-error' });
  };

  const emitTap = (event: PostmasterEvent): void => {
    if (tappers.size === 0) return;
    for (const tapper of tappers) {
      try {
        tapper(event);
      } catch {
        // Observability must not affect postmaster behavior.
      }
    }
  };

  const assertLive = (): void => {
    if (disposed) throw new PostmasterDisposedError('Postmaster is disposed');
  };

  const clearWakeTimer = (): void => {
    if (wakeTimer !== undefined) clearTimeout(wakeTimer);
    wakeTimer = undefined;
  };

  const wake = (): void => {
    clearWakeTimer();
    if (started && !disposed) pump();
  };

  const schedule = async (): Promise<void> => {
    if (!started || disposed) return;
    const next = await store.transact((tx) => tx.findNextWake(clock()));
    if (next === undefined) return;
    const delay = Math.max(0, Math.min(next - clock(), 2_147_483_647));
    wakeTimer = setTimeout(wake, delay);
  };

  const resolveJob = (entry: StoredJob): JobDefinition<unknown> => {
    const job = jobs[entry.name];
    if (!job) throw new PostmasterJobError(`no job definition is registered for "${entry.name}"`);
    return job;
  };

  const deadLetter = async (entry: StoredJob, reason: unknown): Promise<ExecutionResult> => {
    const finalized = await store.transact((tx) =>
      deadLetterJob(tx, { failure: failureFrom(reason, clock()), id: entry.id, now: clock(), ownerId }),
    );

    if (!finalized) {
      emitTap({ id: entry.id, type: 'lease-lost' });
      return { completed: 0, deadLettered: 0, processed: true, retryScheduled: 0 };
    }

    emitTap({ entry: toEntry({ ...entry, status: 'dead-letter' }), type: 'dead-lettered' });
    return { completed: 0, deadLettered: 1, processed: true, retryScheduled: 0 };
  };

  const execute = async (entry: StoredJob, externalSignal?: AbortSignal): Promise<ExecutionResult> => {
    let job: JobDefinition<unknown>;
    let payload: unknown;

    try {
      job = resolveJob(entry);
      if (entry.version > job.version) {
        throw new PostmasterJobError(
          `job "${entry.name}" version ${entry.version} is newer than the registered version`,
        );
      }
      const raw = entry.version === job.version ? entry.payload : job.migrate?.(entry.payload, entry.version);
      if (raw === undefined) {
        throw new PostmasterJobError(`job "${entry.name}" version ${entry.version} cannot be migrated`);
      }
      payload = runValidate(job.validate, raw);
    } catch (reason) {
      return deadLetter(entry, reason);
    }

    const taskController = new AbortController();
    const taskSignal = AbortSignal.any(
      [controller.signal, externalSignal, taskController.signal].filter((s): s is AbortSignal => s !== undefined),
    );
    const heartbeat = setInterval(
      () => {
        void store
          .transact((tx) =>
            renewLeaseJob(tx, { id: entry.id, leaseExpiresAt: clock() + leaseDuration, now: clock(), ownerId }),
          )
          .then((renewed) => {
            if (!renewed) {
              taskController.abort();
              emitTap({ id: entry.id, type: 'lease-lost' });
            }
          })
          .catch(error);
      },
      Math.max(1_000, Math.floor(leaseDuration / 2)),
    );

    emitTap({ entry: toEntry(entry), type: 'started' });

    try {
      await job.execute(payload, {
        attempt: entry.attempts,
        entryId: entry.id,
        key: entry.key,
        signal: taskSignal,
      } as JobContext);

      if (taskSignal.aborted) {
        await store.transact((tx) => releaseJob(tx, { id: entry.id, now: clock(), ownerId }));
        return { completed: 0, deadLettered: 0, processed: true, retryScheduled: 0 };
      }

      const completed = await store.transact((tx) => completeJob(tx, { id: entry.id, now: clock(), ownerId }));
      if (!completed) {
        emitTap({ id: entry.id, type: 'lease-lost' });
        return { completed: 0, deadLettered: 0, processed: true, retryScheduled: 0 };
      }

      emitTap({ entry: toEntry(entry), type: 'completed' });
      return { completed: 1, deadLettered: 0, processed: true, retryScheduled: 0 };
    } catch (reason) {
      if (taskSignal.aborted || isAbortError(reason)) {
        await store.transact((tx) => releaseJob(tx, { id: entry.id, now: clock(), ownerId }));
        return { completed: 0, deadLettered: 0, processed: true, retryScheduled: 0 };
      }

      let shouldRetry = false;
      let delay = 0;

      try {
        shouldRetry =
          entry.attempts < (job.retry?.maxAttempts ?? 1) && (job.retry?.shouldRetry(reason, entry.attempts) ?? false);
        if (!shouldRetry) return deadLetter(entry, reason);
        delay = job.retry?.delay?.(entry.attempts - 1) ?? backoff(entry.attempts - 1);
        if (!Number.isFinite(delay) || delay < 0) {
          throw new PostmasterError(`job "${entry.name}" retry delay must be finite and non-negative`);
        }
      } catch (retryReason) {
        return deadLetter(entry, retryReason);
      }

      const availableAt = clock() + delay;
      const rescheduled = await store.transact((tx) =>
        rescheduleJob(tx, { availableAt, failure: failureFrom(reason, clock()), id: entry.id, now: clock(), ownerId }),
      );
      if (!rescheduled) {
        emitTap({ id: entry.id, type: 'lease-lost' });
        return { completed: 0, deadLettered: 0, processed: true, retryScheduled: 0 };
      }
      emitTap({ entry: toEntry({ ...entry, availableAt, status: 'queued' }), type: 'retry-scheduled' });
      return { completed: 0, deadLettered: 0, processed: true, retryScheduled: 1 };
    } finally {
      clearInterval(heartbeat);
    }
  };

  const processNext = async (externalSignal?: AbortSignal): Promise<ExecutionResult> => {
    if (externalSignal?.aborted) throw new DOMException('The operation was aborted', 'AbortError');
    if (controller.signal.aborted) return { completed: 0, deadLettered: 0, processed: false, retryScheduled: 0 };
    const entry = await store.transact((tx) => claimJob(tx, { leaseDuration, now: clock(), ownerId }));
    if (!entry) return { completed: 0, deadLettered: 0, processed: false, retryScheduled: 0 };
    activeEntries.set(entry.id, entry);
    try {
      return await execute(entry, externalSignal);
    } finally {
      activeEntries.delete(entry.id);
    }
  };

  const pump = (): void => {
    if (running || disposed) return;
    running = (async () => {
      for (;;) {
        const result = await processNext();
        if (!result.processed || disposed) break;
      }
      await schedule();
    })()
      .catch(error)
      .finally(() => {
        running = undefined;
      });
  };

  const unsubscribeStore = store.subscribe(wake);
  const externalAbort = (): void => {
    void dispose();
  };
  signal?.addEventListener('abort', externalAbort, { once: true });

  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    emitTap({ type: 'dispose' });
    tappers.clear();
    clearWakeTimer();
    signal?.removeEventListener('abort', externalAbort);
    unsubscribeStore();
    controller.abort();
    const entries = [...activeEntries.values()];
    activeEntries.clear();
    await Promise.all(
      entries.map((entry) => store.transact((tx) => releaseJob(tx, { id: entry.id, now: clock(), ownerId }))),
    );
  };

  return {
    get disposalSignal() {
      return controller.signal;
    },
    async dispose(): Promise<void> {
      await dispose();
    },
    get disposed() {
      return disposed;
    },
    async enqueue<K extends keyof J & string>(
      name: K,
      payload: InferJobPayload<J[K]>,
      options?: EnqueueOptions,
    ): Promise<PostmasterEntry> {
      assertLive();
      const job = jobs[name];
      if (!job) throw new PostmasterJobError(`no job definition is registered for "${name}"`);
      const now = clock();
      const availableAt = assertAvailableAt(options?.availableAt, now);
      const parsed = runValidate(job.validate, payload);
      const key = job.key(parsed);
      if (typeof key !== 'string' || key.length === 0) {
        throw new PostmasterError(`job "${name}" returned an empty key`);
      }
      const entry: StoredJob = {
        attempts: 0,
        availableAt,
        createdAt: now,
        id: crypto.randomUUID(),
        key,
        name,
        payload: asJsonValue(parsed),
        status: 'queued',
        updatedAt: now,
        version: job.version,
      };
      await store.transact((tx) => enqueueJob(tx, entry));
      const result = toEntry(entry);
      emitTap({ entry: result, type: 'enqueued' });
      wake();
      return result;
    },
    flush(options?: { signal?: AbortSignal }): Promise<FlushResult> {
      assertLive();
      if (flushPromise) return flushPromise;
      clearWakeTimer();
      const promise = (async (): Promise<FlushResult> => {
        await running;
        const result: MutableFlushResult = emptyResult();
        try {
          for (;;) {
            const next = await processNext(options?.signal);
            if (!next.processed) return result;
            result.processed += 1;
            result.completed += next.completed;
            result.deadLettered += next.deadLettered;
            result.retryScheduled += next.retryScheduled;
            if (disposed) return result;
          }
        } finally {
          flushPromise = undefined;
          wake();
        }
      })();
      flushPromise = promise;
      return promise;
    },
    async list(filter?: EntryFilter): Promise<PostmasterEntry[]> {
      assertLive();
      return (await store.list(filter)).map(toEntry);
    },
    async remove(id: string): Promise<RemoveResult> {
      assertLive();
      const result = await store.transact((tx) => removeJob(tx, id));
      if (result.status === 'removed') emitTap({ id, type: 'removed' });
      return result;
    },
    async retry(id: string): Promise<RetryResult> {
      assertLive();
      const result = await store.transact((tx) => retryJob(tx, id, clock()));
      if (result.status === 'retried') wake();
      return result;
    },
    async start(): Promise<void> {
      assertLive();
      if (started) return;
      started = true;
      wake();
    },
    async stats(): Promise<PostmasterStats> {
      assertLive();
      return store.transact((tx) => tx.countByStatus());
    },
    tap(handler: (event: PostmasterEvent) => void, opts?: { readonly signal?: AbortSignal }): () => void {
      assertLive();
      tappers.add(handler);

      if (opts?.signal) {
        if (opts.signal.aborted) {
          tappers.delete(handler);
          return () => {};
        }
        const onAbort = () => tappers.delete(handler);
        opts.signal.addEventListener('abort', onAbort, { once: true });
        return () => {
          tappers.delete(handler);
          opts.signal?.removeEventListener('abort', onAbort);
        };
      }

      return () => tappers.delete(handler);
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await dispose();
    },
  };
}
