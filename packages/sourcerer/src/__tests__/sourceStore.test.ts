import { createSourceStore } from '../sourceStore';

describe('source store', () => {
  it('delivers complete replacements and stops after disposal', () => {
    const store = createSourceStore({ count: 0 });
    const listener = vi.fn();

    store.subscribe(listener);
    store.set({ count: 1 });

    expect(listener).toHaveBeenCalledWith({ count: 1 });
    expect(store.value).toEqual({ count: 1 });

    store.dispose();
    store.set({ count: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.disposalSignal.aborted).toBe(true);
  });

  it('commits and notifies remaining listeners when one observer throws', () => {
    const store = createSourceStore({ count: 0 });
    const queue = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(() => {});
    const listener = vi.fn();

    store.subscribe(() => {
      throw new Error('observer failure');
    });
    store.subscribe(listener);
    store.set({ count: 1 });

    expect(store.value).toEqual({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 });
    expect(queue).toHaveBeenCalledTimes(1);
    queue.mockRestore();
  });
});
