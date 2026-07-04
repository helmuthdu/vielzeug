import { createTestWorker } from '../testing/testing';
import { FamiliarInvalidOptionsError, FamiliarRuntimeError, FamiliarTaskError } from '../worker';
import { expectFamiliarErrorCode } from './worker-test-helpers';

describe('createTestWorker', () => {
  describe('options validation', () => {
    it('rejects invalid maxQueue values', () => {
      expect(() => createTestWorker<number, number>((n) => n, { maxQueue: 0 })).toThrow(FamiliarInvalidOptionsError);
      expect(() => createTestWorker<number, number>((n) => n, { maxQueue: 1.5 })).toThrow(FamiliarInvalidOptionsError);
    });

    it('rejects invalid concurrency values', () => {
      expect(() => createTestWorker<number, number>((n) => n, { concurrency: 0 })).toThrow(FamiliarInvalidOptionsError);
      expect(() => createTestWorker<number, number>((n) => n, { concurrency: 1.5 })).toThrow(
        FamiliarInvalidOptionsError,
      );
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

    it('propagates callback errors without wrapping in FamiliarError', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expect(worker.run(-1)).rejects.toThrow('negative');
      // Note: unlike the real worker, createTestWorker does NOT wrap errors in FamiliarError
      // for improved DX — vitest assertion errors surface directly.
    });

    it('wraps callback errors in FamiliarTaskError when errorWrapping is true', async () => {
      const worker = createTestWorker<number, number>(
        (n) => {
          if (n < 0) throw new Error('negative');

          return n;
        },
        { errorWrapping: true },
      );

      const error = await worker.run(-1).catch((e) => e);

      expect(error).toBeInstanceOf(FamiliarTaskError);
      expect(error.message).toBe('negative');
      expect(error.cause).toBeInstanceOf(Error);
    });

    it('does not wrap the runStream() unsupported rejection even when errorWrapping is true', async () => {
      const worker = createTestWorker<number, number>((n) => n, { errorWrapping: true });
      const iterator = worker.runStream(1)[Symbol.asyncIterator]();

      await expect(iterator.next()).rejects.toBeInstanceOf(FamiliarRuntimeError);
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

      await expectFamiliarErrorCode(worker.run(undefined), 'queue_full');

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

      await expectFamiliarErrorCode(worker.run(1), 'terminated');
    });

    it('drain() drains queued work then terminates', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n), 20)),
      );
      const first = worker.run(1);
      const second = worker.run(2);

      await worker.drain();

      await expect(first).resolves.toBe(1);
      await expect(second).resolves.toBe(2);
      expect(worker.status).toBe('terminated');
    });

    it('drain() rejects with timeout when in-flight work never settles', async () => {
      const worker = createTestWorker<void, void>(() => new Promise(() => {}));

      worker.run(undefined).catch(() => {});

      await expectFamiliarErrorCode(worker.drain(25), 'timeout');
      worker.dispose();
    }, 1000);

    it('rejects new run() calls once drain() has started', async () => {
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 20)));
      const running = worker.run(undefined);
      const draining = worker.drain();

      await expectFamiliarErrorCode(worker.run(undefined), 'terminated');
      await expect(running).resolves.toBeUndefined();
      await expect(draining).resolves.toBeUndefined();
    });

    it('dispose() while drain() is pending eventually resolves the drain promise', async () => {
      // In the test worker, tasks run in-process and cannot be force-terminated mid-flight.
      // dispose() stops accepting new work and drains the queue, but the in-flight task
      // completes naturally. drain() therefore resolves once the task finishes.
      const worker = createTestWorker<void, void>(() => new Promise((resolve) => setTimeout(resolve, 30)));
      const running = worker.run(undefined);
      const draining = worker.drain();

      worker.dispose();

      // The in-flight task completes (cannot be interrupted in-process).
      await expect(running).resolves.toBeUndefined();
      await expect(draining).resolves.toBeUndefined();
      expect(worker.status).toBe('terminated');
    });

    it('tracks completed count', async () => {
      const worker = createTestWorker<number, number>((n) => n + 1);

      expect(worker.completed).toBe(0);
      await worker.run(1);
      await worker.run(2);
      expect(worker.completed).toBe(2);
      worker.dispose();
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
      await worker.drain();

      expect(worker.failed).toBe(0);
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

    it('aborts remaining tasks when consumer breaks early', async () => {
      const worker = createTestWorker<number, number>((n) => n * 2);
      const collected: number[] = [];

      for await (const r of worker.batch([1, 2, 3])) {
        collected.push(r);
        break;
      }

      expect(collected).toHaveLength(1);
      worker.dispose();
    });

    it('bounds in-flight/buffered tasks to concurrency for a slow consumer (ordered:false)', async () => {
      const concurrency = 2;
      let started = 0;

      const worker = createTestWorker<number, number>(
        async (n) => {
          started++;
          await new Promise((resolve) => setTimeout(resolve, 5));

          return n;
        },
        { concurrency },
      );

      let consumed = 0;
      let maxLead = 0;

      for await (const _ of worker.batch(
        Array.from({ length: 10 }, (_, i) => i),
        { ordered: false },
      )) {
        consumed++;
        maxLead = Math.max(maxLead, started - consumed);
        // Simulate a slow consumer — much slower than the 5ms task duration.
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      expect(consumed).toBe(10);
      // Without windowed submission, `started` would race ahead to 10 almost immediately;
      // with it, no more than `concurrency` tasks may be started-but-not-yet-consumed at once.
      expect(maxLead).toBeLessThanOrEqual(concurrency);
      worker.dispose();
    });

    it('stops submitting further windowed tasks when consumer breaks early on a large ordered:false batch', async () => {
      const concurrency = 2;
      let started = 0;

      const worker = createTestWorker<number, number>(
        async (n) => {
          started++;
          await new Promise((resolve) => setTimeout(resolve, 10));

          return n;
        },
        { concurrency },
      );

      for await (const _ of worker.batch(
        Array.from({ length: 20 }, (_, i) => i),
        { ordered: false },
      )) {
        break;
      }

      // Give any wrongly-still-running submission loop a chance to over-submit before asserting.
      await new Promise((resolve) => setTimeout(resolve, 30));

      // Only the initial window (bounded by concurrency) should ever have been submitted —
      // breaking early must not let submitNext() keep releasing capacity for the other 18 inputs.
      expect(started).toBeLessThanOrEqual(concurrency);
      worker.dispose();
    });
  });

  describe('runStream()', () => {
    it('is unsupported by createTestWorker and rejects with worker code on first next()', async () => {
      const worker = createTestWorker<number, number>((n) => n);
      const iterator = worker.runStream(1)[Symbol.asyncIterator]();

      await expectFamiliarErrorCode(iterator.next(), 'worker');
      worker.dispose();
    });
  });

  describe('group()', () => {
    it('runs tasks and drains them together', async () => {
      const worker = createTestWorker<number, number>((n) => n * 2);
      const g = worker.group();

      const p1 = g.run(1);
      const p2 = g.run(2);

      const results = await g.drain();

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ status: 'fulfilled', value: 2 });
      expect(results[1]).toMatchObject({ status: 'fulfilled', value: 4 });
      await expect(p1).resolves.toBe(2);
      await expect(p2).resolves.toBe(4);
      expect(g.size).toBe(2);
      worker.dispose();
    });

    it('drain() on an empty group resolves with empty array', async () => {
      const worker = createTestWorker<number, number>((n) => n);
      const g = worker.group();

      await expect(g.drain()).resolves.toEqual([]);
      worker.dispose();
    });

    it('drain() returns all settled results including failures', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error(`fail:${n}`);

        return n;
      });
      const g = worker.group();

      g.run(-1).catch(() => {});
      g.run(-2).catch(() => {});
      g.run(3).catch(() => {});

      const settled = await g.drain();

      expect(settled).toHaveLength(3);
      expect(settled.filter((r) => r.status === 'rejected')).toHaveLength(2);
      expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
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

  describe('disposalSignal', () => {
    it('is not aborted before dispose()', () => {
      const worker = createTestWorker<number, number>((n) => n);

      expect(worker.disposalSignal.aborted).toBe(false);
      worker.dispose();
    });

    it('is aborted after dispose()', () => {
      const worker = createTestWorker<number, number>((n) => n);

      worker.dispose();
      expect(worker.disposalSignal.aborted).toBe(true);
    });
  });

  describe('concurrency > 1', () => {
    it('runs tasks in parallel across multiple slots', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n * 2), 20)),
        { concurrency: 3 },
      );

      const results = await Promise.all([1, 2, 3].map((n) => worker.run(n)));

      expect(results).toEqual([2, 4, 6]);
      worker.dispose();
    });

    it('respects concurrency limit', async () => {
      let maxActive = 0;
      let current = 0;

      const worker = createTestWorker<void, void>(
        async () => {
          current++;

          if (current > maxActive) maxActive = current;

          await new Promise((resolve) => setTimeout(resolve, 10));
          current--;
        },
        { concurrency: 2 },
      );

      await Promise.all([worker.run(), worker.run(), worker.run(), worker.run()]);
      expect(maxActive).toBeLessThanOrEqual(2);
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
