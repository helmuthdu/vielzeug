import { signal } from '@vielzeug/ripple';

import { prop } from '../index';
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

    await renderHook((_props, ctx) => {
      log.push('setup');
      ctx.onMounted(() => {
        log.push('mounted');
      });
    });

    expect(log).toEqual(['setup', 'mounted']);
  });

  it('supports reactive effects tracking signal changes', async () => {
    const log: number[] = [];

    const { flush, result } = await renderHook((_props, ctx) => {
      const count = signal(0);

      ctx.watch(() => {
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

    const { destroy } = await renderHook((_props, ctx) => {
      ctx.onCleanup(cleanupSpy);
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

  it('prop-defs overload: exposes typed prop signals to setup', async () => {
    const { result } = await renderHook({ count: prop.number(10), label: prop.string('hi') }, (props) => ({
      count: props.count,
      label: props.label,
    }));

    expect(result.count.value).toBe(10);
    expect(result.label.value).toBe('hi');
  });

  it('prop-defs overload: ctx bag is passed alongside props', async () => {
    const log: string[] = [];

    await renderHook({ name: prop.string('world') }, (_props, ctx) => {
      ctx.onMounted(() => {
        log.push('mounted');
      });
    });

    expect(log).toEqual(['mounted']);
  });

  it('destroy() disposes the scope, stopping effects', async () => {
    const effectSpy = vi.fn();

    const { destroy, flush, result } = await renderHook((_props, ctx) => {
      const s = signal(0);

      ctx.watch(() => {
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
