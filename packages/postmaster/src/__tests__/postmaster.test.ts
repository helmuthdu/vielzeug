import {
  createPostmaster,
  defineJobs,
  type JobContext,
  PostmasterDisposedError,
  PostmasterError,
  PostmasterJobError,
} from '../index.ts';
import { createMemoryPostmasterStore } from '../testing.ts';

const textValidator = (value: unknown) => String(value);

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
      .fn<(payload: unknown, context: JobContext) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const postmaster = createPostmaster({
      clock: () => now,
      jobs: defineJobs({
        send: {
          execute,
          key: (payload: unknown) => String(payload),
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

describe('tap()', () => {
  it('emits an enqueued event when a job is enqueued', async () => {
    const handler = vi.fn();
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler);

    const entry = await postmaster.enqueue('send', 'hello');

    expect(handler).toHaveBeenCalledWith({ entry, type: 'enqueued' });
    await postmaster.dispose();
  });

  it('emits started and completed events when a job runs', async () => {
    const handler = vi.fn();
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler);

    const entry = await postmaster.enqueue('send', 'hello');
    await postmaster.flush();

    expect(handler).toHaveBeenCalledWith({ entry: expect.objectContaining({ id: entry.id }), type: 'started' });
    expect(handler).toHaveBeenCalledWith({ entry: expect.objectContaining({ id: entry.id }), type: 'completed' });
    await postmaster.dispose();
  });

  it('emits a dead-lettered event when a job fails past max attempts', async () => {
    const handler = vi.fn();
    const execute = vi.fn().mockRejectedValue(new Error('boom'));
    let now = 100;
    const postmaster = createPostmaster({
      clock: () => now,
      jobs: defineJobs({
        send: {
          execute,
          key: (payload: unknown) => String(payload),
          retry: { delay: () => 50, maxAttempts: 2, shouldRetry: () => true },
          validate: textValidator,
          version: 1,
        },
      }),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler);

    const entry = await postmaster.enqueue('send', 'hello');
    await postmaster.flush();
    now = 150;
    await postmaster.flush();

    expect(handler).toHaveBeenCalledWith({ entry: expect.objectContaining({ id: entry.id }), type: 'dead-lettered' });
    await postmaster.dispose();
  });

  it('emits a dispose event on dispose', async () => {
    const handler = vi.fn();
    const postmaster = createPostmaster({
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler);

    await postmaster.dispose();

    expect(handler).toHaveBeenCalledWith({ type: 'dispose' });
  });

  it('returns an unsubscribe function that stops events', async () => {
    const handler = vi.fn();
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });
    const unsubscribe = postmaster.tap(handler);

    unsubscribe();
    await postmaster.enqueue('send', 'hello');

    expect(handler).not.toHaveBeenCalled();
    await postmaster.dispose();
  });

  it('auto-detaches when the tap signal aborts', async () => {
    const handler = vi.fn();
    const controller = new AbortController();
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler, { signal: controller.signal });

    controller.abort();
    await postmaster.enqueue('send', 'hello');

    expect(handler).not.toHaveBeenCalled();
    await postmaster.dispose();
  });

  it('swallows handler errors without affecting processing', async () => {
    const handler = vi.fn(() => {
      throw new Error('observer blew up');
    });
    const execute = vi.fn(async () => {});
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler);

    await postmaster.enqueue('send', 'hello');
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 1,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 0,
    });
    expect(execute).toHaveBeenCalledWith('hello', expect.objectContaining({ attempt: 1 }));
    await postmaster.dispose();
  });

  it('throws PostmasterDisposedError when tap is called after dispose', async () => {
    const postmaster = createPostmaster({
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });

    await postmaster.dispose();

    expect(() => postmaster.tap(vi.fn())).toThrow(PostmasterDisposedError);
  });
});

describe('delayed enqueue', () => {
  it('persists a future availableAt and skips it during flush', async () => {
    const execute = vi.fn(async () => {});
    const now = 100;
    const postmaster = createPostmaster({
      clock: () => now,
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });

    const entry = await postmaster.enqueue('send', 'hello', { availableAt: 500 });

    expect(entry).toMatchObject({ availableAt: 500, status: 'queued' });
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 0,
      deadLettered: 0,
      processed: 0,
      retryScheduled: 0,
    });
    expect(execute).not.toHaveBeenCalled();
    await postmaster.dispose();
  });

  it('executes the job once the clock reaches availableAt', async () => {
    const execute = vi.fn(async () => {});
    let now = 100;
    const postmaster = createPostmaster({
      clock: () => now,
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });

    await postmaster.enqueue('send', 'hello', { availableAt: 500 });
    await expect(postmaster.flush()).resolves.toMatchObject({ processed: 0 });

    now = 500;
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 1,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 0,
    });
    await postmaster.dispose();
  });

  it('processes a past availableAt immediately', async () => {
    const execute = vi.fn(async () => {});
    const postmaster = createPostmaster({
      clock: () => 1000,
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });

    await postmaster.enqueue('send', 'hello', { availableAt: 0 });
    await expect(postmaster.flush()).resolves.toEqual({
      completed: 1,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 0,
    });
    await postmaster.dispose();
  });

  it('defaults availableAt to the current clock when omitted', async () => {
    const execute = vi.fn(async () => {});
    const postmaster = createPostmaster({
      clock: () => 200,
      jobs: createJobs(execute),
      store: createMemoryPostmasterStore(),
    });

    const entry = await postmaster.enqueue('send', 'hello');
    expect(entry.availableAt).toBe(200);
    expect(entry.availableAt).toBe(entry.createdAt);
    await postmaster.dispose();
  });

  it('rejects invalid availableAt values before persistence', async () => {
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });

    await expect(postmaster.enqueue('send', 'hello', { availableAt: -1 })).rejects.toThrow(PostmasterError);
    await expect(postmaster.enqueue('send', 'hello', { availableAt: Number.NaN })).rejects.toThrow(PostmasterError);
    await expect(postmaster.enqueue('send', 'hello', { availableAt: 1.5 })).rejects.toThrow(PostmasterError);
    await expect(postmaster.enqueue('send', 'hello', { availableAt: Number.POSITIVE_INFINITY })).rejects.toThrow(
      PostmasterError,
    );
    await expect(postmaster.list()).resolves.toEqual([]);
    await postmaster.dispose();
  });

  it('emits an enqueued event with the scheduled availableAt', async () => {
    const handler = vi.fn();
    const postmaster = createPostmaster({
      clock: () => 100,
      jobs: createJobs(async () => {}),
      store: createMemoryPostmasterStore(),
    });
    postmaster.tap(handler);

    const entry = await postmaster.enqueue('send', 'hello', { availableAt: 300 });

    expect(handler).toHaveBeenCalledWith({ entry, type: 'enqueued' });
    expect(entry.availableAt).toBe(300);
    await postmaster.dispose();
  });

  it('retains a delayed job across processor recreation', async () => {
    const execute = vi.fn(async () => {});
    let now = 100;
    const store = createMemoryPostmasterStore();
    const first = createPostmaster({ clock: () => now, jobs: createJobs(execute), store });

    await first.enqueue('send', 'hello', { availableAt: 500 });
    await first.dispose();

    now = 500;
    const second = createPostmaster({ clock: () => now, jobs: createJobs(execute), store });
    await expect(second.flush()).resolves.toEqual({
      completed: 1,
      deadLettered: 0,
      processed: 1,
      retryScheduled: 0,
    });
    await second.dispose();
  });

  it('wakes the started processor when a delayed job becomes eligible', async () => {
    vi.useFakeTimers();
    try {
      const execute = vi.fn(async () => {});
      let now = 100;
      const postmaster = createPostmaster({
        clock: () => now,
        jobs: createJobs(execute),
        store: createMemoryPostmasterStore(),
      });

      await postmaster.enqueue('send', 'hello', { availableAt: 500 });
      await postmaster.start();

      // Let the pump settle: processNext finds nothing claimable, then schedule() arms the wake timer.
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(0);
      }

      now = 500;
      await vi.advanceTimersByTimeAsync(400);
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(0);
      }

      expect(execute).toHaveBeenCalledTimes(1);
      await postmaster.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
