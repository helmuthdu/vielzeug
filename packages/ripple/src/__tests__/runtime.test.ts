import { createRipple } from '../index';

describe('ripple graph', () => {
  it('updates derived values and suppresses unchanged output', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const parity = ripple.computed(() => count.value % 2);
    const values: number[] = [];
    const stop = ripple.effect(() => values.push(parity.value));

    count.value = 2;
    count.value = 3;

    expect(values).toEqual([0, 1]);
    stop.dispose();
    ripple.dispose();
  });

  it('keeps previous computed dependencies when derive throws', () => {
    const ripple = createRipple();
    const enabled = ripple.signal(true);
    const source = ripple.signal(1);
    const value = ripple.computed(() => {
      if (!enabled.value) throw new Error('disabled');

      return source.value;
    });

    expect(value.value).toBe(1);
    enabled.value = false;
    expect(() => value.value).toThrow('disabled');

    enabled.value = true;
    source.value = 2;
    expect(value.value).toBe(2);
    ripple.dispose();
  });

  it('batches dependent effects', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const values: number[] = [];
    const stop = ripple.effect(() => values.push(count.value));

    ripple.batch(() => {
      count.value = 1;
      count.value = 2;
    });

    expect(values).toEqual([0, 2]);
    stop.dispose();
    ripple.dispose();
  });

  it('owns nested work through parent effect run', () => {
    const ripple = createRipple();
    const enabled = ripple.signal(true);
    const child = ripple.signal(0);
    const values: number[] = [];
    const stop = ripple.effect(() => {
      if (!enabled.value) return;

      ripple.effect(() => values.push(child.value));
    });

    enabled.value = false;
    child.value = 1;

    expect(values).toEqual([0]);
    stop.dispose();
    ripple.dispose();
  });

  it('retries an effect after its first run fails', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError(error, context) {
        errors.push(`${context.kind}:${(error as Error).message}`);
      },
    });
    const enabled = ripple.signal(true);
    const values: boolean[] = [];

    ripple.effect(() => {
      if (enabled.value) throw new Error('not ready');

      values.push(enabled.value);
    });
    enabled.value = false;

    expect(errors).toEqual(['effect:not ready']);
    expect(values).toEqual([false]);
    ripple.dispose();
  });

  it('reports cleanup failures without interrupting disposal', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError(error, context) {
        errors.push(`${context.kind}:${(error as Error).message}`);
      },
    });
    const scope = ripple.createScope();
    let disposed = false;

    scope.run(() => {
      ripple.effect(() => () => {
        throw new Error('cleanup failed');
      });
      ripple.effect(() => () => {
        disposed = true;
      });
    });
    scope.dispose();

    expect(errors).toEqual(['cleanup:cleanup failed']);
    expect(disposed).toBe(true);
    ripple.dispose();
  });
});

describe('bound helpers', () => {
  it('watches explicit source with immediate and once options', () => {
    const ripple = createRipple();
    const count = ripple.signal(1);
    const values: Array<[number, number | undefined]> = [];
    const stop = ripple.watch(count, (value, previous) => values.push([value, previous]), {
      immediate: true,
      once: true,
    });

    count.value = 2;

    expect(values).toEqual([[1, undefined]]);
    expect(stop.disposed).toBe(true);
    ripple.dispose();
  });

  it('retries resource when source initially fails', async () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError(error, context) {
        errors.push(`${context.kind}:${(error as Error).message}`);
      },
    });
    const ready = ripple.signal(false);
    const user = ripple.resource(
      () => {
        if (!ready.value) throw new Error('source unavailable');

        return 'user';
      },
      async (value) => value,
    );

    expect(user.value).toMatchObject({
      error: expect.objectContaining({ message: 'source unavailable' }),
      status: 'error',
    });

    ready.value = true;
    await Promise.resolve();

    expect(errors).toEqual([]);
    expect(user.value).toEqual({ status: 'success', value: 'user' });
    user.dispose();
    ripple.dispose();
  });

  it('converts loader failures into resource state and reloads', async () => {
    const ripple = createRipple();
    const attempts = ripple.signal(0);
    const user = ripple.resource(
      () => attempts.value,
      async (attempt) => {
        if (attempt === 0) throw new Error('offline');

        return 'online';
      },
    );

    await Promise.resolve();
    expect(user.value).toMatchObject({ error: expect.objectContaining({ message: 'offline' }), status: 'error' });

    attempts.value = 1;
    await Promise.resolve();
    expect(user.value).toEqual({ status: 'success', value: 'online' });
    user.dispose();
    ripple.dispose();
  });

  it('ignores stale resource results', async () => {
    const ripple = createRipple();
    const id = ripple.signal('first');
    let resolveFirst!: (value: string) => void;
    let resolveNext!: (value: string) => void;
    const user = ripple.resource(
      () => id.value,
      (value) =>
        new Promise((resolve) => {
          if (value === 'first') resolveFirst = resolve;
          else resolveNext = resolve;
        }),
    );

    id.value = 'next';
    resolveFirst('stale');
    resolveNext('fresh');
    await Promise.resolve();

    expect(user.value).toEqual({ status: 'success', value: 'fresh' });
    user.dispose();
    ripple.dispose();
  });

  it('updates immutable stores', () => {
    const ripple = createRipple();
    const cart = ripple.createStore({ items: 0, label: 'empty' });
    const items = ripple.computed(() => cart.value.items);

    cart.update((state) => ({ ...state, items: 3 }));

    expect(items.value).toBe(3);
    ripple.dispose();
  });
});
