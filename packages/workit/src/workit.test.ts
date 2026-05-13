import { createTestWorker } from './test/test';
import { createWorker, WorkerError } from './workit';

async function expectWorkerErrorCode<T>(promise: Promise<T>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('createWorker', () => {
  describe('execution', () => {
    it('runs a synchronous task', async () => {
      const worker = createWorker<number, number>((n) => n * 2);

      expect(await worker.run(5)).toBe(10);
      worker.dispose();
    });

    it('runs an async task', async () => {
      const worker = createWorker<string, string>(async (s) => `hello ${s}`);

      expect(await worker.run('world')).toBe('hello world');
      worker.dispose();
    });

    it('handles complex object input and output', async () => {
      const worker = createWorker<{ a: number; b: number }, number>(({ a, b }) => a + b);

      expect(await worker.run({ a: 3, b: 4 })).toBe(7);
      worker.dispose();
    });

    it('accepts transfer option without error', async () => {
      const worker = createWorker<ArrayBuffer, number>((buf) => buf.byteLength);
      const buf = new ArrayBuffer(8);

      // jsdom's Worker implementation does not reliably support transfer lists.
      if (globalThis.navigator?.userAgent?.toLowerCase().includes('jsdom')) {
        expect(await worker.run(buf)).toBe(8);
        worker.dispose();

        return;
      }

      expect(await worker.run(buf, { transferables: [buf] })).toBe(8);
      worker.dispose();
    });
  });

  describe('concurrency', () => {
    it('defaults to 1', () => {
      const worker = createWorker<number, number>((n) => n);

      expect(worker.concurrency).toBe(1);
      worker.dispose();
    });

    it('respects an explicit concurrency value', () => {
      const pool = createWorker<number, number>((n) => n, { concurrency: 4 });

      expect(pool.concurrency).toBe(4);
      pool.dispose();
    });

    it('supports auto concurrency', () => {
      const pool = createWorker<number, number>((n) => n, { concurrency: 'auto' });

      expect(pool.concurrency).toBeGreaterThanOrEqual(1);
      pool.dispose();
    });

    it('rejects invalid concurrency values', () => {
      expect(() => createWorker<number, number>((n) => n, { concurrency: 0 })).toThrow(WorkerError);
      expect(() => createWorker<number, number>((n) => n, { concurrency: 1.5 })).toThrow(WorkerError);
    });

    it('rejects invalid timeout values', () => {
      expect(() => createWorker<number, number>((n) => n, { timeout: -1 })).toThrow(WorkerError);
      expect(() => createWorker<number, number>((n) => n, { timeout: 0 })).toThrow(WorkerError);
    });

    it('rejects invalid maxQueue values', () => {
      expect(() => createWorker<number, number>((n) => n, { maxQueue: 0 })).toThrow(WorkerError);
      expect(() => createWorker<number, number>((n) => n, { maxQueue: 1.5 })).toThrow(WorkerError);
    });
  });

  describe('queue limits', () => {
    it('rejects when queue is full', async () => {
      const worker = createWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 20)), {
        concurrency: 1,
        maxQueue: 1,
      });

      const running = worker.run(undefined);
      const queued = worker.run(undefined);

      await expect(worker.run(undefined)).rejects.toMatchObject({ code: 'queue_full' });

      await running;
      await queued;
      worker.dispose();
    });

    it('supports maxQueue auto', () => {
      const worker = createWorker<number, number>((n) => n, { concurrency: 2, maxQueue: 'auto' });

      expect(worker.size).toBe(0);
      worker.dispose();
    });
  });

  describe('status', () => {
    it('is idle after creation', () => {
      const worker = createWorker<number, number>((n) => n);

      expect(worker.status).toBe('idle');
      worker.dispose();
    });

    it('is running while a task is in progress', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}));
      const promise = worker.run(undefined);

      expect(worker.status).toBe('running');
      worker.dispose();
      await expectWorkerErrorCode(promise, 'terminated');
    });

    it('is idle after a task completes', async () => {
      const worker = createWorker<number, number>((n) => n);

      await worker.run(1);
      expect(worker.status).toBe('idle');
      worker.dispose();
    });

    it('is terminated after dispose()', () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      expect(worker.status).toBe('terminated');
    });
  });

  describe('pooling', () => {
    it('dispatches tasks to all slots in a pool', async () => {
      const pool = createWorker<number, number>((n) => n * 2, { concurrency: 3 });
      const results = await Promise.all([1, 2, 3].map((n) => pool.run(n)));

      expect(results).toEqual([2, 4, 6]);
      pool.dispose();
    });

    it('queues tasks that exceed pool capacity and processes them in order', async () => {
      const pool = createWorker<number, number>(async (n) => n, { concurrency: 1 });
      const results = await Promise.all([1, 2, 3].map((n) => pool.run(n)));

      expect(results).toEqual([1, 2, 3]);
      pool.dispose();
    });

    it('processes more tasks than pool slots', async () => {
      const pool = createWorker<number, number>((n) => n + 1, { concurrency: 2 });
      const results = await Promise.all([10, 20, 30, 40, 50].map((n) => pool.run(n)));

      expect(results).toEqual([11, 21, 31, 41, 51]);
      pool.dispose();
    });
  });

  describe('termination', () => {
    it('rejects new run() calls', async () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      await expectWorkerErrorCode(worker.run(1), 'terminated');
    });

    it('rejects the in-flight task', async () => {
      const worker = createWorker<void, number>(() => new Promise((r) => setTimeout(() => r(1), 200)));
      const promise = worker.run(undefined);

      worker.dispose();
      await expectWorkerErrorCode(promise, 'terminated');
    });

    it('rejects all queued tasks', async () => {
      const pool = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 200)), { concurrency: 1 });
      const running = pool.run(undefined);
      const queued = pool.run(undefined);

      pool.dispose();
      await expectWorkerErrorCode(running, 'terminated');
      await expectWorkerErrorCode(queued, 'terminated');
    });

    it('is idempotent', () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      expect(() => worker.dispose()).not.toThrow();
    });

    it('[Symbol.dispose] terminates the worker', () => {
      const worker = createWorker<number, number>((n) => n);

      worker[Symbol.dispose]();
      expect(worker.status).toBe('terminated');
    });
  });

  describe('lifecycle', () => {
    it('close() drains running and queued tasks then terminates', async () => {
      const worker = createWorker<number, number>((n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)), {
        concurrency: 1,
      });

      const p1 = worker.run(1);
      const p2 = worker.run(2);
      const closePromise = worker.close();

      await expect(p1).resolves.toBe(1);
      await expect(p2).resolves.toBe(2);
      await closePromise;
      expect(worker.status).toBe('terminated');
      await expectWorkerErrorCode(worker.run(3), 'terminated');
    });

    it('close() is idempotent', async () => {
      const worker = createWorker<number, number>((n) => n);
      const c1 = worker.close();
      const c2 = worker.close();

      await expect(c1).resolves.toBeUndefined();
      await expect(c2).resolves.toBeUndefined();
      expect(worker.status).toBe('terminated');
    });
  });

  describe('stats', () => {
    it('tracks completed tasks', async () => {
      const worker = createWorker<number, number>((n) => n + 1);

      expect(worker.completed).toBe(0);
      await worker.run(1);
      await worker.run(2);
      expect(worker.completed).toBe(2);
      worker.dispose();
    });

    it('tracks utilization while running', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}));
      const promise = worker.run(undefined);

      await Promise.resolve();

      expect(worker.utilization).toBe(1);
      worker.dispose();
      await expectWorkerErrorCode(promise, 'terminated');
      expect(worker.utilization).toBe(0);
    });
  });

  describe('error handling', () => {
    it('wraps Error throws in TaskError with the original message', async () => {
      const worker = createWorker<void, never>(() => {
        throw new Error('task failed');
      });
      const err = await worker.run(undefined).catch((e) => e);

      expect(err).toBeInstanceOf(WorkerError);
      expect((err as WorkerError).code).toBe('task');
      expect((err as WorkerError).message).toBe('task failed');
      worker.dispose();
    });

    it('wraps non-Error throws in TaskError', async () => {
      const worker = createWorker<void, never>(() => {
        throw 'oops';
      });
      const err = await worker.run(undefined).catch((e) => e);

      expect(err).toBeInstanceOf(WorkerError);
      expect((err as WorkerError).code).toBe('task');
      expect((err as WorkerError).message).toBe('oops');
      worker.dispose();
    });

    it('slot is reused after a task error', async () => {
      const worker = createWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expectWorkerErrorCode(worker.run(-1), 'task');
      await expect(worker.run(5)).resolves.toBe(5);
      worker.dispose();
    });

    it('uses WorkerError for runtime worker availability failures', async () => {
      const worker = createWorker<number, number>((n) => n * 2);
      const previousWorker = globalThis.Worker;

      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: undefined,
        writable: true,
      });

      await expect(worker.run(1)).rejects.toMatchObject({ code: 'worker' });

      Object.defineProperty(globalThis, 'Worker', {
        configurable: true,
        value: previousWorker,
        writable: true,
      });

      worker.dispose();
    });

    it('all exported error types extend WorkerError', () => {
      expect(new WorkerError('task', 'x')).toBeInstanceOf(WorkerError);
      expect(new WorkerError('timeout', 'x')).toBeInstanceOf(WorkerError);
      expect(new WorkerError('terminated', 'x')).toBeInstanceOf(WorkerError);
      expect(new WorkerError('queue_full', 'x')).toBeInstanceOf(WorkerError);
    });
  });

  describe('timeout', () => {
    it('rejects with timeout code after the timeout expires', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 30 });

      await expectWorkerErrorCode(worker.run(undefined), 'timeout');
      worker.dispose();
    }, 1000);

    it('resolves if the task completes before the timeout', async () => {
      const worker = createWorker<number, number>((n) => n, { timeout: 2000 });

      await expect(worker.run(42)).resolves.toBe(42);
      worker.dispose();
    });

    it('status is idle after a timeout', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 30 });

      await expectWorkerErrorCode(worker.run(undefined), 'timeout');
      expect(worker.status).toBe('idle');
      worker.dispose();
    }, 1000);

    it('slot is reused after a timeout', async () => {
      const worker = createWorker<number, number>((n) => (n === 0 ? new Promise(() => {}) : n), { timeout: 30 });

      await expectWorkerErrorCode(worker.run(0), 'timeout');
      await expect(worker.run(42)).resolves.toBe(42);
      worker.dispose();
    }, 1000);

    it('recycles the timed-out worker before the next task starts', async () => {
      const worker = createWorker<string, number>(
        (input) => {
          const scope = self as typeof self & { __runs?: number };

          scope.__runs = (scope.__runs ?? 0) + 1;

          if (input === 'timeout') {
            return new Promise<number>(() => {});
          }

          return scope.__runs;
        },
        { timeout: 10 },
      );

      await expectWorkerErrorCode(worker.run('timeout'), 'timeout');
      await expect(worker.run('fresh')).resolves.toBe(1);
      worker.dispose();
    }, 1000);
  });

  describe('abort signal', () => {
    it('rejects immediately when signal is already aborted', async () => {
      const worker = createWorker<number, number>((n) => n);
      const ac = new AbortController();

      ac.abort();
      await expect(worker.run(1, { signal: ac.signal })).rejects.toThrow(/aborted/i);
      worker.dispose();
    });

    it('cancels a queued task', async () => {
      const worker = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 30)), { concurrency: 1 });
      const ac = new AbortController();
      const running = worker.run(undefined);
      const abortable = worker.run(undefined, { signal: ac.signal });

      ac.abort();
      await expect(abortable).rejects.toThrow(/aborted/i);
      await running;
      worker.dispose();
    });

    it('aborting one queued task does not affect others', async () => {
      const pool = createWorker<number, number>(
        (n) => (n < 0 ? new Promise<number>((r) => setTimeout(() => r(n), 30)) : n),
        { concurrency: 1 },
      );
      const ac = new AbortController();
      const running = pool.run(-1);
      const normal = pool.run(1);
      const abortable = pool.run(2, { signal: ac.signal });

      ac.abort();
      await expect(abortable).rejects.toThrow(/aborted/i);
      expect(await running).toBe(-1);
      expect(await normal).toBe(1);
      pool.dispose();
    });

    it('removes queued abort listeners when a task starts running', async () => {
      const worker = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 20)), { concurrency: 1 });
      const controller = new AbortController();
      const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');

      const first = worker.run(undefined);
      const second = worker.run(undefined, { signal: controller.signal });

      await first;
      await second;

      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
      worker.dispose();
    });
  });
});

describe('createTestWorker', () => {
  describe('run', () => {
    it('executes a synchronous fn', async () => {
      const worker = createTestWorker<number, number>((n) => n * 3);

      expect(await worker.run(7)).toBe(21);
    });

    it('executes an async fn', async () => {
      const worker = createTestWorker<string, string>(async (s) => `hey ${s}`);

      expect(await worker.run('you')).toBe('hey you');
    });

    it('propagates task errors directly', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expect(worker.run(-1)).rejects.toThrow('negative');
    });
  });

  describe('status', () => {
    it('is idle initially', () => {
      const worker = createTestWorker<number, number>((n) => n);

      expect(worker.status).toBe('idle');
    });

    it('is running during async execution', async () => {
      const worker = createTestWorker<number, number>(async (n) => n);
      const promise = worker.run(1);

      expect(worker.status).toBe('running');
      await promise;
      expect(worker.status).toBe('idle');
    });

    it('is idle after task completes', async () => {
      const worker = createTestWorker<number, number>((n) => n);

      await worker.run(1);
      expect(worker.status).toBe('idle');
    });

    it('is terminated after dispose()', () => {
      const worker = createTestWorker<number, number>((n) => n);

      worker.dispose();
      expect(worker.status).toBe('terminated');
    });
  });

  describe('termination', () => {
    it('rejects run() calls after dispose()', async () => {
      const worker = createTestWorker<number, number>((n) => n);

      worker.dispose();
      await expectWorkerErrorCode(worker.run(1), 'terminated');
    });

    it('rejects immediately when signal is already aborted', async () => {
      const worker = createTestWorker<number, number>((n) => n);
      const controller = new AbortController();

      controller.abort();
      await expect(worker.run(1, { signal: controller.signal })).rejects.toThrow(/aborted/i);
    });
  });

  describe('calls', () => {
    it('records { input, output } for each successful run in order', async () => {
      const worker = createTestWorker<number, number>((n) => n + 1);

      await worker.run(1);
      await worker.run(2);
      await worker.run(3);
      expect(worker.calls).toEqual([
        { input: 1, output: 2 },
        { input: 2, output: 3 },
        { input: 3, output: 4 },
      ]);
    });

    it('does not record failed calls', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await worker.run(1);
      await expect(worker.run(-1)).rejects.toThrow('negative');
      expect(worker.calls).toHaveLength(1);
      expect(worker.calls[0]!.input).toBe(1);
    });

    it('is typed as ReadonlyArray', () => {
      const worker = createTestWorker<number, number>((n) => n);

      // @ts-expect-error - ReadonlyArray does not expose push.
      void worker.calls.push;
      expect(Array.isArray(worker.calls)).toBe(true);
    });
  });

  describe('shape', () => {
    it('concurrency is always 1', () => {
      const worker = createTestWorker<number, number>((n) => n);

      expect(worker.concurrency).toBe(1);
    });

    it('tracks completed and utilization', async () => {
      const worker = createTestWorker<number, number>((n) => n + 1);

      expect(worker.completed).toBe(0);

      const task = worker.run(1);

      expect(worker.utilization).toBe(1);
      await expect(task).resolves.toBe(2);
      expect(worker.completed).toBe(1);
      expect(worker.utilization).toBe(0);
    });

    it('close() drains and terminates', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)),
      );
      const p1 = worker.run(1);
      const p2 = worker.run(2);

      await worker.close();
      await expect(p1).resolves.toBe(1);
      await expect(p2).resolves.toBe(2);
      expect(worker.status).toBe('terminated');
    });
  });
});
