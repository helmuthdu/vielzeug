import { signal } from '@vielzeug/ripple';

import { effect, onCleanup, onMounted } from '../runtime';
import { renderHook } from '../testing';

describe('renderHook()', () => {
  it('returns the value from the setup function', async () => {
    const { result } = await renderHook(() => {
      return signal(42);
    });

    expect(result.value).toBe(42);
  });

  it('runs onMounted callbacks after setup', async () => {
    const log: string[] = [];

    await renderHook(() => {
      log.push('setup');
      onMounted(() => {
        log.push('mounted');
      });
    });

    expect(log).toEqual(['setup', 'mounted']);
  });

  it('supports reactive effects tracking signal changes', async () => {
    const log: number[] = [];

    const { flush, result } = await renderHook(() => {
      const count = signal(0);

      effect(() => {
        log.push(count.value);
      });

      return count;
    });

    result.value = 1;
    await flush();
    result.value = 2;
    await flush();

    expect(log).toContain(1);
    expect(log).toContain(2);
  });

  it('runs onCleanup when destroy() is called', async () => {
    const cleanupSpy = vi.fn();

    const { destroy } = await renderHook(() => {
      onCleanup(cleanupSpy);
    });

    expect(cleanupSpy).not.toHaveBeenCalled();

    destroy();

    expect(cleanupSpy).toHaveBeenCalledOnce();
  });

  it('flush() resolves pending reactive updates', async () => {
    const { flush, result } = await renderHook(() => {
      return signal(0);
    });

    result.value = 99;
    await flush();

    expect(result.value).toBe(99);
  });

  it('destroy() disposes the scope, stopping effects', async () => {
    const effectSpy = vi.fn();

    const { destroy, flush, result } = await renderHook(() => {
      const s = signal(0);

      effect(() => {
        void s.value;
        effectSpy();
      });

      return s;
    });

    const callsBefore = effectSpy.mock.calls.length;

    destroy();

    result.value = 1;
    await flush();

    expect(effectSpy.mock.calls.length).toBe(callsBefore);
  });
});
