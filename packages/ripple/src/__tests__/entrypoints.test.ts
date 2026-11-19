import { vi } from 'vitest';
import {
  batch,
  computed,
  createScope,
  effect,
  fromSubscribable,
  isReactive,
  onCleanup,
  resource,
  signal,
  untrack,
  watch,
} from '../index';

import { itScoped } from './scope-test';

describe('default graph exports', () => {
  itScoped('exports all primitives from root', () => {
    const exports = {
      batch,
      computed,
      createScope,
      effect,
      fromSubscribable,
      isReactive,
      onCleanup,
      resource,
      signal,
      untrack,
      watch,
    };
    for (const [name, fn] of Object.entries(exports)) {
      expect(typeof fn).toBe('function');
      expect(name).toBeTruthy();
    }
  });

  itScoped('does not export isolated runtime factories', async () => {
    const api = await import('../index');

    expect(api).not.toHaveProperty('createRipple');
  });

  itScoped('shares default graph across root exports', () => {
    const count = signal(0);
    const values: number[] = [];
    const stop = watch(count, (value) => values.push(value));

    count.value = 1;

    expect(values).toEqual([1]);
    stop.dispose();
  });

  itScoped('supports signal.update for immutable state', () => {
    const cart = signal({ items: 0 });
    const items = computed(() => cart.value.items);

    cart.update((state) => ({ ...state, items: 3 }));

    expect(items.value).toBe(3);
  });

  itScoped('recognizes Ripple readables from another loaded module graph', async () => {
    const first = await import('../index');
    const value = first.signal(0);

    vi.resetModules();
    const second = await import('../index');

    expect(second.isReactive(value)).toBe(true);
    expect(second.isReactive({ [Symbol.for('@vielzeug/ripple/reactive')]: true })).toBe(false);
  });

  itScoped('does not track reads across loaded module graphs', async () => {
    const first = await import('../index');
    const value = first.signal(0);

    vi.resetModules();
    const second = await import('../index');
    const seen: number[] = [];

    const stop = second.effect(() => {
      seen.push(value.value);
    });
    value.value = 1;

    expect(seen).toEqual([0]);
    stop.dispose();
  });

  itScoped('isReactive rejects non-readable values', () => {
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
