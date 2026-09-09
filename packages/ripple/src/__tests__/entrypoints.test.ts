import { vi } from 'vitest';
import { computed, createRipple, effect, fromSubscribable, isReactive, signal, watch } from '../index';

describe('default graph exports', () => {
  it('exports all primitives from root', () => {
    const exports = { computed, createRipple, effect, fromSubscribable, signal, watch };
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

    vi.resetModules();
    const second = await import('../index');

    expect(second.isReactive(value)).toBe(true);
    expect(second.isReactive({ [Symbol.for('@vielzeug/ripple/reactive')]: true })).toBe(false);
    ripple.dispose();
  });

  it('isReactive rejects non-readable values', () => {
    const cases: unknown[] = [
      null,
      undefined,
      42,
      'text',
      () => 0,
      {},
      { peek: () => 0 },
      { peek: () => 0, subscribe: () => () => undefined },
    ];

    for (const value of cases) expect(isReactive(value)).toBe(false);
  });
});
