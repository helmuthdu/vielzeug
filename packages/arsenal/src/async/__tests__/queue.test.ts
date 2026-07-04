import { ArsenalError } from '../../errors';
import { queue, type Queue } from '../queue';

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

  it('tracks active, pending and size', async () => {
    const q = queue({ concurrency: 1 });
    let resolve!: () => void;

    void q.add(() => new Promise<void>((r) => (resolve = r)));
    void q.add(async () => {});

    await new Promise((r) => setTimeout(r, 0)); // let drain start

    expect(q.active).toBe(1);
    expect(q.pending).toBe(1);
    expect(q.size).toBe(2);

    resolve();
    await q.onIdle();

    expect(q.active).toBe(0);
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

  it('throws ArsenalError for concurrency < 1', () => {
    expect(() => queue({ concurrency: 0 })).toThrow(ArsenalError);
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

  it('rejects the task promise (instead of escaping add()) when a non-async task throws synchronously', async () => {
    const q = queue({ concurrency: 1 });

    // add() itself must not throw — the sync error should surface as a rejection of the
    // returned promise instead.
    const p1 = q.add((): Promise<never> => {
      throw new Error('sync boom');
    });
    const p2 = q.add(async () => 'ok');

    await expect(p1).rejects.toThrow('sync boom');
    await expect(p2).resolves.toBe('ok');
  });

  it('Queue type is exported and usable for variable typing', () => {
    const q: Queue = queue();

    expect(q.size).toBe(0);
  });

  it('onSettled fires for resolved tasks', async () => {
    const q = queue({ concurrency: 2 });
    const results: unknown[] = [];

    q.onSettled((r) => results.push(r));
    q.add(async () => 1);
    q.add(async () => 2);

    await q.onIdle();
    expect(results).toHaveLength(2);
    expect(results.every((r) => (r as { ok: boolean }).ok === true)).toBe(true);
    expect((results as Array<{ ok: true; value: number }>).map((r) => r.value).sort()).toEqual([1, 2]);
  });

  it('onSettled fires for failed tasks as { ok: false }', async () => {
    const q = queue({ concurrency: 1 });
    const results: unknown[] = [];

    q.onSettled((r) => results.push(r));
    q.add(async () => {
      throw new Error('boom');
    }).catch(() => null);
    q.add(async () => 'ok').catch(() => null);

    await q.onIdle();
    expect(results).toHaveLength(2);
    expect((results[0] as { ok: boolean }).ok).toBe(false);
    expect((results[1] as { ok: boolean }).ok).toBe(true);
  });

  it('onSettled returns an unsubscribe function', async () => {
    const q = queue();
    const results: unknown[] = [];

    const unsub = q.onSettled((r) => results.push(r));

    q.add(async () => 1);
    await q.onIdle();
    unsub();
    q.add(async () => 2);
    await q.onIdle();

    expect(results).toHaveLength(1);
  });

  it('onSettled supports multiple subscribers', async () => {
    const q = queue();
    let count1 = 0;
    let count2 = 0;

    q.onSettled(() => count1++);
    q.onSettled(() => count2++);
    q.add(async () => 'x');

    await q.onIdle();
    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });
});
