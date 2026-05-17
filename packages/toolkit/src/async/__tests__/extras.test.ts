import { memo } from '../../function/memo';
import { abortable } from '../abortable';
import { timeout } from '../timeout';

describe('async extras', () => {
  it('times out slow promises', async () => {
    await expect(timeout(new Promise((resolve) => setTimeout(resolve, 30)), 5)).rejects.toThrow('Operation timed out');
  });

  it('supports abortable promises', async () => {
    const controller = new AbortController();
    const promise = abortable(new Promise((resolve) => setTimeout(() => resolve('ok'), 20)), controller.signal);

    controller.abort(new Error('aborted'));

    await expect(promise).rejects.toThrow('aborted');
  });

  it('memoizes async work and deduplicates in-flight calls', async () => {
    const fn = vi.fn(async (value: number) => value * 2);
    const memoized = memo(fn);

    const [first, second] = await Promise.all([memoized(2), memoized(2)]);

    expect(first).toBe(4);
    expect(second).toBe(4);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
