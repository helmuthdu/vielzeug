import { resource } from '../async';
import { signal } from '../index';
import { createStore } from '../store';
import { watch } from '../watch';

describe('default graph subpaths', () => {
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
