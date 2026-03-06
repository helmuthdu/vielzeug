import { createTestWorker, createWorker, createWorkerPool } from './workit';

/** -------------------- createWorker -------------------- **/

describe('createWorker', () => {
  describe('basic execution', () => {
    it('runs a synchronous task', async () => {
      const worker = createWorker<number, number>((n) => n * 2);
      expect(await worker.run(5)).toBe(10);
      worker.terminate();
    });

    it('runs an async task', async () => {
      const worker = createWorker<string, string>(async (s) => `hello ${s}`);
      expect(await worker.run('world')).toBe('hello world');
      worker.terminate();
    });

    it('propagates task errors as rejections', async () => {
      const worker = createWorker<void, never>(() => {
        throw new Error('task failed');
      });
      await expect(worker.run(undefined as undefined)).rejects.toThrow('task failed');
      worker.terminate();
    });

    it('handles complex object input and output', async () => {
      const worker = createWorker<{ a: number; b: number }, number>(({ a, b }) => a + b);
      expect(await worker.run({ a: 3, b: 4 })).toBe(7);
      worker.terminate();
    });

    it('handles multiple concurrent tasks', async () => {
      const worker = createWorker<number, number>((n) => n * 2);
      const results = await Promise.all([worker.run(1), worker.run(2), worker.run(3)]);
      expect(results).toEqual([2, 4, 6]);
      worker.terminate();
    });
  });

  describe('status', () => {
    it('is idle after creation', () => {
      const worker = createWorker<number, number>((n) => n);
      expect(worker.status).toBe('idle');
      worker.terminate();
    });

    it('is running while task is in progress', async () => {
      const worker = createWorker<void, number>(
        () => new Promise(() => {}), // never resolves
      );
      const promise = worker.run(undefined as undefined);
      expect(worker.status).toBe('running');
      worker.terminate();
      await expect(promise).rejects.toThrow('terminated');
    });

    it('is idle after task completes', async () => {
      const worker = createWorker<number, number>((n) => n);
      await worker.run(1);
      expect(worker.status).toBe('idle');
      worker.terminate();
    });

    it('is terminated after terminate()', () => {
      const worker = createWorker<number, number>((n) => n);
      worker.terminate();
      expect(worker.status).toBe('terminated');
    });
  });

  describe('terminate', () => {
    it('rejects run() calls after terminate()', async () => {
      const worker = createWorker<number, number>((n) => n);
      worker.terminate();
      await expect(worker.run(1)).rejects.toThrow('terminated');
    });

    it('rejects pending tasks when terminated mid-flight', async () => {
      let taskResolve!: (v: number) => void;
      const worker = createWorker<void, number>(
        () =>
          new Promise((r) => {
            taskResolve = r;
          }),
      );
      const promise = worker.run(undefined as undefined);
      worker.terminate();
      await expect(promise).rejects.toThrow('terminated');
      taskResolve(0); // clean up the hanging fn promise
    });

    it('is idempotent — calling twice does not throw', () => {
      const worker = createWorker<number, number>((n) => n);
      worker.terminate();
      expect(() => worker.terminate()).not.toThrow();
    });
  });

  describe('scripts', () => {
    it('accepts scripts option without error', async () => {
      // In test env Workers are unavailable; falls back to main thread (importScripts not called)
      const worker = createWorker<number, number>((n) => n + 1, {
        scripts: ['https://example.com/lib.js'],
      });
      expect(await worker.run(4)).toBe(5);
      worker.terminate();
    });

    it('works with multiple scripts entries', async () => {
      const worker = createWorker<string, string>((s) => s.toUpperCase(), {
        scripts: ['https://example.com/a.js', 'https://example.com/b.js'],
      });
      expect(await worker.run('hello')).toBe('HELLO');
      worker.terminate();
    });
  });

  describe('timeout', () => {
    it('rejects after timeout expires', async () => {
      const worker = createWorker<void, void>(
        () => new Promise(() => {}), // never resolves
        { timeout: 30 },
      );
      await expect(worker.run(undefined as undefined)).rejects.toThrow('timed out');
      worker.terminate();
    }, 1000);

    it('resolves if task completes before timeout', async () => {
      const worker = createWorker<number, number>((n) => n, { timeout: 2000 });
      await expect(worker.run(42)).resolves.toBe(42);
      worker.terminate();
    });

    it('status is idle after timeout', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 30 });
      await expect(worker.run(undefined as undefined)).rejects.toThrow();
      expect(worker.status).toBe('idle');
      worker.terminate();
    }, 1000);
  });
});

/** -------------------- createWorkerPool -------------------- **/

describe('createWorkerPool', () => {
  it('has the correct size', () => {
    const pool = createWorkerPool<number, number>((n) => n, { size: 3 });
    expect(pool.size).toBe(3);
    pool.terminate();
  });

  it('defaults size to at least 1', () => {
    const pool = createWorkerPool<number, number>((n) => n, { size: 0 });
    expect(pool.size).toBe(1);
    pool.terminate();
  });

  it('runs a single task', async () => {
    const pool = createWorkerPool<number, number>((n) => n * 10, { size: 2 });
    expect(await pool.run(5)).toBe(50);
    pool.terminate();
  });

  it('runAll returns results in input order', async () => {
    const pool = createWorkerPool<number, number>((n) => n * 2, { size: 2 });
    const results = await pool.runAll([1, 2, 3, 4]);
    expect(results).toEqual([2, 4, 6, 8]);
    pool.terminate();
  });

  it('queues tasks that exceed pool capacity', async () => {
    const order: number[] = [];
    const pool = createWorkerPool<number, number>(
      async (n) => {
        order.push(n);
        return n;
      },
      { size: 1 },
    );
    await pool.runAll([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
    pool.terminate();
  });

  it('processes more tasks than pool size', async () => {
    const pool = createWorkerPool<number, number>((n) => n + 1, { size: 2 });
    const results = await pool.runAll([10, 20, 30, 40, 50]);
    expect(results).toEqual([11, 21, 31, 41, 51]);
    pool.terminate();
  });

  it('rejects run() after terminate()', async () => {
    const pool = createWorkerPool<number, number>((n) => n, { size: 2 });
    pool.terminate();
    await expect(pool.run(1)).rejects.toThrow('terminated');
  });

  it('rejects queued tasks when terminated', async () => {
    let unblock!: () => void;
    const pool = createWorkerPool<void, void>(
      () =>
        new Promise((r) => {
          unblock = r;
        }),
      { size: 1 },
    );
    const running = pool.run(undefined as undefined);
    const queued = pool.run(undefined as undefined);
    pool.terminate();
    await expect(queued).rejects.toThrow('terminated');
    await expect(running).rejects.toThrow('terminated');
    unblock(); // prevent dangling promise
  });

  it('respects AbortSignal — cancels a queued task', async () => {
    let unblock!: () => void;
    const pool = createWorkerPool<void, void>(
      () =>
        new Promise((r) => {
          unblock = r;
        }),
      { size: 1 },
    );
    const ac = new AbortController();
    const running = pool.run(undefined as undefined);
    const abortable = pool.run(undefined as undefined, ac.signal);
    ac.abort();
    await expect(abortable).rejects.toThrow('Aborted');
    unblock();
    await running;
    pool.terminate();
  });

  it('rejects immediately when signal is already aborted', async () => {
    const pool = createWorkerPool<number, number>((n) => n, { size: 2 });
    const ac = new AbortController();
    ac.abort();
    await expect(pool.run(1, ac.signal)).rejects.toThrow('Aborted');
    pool.terminate();
  });

  it('propagates task errors', async () => {
    const pool = createWorkerPool<void, never>(
      () => {
        throw new Error('pool task error');
      },
      { size: 1 },
    );
    await expect(pool.run(undefined as undefined)).rejects.toThrow('pool task error');
    pool.terminate();
  });
});

/** -------------------- createTestWorker -------------------- **/

describe('createTestWorker', () => {
  it('runs the fn directly and returns its result', async () => {
    const { worker } = createTestWorker<number, number>((n) => n * 3);
    expect(await worker.run(7)).toBe(21);
  });

  it('runs an async fn', async () => {
    const { worker } = createTestWorker<string, string>(async (s) => `hey ${s}`);
    expect(await worker.run('you')).toBe('hey you');
  });

  it('records all calls in order', async () => {
    const { worker, calls } = createTestWorker<number, number>((n) => n + 1);
    await worker.run(1);
    await worker.run(2);
    await worker.run(3);
    expect(calls).toEqual([
      { input: 1, output: 2 },
      { input: 2, output: 3 },
      { input: 3, output: 4 },
    ]);
  });

  it('does not record failed calls', async () => {
    const { worker, calls } = createTestWorker<number, number>((n) => {
      if (n < 0) throw new Error('negative');
      return n;
    });
    await worker.run(1);
    await expect(worker.run(-1)).rejects.toThrow('negative');
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(1);
  });

  it('status is idle initially', () => {
    const { worker } = createTestWorker<number, number>((n) => n);
    expect(worker.status).toBe('idle');
  });

  it('status is terminated after terminate()', () => {
    const { worker } = createTestWorker<number, number>((n) => n);
    worker.terminate();
    expect(worker.status).toBe('terminated');
  });

  it('run() rejects after terminate()', async () => {
    const { worker } = createTestWorker<number, number>((n) => n);
    worker.terminate();
    await expect(worker.run(1)).rejects.toThrow('terminated');
  });

  it('dispose() terminates the worker', () => {
    const { worker, dispose } = createTestWorker<number, number>((n) => n);
    dispose();
    expect(worker.status).toBe('terminated');
  });

  it('calls accumulate across multiple invocations', async () => {
    const { worker, calls } = createTestWorker<string, string>((s) => s.toUpperCase());
    await worker.run('a');
    await worker.run('b');
    await worker.run('c');
    expect(calls.map((c) => c.output)).toEqual(['A', 'B', 'C']);
  });
});
