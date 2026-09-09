import { describe, expect, it, vi } from 'vitest';
import { createSentinel } from '../core.ts';

describe('Sentinel lifecycle', () => {
  it('exposes callback-safe external-store methods', () => {
    let update: ((value: number) => void) | undefined;
    const sentinel = createSentinel({ initialValue: 1 }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const listener = vi.fn();
    const { dispose, getSnapshot, subscribe } = sentinel;
    const unsubscribe = subscribe(listener);

    update?.(2);

    expect(getSnapshot()).toBe(2);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    dispose();
    expect(sentinel.disposed).toBe(true);
  });

  it('skips setup when the external signal is already aborted', () => {
    const controller = new AbortController();
    const setup = vi.fn(() => () => {});
    controller.abort();

    const sentinel = createSentinel({ initialValue: 1, signal: controller.signal }, setup);

    expect(setup).not.toHaveBeenCalled();
    expect(sentinel.disposed).toBe(true);
    expect(sentinel.disposalSignal.aborted).toBe(true);
  });

  it('disposes when the external signal aborts', () => {
    const controller = new AbortController();
    const cleanup = vi.fn();
    const sentinel = createSentinel({ initialValue: 1, signal: controller.signal }, () => cleanup);

    controller.abort();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(sentinel.disposed).toBe(true);
    expect(sentinel.disposalSignal.aborted).toBe(true);
  });

  it('removes the external abort listener on manual disposal', () => {
    const controller = new AbortController();
    const removeEventListener = vi.spyOn(controller.signal, 'removeEventListener');
    const sentinel = createSentinel({ initialValue: 1, signal: controller.signal }, () => () => {});

    sentinel.dispose();

    expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('aborts its disposal signal even when cleanup throws', () => {
    const sentinel = createSentinel({ initialValue: 1 }, () => () => {
      throw new Error('cleanup failed');
    });

    expect(() => sentinel.dispose()).toThrow('cleanup failed');
    expect(sentinel.disposed).toBe(true);
    expect(sentinel.disposalSignal.aborted).toBe(true);
  });

  it('propagates setup failures', () => {
    expect(() =>
      createSentinel({ initialValue: 1 }, () => {
        throw new Error('setup failed');
      }),
    ).toThrow('setup failed');
  });

  it('notifies multiple subscribers and stops after unsubscribe', () => {
    let update: ((value: number) => void) | undefined;
    const sentinel = createSentinel({ initialValue: 0 }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    const unsubA = sentinel.subscribe(listenerA);
    sentinel.subscribe(listenerB);

    update?.(1);
    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledOnce();

    unsubA();
    update?.(2);
    expect(listenerA).toHaveBeenCalledOnce();
    expect(listenerB).toHaveBeenCalledTimes(2);

    sentinel.dispose();
  });

  it('isolates listener errors without skipping subscribers', () => {
    let update: ((value: number) => void) | undefined;
    const queued: VoidFunction[] = [];
    const queueMicrotaskSpy = vi
      .spyOn(globalThis, 'queueMicrotask')
      .mockImplementation((callback) => queued.push(callback));
    const sentinel = createSentinel({ initialValue: 0 }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const listener = vi.fn();
    sentinel.subscribe(() => {
      throw new Error('listener failed');
    });
    sentinel.subscribe(listener);

    update?.(1);

    expect(listener).toHaveBeenCalledOnce();
    expect(queued).toHaveLength(1);
    expect(() => queued[0]?.()).toThrow('listener failed');

    sentinel.dispose();
    queueMicrotaskSpy.mockRestore();
  });

  it('delivers each update to the subscriber snapshot', () => {
    let update: ((value: number) => void) | undefined;
    const sentinel = createSentinel({ initialValue: 0 }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const addedDuringDelivery = vi.fn();
    const removedDuringDelivery = vi.fn();
    let unsubscribe = () => {};
    sentinel.subscribe(() => {
      unsubscribe();
      sentinel.subscribe(addedDuringDelivery);
    });
    unsubscribe = sentinel.subscribe(removedDuringDelivery);

    update?.(1);
    expect(removedDuringDelivery).toHaveBeenCalledOnce();
    expect(addedDuringDelivery).not.toHaveBeenCalled();

    update?.(2);
    expect(removedDuringDelivery).toHaveBeenCalledOnce();
    expect(addedDuringDelivery).toHaveBeenCalledOnce();

    sentinel.dispose();
  });

  it('finishes the current delivery when a listener disposes the Sentinel', () => {
    let update: ((value: number) => void) | undefined;
    const sentinel = createSentinel({ initialValue: 0 }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const listener = vi.fn();
    sentinel.subscribe(() => sentinel.dispose());
    sentinel.subscribe(listener);

    update?.(1);

    expect(listener).toHaveBeenCalledOnce();
    expect(sentinel.disposed).toBe(true);
  });
});
