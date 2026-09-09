import type { RippleEvent, Scope } from '../index';

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

  it('recovers when a computed first run fails and a dependency later changes', () => {
    const errors: string[] = [];
    const ripple = createRipple({ errorPolicy: 'swallow' });
    ripple.tap((event) => {
      if (event.type === 'error') errors.push(`${event.context.kind}:${(event.error as Error).message}`);
    });
    const user = ripple.signal<{ name: string } | null>(null);
    const name = ripple.computed(() => user.value!.name);
    const values: string[] = [];

    expect(() => name.value).toThrow();

    const stop = ripple.effect(() => {
      values.push(name.value);
    });

    errors.length = 0;
    user.value = { name: 'Ada' };

    expect(values).toEqual(['Ada']);
    expect(errors).toEqual([]);
    stop.dispose();
    ripple.dispose();
  });

  it('isolates computed refresh failures so sibling dependencies stay current', () => {
    const errors: string[] = [];
    const ripple = createRipple({ errorPolicy: 'swallow' });
    ripple.tap((event) => {
      if (event.type === 'error') errors.push(`${event.context.kind}:${(event.error as Error).message}`);
    });
    const source = ripple.signal(0);
    const failing = ripple.computed(() => {
      if (source.value === 1) throw new Error('failed computed');
      return source.value;
    });
    const valid = ripple.computed(() => source.value * 2);
    const first = ripple.effect(() => void failing.value);
    const second = ripple.effect(() => void valid.value);

    expect(() => (source.value = 1)).not.toThrow();
    expect(valid.peek()).toBe(2);
    expect(errors).toEqual(['computed:failed computed']);

    first.dispose();
    second.dispose();
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
      ripple.watch(
        () => 0,
        () => undefined,
      ),
    ).toThrow(RippleDisposedRuntimeError);
    expect(() => ripple.dispose()).not.toThrow();
  });

  it('retries an effect after its first run fails', () => {
    const errors: string[] = [];
    const ripple = createRipple({ errorPolicy: 'swallow' });
    ripple.tap((event) => {
      if (event.type === 'error') errors.push(`${event.context.kind}:${(event.error as Error).message}`);
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
    const ripple = createRipple({ errorPolicy: 'swallow' });
    ripple.tap((event) => {
      if (event.type === 'error') errors.push(`${event.context.kind}:${(event.error as Error).message}`);
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

  it('reports owned cleanup and disposal events before graph taps are cleared', () => {
    const events: string[] = [];
    const ripple = createRipple({ errorPolicy: 'swallow' });
    ripple.tap((event) => {
      events.push(
        event.type === 'error'
          ? `error:${event.context.kind}`
          : event.type === 'dispose'
            ? `dispose:${event.node}`
            : event.type,
      );
    });
    ripple.effect(() => () => {
      throw new Error('cleanup failed');
    });

    ripple.dispose();

    expect(events).toContain('error:cleanup');
    expect(events).toContain('dispose:effect');
    expect(events.at(-1)).toBe('dispose:graph');
  });

  it('returns last cached value from peek on disposed computed', () => {
    const ripple = createRipple();
    const source = ripple.signal(1);
    const value = ripple.computed(() => source.value * 2);

    expect(value.value).toBe(2);
    ripple.dispose();

    expect(value.peek()).toBe(2);
  });

  it('propagates derivation errors through computed peek', () => {
    const ripple = createRipple();
    const enabled = ripple.signal(false);
    const value = ripple.computed(() => {
      if (!enabled.value) throw new Error('disabled');

      return 42;
    });

    expect(() => value.peek()).toThrow('disabled');
    enabled.value = true;
    expect(value.peek()).toBe(42);
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

  it('updates immutable state via signal.update', () => {
    const ripple = createRipple();
    const cart = ripple.signal({ items: 0, label: 'empty' });
    const items = ripple.computed(() => cart.value.items);

    cart.update((state) => ({ ...state, items: 3 }));

    expect(items.value).toBe(3);
    ripple.dispose();
  });
});

describe('tap', () => {
  it('emits write, compute, effect, and dispose events', () => {
    const ripple = createRipple();
    const events: RippleEvent[] = [];
    const stop = ripple.tap((event) => events.push(event));

    const count = ripple.signal(0, { name: 'count' });
    const doubled = ripple.computed(() => count.value * 2, { name: 'doubled' });
    const effectStop = ripple.effect(() => void doubled.value, { name: 'logger' });

    count.value = 1;
    effectStop.dispose();

    const types = events.map((e) => e.type);
    expect(types).toContain('write');
    expect(types).toContain('compute');
    expect(types).toContain('effect');
    expect(types).toContain('dispose');

    const writeEvent = events.find((e) => e.type === 'write') as Extract<RippleEvent, { type: 'write' }>;
    expect(writeEvent.name).toBe('count');
    expect(writeEvent.next).toBe(1);
    expect(writeEvent.previous).toBe(0);

    stop();
    ripple.dispose();
  });

  it('emits error events for effect failures', () => {
    const ripple = createRipple({ errorPolicy: 'swallow' });
    const errors: Array<{ kind: string; message: string }> = [];
    const stop = ripple.tap((event) => {
      if (event.type === 'error') {
        errors.push({ kind: event.context.kind, message: (event.error as Error).message });
      }
    });

    const enabled = ripple.signal(true);
    ripple.effect(() => {
      if (enabled.value) throw new Error('boom');
    });

    expect(errors).toEqual([{ kind: 'effect', message: 'boom' }]);
    stop();
    ripple.dispose();
  });

  it('swallows tap handler errors', () => {
    const ripple = createRipple({ errorPolicy: 'swallow' });
    const calls: string[] = [];

    ripple.tap(() => {
      throw new Error('tap handler failed');
    });
    ripple.tap((event) => {
      if (event.type === 'write') calls.push('second-tap');
    });

    const count = ripple.signal(0);
    expect(() => (count.value = 1)).not.toThrow();
    expect(calls).toEqual(['second-tap']);
    ripple.dispose();
  });

  it('returns a no-op unsubscribe after disposal', () => {
    const ripple = createRipple();
    ripple.dispose();

    const unsub = ripple.tap(() => undefined);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('auto-detaches when signal aborts', () => {
    const ripple = createRipple();
    const controller = new AbortController();
    const events: RippleEvent[] = [];
    const stop = ripple.tap((event) => events.push(event), { signal: controller.signal });

    const count = ripple.signal(0);
    count.value = 1;
    expect(events.length).toBeGreaterThan(0);

    events.length = 0;
    controller.abort();
    count.value = 2;

    expect(events).toEqual([]);
    stop();
    ripple.dispose();
  });

  it('emits a dispose event on graph disposal', () => {
    const ripple = createRipple();
    const events: RippleEvent[] = [];
    ripple.tap((event) => events.push(event));

    ripple.dispose();

    expect(events.some((e) => e.type === 'dispose')).toBe(true);
  });

  it('has zero overhead when no tappers registered', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);

    // No tap registered — emit should be a no-op early return.
    // This test just verifies no throw and correct value propagation.
    count.value = 1;
    expect(count.peek()).toBe(1);
    ripple.dispose();
  });
});

describe('isReactive', () => {
  it('requires the complete readable surface', async () => {
    const { isReactive } = await import('../index');
    const marker = Symbol.for('@vielzeug/ripple/reactive');

    expect(isReactive({ [marker]: true, peek: () => 1, subscribe: () => () => {} } as never)).toBe(false);
    expect(isReactive({ [marker]: true, peek: () => 1, subscribe: () => () => {}, value: 1 } as never)).toBe(true);
  });
});

describe('fromSubscribable', () => {
  it('bridges an external source into a reactive readable', async () => {
    const { fromSubscribable, isReactive } = await import('../index');

    let snapshot = 0;
    const listeners = new Set<() => void>();
    const source = {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };

    const readable = fromSubscribable(source);
    expect(isReactive(readable)).toBe(true);
    expect(readable.value).toBe(0);

    const values: number[] = [];
    // Use an effect to verify tracking works through the bridge.
    const { effect } = await import('../index');
    const stop = effect(() => {
      values.push(readable.value);
    });

    expect(values).toEqual([0]);

    snapshot = 42;
    for (const listener of listeners) listener();

    expect(values).toEqual([0, 42]);
    stop.dispose();
    readable.dispose();
    expect(listeners.size).toBe(0);
  });

  it('works without importing ripple in the source', async () => {
    const { fromSubscribable } = await import('../index');

    // Source is a plain object — no ripple import needed.
    let value = 'hello';
    const subs = new Set<() => void>();
    const external = {
      getSnapshot: () => value,
      subscribe: (cb: () => void) => {
        subs.add(cb);
        return () => subs.delete(cb);
      },
    };

    const readable = fromSubscribable(external);
    expect(readable.peek()).toBe('hello');

    value = 'world';
    for (const cb of subs) cb();

    expect(readable.peek()).toBe('world');
    readable.dispose();
  });

  it('closes the getSnapshot-to-subscribe race', async () => {
    const { fromSubscribable } = await import('../index');
    let value = 0;
    const readable = fromSubscribable({
      getSnapshot: () => value,
      subscribe: () => {
        value = 1;
        return () => {};
      },
    });

    expect(readable.value).toBe(1);
    readable.dispose();
  });

  it('binds bridges to isolated graph ownership', () => {
    const ripple = createRipple();
    let unsubscribed = 0;
    const readable = ripple.fromSubscribable({
      getSnapshot: () => 1,
      subscribe: () => () => unsubscribed++,
    });

    ripple.dispose();

    expect(readable.disposed).toBe(true);
    expect(unsubscribed).toBe(1);
  });
});
