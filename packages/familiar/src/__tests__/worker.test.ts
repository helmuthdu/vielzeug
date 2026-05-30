import { createWorker, WorkerError } from '../worker';

async function expectWorkerErrorCode<T>(promise: Promise<T>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('createWorker', () => {
  describe('options validation', () => {
    it('rejects non-positive or non-integer concurrency', () => {
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

    it('supports auto concurrency', () => {
      const worker = createWorker<number, number>((n) => n, { concurrency: 'auto' });

      expect(worker.concurrency).toBeGreaterThanOrEqual(1);
      worker.dispose();
    });
  });

  describe('execution semantics', () => {
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

    it('accepts transferables option without error', async () => {
      const worker = createWorker<ArrayBuffer, number>((buf) => buf.byteLength);
      const buf = new ArrayBuffer(8);

      expect(await worker.run(buf, { transferables: [buf] })).toBe(8);
      worker.dispose();
    });

    it('defaults concurrency to 1', () => {
      const worker = createWorker<number, number>((n) => n);

      expect(worker.concurrency).toBe(1);
      worker.dispose();
    });

    it('respects an explicit concurrency value', () => {
      const worker = createWorker<number, number>((n) => n, { concurrency: 4 });

      expect(worker.concurrency).toBe(4);
      worker.dispose();
    });
  });

  describe('pooling and queueing', () => {
    it('dispatches parallel work across multiple slots', async () => {
      const worker = createWorker<number, number>(
        async (n) => {
          await new Promise((resolve) => setTimeout(resolve, 10));

          return n * 2;
        },
        { concurrency: 3 },
      );

      const results = await Promise.all([1, 2, 3].map((n) => worker.run(n)));

      expect(results).toEqual([2, 4, 6]);
      worker.dispose();
    });

    it('queues excess tasks and preserves output order at call sites', async () => {
      const worker = createWorker<number, number>((n) => n + 1, { concurrency: 1 });
      const results = await Promise.all([10, 20, 30].map((n) => worker.run(n)));

      expect(results).toEqual([11, 21, 31]);
      worker.dispose();
    });

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
  });

  describe('abort behavior', () => {
    it('rejects immediately when signal is already aborted', async () => {
      const worker = createWorker<number, number>((n) => n);
      const controller = new AbortController();

      controller.abort(new Error('cancelled'));

      await expect(worker.run(1, { signal: controller.signal })).rejects.toThrow('cancelled');
      worker.dispose();
    });

    it('cancels a queued task', async () => {
      const worker = createWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 25)), {
        concurrency: 1,
      });
      const controller = new AbortController();
      const running = worker.run(undefined);
      const queued = worker.run(undefined, { signal: controller.signal });

      controller.abort();

      await expect(queued).rejects.toThrow(/aborted/i);
      await running;
      worker.dispose();
    });

    it('aborting one queued task does not affect others', async () => {
      const worker = createWorker<number, number>(
        (n) => (n < 0 ? new Promise<number>((resolve) => setTimeout(() => resolve(n), 25)) : n),
        { concurrency: 1 },
      );
      const controller = new AbortController();
      const running = worker.run(-1);
      const normal = worker.run(1);
      const abortable = worker.run(2, { signal: controller.signal });

      controller.abort();

      await expect(abortable).rejects.toThrow(/aborted/i);
      await expect(running).resolves.toBe(-1);
      await expect(normal).resolves.toBe(1);
      worker.dispose();
    });

    it('aborting multiple queued tasks skips all of them and runs the non-aborted remainder', async () => {
      const worker = createWorker<number, number>(
        (n) => (n < 0 ? new Promise<number>((resolve) => setTimeout(() => resolve(n), 25)) : n),
        { concurrency: 1 },
      );
      const controller = new AbortController();
      const running = worker.run(-1);
      const abortable1 = worker.run(10, { signal: controller.signal });
      const abortable2 = worker.run(20, { signal: controller.signal });
      const normal = worker.run(99);

      controller.abort();

      await expect(abortable1).rejects.toThrow(/aborted/i);
      await expect(abortable2).rejects.toThrow(/aborted/i);
      await expect(running).resolves.toBe(-1);
      await expect(normal).resolves.toBe(99);
      worker.dispose();
    });
  });

  describe('error and timeout handling', () => {
    it('wraps thrown Error values as task WorkerError', async () => {
      const worker = createWorker<void, never>(() => {
        throw new Error('task failed');
      });
      const error = await worker.run(undefined).catch((e) => e as WorkerError);

      expect(error).toBeInstanceOf(WorkerError);
      expect(error.code).toBe('task');
      expect(error.message).toBe('task failed');
      worker.dispose();
    });

    it('preserves original error metadata in cause while keeping WorkerError identity', async () => {
      const worker = createWorker<void, never>(() => {
        throw new TypeError('bad type');
      });
      const error = await worker.run(undefined).catch((e) => e as WorkerError);

      expect(error).toBeInstanceOf(WorkerError);
      expect(error.name).toBe('WorkerError');
      expect(error.code).toBe('task');
      expect((error.cause as Error).name).toBe('TypeError');
      expect((error.cause as Error).message).toBe('bad type');
      worker.dispose();
    });

    it('wraps non-Error throws as task WorkerError', async () => {
      const worker = createWorker<void, never>(() => {
        throw 'oops';
      });
      const error = await worker.run(undefined).catch((e) => e as WorkerError);

      expect(error).toBeInstanceOf(WorkerError);
      expect(error.code).toBe('task');
      expect(error.message).toBe('oops');
      worker.dispose();
    });

    it('slot remains usable after a task error', async () => {
      const worker = createWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expectWorkerErrorCode(worker.run(-1), 'task');
      await expect(worker.run(5)).resolves.toBe(5);
      worker.dispose();
    });

    it('rejects with timeout code when work exceeds pool-level timeout', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 25 });

      await expectWorkerErrorCode(worker.run(undefined), 'timeout');
      worker.dispose();
    }, 1000);

    it('per-run timeout overrides pool-level timeout', async () => {
      // Pool has a 5-second timeout; the per-run override of 25ms fires first.
      const worker = createWorker<void, void>(() => new Promise(() => {}), { timeout: 5000 });

      await expectWorkerErrorCode(worker.run(undefined, { timeout: 25 }), 'timeout');
      worker.dispose();
    }, 1000);

    it('slot remains usable after timeout', async () => {
      const worker = createWorker<number, number>((n) => (n === 0 ? new Promise(() => {}) : n), { timeout: 25 });

      await expectWorkerErrorCode(worker.run(0), 'timeout');
      await expect(worker.run(42)).resolves.toBe(42);
      worker.dispose();
    }, 1000);

    it('uses worker error code when Worker API is unavailable at runtime', async () => {
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
  });

  describe('lifecycle and metrics', () => {
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

    it('is terminated after dispose', () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      expect(worker.status).toBe('terminated');
    });

    it('rejects new run() calls after dispose', async () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      await expectWorkerErrorCode(worker.run(1), 'terminated');
    });

    it('rejects the in-flight task on dispose', async () => {
      const worker = createWorker<void, number>(() => new Promise((r) => setTimeout(() => r(1), 200)));
      const promise = worker.run(undefined);

      worker.dispose();
      await expectWorkerErrorCode(promise, 'terminated');
    });

    it('rejects all queued tasks on dispose', async () => {
      const pool = createWorker<void, void>(() => new Promise((r) => setTimeout(r, 200)), { concurrency: 1 });
      const running = pool.run(undefined);
      const queued = pool.run(undefined);

      pool.dispose();
      await expectWorkerErrorCode(running, 'terminated');
      await expectWorkerErrorCode(queued, 'terminated');
    });

    it('dispose is idempotent', () => {
      const worker = createWorker<number, number>((n) => n);

      worker.dispose();
      expect(() => worker.dispose()).not.toThrow();
    });

    it('[Symbol.dispose] terminates the worker', () => {
      const worker = createWorker<number, number>((n) => n);

      worker[Symbol.dispose]();
      expect(worker.status).toBe('terminated');
    });

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

    it('close() rejects when timeoutMs elapses before idle', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {})); // hangs forever
      const running = worker.run(undefined);

      await expect(worker.close(25)).rejects.toMatchObject({ code: 'timeout' });
      worker.dispose();
      await running.catch(() => {});
    }, 1000);

    it('dispose() while close() is pending resolves the close promise', async () => {
      const worker = createWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 50)));
      const running = worker.run(undefined);
      const closing = worker.close();

      // Dispose before the in-flight task finishes — close() must still resolve.
      worker.dispose();

      await expect(running).rejects.toMatchObject({ code: 'terminated' });
      await expect(closing).resolves.toBeUndefined();
      expect(worker.status).toBe('terminated');
    });

    it('rejects new run() calls once close() has started', async () => {
      const worker = createWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 20)));
      const running = worker.run(undefined);
      const closing = worker.close();

      await expectWorkerErrorCode(worker.run(undefined), 'terminated');
      await expect(running).resolves.toBeUndefined();
      await expect(closing).resolves.toBeUndefined();
    });

    it('[Symbol.asyncDispose] drains and terminates', async () => {
      const worker = createWorker<number, number>(async (n) => {
        await new Promise((resolve) => setTimeout(resolve, 20));

        return n;
      });
      const runPromise = worker.run(5);

      const [result] = await Promise.all([runPromise, worker[Symbol.asyncDispose]()]);

      expect(result).toBe(5);
      expect(worker.status).toBe('terminated');
    });

    it('tracks completed tasks', async () => {
      const worker = createWorker<number, number>((n) => n + 1);

      expect(worker.completed).toBe(0);
      await worker.run(1);
      await worker.run(2);
      expect(worker.completed).toBe(2);
      worker.dispose();
    });

    it('tracks failed tasks (excludes aborts and terminations)', async () => {
      const worker = createWorker<number, number>((n) => {
        if (n < 0) throw new Error('bad');

        return n;
      });

      expect(worker.failed).toBe(0);
      await worker.run(1);
      await worker.run(-1).catch(() => {});
      await worker.run(-2).catch(() => {});
      expect(worker.failed).toBe(2);
      expect(worker.completed).toBe(1);
      worker.dispose();
    });

    it('does not count aborts as failures', async () => {
      const worker = createWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 25)), {
        concurrency: 1,
      });
      const controller = new AbortController();

      worker.run(undefined);

      const abortable = worker.run(undefined, { signal: controller.signal });

      controller.abort();
      await abortable.catch(() => {});
      await worker.close();

      expect(worker.failed).toBe(0);
    });

    it('reports active count while running', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}));
      const promise = worker.run(undefined);

      await Promise.resolve();
      expect(worker.active).toBeGreaterThanOrEqual(1);
      worker.dispose();
      await expectWorkerErrorCode(promise, 'terminated');
      expect(worker.active).toBe(0);
    });

    it('reports queued count while tasks wait', async () => {
      const worker = createWorker<void, void>(() => new Promise(() => {}), { concurrency: 1 });
      const p1 = worker.run(undefined);

      worker.run(undefined).catch(() => {});

      await Promise.resolve();
      expect(worker.queued).toBe(1);
      worker.dispose();
      await expectWorkerErrorCode(p1, 'terminated');
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

    it('prime() does not throw and pre-initializes slots', async () => {
      const worker = createWorker<number, number>((n) => n);

      await expect(worker.prime()).resolves.toBeUndefined();
      worker.dispose();
    });
  });

  describe('batch()', () => {
    it('yields results in submission order', async () => {
      const worker = createWorker<number, number>((n) => n * 2);
      const results: number[] = [];

      for await (const r of worker.batch([1, 2, 3])) {
        results.push(r);
      }

      expect(results).toEqual([2, 4, 6]);
      worker.dispose();
    });

    it('yields nothing for an empty input array', async () => {
      const worker = createWorker<number, number>((n) => n);
      const results: number[] = [];

      for await (const r of worker.batch([])) {
        results.push(r);
      }

      expect(results).toEqual([]);
      worker.dispose();
    });

    it('propagates task errors and cancels remaining tasks', async () => {
      const worker = createWorker<number, number>((n) => {
        if (n === 2) throw new Error('bad');

        return n;
      });

      await expect(async () => {
        for await (const _ of worker.batch([1, 2, 3])) {
          // consume
        }
      }).rejects.toThrow('bad');

      worker.dispose();
    });

    it('passes per-run timeout to each task', async () => {
      const worker = createWorker<number, number>((n) => (n === 0 ? new Promise(() => {}) : n), { concurrency: 2 });

      await expect(async () => {
        for await (const _ of worker.batch([0, 1], { timeout: 25 })) {
          // consume
        }
      }).rejects.toMatchObject({ code: 'timeout' });

      worker.dispose();
    }, 1000);

    it('yields as-completed when ordered:false', async () => {
      const worker = createWorker<number, number>((n) => n * 2, { concurrency: 4 });
      const results: number[] = [];

      for await (const r of worker.batch([1, 2, 3], { ordered: false })) {
        results.push(r);
      }

      expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6]);
      worker.dispose();
    });
  });

  describe('group()', () => {
    it('runs tasks and drains them together', async () => {
      const worker = createWorker<number, number>((n) => n * 2);
      const g = worker.group();

      const p1 = g.run(1);
      const p2 = g.run(2);

      await g.drain();

      await expect(p1).resolves.toBe(2);
      await expect(p2).resolves.toBe(4);
      expect(g.size).toBe(2);
      worker.dispose();
    });

    it('abort() cancels all pending group tasks', async () => {
      const worker = createWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 50)), {
        concurrency: 1,
      });
      const g = worker.group();
      const running = g.run(undefined);
      const queued = g.run(undefined);

      g.abort();

      await expect(queued).rejects.toThrow(/aborted/i);
      // running task is in-flight and cannot be aborted
      await running.catch(() => {});
      worker.dispose();
    });

    it('size reflects submitted tasks', () => {
      const worker = createWorker<number, number>((n) => n);
      const g = worker.group();

      expect(g.size).toBe(0);
      g.run(1).catch(() => {});
      g.run(2).catch(() => {});
      expect(g.size).toBe(2);
      worker.dispose();
    });
  });

  describe('onFull="wait"', () => {
    it('suspends caller when queue is full and resumes when slot opens', async () => {
      const worker = createWorker<number, number>((n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)), {
        concurrency: 1,
        maxQueue: 1,
        onFull: 'wait',
      });
      const p1 = worker.run(1);
      const p2 = worker.run(2); // fills queue slot
      const p3 = worker.run(3); // would exceed maxQueue — suspends caller

      await expect(Promise.all([p1, p2, p3])).resolves.toEqual([1, 2, 3]);
      worker.dispose();
    });

    it('does not reject with queue_full when onFull="wait"', async () => {
      const worker = createWorker<number, number>((n) => n, { concurrency: 1, maxQueue: 1, onFull: 'wait' });

      const results = await Promise.all([worker.run(1), worker.run(2)]);

      expect(results).toEqual([1, 2]);
      worker.dispose();
    });
  });

  describe('runStream()', () => {
    it('yields chunks emitted by the worker', async () => {
      // Stream-mode worker: fn returns an iterable; the pool protocol emits each item as a chunk.
      const worker = createWorker<number, number[]>(
        (n) =>
          (async function* () {
            for (let i = 0; i < n; i++) yield i;
          })() as unknown as number[],
      );
      const chunks: number[] = [];

      for await (const chunk of worker.runStream(3)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([0, 1, 2]);
      worker.dispose();
    }, 2000);
  });

  describe('createModuleWorker', () => {
    it('throws worker error when Worker API is unavailable', async () => {
      const { createModuleWorker } = await import('../worker');
      const previousWorker = globalThis.Worker;

      Object.defineProperty(globalThis, 'Worker', { configurable: true, value: undefined, writable: true });

      const pool = createModuleWorker<number, number>(new URL('http://localhost/worker.js'));

      await expect(pool.run(1)).rejects.toMatchObject({ code: 'worker' });

      Object.defineProperty(globalThis, 'Worker', { configurable: true, value: previousWorker, writable: true });

      pool.dispose();
    });

    it('accepts string URL', async () => {
      const { createModuleWorker } = await import('../worker');

      // Just verify construction doesn't throw; actual execution needs a real module worker.
      expect(() => createModuleWorker<number, number>('http://localhost/worker.js')).not.toThrow();
    });
  });
});
