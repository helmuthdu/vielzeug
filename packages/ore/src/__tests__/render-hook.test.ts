import { signal } from '@vielzeug/ripple';

import { prop, onCleanup, onMounted, watchEffect } from '../index';
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

    await renderHook((_props) => {
      log.push('setup');
      onMounted(() => {
        log.push('mounted');
      });
    });

    expect(log).toEqual(['setup', 'mounted']);
  });

  it('reports (does not silently swallow) an error thrown from an onMounted callback, and still runs the remaining callbacks', async () => {
    const log: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => {
      onMounted(() => {
        log.push('first');
        throw new Error('boom');
      });
      onMounted(() => {
        log.push('second');
      });

      return 'ok';
    });

    expect(result).toBe('ok');
    expect(log).toEqual(['first', 'second']);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('supports reactive effects tracking signal changes', async () => {
    const log: number[] = [];

    const { flush, result } = await renderHook((_props) => {
      const count = signal(0);

      watchEffect(() => {
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

  it('runs onCleanup when dispose() is called', async () => {
    const cleanupSpy = vi.fn();

    const { dispose } = await renderHook((_props) => {
      onCleanup(cleanupSpy);
    });

    expect(cleanupSpy).not.toHaveBeenCalled();

    dispose();

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

  it('prop-defs overload: exposes typed prop signals to setup', async () => {
    const { result } = await renderHook({ count: prop.number(10), label: prop.string('hi') }, (props) => ({
      count: props.count,
      label: props.label,
    }));

    expect(result.count.value).toBe(10);
    expect(result.label.value).toBe('hi');
  });

  it('prop-defs overload: lifecycle hooks work alongside props', async () => {
    const log: string[] = [];

    await renderHook({ name: prop.string('world') }, (_props) => {
      onMounted(() => {
        log.push('mounted');
      });
    });

    expect(log).toEqual(['mounted']);
  });

  it('dispose() disposes the scope, stopping effects', async () => {
    const effectSpy = vi.fn();

    const { dispose, flush, result } = await renderHook((_props) => {
      const s = signal(0);

      watchEffect(() => {
        void s.value;
        effectSpy();
      });

      return s;
    });

    const callsBefore = effectSpy.mock.calls.length;

    dispose();

    result.value = 1;
    await flush();

    expect(effectSpy.mock.calls.length).toBe(callsBefore);
  });
});
