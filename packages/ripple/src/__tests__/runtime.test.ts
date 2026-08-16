import type { Scope } from '../index';

import { createRipple, RippleDisposedRuntimeError } from '../index';

describe('ripple graph', () => {
  it('updates derived values and suppresses unchanged output', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const parity = ripple.computed(() => count.value % 2);
    const values: number[] = [];
    const stop = ripple.effect(() => {
      values.push(parity.value);
    });

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
    const stop = ripple.effect(() => {
      values.push(count.value);
    });

    ripple.batch(() => {
      count.value = 1;
      count.value = 2;
    });

    expect(values).toEqual([0, 2]);
    stop.dispose();
    ripple.dispose();
  });

  it('flushes effects before direct listeners after synchronous writes', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const doubled = ripple.computed(() => count.value * 2);
    const calls: string[] = [];

    const stop = ripple.effect(() => {
      calls.push(`effect: ${count.value}/${doubled.value}`);
    });
    const unsubscribe = count.subscribe(() => {
      calls.push(`listener: ${count.value}/${doubled.value}`);
    });

    calls.length = 0;
    count.value = 1;

    expect(calls).toEqual(['effect: 1/2', 'listener: 1/2']);
    unsubscribe();
    stop.dispose();
    ripple.dispose();
  });

  it('runs listeners before effects queued by earlier effects in same flush', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    const derived = ripple.signal(0);
    const calls: string[] = [];

    const writer = ripple.effect(() => {
      if (source.value > 0) derived.value = source.value;
      calls.push('writer');
    });
    const reader = ripple.effect(() => {
      calls.push(`reader: ${derived.value}`);
    });
    const unsubscribe = source.subscribe(() => calls.push('listener'));

    calls.length = 0;
    source.value = 1;

    expect(calls).toEqual(['writer', 'listener', 'reader: 1']);
    unsubscribe();
    writer.dispose();
    reader.dispose();
    ripple.dispose();
  });

  it('coalesces microtask effects after synchronous writes', async () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const values: number[] = [];

    ripple.effect(
      () => {
        values.push(count.value);
      },
      { scheduler: 'microtask' },
    );
    count.value = 1;
    count.value = 2;

    expect(values).toEqual([0]);
    await Promise.resolve();
    expect(values).toEqual([0, 2]);
    ripple.dispose();
  });

  it('does not run a queued microtask effect after disposal', async () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const values: number[] = [];
    const stop = ripple.effect(
      () => {
        values.push(count.value);
      },
      { scheduler: 'microtask' },
    );

    count.value = 1;
    stop.dispose();
    await Promise.resolve();

    expect(values).toEqual([0]);
    ripple.dispose();
  });

  it('owns nested work through parent effect run', () => {
    const ripple = createRipple();
    const enabled = ripple.signal(true);
    const child = ripple.signal(0);
    const values: number[] = [];
    const stop = ripple.effect(() => {
      if (!enabled.value) return;

      ripple.effect(() => {
        values.push(child.value);
      });
    });

    enabled.value = false;
    child.value = 1;

    expect(values).toEqual([0]);
    stop.dispose();
    ripple.dispose();
  });

  it('keeps explicit scopes alive across parent effect reruns', () => {
    const ripple = createRipple();
    const enabled = ripple.signal(true);
    const child = ripple.signal(0);
    const scopes: Scope[] = [];
    const values: number[] = [];

    ripple.effect(() => {
      if (!enabled.value) return;

      const scope = ripple.createScope();

      scopes.push(scope);
      scope.run(() => {
        ripple.effect(() => {
          values.push(child.value);
        });
      });
    });

    enabled.value = false;
    child.value = 1;

    expect(scopes[0]?.disposed).toBe(false);
    expect(values).toEqual([0, 1]);
    ripple.dispose();
    expect(scopes[0]?.disposed).toBe(true);
  });

  it('makes graph disposal terminal', () => {
    const ripple = createRipple();
    const signal = ripple.signal(0);
    const computed = ripple.computed(() => signal.value * 2);
    let subscriptionCalls = 0;

    signal.subscribe(() => subscriptionCalls++);
    expect(computed.value).toBe(0);
    ripple.dispose();

    expect(ripple.disposed).toBe(true);
    expect(signal.peek()).toBe(0);
    expect(computed.peek()).toBe(0);
    expect(() => (signal.value = 1)).toThrow(RippleDisposedRuntimeError);
    expect(subscriptionCalls).toBe(0);
    expect(() => signal.subscribe(() => undefined)).toThrow(RippleDisposedRuntimeError);
    expect(() => computed.subscribe(() => undefined)).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.signal(0)).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.computed(() => 0)).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.effect(() => undefined)).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.createScope()).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.batch(() => 0)).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.untrack(() => 0)).toThrow(RippleDisposedRuntimeError);
    expect(() =>
      ripple.resource(
        () => 'value',
        async (value) => value,
      ),
    ).toThrow(RippleDisposedRuntimeError);
    expect(() =>
      ripple.watch(
        () => 0,
        () => undefined,
      ),
    ).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.dispose()).not.toThrow();
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

  it('updates immutable state via signal.update', () => {
    const ripple = createRipple();
    const cart = ripple.signal({ items: 0, label: 'empty' });
    const items = ripple.computed(() => cart.value.items);

    cart.update((state) => ({ ...state, items: 3 }));

    expect(items.value).toBe(3);
    ripple.dispose();
  });
});
