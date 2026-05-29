import { WorkerError } from '../worker';
import { createTestWorker } from './test';

async function expectWorkerErrorCode<T>(promise: Promise<T>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('createTestWorker', () => {
  describe('execution semantics', () => {
    it('executes synchronous tasks', async () => {
      const worker = createTestWorker<number, number>((n) => n * 3);

      await expect(worker.run(7)).resolves.toBe(21);
    });

    it('executes async tasks', async () => {
      const worker = createTestWorker<string, string>(async (s) => `hey ${s}`);

      await expect(worker.run('you')).resolves.toBe('hey you');
    });

    it('wraps callback errors as WorkerError(code="task")', async () => {
      const worker = createTestWorker<number, number>((n) => {
        if (n < 0) throw new Error('negative');

        return n;
      });

      await expectWorkerErrorCode(worker.run(-1), 'task');
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

    it('tracks completed count and utilization during active work', async () => {
      const worker = createTestWorker<number, number>(
        (n) => new Promise((resolve) => setTimeout(() => resolve(n + 1), 10)),
      );

      expect(worker.completed).toBe(0);

      const task = worker.run(1);

      expect(worker.utilization).toBe(1);
      await expect(task).resolves.toBe(2);
      expect(worker.completed).toBe(1);
      expect(worker.utilization).toBe(0);
    });

    it('exposes WorkerError for termination and queue-full paths', () => {
      expect(new WorkerError('terminated', 'x')).toBeInstanceOf(WorkerError);
      expect(new WorkerError('queue_full', 'x')).toBeInstanceOf(WorkerError);
    });
  });
});
