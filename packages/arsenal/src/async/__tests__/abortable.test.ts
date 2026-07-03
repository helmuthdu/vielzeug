import { abortable } from '../../_common/_abortable';

describe('abortable', () => {
  it('resolves when the underlying promise resolves', async () => {
    const result = await abortable(Promise.resolve(42), new AbortController().signal);

    expect(result).toBe(42);
  });

  it('rejects when the underlying promise rejects', async () => {
    await expect(abortable(Promise.reject(new Error('fail')), new AbortController().signal)).rejects.toThrow('fail');
  });

  it('rejects immediately when signal is already aborted', async () => {
    const signal = AbortSignal.abort();
    const err = await abortable(Promise.resolve(1), signal).catch((e) => e);

    expect((err as Error).name).toBe('AbortError');
  });

  it('rejects mid-flight when signal is aborted after wrapping', async () => {
    const controller = new AbortController();
    let outerResolve!: (v: number) => void;
    const slow = new Promise<number>((res) => {
      outerResolve = res;
    });
    const wrapped = abortable(slow, controller.signal);

    controller.abort();

    const err = await wrapped.catch((e) => e);

    expect((err as Error).name).toBe('AbortError');

    outerResolve(0);
  });

  it('removes the abort listener after the promise settles', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    await abortable(Promise.resolve('ok'), signal);

    const listenerCountBefore = (signal as unknown as { _listeners?: unknown[] })._listeners?.length ?? 0;

    controller.abort();

    expect(listenerCountBefore).toBe(0);
  });
});
