import { vi } from 'vitest';
import { computed, createRipple, effect, resource, signal, watch } from '../index';

describe('default graph exports', () => {
  it('exports all primitives from root', () => {
    const exports = { computed, createRipple, effect, resource, signal, watch };
    for (const [name, fn] of Object.entries(exports)) {
      expect(typeof fn).toBe('function');
      expect(name).toBeTruthy();
    }
  });

  it('shares default graph across root exports', () => {
    const count = signal(0);
    const values: number[] = [];
    const stop = watch(count, (value) => values.push(value));

    count.value = 1;

    expect(values).toEqual([1]);
    stop.dispose();
  });

  it('shares default graph across signal and resource', async () => {
    const id = signal('first');
    const user = resource(
      () => id.value,
      async (value) => value.toUpperCase(),
    );

    await Promise.resolve();
    expect(user.value).toEqual({ status: 'success', value: 'FIRST' });
    user.dispose();
  });

  it('supports signal.update for immutable state', () => {
    const cart = signal({ items: 0 });
    const items = computed(() => cart.value.items);

    cart.update((state) => ({ ...state, items: 3 }));

    expect(items.value).toBe(3);
  });

  it('recognizes Ripple readables from another loaded module graph', async () => {
    const first = await import('../index');
    const ripple = first.createRipple();
    const value = ripple.signal(0);
    const resource = ripple.resource(
      () => 'value',
      async (input) => input,
    );

    vi.resetModules();
    const second = await import('../index');

    expect(second.isReactive(value)).toBe(true);
    expect(second.isReactive(resource)).toBe(true);
    expect(second.isReactive({ [Symbol.for('@vielzeug/ripple/reactive')]: true })).toBe(false);
    ripple.dispose();
  });
});
