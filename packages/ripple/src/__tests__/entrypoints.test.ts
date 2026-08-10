import { resource } from '../async';
import * as root from '../index';
import { signal } from '../index';
import { createStore } from '../store';
import { watch } from '../watch';

describe('default graph subpaths', () => {
  it('keeps optional helpers on their dedicated subpaths', () => {
    expect(root).toMatchObject({
      batch: expect.any(Function),
      computed: expect.any(Function),
      createRipple: expect.any(Function),
      createScope: expect.any(Function),
      effect: expect.any(Function),
      signal: expect.any(Function),
      untrack: expect.any(Function),
    });
    expect('createStore' in root).toBe(false);
    expect('resource' in root).toBe(false);
    expect('watch' in root).toBe(false);
  });

  it('shares default graph across root and watch subpath', () => {
    const count = signal(0);
    const values: number[] = [];
    const stop = watch(count, (value) => values.push(value));

    count.value = 1;

    expect(values).toEqual([1]);
    stop.dispose();
  });

  it('shares default graph across root and async subpath', async () => {
    const id = signal('first');
    const user = resource(
      () => id.value,
      async (value) => value.toUpperCase(),
    );

    await Promise.resolve();
    expect(user.value).toEqual({ status: 'success', value: 'FIRST' });
    user.dispose();
  });

  it('shares default graph across root and store subpath', () => {
    const cart = createStore({ items: 0 });
    const values: number[] = [];
    const stop = watch(
      () => cart.value.items,
      (value) => values.push(value),
    );

    cart.update((state) => ({ ...state, items: 1 }));

    expect(values).toEqual([1]);
    stop.dispose();
  });
});
