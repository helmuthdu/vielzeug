import type { Scope } from '../index';

import { createRipple, RippleCycleError, RippleDisposedError } from '../index';

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
    const ripple = createRipple({
      onError: (error, context) => errors.push(`${context.kind}:${(error as Error).message}`),
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

  it('reports a failing computed through the effect that reads it, keeping siblings current', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError: (error, context) => errors.push(`${context.kind}:${(error as Error).message}`),
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
    expect(errors).toEqual(['effect:failed computed']);

    first.dispose();
    second.dispose();
    ripple.dispose();
  });

  it('never derives from a stale sibling in a diamond', () => {
    const ripple = createRipple();
    const source = ripple.signal(1);
    const doubled = ripple.computed(() => source.value * 2);
    const tripled = ripple.computed(() => source.value * 3);
    const seen: string[] = [];
    const sum = ripple.computed(() => {
      seen.push(`${doubled.value}+${tripled.value}`);
      return doubled.value + tripled.value;
    });

    ripple.effect(() => void sum.value);
    seen.length = 0;
    source.value = 2;

    expect(seen).toEqual(['4+6']);
    ripple.dispose();
  });

  it('derives a computed once per batch however many sources changed', () => {
    const ripple = createRipple();
    const first = ripple.signal(0);
    const second = ripple.signal(0);
    let derives = 0;
    const total = ripple.computed(() => {
      derives++;
      return first.value + second.value;
    });

    ripple.effect(() => void total.value);
    derives = 0;
    ripple.batch(() => {
      first.value = 1;
      first.value = 2;
      second.value = 3;
    });

    expect(derives).toBe(1);
    expect(total.peek()).toBe(5);
    ripple.dispose();
  });

  it('does not derive a computed nobody reads until it is read', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    let derives = 0;
    const derived = ripple.computed(() => {
      derives++;
      return source.value;
    });

    source.value = 1;
    source.value = 2;
    expect(derives).toBe(0);
    expect(derived.value).toBe(2);
    expect(derives).toBe(1);
    ripple.dispose();
  });

  it('notifies computed subscribers only when the derived value changes', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const parity = ripple.computed(() => count.value % 2);
    let calls = 0;
    const unsubscribe = parity.subscribe(() => calls++);

    count.value = 2;
    expect(calls).toBe(0);
    count.value = 3;
    expect(calls).toBe(1);
    unsubscribe();
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

  it('fires each subscription once per flush even when they share one callback', () => {
    const ripple = createRipple();
    const first = ripple.signal(0);
    const second = ripple.signal(0);
    let calls = 0;
    const listener = () => {
      calls++;
    };

    const stopFirst = first.subscribe(listener);
    const stopSecond = second.subscribe(listener);

    ripple.batch(() => {
      first.value = 1;
      second.value = 1;
    });

    expect(calls).toBe(2);

    // One subscription whose signal is written twice in a batch still fires once.
    calls = 0;

    ripple.batch(() => {
      first.value = 2;
      first.value = 3;
    });

    expect(calls).toBe(1);

    stopFirst();
    stopSecond();
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

  it('coalesces writes made inside a batch into one effect run', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const values: number[] = [];

    ripple.effect(() => {
      values.push(count.value);
    });
    ripple.batch(() => {
      count.value = 1;
      count.value = 2;
    });

    expect(values).toEqual([0, 2]);
    ripple.dispose();
  });

  it('does not run a disposed effect when a pending write flushes', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const values: number[] = [];
    const stop = ripple.effect(() => {
      values.push(count.value);
    });

    ripple.batch(() => {
      count.value = 1;
      stop.dispose();
    });

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

  it('runs onCleanup callbacks newest-first when the scope is disposed', () => {
    const ripple = createRipple();
    const scope = ripple.createScope();
    const calls: number[] = [];

    scope.run(() => {
      ripple.onCleanup(() => calls.push(1));
      ripple.onCleanup(() => calls.push(2));
      ripple.effect(() => {
        calls.push(0);
      });
    });

    scope.dispose();

    expect(calls).toEqual([0, 2, 1]);
    ripple.dispose();
  });

  it('reruns an effect after disposing the previous run’s onCleanup callbacks', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    const calls: string[] = [];

    const stop = ripple.effect(() => {
      const current = count.value;

      ripple.onCleanup(() => calls.push(`cleanup ${current}`));
      calls.push(`run ${current}`);
    });

    count.value = 1;
    stop.dispose();

    expect(calls).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
    ripple.dispose();
  });

  it('reports a throwing onCleanup and still runs the rest', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError: (error) => errors.push((error as Error).message),
    });
    const scope = ripple.createScope();
    let ran = false;

    scope.run(() => {
      ripple.onCleanup(() => {
        throw new Error('cleanup failed');
      });
      ripple.onCleanup(() => {
        ran = true;
      });
    });
    scope.dispose();

    expect(errors).toEqual(['cleanup failed']);
    expect(ran).toBe(true);
    ripple.dispose();
  });

  it('runs onCleanup immediately when the owner is already disposed', () => {
    const ripple = createRipple();
    const calls: string[] = [];
    const scope = ripple.createScope();

    scope.run(() => {
      ripple.onCleanup(() => {
        ripple.onCleanup(() => calls.push('nested'));
        calls.push('outer');
      });
    });
    scope.dispose();

    expect(calls).toEqual(['nested', 'outer']);
    ripple.dispose();
  });

  it('runs an effect’s returned cleanup before the onCleanup callbacks of the same run', () => {
    const ripple = createRipple();
    const calls: string[] = [];

    const stop = ripple.effect(() => {
      ripple.onCleanup(() => calls.push('onCleanup'));
      ripple.effect(() => () => calls.push('child'));
      return () => calls.push('returned');
    });

    stop.dispose();

    expect(calls).toEqual(['child', 'returned', 'onCleanup']);
    ripple.dispose();
  });

  it('disposes effects created while a scope runs its cleanups', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    const values: number[] = [];
    const scope = ripple.createScope();

    scope.run(() => {
      ripple.onCleanup(() => {
        ripple.effect(() => {
          values.push(source.value);
        });
      });
    });
    scope.dispose();
    source.value = 1;

    expect(values).toEqual([]);
    ripple.dispose();
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
    expect(() => (signal.value = 1)).toThrow(RippleDisposedError);
    expect(subscriptionCalls).toBe(0);
    expect(() => signal.subscribe(() => undefined)).toThrow(RippleDisposedError);
    expect(() => computed.subscribe(() => undefined)).toThrow(RippleDisposedError);
    expect(() => ripple.signal(0)).toThrow(RippleDisposedError);
    expect(() => ripple.computed(() => 0)).toThrow(RippleDisposedError);
    expect(() => ripple.effect(() => undefined)).toThrow(RippleDisposedError);
    expect(() => ripple.createScope()).toThrow(RippleDisposedError);
    expect(() => ripple.batch(() => 0)).toThrow(RippleDisposedError);
    expect(() => ripple.untrack(() => 0)).toThrow(RippleDisposedError);
    expect(() =>
      ripple.watch(
        () => 0,
        () => undefined,
      ),
    ).toThrow(RippleDisposedError);
    expect(() => ripple.dispose()).not.toThrow();
  });

  it('retries an effect after its first run fails', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError: (error, context) => errors.push(`${context.kind}:${(error as Error).message}`),
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
      onError: (error, context) => errors.push(`${context.kind}:${(error as Error).message}`),
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

  it('reports cleanup failures raised during graph disposal', () => {
    const errors: string[] = [];
    const ripple = createRipple({
      onError: (error, context) => errors.push(`${context.kind}:${(error as Error).message}`),
    });
    ripple.effect(() => () => {
      throw new Error('cleanup failed');
    });

    ripple.dispose();

    expect(errors).toEqual(['cleanup:cleanup failed']);
  });

  it('returns last cached value from peek on disposed computed', () => {
    const ripple = createRipple();
    const source = ripple.signal(1);
    const value = ripple.computed(() => source.value * 2);

    expect(value.value).toBe(2);
    ripple.dispose();

    expect(value.peek()).toBe(2);
  });

  it('throws from peek on a computed disposed before it was ever evaluated', () => {
    const ripple = createRipple();
    const source = ripple.signal(1);
    const value = ripple.computed(() => source.value * 2);

    ripple.dispose();

    expect(() => value.peek()).toThrow(RippleDisposedError);
    expect(() => value.peek()).toThrow('disposed before it was ever evaluated');
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

describe('scheduling edge cases', () => {
  it('keeps updating an effect whose first run changed a source it reads', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    const doubled = ripple.computed(() => source.value * 2);
    const seen: number[] = [];

    ripple.effect(() => {
      seen.push(doubled.value);
      if (source.peek() === 0) source.value = 1;
    });
    source.value = 5;

    expect(seen).toEqual([0, 2, 10]);
    ripple.dispose();
  });

  it('does not leak a running effect’s tracking into listeners its writes flush', () => {
    const ripple = createRipple();
    const trigger = ripple.signal(0);
    const unrelated = ripple.signal(0);
    let runs = 0;

    trigger.subscribe(() => void unrelated.value);
    ripple.effect(() => {
      runs++;
      trigger.value = 1;
    });
    unrelated.value = 5;

    expect(runs).toBe(1);
    ripple.dispose();
  });

  it('reruns a parent before the child effects it created', () => {
    const errors: unknown[] = [];
    const ripple = createRipple({ onError: (error) => errors.push(error) });
    const user = ripple.signal<{ name: string } | null>({ name: 'Ada' });

    ripple.effect(() => {
      if (user.value) ripple.effect(() => void user.value!.name);
    });
    user.value = null;

    expect(errors).toEqual([]);
    ripple.dispose();
  });

  it('keeps effects schedulable after a runaway flush is abandoned', () => {
    const ripple = createRipple({ onError: () => undefined });
    const shared = ripple.signal(0);
    const other = ripple.signal(0);
    const seen: number[] = [];

    ripple.effect(() => {
      void shared.value;
      seen.push(other.value);
    });
    ripple.effect(() => {
      shared.value = shared.value + 1;
    });
    seen.length = 0;
    other.value = 1;

    expect(seen).toEqual([1]);
    ripple.dispose();
  });

  it('does not rerun an effect for a write its own cleanup makes', () => {
    const errors: unknown[] = [];
    const ripple = createRipple({ onError: (error) => errors.push(error) });
    const source = ripple.signal(0);
    const counter = ripple.signal(0);
    let runs = 0;

    ripple.effect(() => {
      runs++;
      void source.value;
      void counter.value;
      return () => {
        counter.value = counter.peek() + 1;
      };
    });
    source.value = 1;

    expect(runs).toBe(2);
    expect(errors).toEqual([]);
    ripple.dispose();
  });

  it('creates scopes inside a rerun under the effect’s own scope', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    const outer = ripple.createScope();
    const other = ripple.createScope();
    let inner: Scope | undefined;

    outer.run(() =>
      ripple.effect(() => {
        void source.value;
        inner = ripple.createScope();
      }),
    );
    other.run(() => {
      source.value = 1;
    });
    other.dispose();

    expect(inner?.disposed).toBe(false);
    outer.dispose();
    expect(inner?.disposed).toBe(true);
    ripple.dispose();
  });

  it('drops the edges of an effect disposed during its own run', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    let runs = 0;
    const stop = ripple.effect(() => {
      runs++;
      if (source.value === 1) stop.dispose();
    });

    source.value = 1;
    source.value = 2;

    expect(runs).toBe(2);
    expect(stop.disposed).toBe(true);
    ripple.dispose();
  });

  it('treats a throwing equals as a derivation failure', () => {
    const ripple = createRipple();
    const source = ripple.signal(0);
    const derived = ripple.computed(() => source.value, {
      equals: () => {
        throw new Error('bad equals');
      },
    });

    expect(derived.value).toBe(0);
    source.value = 1;
    expect(() => derived.value).toThrow('bad equals');
    ripple.dispose();
  });

  it('re-derives a computed whose own write landed during its derive', () => {
    const ripple = createRipple();
    const source = ripple.signal(1);
    const stepped = ripple.computed(() => {
      const v = source.value;

      if (v < 4) source.value = v + 1;

      return v;
    });

    // Each read sees the value the last derive read, then re-derives on the
    // write that landed mid-derive; the idempotent final write settles CLEAN.
    expect(stepped.value).toBe(1);
    expect(stepped.value).toBe(2);
    expect(stepped.value).toBe(3);
    expect(stepped.value).toBe(4);
    expect(stepped.value).toBe(4);
    expect(source.peek()).toBe(4);
    ripple.dispose();
  });
});

describe('bound helpers', () => {
  it('watches explicit source with the immediate option', () => {
    const ripple = createRipple();
    const count = ripple.signal(1);
    const values: Array<[number, number | undefined]> = [];
    const stop = ripple.watch(count, (value, previous) => values.push([value, previous]), { immediate: true });

    count.value = 2;
    count.value = 3;
    stop.dispose();
    count.value = 4;

    expect(values).toEqual([
      [1, undefined],
      [2, 1],
      [3, 2],
    ]);
    ripple.dispose();
  });

  it('supports caller-managed one-shot watching via the returned handle', () => {
    const ripple = createRipple();
    const count = ripple.signal(1);
    const values: number[] = [];
    const stop = ripple.watch(count, (value) => {
      values.push(value);
      stop.dispose();
    });

    count.value = 2;
    count.value = 3;

    expect(values).toEqual([2]);
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

describe('error handling', () => {
  it('reports effect failures with their context', () => {
    const errors: Array<{ context: { kind: string }; message: string }> = [];
    const ripple = createRipple({
      onError: (error, context) => errors.push({ context, message: (error as Error).message }),
    });

    const enabled = ripple.signal(true);
    ripple.effect(
      () => {
        if (enabled.value) throw new Error('boom');
      },
      { name: 'guarded' },
    );

    expect(errors).toEqual([{ context: { kind: 'effect', name: 'guarded' }, message: 'boom' }]);
    ripple.dispose();
  });

  it('keeps listeners quiet while a computed fails with the same error', () => {
    const ripple = createRipple();
    const flag = ripple.signal(0);
    const boom = new Error('boom');
    const failing = ripple.computed(() => {
      flag.value;

      throw boom;
    });

    expect(() => failing.value).toThrow('boom');

    let fires = 0;

    failing.subscribe(() => void fires++);
    flag.value = 1;
    flag.value = 2;
    flag.value = 3;

    // The observable state (failing with `boom`) never changed between reads.
    expect(fires).toBe(0);
    ripple.dispose();
  });

  it('fires listeners when a failing computed fails with a new error', () => {
    const ripple = createRipple();
    const flag = ripple.signal(0);
    const failing = ripple.computed(() => {
      throw new Error(`boom ${flag.value}`);
    });

    expect(() => failing.value).toThrow('boom 0');

    let fires = 0;

    failing.subscribe(() => void fires++);
    flag.value = 1;
    flag.value = 2;

    // Each write produces a different error, so the failure state really changed.
    expect(fires).toBe(2);
    ripple.dispose();
  });

  it('swallows failing onError handlers without masking graph work', () => {
    const writes: number[] = [];
    const ripple = createRipple({
      onError: () => {
        throw new Error('handler failed');
      },
    });

    const count = ripple.signal(0);
    const stop = ripple.effect(() => {
      writes.push(count.value);
    });

    ripple.effect(() => {
      throw new Error('boom');
    });
    expect(() => (count.value = 1)).not.toThrow();
    expect(writes).toEqual([0, 1]);
    stop.dispose();
    ripple.dispose();
  });

  it('reports a runaway flush instead of throwing from the write site', () => {
    const errors: Array<{ kind: string; message: string }> = [];
    const ripple = createRipple({
      onError: (error, context) => errors.push({ kind: context.kind, message: (error as Error).message }),
    });
    const armed = ripple.signal(false);
    const shared = ripple.signal(0);
    const unrelated = ripple.signal(0);
    const healthy: number[] = [];

    // Once armed, the effect increments a signal it reads: every run re-triggers it, forever.
    const stopRunaway = ripple.effect(() => {
      if (armed.value) shared.value = shared.value + 1;
    });
    const stop = ripple.effect(() => {
      healthy.push(unrelated.value);
    });

    expect(() => (armed.value = true)).not.toThrow();
    expect(errors).toHaveLength(1);
    expect(errors[0]?.kind).toBe('flush');
    expect(errors[0]?.message).toContain('infinite reactive flush');

    // The graph stays usable: a later write still runs healthy effects.
    expect(() => (unrelated.value = 1)).not.toThrow();
    expect(healthy).toEqual([0, 1]);
    stopRunaway.dispose();
    stop.dispose();
    ripple.dispose();
  });

  it('throws a cycle error when a computed reads itself', () => {
    const ripple = createRipple();
    const counter: { current?: { value: number } } = {};

    counter.current = ripple.computed((): number => (counter.current?.value ?? 0) + 1);

    expect(() => counter.current?.value).toThrow(RippleCycleError);
    ripple.dispose();
  });

  it('surfaces a cycle between two computeds after a source change instead of recursing', () => {
    const ripple = createRipple();
    const enabled = ripple.signal(false);
    const refs: { left?: { value: number }; right?: { value: number } } = {};

    refs.left = ripple.computed((): number => (enabled.value ? (refs.right?.value ?? 0) : 0) + 1);
    refs.right = ripple.computed((): number => (refs.left?.value ?? 0) + 1);

    expect(refs.right.value).toBe(2);
    enabled.value = true;
    expect(() => refs.right?.value).toThrow(RippleCycleError);
    ripple.dispose();
  });

  it('does not call a listener unsubscribed after its write was queued', () => {
    const ripple = createRipple();
    const count = ripple.signal(0);
    let calls = 0;
    let unsubscribe = (): void => undefined;

    ripple.effect(() => {
      if (count.value === 1) unsubscribe();
    });
    unsubscribe = count.subscribe(() => calls++);
    count.value = 1;

    expect(calls).toBe(0);
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

    // Source is a plain object: no ripple import needed.
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

  it('keeps the last value but rejects subscriptions after disposal', () => {
    const ripple = createRipple();
    const readable = ripple.fromSubscribable({ getSnapshot: () => 7, subscribe: () => () => undefined });

    readable.dispose();

    expect(readable.value).toBe(7);
    expect(() => readable.subscribe(() => undefined)).toThrow(RippleDisposedError);
    ripple.dispose();
  });

  it('does not resubscribe when a signal read by the source changes', () => {
    const ripple = createRipple();
    const dep = ripple.signal(0);
    let subscriptions = 0;
    const readable = ripple.fromSubscribable({
      getSnapshot: () => dep.value,
      subscribe: () => {
        subscriptions++;
        return () => undefined;
      },
    });

    dep.value = 1;

    expect(subscriptions).toBe(1);
    readable.dispose();
    ripple.dispose();
  });

  it('disposes the bridge when its abort signal fires', () => {
    const ripple = createRipple();
    const controller = new AbortController();
    let unsubscribed = 0;
    const readable = ripple.fromSubscribable(
      { getSnapshot: () => 1, subscribe: () => () => unsubscribed++ },
      { signal: controller.signal },
    );

    controller.abort();

    expect(readable.disposed).toBe(true);
    expect(unsubscribed).toBe(1);
    ripple.dispose();
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
