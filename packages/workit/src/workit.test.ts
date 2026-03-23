import { createTestWorker } from './test/test';
import { createWorker, TaskError, TaskTimeoutError, TerminatedError, WorkerError } from './workit';

/** -------------------- createWorker -------------------- **/

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

      expect(await worker.run(buf, { transfer: [buf] })).toBe(8);
      worker.dispose();
    });
  });

  describe('size', () => {
    it('defaults to 1', () => {
      const worker = createWorker<number, number>((n) => n);

      expect(worker.size).toBe(1);
      worker.dispose();
    });

    it('respects an explicit size', () => {
      const pool = createWorker<number, number>((n) => n, { size: 4 });

      expect(pool.size).toBe(4);
      pool.dispose();
    });

    it('clamps size 0 to 1', () => {
      const pool = createWorker<number, number>((n) => n, { size: 0 });

      expect(pool.size).toBe(1);
      pool.dispose();
    });

    it("'auto' creates at least 1 slot", () => {
      const pool = createWorker<number, number>((n) => n, { size: 'auto' });

      expect(pool.size).toBeGreaterThanOrEqual(1);
      pool.dispose();
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
      const promise = worker.run();

      expect(worker.status).toBe('running');
      worker.dispose();
      await expect(promise).rejects.toThrow(TerminatedError);
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

  describe('concurrency', () => {
    it('dispatches tasks to all slots in a pool', async () => {
      const pool = createWorker<number, number>((n) => n * 2, { size: 3 });
      const results = await Promise.all([1, 2, 3].map((n) => pool.run(n)));

      expect(results).toEqual([2, 4, 6]);
      pool.dispose();
    });

    it('queues tasks that exceed pool capacity and processes them in order', async () => {
      const pool = createWorker<number, number>(async (n) => n, { size: 1 });
      const results = await Promise.all([1, 2, 3].map((n) => pool.run(n)));

      expect(results).toEqual([1, 2, 3]);
      pool.dispose();
    });

    it('processes more tasks than pool slots', async () => {
      const pool = createWorker<number, number>((n) => n + 1, { size: 2 });
      const results = await Promise.all([10, 20, 30, 40, 50].map((n) => pool.run(n)));

      expect(results).toEqual([11, 21, 31, 41, 51]);
      pool.dispose();
    });
  });

  describe('terminate', () => {
    it('rejects new run() calls', async () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      await expect(worker.run(1)).rejects.toThrow(TerminatedError);
    });

    it('rejects the in-flight task', async () => {
      const worker = createWorker<void, number>(() => new Promise((r) => setTimeout(() => r(1), 200)));
      const promise = worker.run(undefined);

      worker.dispose();
      await expect(promise).rejects.toThrow(TerminatedError);
    });

    it('rejects all queued tasks', async () => {
      const pool = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 200)), { size: 1 });
      const running = pool.run(undefined);
      const queued = pool.run(undefined);

      pool.dispose();
      await expect(running).rejects.toThrow(TerminatedError);
      await expect(queued).rejects.toThrow(TerminatedError);
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

  describe('error handling', () => {
    it('wraps Error throws in TaskError with the original message', async () => {
      const worker = createWorker<void, never>(() => {
        throw new Error('task failed');
      });
      const err = await worker.run(undefined).catch((e) => e);

      expect(err).toBeInstanceOf(TaskError);
      expect((err as TaskError).message).toBe('task failed');
      worker.dispose();
    });

    it('wraps non-Error throws in TaskError', async () => {
      const worker = createWorker<void, never>(() => {
        throw 'oops';
      });
      const err = await worker.run(undefined).catch((e) => e);

      expect(err).toBeInstanceOf(TaskError);
      expect((err as TaskError).message).toBe('oops');
      worker.dispose();
    });

    it('slot is reused after a task error — next run succeeds', async () => {
      const worker = createWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expect(worker.run(-1)).rejects.toThrow(TaskError);
      await expect(worker.run(5)).resolves.toBe(5);
      worker.dispose();
    });

    it('all error types extend WorkerError', () => {
      expect(new TaskError('x')).toBeInstanceOf(WorkerError);
      expect(new TerminatedError()).toBeInstanceOf(WorkerError);
      expect(new TaskTimeoutError(100)).toBeInstanceOf(WorkerError);
    });
  });

  describe('timeout', () => {
    it('rejects with TaskTimeoutError after the timeout expires', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 30 });

      await expect(worker.run(undefined)).rejects.toThrow(TaskTimeoutError);
      worker.dispose();
    }, 1000);

    it('resolves if the task completes before the timeout', async () => {
      const worker = createWorker<number, number>((n) => n, { timeout: 2000 });

      await expect(worker.run(42)).resolves.toBe(42);
      worker.dispose();
    });

    it('status is idle after a timeout', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 30 });

      await expect(worker.run(undefined)).rejects.toThrow(TaskTimeoutError);
      expect(worker.status).toBe('idle');
      worker.dispose();
    }, 1000);

    it('slot is reused after a timeout — next run succeeds', async () => {
      const worker = createWorker<number, number>((n) => (n === 0 ? new Promise(() => {}) : n), { timeout: 30 });

      await expect(worker.run(0)).rejects.toThrow(TaskTimeoutError);
      await expect(worker.run(42)).resolves.toBe(42);
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
      const worker = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 30)), { size: 1 });
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
        { size: 1 },
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
  });
});

/** -------------------- createTestWorker -------------------- **/

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

  describe('terminate', () => {
    it('rejects run() calls after dispose()', async () => {
      const worker = createTestWorker<number, number>((n) => n);

      worker.dispose();
      await expect(worker.run(1)).rejects.toThrow(TerminatedError);
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

      // @ts-expect-error — ReadonlyArray does not expose push
      void worker.calls.push;
      expect(Array.isArray(worker.calls)).toBe(true);
    });
  });

  describe('shape', () => {
    it('size is always 1', () => {
      const worker = createTestWorker<number, number>((n) => n);

      expect(worker.size).toBe(1);
    });
  });
});
