import { createTestWorker } from '../test/test';
import { WorkerError } from '../worker';

async function expectWorkerErrorCode<T>(promise: Promise<T>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('createTestWorker', () => {
  describe('options validation', () => {
    it('rejects invalid maxQueue values', () => {
      expect(() => createTestWorker<number, number>((n) => n, { maxQueue: 0 })).toThrow(WorkerError);
      expect(() => createTestWorker<number, number>((n) => n, { maxQueue: 1.5 })).toThrow(WorkerError);
    });
  });

  describe('execution semantics', () => {
    it('executes synchronous tasks', async () => {
      const worker = createTestWorker<number, number>((n) => n * 3);

      await expect(worker.run(7)).resolves.toBe(21);
    });

    it('executes async tasks', async () => {
      const worker = createTestWorker<string, string>(async (s) => `hey ${s}`);

      await expect(worker.run('you')).resolves.toBe('hey you');
    });

    it('propagates callback errors without wrapping in WorkerError', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expect(worker.run(-1)).rejects.toThrow('negative');
      // Note: unlike the real worker, createTestWorker does NOT wrap errors in WorkerError
      // for improved DX — vitest assertion errors surface directly.
    });

    it('tracks only successful calls in order', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n + 1;
      });

      await worker.run(1);
      await expect(worker.run(-1)).rejects.toThrow('negative');
      await worker.run(2);

      expect(worker.calls).toEqual([
        { input: 1, output: 2 },
        { input: 2, output: 3 },
      ]);
    });
  });

  describe('queue and cancellation', () => {
    it('rejects when queue is full', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 25)), {
        maxQueue: 1,
      });
      const running = worker.run(undefined);
      const queued = worker.run(undefined);

      await expectWorkerErrorCode(worker.run(undefined), 'queue_full');

      await running;
      await queued;
      worker.dispose();
    });

    it('rejects immediately when signal is already aborted', async () => {
      const worker = createTestWorker<number, number>((n) => n);
      const controller = new AbortController();

      controller.abort();

      await expect(worker.run(1, { signal: controller.signal })).rejects.toThrow(/aborted/i);
    });

    it('cancels a queued task without affecting the running task', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 25)));
      const controller = new AbortController();
      const running = worker.run(undefined);
      const queued = worker.run(undefined, { signal: controller.signal });

      controller.abort();

      await expect(queued).rejects.toThrow(/aborted/i);
      await expect(running).resolves.toBeUndefined();
      worker.dispose();
    });

    it('aborting multiple queued tasks skips all of them and runs the non-aborted remainder', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)),
      );
      const controller = new AbortController();
      const running = worker.run(1);
      const abortable1 = worker.run(10, { signal: controller.signal });
      const abortable2 = worker.run(20, { signal: controller.signal });
      const normal = worker.run(99);

      controller.abort();

      await expect(abortable1).rejects.toThrow(/aborted/i);
      await expect(abortable2).rejects.toThrow(/aborted/i);
      await expect(running).resolves.toBe(1);
      await expect(normal).resolves.toBe(99);
      worker.dispose();
    });
  });

  describe('lifecycle and metrics', () => {
    it('starts idle and becomes terminated after dispose', () => {
      const worker = createTestWorker<number, number>((n) => n);

      expect(worker.status).toBe('idle');
      worker.dispose();
      expect(worker.status).toBe('terminated');
    });

    it('rejects run calls after dispose', async () => {
      const worker = createTestWorker<number, number>((n) => n);

      worker.dispose();

      await expectWorkerErrorCode(worker.run(1), 'terminated');
    });

    it('close drains queued work then terminates', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)),
      );
      const first = worker.run(1);
      const second = worker.run(2);

      await worker.close();

      await expect(first).resolves.toBe(1);
      await expect(second).resolves.toBe(2);
      expect(worker.status).toBe('terminated');
    });

    it('rejects new run() calls once close() has started', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 20)));
      const running = worker.run(undefined);
      const closing = worker.close();

      await expectWorkerErrorCode(worker.run(undefined), 'terminated');
      await expect(running).resolves.toBeUndefined();
      await expect(closing).resolves.toBeUndefined();
    });

    it('dispose() while close() is pending eventually resolves the close promise', async () => {
      // In the test worker, tasks run in-process and cannot be force-terminated mid-flight.
      // dispose() stops accepting new work and drains the queue, but the in-flight task
      // completes naturally. close() therefore resolves once the task finishes.
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 30)));
      const running = worker.run(undefined);
      const closing = worker.close();

      worker.dispose();

      // The in-flight task completes (cannot be interrupted in-process).
      await expect(running).resolves.toBeUndefined();
      await expect(closing).resolves.toBeUndefined();
      expect(worker.status).toBe('terminated');
    });

    it('tracks completed count', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n + 1), 10)),
      );

      expect(worker.completed).toBe(0);
      await worker.run(1);
      await worker.run(2);
      expect(worker.completed).toBe(2);
    });

    it('tracks failed count (excludes aborts and terminations)', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('bad');

        return n;
      });

      await worker.run(1);
      await worker.run(-1).catch(() => {});
      await worker.run(-2).catch(() => {});
      expect(worker.failed).toBe(2);
      expect(worker.completed).toBe(1);
      worker.dispose();
    });

    it('does not count aborts as failures', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 25)));
      const controller = new AbortController();

      worker.run(undefined);

      const abortable = worker.run(undefined, { signal: controller.signal });

      controller.abort();
      await abortable.catch(() => {});
      await worker.close();

      expect(worker.failed).toBe(0);
    });

    it('reports utilization=1 while running, 0 when idle', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n + 1), 10)),
      );

      const task = worker.run(1);

      expect(worker.utilization).toBe(1);
      await expect(task).resolves.toBe(2);
      expect(worker.utilization).toBe(0);
    });

    it('reports active=1 while running, 0 when idle', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n + 1), 10)),
      );

      const task = worker.run(1);

      expect(worker.active).toBe(1);
      await expect(task).resolves.toBe(2);
      expect(worker.active).toBe(0);
    });

    it('reports queued count while tasks wait', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 25)));
      const running = worker.run(undefined);

      worker.run(undefined).catch(() => {});

      await Promise.resolve();
      expect(worker.queued).toBe(1);
      worker.dispose();
      await running.catch(() => {});
    });

    it('concurrency is always 1', () => {
      const worker = createTestWorker<number, number>((n) => n);

      expect(worker.concurrency).toBe(1);
      worker.dispose();
    });

    it('prime() is a no-op that resolves', async () => {
      const worker = createTestWorker<number, number>((n) => n);

      await expect(worker.prime()).resolves.toBeUndefined();
      worker.dispose();
    });

    it('[Symbol.dispose] terminates', () => {
      const worker = createTestWorker<number, number>((n) => n);

      worker[Symbol.dispose]();
      expect(worker.status).toBe('terminated');
    });

    it('[Symbol.asyncDispose] drains and terminates', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)),
      );
      const runPromise = worker.run(5);

      const [result] = await Promise.all([runPromise, worker[Symbol.asyncDispose]()]);

      expect(result).toBe(5);
      expect(worker.status).toBe('terminated');
    });
  });

  describe('batch()', () => {
    it('yields results in submission order', async () => {
      const worker = createTestWorker<number, number>((n) => n * 2);
      const results: number[] = [];

      for await (const r of worker.batch([1, 2, 3])) {
        results.push(r);
      }

      expect(results).toEqual([2, 4, 6]);
      worker.dispose();
    });

    it('yields nothing for an empty input array', async () => {
      const worker = createTestWorker<number, number>((n) => n);
      const results: number[] = [];

      for await (const r of worker.batch([])) {
        results.push(r);
      }

      expect(results).toEqual([]);
      worker.dispose();
    });

    it('propagates task errors', async () => {
      const worker = createTestWorker<number, number>((n) => {
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

    it('yields as-completed when ordered:false', async () => {
      const worker = createTestWorker<number, number>((n) => n * 2);
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
      const worker = createTestWorker<number, number>((n) => n * 2);
      const g = worker.group();

      const p1 = g.run(1);
      const p2 = g.run(2);

      await g.drain();

      await expect(p1).resolves.toBe(2);
      await expect(p2).resolves.toBe(4);
      expect(g.size).toBe(2);
      worker.dispose();
    });

    it('abort() cancels pending group tasks', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 30)));
      const g = worker.group();
      const running = g.run(undefined);
      const queued = g.run(undefined);

      g.abort();

      await expect(queued).rejects.toThrow(/aborted/i);
      await running.catch(() => {});
      worker.dispose();
    });
  });

  describe('onFull="wait"', () => {
    it('suspends caller when queue is full and resumes when slot opens', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)),
        { maxQueue: 1, onFull: 'wait' },
      );
      const p1 = worker.run(1);
      const p2 = worker.run(2); // fills queue
      const p3 = worker.run(3); // suspends caller

      await expect(Promise.all([p1, p2, p3])).resolves.toEqual([1, 2, 3]);
      worker.dispose();
    });
  });
});
