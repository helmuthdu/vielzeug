import { createPostmaster, defineJobs, type JobContext } from '../index.ts';
import type { StoredJob } from '../store.ts';
import { claimJob } from '../store-ops.ts';
import { createMemoryPostmasterStore } from '../testing.ts';

const textValidator = (value: unknown) => String(value);

function stallUntilAbort(signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

function createJobs(execute: (payload: string, context: JobContext) => Promise<void>) {
  return defineJobs({
    send: {
      execute: execute as (payload: unknown, context: JobContext) => Promise<void>,
      key: (payload: unknown) => `send:${payload}`,
      validate: textValidator,
      version: 1,
    },
  });
}

const stallingJobs = createJobs(async (_payload, context) => {
  await stallUntilAbort(context.signal);
});

const queuedEntry = (id: string): StoredJob => ({
  attempts: 0,
  availableAt: 0,
  createdAt: 0,
  id,
  key: id,
  name: 'send',
  payload: id,
  status: 'queued',
  updatedAt: 0,
  version: 1,
});

describe('Postmaster concurrency and crash recovery', () => {
  it('two processors cannot hold the same lease simultaneously', async () => {
    const store = createMemoryPostmasterStore([queuedEntry('one')]);

    const a = createPostmaster({ clock: () => 0, jobs: stallingJobs, leaseDuration: 1000, store });
    const b = createPostmaster({ clock: () => 0, jobs: stallingJobs, leaseDuration: 1000, store });

    const aFlush = a.flush();
    const bFlush = b.flush();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await a.dispose();
    await b.dispose();
    const [aResult, bResult] = await Promise.all([aFlush, bFlush]);

    expect(aResult.processed + bResult.processed).toBe(1);
  });

  it('reclaims an abandoned lease after expiry and resumes processing', async () => {
    const store = createMemoryPostmasterStore([queuedEntry('one')]);
    const execute = vi.fn(async () => {});

    await store.transact((tx) => claimJob(tx, { leaseDuration: 1000, now: 0, ownerId: 'crashed' }));

    let now = 999;
    const early = createPostmaster({ clock: () => now, jobs: createJobs(execute), leaseDuration: 1000, store });
    await expect(early.flush()).resolves.toMatchObject({ processed: 0 });
    await early.dispose();

    now = 1001;
    const survivor = createPostmaster({ clock: () => now, jobs: createJobs(execute), leaseDuration: 1000, store });
    await expect(survivor.flush()).resolves.toMatchObject({ completed: 1, processed: 1 });
    expect(execute).toHaveBeenCalledTimes(1);
    await survivor.dispose();
  });

  it('rejects stale-owner completion after lease was reclaimed', async () => {
    const store = createMemoryPostmasterStore([queuedEntry('one')]);

    await store.transact((tx) => claimJob(tx, { leaseDuration: 1000, now: 0, ownerId: 'a' }));
    await store.transact((tx) => claimJob(tx, { leaseDuration: 1000, now: 1000, ownerId: 'b' }));

    const { completeJob } = await import('../store-ops.ts');
    await expect(store.transact((tx) => completeJob(tx, { id: 'one', now: 1000, ownerId: 'a' }))).resolves.toBe(false);
    await expect(store.transact((tx) => completeJob(tx, { id: 'one', now: 1000, ownerId: 'b' }))).resolves.toBe(true);
  });

  it('survives store recreation and continues after start', async () => {
    const store = createMemoryPostmasterStore();
    const execute = vi.fn(async () => {});
    const postmaster = createPostmaster({ clock: () => 0, jobs: createJobs(execute), store });

    await postmaster.enqueue('send', 'hello');
    await postmaster.dispose();

    const postmaster2 = createPostmaster({ clock: () => 0, jobs: createJobs(execute), store });
    postmaster2.start();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(postmaster2.list()).resolves.toEqual([]);
    await postmaster2.dispose();
  });

  it('disposal aborts owned work and releases the lease without consuming an attempt', async () => {
    let started!: () => void;
    const startedExecution = new Promise<void>((resolve) => {
      started = resolve;
    });
    const store = createMemoryPostmasterStore();
    const postmaster = createPostmaster({
      clock: () => 0,
      jobs: createJobs(async (_payload, context) => {
        started();
        await new Promise<void>((resolve) => context.signal.addEventListener('abort', () => resolve(), { once: true }));
      }),
      store,
    });

    await postmaster.enqueue('send', 'hello');
    const flushing = postmaster.flush();
    await startedExecution;
    await postmaster.dispose();
    await flushing;

    await expect(store.list()).resolves.toMatchObject([{ attempts: 1, status: 'queued' }]);
  });

  it('at-least-once: a crash after the remote write repeats the job', async () => {
    const store = createMemoryPostmasterStore([queuedEntry('one')]);
    const executions: number[] = [];
    const now = 0;

    const postmaster = createPostmaster({
      clock: () => now,
      jobs: createJobs(async (_payload, context) => {
        executions.push(context.attempt);
        await stallUntilAbort(context.signal);
      }),
      leaseDuration: 1000,
      store,
    });

    const flushing = postmaster.flush();
    await new Promise((resolve) => setTimeout(resolve, 5));
    await postmaster.dispose();
    await flushing;

    expect(executions).toEqual([1]);

    const survivor = createPostmaster({
      clock: () => now,
      jobs: createJobs(async (_payload, context) => {
        executions.push(context.attempt);
      }),
      leaseDuration: 1000,
      store,
    });
    await survivor.flush();
    await survivor.dispose();

    expect(executions).toEqual([1, 2]);
  });
});
