import { createPostmaster, defineJobs, PostmasterJobError } from '../index.ts';
import { createMemoryPostmasterStore } from '../testing.ts';

const textValidator = (value: unknown) => String(value);

function createJobs(execute: (payload: string, context: { attempt: number }) => Promise<void>) {
  return defineJobs({
    send: {
      execute,
      key: (payload) => `send:${payload}`,
      validate: textValidator,
      version: 1,
    },
  });
}

describe('Postmaster', () => {
  it('persists and executes a typed job once', async () => {
    const execute = vi.fn(async () => {});
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });

    const entry = await postmaster.enqueue('send', 'hello');
    const result = await postmaster.flush();

    expect(entry).toMatchObject({ attempts: 0, key: 'send:hello', name: 'send', status: 'queued' });
    expect(execute).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({ attempt: 1, entryId: entry.id, key: 'send:hello' }),
    );
    expect(result).toEqual({ completed: 1, deadLettered: 0, processed: 1, retryScheduled: 0 });
    await expect(postmaster.list()).resolves.toEqual([]);
  });

  it('reschedules only explicitly classified failures', async () => {
    let now = 100;
    const execute = vi
      .fn<(_: string, context: { attempt: number }) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const postmaster = createPostmaster({
      clock: () => now,
      jobs: defineJobs({
        send: {
          execute,
          key: (payload: string) => payload,
          retry: { delay: () => 50, maxAttempts: 2, shouldRetry: () => true },
          validate: textValidator,
          version: 1,
        },
      }),
      store: createMemoryPostmasterStore(),
    });

    await postmaster.enqueue('send', 'hello');
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 0,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 1,
    });
    await expect(postmaster.list()).resolves.toMatchObject([{ attempts: 1, availableAt: 150, status: 'queued' }]);

    now = 150;
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 1,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 0,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('moves terminal failures to the dead letter queue and permits manual retry', async () => {
    const execute = vi
      .fn<(_: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('bad request'))
      .mockResolvedValueOnce(undefined);
    const postmaster = createPostmaster({
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });

    const entry = await postmaster.enqueue('send', 'hello');
    await postmaster.flush();
    await expect(postmaster.list()).resolves.toMatchObject([
      { failure: { message: 'bad request' }, id: entry.id, status: 'dead-letter' },
    ]);

    await expect(postmaster.retry(entry.id)).resolves.toMatchObject({ status: 'retried' });
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 1,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 0,
    });
  });

  it('dead-letters missing definitions without executing them', async () => {
    const store = createMemoryPostmasterStore();
    await store.transact(async (tx) => {
      await tx.put({
        attempts: 0,
        availableAt: 0,
        createdAt: 0,
        id: 'unknown',
        key: 'unknown',
        name: 'removed-job',
        payload: 'value',
        status: 'queued',
        updatedAt: 0,
        version: 1,
      });
    });
    const postmaster = createPostmaster({ jobs: createJobs(async () => {}), store });

    await postmaster.flush();
    await expect(postmaster.list()).resolves.toMatchObject([
      { failure: { name: PostmasterJobError.name }, status: 'dead-letter' },
    ]);
  });

  it('releases an owned job when disposed while execution is active', async () => {
    let started!: () => void;
    const startedExecution = new Promise<void>((resolve) => {
      started = resolve;
    });
    const store = createMemoryPostmasterStore();
    const postmaster = createPostmaster({
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
});
