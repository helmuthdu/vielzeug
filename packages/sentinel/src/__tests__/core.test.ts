import { createRipple } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';
import { createSentinel } from '../core.ts';

describe('Sentinel lifecycle', () => {
  it('is directly readable and subscribable', () => {
    let update: ((value: number) => void) | undefined;
    const sentinel = createSentinel({ initialValue: 1 }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const listener = vi.fn();
    const unsubscribe = sentinel.subscribe(listener);

    update?.(2);

    expect(sentinel.value).toBe(2);
    expect(sentinel.peek()).toBe(2);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    sentinel.dispose();
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

  it('supports an isolated Ripple runtime', () => {
    const ripple = createRipple();
    let update: ((value: number) => void) | undefined;
    const sentinel = createSentinel({ initialValue: 2, runtime: ripple }, (setValue) => {
      update = setValue;
      return () => {};
    });
    const doubled = ripple.computed(() => sentinel.value * 2);

    expect(doubled.value).toBe(4);
    update?.(3);
    expect(doubled.value).toBe(6);

    sentinel.dispose();
    ripple.dispose();
  });

  it('propagates setup failures', () => {
    expect(() =>
      createSentinel({ initialValue: 1 }, () => {
        throw new Error('setup failed');
      }),
    ).toThrow('setup failed');
  });
});
