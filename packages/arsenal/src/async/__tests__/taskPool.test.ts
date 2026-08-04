import { taskPool } from '../taskPool';

describe('taskPool', () => {
  it('limits concurrent work', async () => {
    let active = 0;
    let peak = 0;
    const pool = taskPool({ concurrency: 2 });
    const work = async (): Promise<void> => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
    };

    await Promise.all([pool.run(work), pool.run(work), pool.run(work)]);

    expect(peak).toBe(2);
  });

  it('passes disposal signal to tasks', async () => {
    const pool = taskPool();
    const result = await pool.run(async (signal) => signal === pool.disposalSignal);

    expect(result).toBe(true);
  });

  it('rejects pending and future work after disposal', async () => {
    const pool = taskPool();
    let release!: () => void;
    const running = pool.run(() => new Promise<void>((resolve) => (release = resolve)));
    const pending = pool.run(async () => 'pending');

    await new Promise((resolve) => setTimeout(resolve, 0));
    pool.dispose(new Error('closed'));

    await expect(pending).rejects.toThrow('closed');
    await expect(pool.run(async () => 'future')).rejects.toThrow('closed');
    release();
    await expect(running).resolves.toBeUndefined();
    await expect(pool.idle()).resolves.toBeUndefined();
  });

  it('rejects invalid concurrency', () => {
    expect(() => taskPool({ concurrency: 0 })).toThrow(RangeError);
  });
});
