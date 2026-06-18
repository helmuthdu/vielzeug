import { abortable } from '../../_internal/_abortable';
import { memo } from '../../cache/memo';

describe('async extras', () => {
  it('supports abortable promises', async () => {
    const controller = new AbortController();
    const promise = abortable(new Promise((resolve) => setTimeout(() => resolve('ok'), 20)), controller.signal);

    controller.abort(new Error('aborted'));

    await expect(promise).rejects.toThrow('aborted');
  });

  it('rejects immediately when signal is already aborted', async () => {
    const controller = new AbortController();

    controller.abort(new TypeError('pre-aborted'));

    await expect(abortable(Promise.resolve('ok'), controller.signal)).rejects.toThrow('pre-aborted');
  });

  it('resolves when the underlying promise resolves before abort', async () => {
    const controller = new AbortController();
    const result = await abortable(Promise.resolve('success'), controller.signal);

    expect(result).toBe('success');
  });

  it('rejects when the underlying promise rejects', async () => {
    const controller = new AbortController();

    await expect(abortable(Promise.reject(new Error('inner error')), controller.signal)).rejects.toThrow('inner error');
  });

  it('memo rejects async functions at the type level', () => {
    const asyncFn = async (value: number) => value * 2;

    // @ts-expect-error — memo() does not accept async functions (returns Promise)
    const memoized = memo(asyncFn);

    // At runtime the call succeeds (caches the Promise object), but the type error
    // is the guard: callers must use stash.getOrSet for async memoization.
    expect(typeof memoized).toBe('function');
  });

  it('abortable: non-aborted signal — resolves with inner value', async () => {
    const controller = new AbortController();

    await expect(abortable(Promise.resolve('value'), controller.signal)).resolves.toBe('value');
  });

  it('abortable: no-reason abort rejects with DOMException AbortError', async () => {
    const controller = new AbortController();
    const promise = abortable(new Promise(() => {}), controller.signal);

    controller.abort();

    const err = await promise.catch((e: unknown) => e);

    expect((err as DOMException).name).toBe('AbortError');
    expect((err as DOMException).code).toBe(20);
  });

  it('abortable: already-aborted signal with no reason rejects with DOMException', async () => {
    const controller = new AbortController();

    controller.abort();

    const err = await abortable(Promise.resolve('x'), controller.signal).catch((e: unknown) => e);

    expect((err as DOMException).name).toBe('AbortError');
    expect((err as DOMException).code).toBe(20);
  });
});
