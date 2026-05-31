import { queue } from '../queue';

describe('queue', () => {
  it('processes tasks sequentially with concurrency 1', async () => {
    const order: number[] = [];
    const q = queue({ concurrency: 1 });

    void q.add(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
    });
    void q.add(async () => {
      order.push(2);
    });

    await q.onIdle();
    expect(order).toEqual([1, 2]);
  });

  it('processes tasks concurrently with concurrency 2', async () => {
    let maxConcurrent = 0;
    let concurrent = 0;
    const q = queue({ concurrency: 2 });

    const task = async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 10));
      concurrent--;
    };

    void q.add(task);
    void q.add(task);
    void q.add(task);

    await q.onIdle();
    expect(maxConcurrent).toBe(2);
  });

  it('returns result from add()', async () => {
    const q = queue();
    const result = await q.add(async () => 42);

    expect(result).toBe(42);
  });

  it('tracks pending and size', async () => {
    const q = queue({ concurrency: 1 });
    let resolve!: () => void;

    void q.add(() => new Promise<void>((r) => (resolve = r)));
    void q.add(async () => {});

    await new Promise((r) => setTimeout(r, 0)); // let drain start

    expect(q.pending).toBe(1);
    expect(q.size).toBe(1);

    resolve();
    await q.onIdle();

    expect(q.pending).toBe(0);
    expect(q.size).toBe(0);
  });

  it('clear() rejects pending tasks', async () => {
    const q = queue({ concurrency: 1 });
    let resolve!: () => void;

    void q.add(() => new Promise<void>((r) => (resolve = r)));

    const p2 = q.add(async () => 'never');

    await new Promise((r) => setTimeout(r, 0));

    q.clear();

    await expect(p2).rejects.toThrow('Queue cleared');

    resolve();
    await q.onIdle();
  });

  it('onIdle() resolves immediately when queue is empty', async () => {
    const q = queue();

    await expect(q.onIdle()).resolves.toBeUndefined();
  });

  it('throws a RangeError for concurrency < 1', () => {
    expect(() => queue({ concurrency: 0 })).toThrow(RangeError);
  });

  it('handles task errors without poisoning the queue', async () => {
    const q = queue({ concurrency: 1 });
    const p1 = q.add(async () => {
      throw new Error('boom');
    });
    const p2 = q.add(async () => 'ok');

    await expect(p1).rejects.toThrow('boom');
    await expect(p2).resolves.toBe('ok');
  });
});
