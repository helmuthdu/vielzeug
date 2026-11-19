import { vi } from 'vitest';

import type { Scope } from '../index';

import {
  batch,
  computed,
  createScope,
  effect,
  fromSubscribable,
  onCleanup,
  type Readable,
  RippleCycleError,
  RippleDisposedError,
  RippleError,
  signal,
  untrack,
  watch,
} from '../index';

import { itScoped } from './scope-test';

describe('ripple graph', () => {
  itScoped('updates derived values and suppresses unchanged output', () => {
    const count = signal(0);
    const parity = computed(() => count.value % 2);
    const values: number[] = [];
    const stop = effect(() => {
      values.push(parity.value);
    });

    count.value = 2;
    count.value = 3;

    expect(values).toEqual([0, 1]);
    stop.dispose();
  });

  itScoped('tracks a computed created in one scope from an effect in another', () => {
    const source = signal(0);
    const computedScope = createScope();
    const effectScope = createScope();
    const value = computedScope.run(() => computed(() => source.value * 2));
    const seen: number[] = [];

    effectScope.run(() =>
      effect(() => {
        seen.push(value.value);
      }),
    );
    source.value = 1;

    expect(seen).toEqual([0, 2]);
    computedScope.dispose();
    effectScope.dispose();
  });

  itScoped('keeps previous computed dependencies when derive throws', () => {
    const enabled = signal(true);
    const source = signal(1);
    const value = computed(() => {
      if (!enabled.value) throw new Error('disabled');

      return source.value;
    });

    expect(value.value).toBe(1);
    enabled.value = false;
    expect(() => value.value).toThrow('disabled');

    enabled.value = true;
    source.value = 2;
    expect(value.value).toBe(2);
  });

  const recoveryErrors: string[] = [];

  itScoped(
    'recovers when a computed first run fails and a dependency later changes',
    () => {
      const user = signal<{ name: string } | null>(null);
      const name = computed(() => user.value!.name);
      const values: string[] = [];

      expect(() => name.value).toThrow();

      const stop = effect(() => {
        values.push(name.value);
      });

      recoveryErrors.length = 0;
      user.value = { name: 'Ada' };

      expect(values).toEqual(['Ada']);
      expect(recoveryErrors).toEqual([]);
      stop.dispose();
    },
    { onError: (error, context) => recoveryErrors.push(`${context.kind}:${(error as Error).message}`) },
  );

  const failingComputedErrors: string[] = [];

  itScoped(
    'reports a failing computed through the effect that reads it, keeping siblings current',
    () => {
      const source = signal(0);
      const failing = computed(() => {
        if (source.value === 1) throw new Error('failed computed');
        return source.value;
      });
      const valid = computed(() => source.value * 2);
      const first = effect(() => void failing.value);
      const second = effect(() => void valid.value);

      expect(() => (source.value = 1)).not.toThrow();
      expect(valid.peek()).toBe(2);
      expect(failingComputedErrors).toEqual(['effect:failed computed']);

      first.dispose();
      second.dispose();
    },
    { onError: (error, context) => failingComputedErrors.push(`${context.kind}:${(error as Error).message}`) },
  );

  itScoped('never derives from a stale sibling in a diamond', () => {
    const source = signal(1);
    const doubled = computed(() => source.value * 2);
    const tripled = computed(() => source.value * 3);
    const seen: string[] = [];
    const sum = computed(() => {
      seen.push(`${doubled.value}+${tripled.value}`);
      return doubled.value + tripled.value;
    });

    effect(() => void sum.value);
    seen.length = 0;
    source.value = 2;

    expect(seen).toEqual(['4+6']);
  });

  itScoped('derives a computed once per batch however many sources changed', () => {
    const first = signal(0);
    const second = signal(0);
    let derives = 0;
    const total = computed(() => {
      derives++;
      return first.value + second.value;
    });

    effect(() => void total.value);
    derives = 0;
    batch(() => {
      first.value = 1;
      first.value = 2;
      second.value = 3;
    });

    expect(derives).toBe(1);
    expect(total.peek()).toBe(5);
  });

  itScoped('does not derive a computed nobody reads until it is read', () => {
    const source = signal(0);
    let derives = 0;
    const derived = computed(() => {
      derives++;
      return source.value;
    });

    source.value = 1;
    source.value = 2;
    expect(derives).toBe(0);
    expect(derived.value).toBe(2);
    expect(derives).toBe(1);
  });

  itScoped('notifies computed subscribers only when the derived value changes', () => {
    const count = signal(0);
    const parity = computed(() => count.value % 2);
    let calls = 0;
    const unsubscribe = parity.subscribe(() => calls++);

    count.value = 2;
    expect(calls).toBe(0);
    count.value = 3;
    expect(calls).toBe(1);
    unsubscribe();
  });

  itScoped('batches dependent effects', () => {
    const count = signal(0);
    const values: number[] = [];
    const stop = effect(() => {
      values.push(count.value);
    });

    batch(() => {
      count.value = 1;
      count.value = 2;
    });

    expect(values).toEqual([0, 2]);
    stop.dispose();
  });

  itScoped('flushes effects before direct listeners after synchronous writes', () => {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);
    const calls: string[] = [];

    const stop = effect(() => {
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
  });

  itScoped('fires each subscription once per flush even when they share one callback', () => {
    const first = signal(0);
    const second = signal(0);
    let calls = 0;
    const listener = () => {
      calls++;
    };

    const stopFirst = first.subscribe(listener);
    const stopSecond = second.subscribe(listener);

    batch(() => {
      first.value = 1;
      second.value = 1;
    });

    expect(calls).toBe(2);

    // One subscription whose signal is written twice in a batch still fires once.
    calls = 0;

    batch(() => {
      first.value = 2;
      first.value = 3;
    });

    expect(calls).toBe(1);

    stopFirst();
    stopSecond();
  });

  itScoped('runs listeners before effects queued by earlier effects in same flush', () => {
    const source = signal(0);
    const derived = signal(0);
    const calls: string[] = [];

    const writer = effect(() => {
      if (source.value > 0) derived.value = source.value;
      calls.push('writer');
    });
    const reader = effect(() => {
      calls.push(`reader: ${derived.value}`);
    });
    const unsubscribe = source.subscribe(() => calls.push('listener'));

    calls.length = 0;
    source.value = 1;

    expect(calls).toEqual(['writer', 'listener', 'reader: 1']);
    unsubscribe();
    writer.dispose();
    reader.dispose();
  });

  itScoped('coalesces writes made inside a batch into one effect run', () => {
    const count = signal(0);
    const values: number[] = [];

    effect(() => {
      values.push(count.value);
    });
    batch(() => {
      count.value = 1;
      count.value = 2;
    });

    expect(values).toEqual([0, 2]);
  });

  itScoped('does not run a disposed effect when a pending write flushes', () => {
    const count = signal(0);
    const values: number[] = [];
    const stop = effect(() => {
      values.push(count.value);
    });

    batch(() => {
      count.value = 1;
      stop.dispose();
    });

    expect(values).toEqual([0]);
  });

  itScoped('owns nested work through parent effect run', () => {
    const enabled = signal(true);
    const child = signal(0);
    const values: number[] = [];
    const stop = effect(() => {
      if (!enabled.value) return;

      effect(() => {
        values.push(child.value);
      });
    });

    enabled.value = false;
    child.value = 1;

    expect(values).toEqual([0]);
    stop.dispose();
  });

  itScoped('keeps explicit scopes alive across parent effect reruns', (testScope) => {
    const enabled = signal(true);
    const child = signal(0);
    const scopes: Scope[] = [];
    const values: number[] = [];

    effect(() => {
      if (!enabled.value) return;

      const scope = createScope();

      scopes.push(scope);
      scope.run(() => {
        effect(() => {
          values.push(child.value);
        });
      });
    });

    enabled.value = false;
    child.value = 1;

    expect(scopes[0]?.disposed).toBe(false);
    expect(values).toEqual([0, 1]);
    testScope.dispose();
    expect(scopes[0]?.disposed).toBe(true);
  });

  itScoped('runs onCleanup callbacks newest-first when the scope is disposed', () => {
    const scope = createScope();
    const calls: number[] = [];

    scope.run(() => {
      onCleanup(() => calls.push(1));
      onCleanup(() => calls.push(2));
      effect(() => {
        calls.push(0);
      });
    });

    scope.dispose();

    expect(calls).toEqual([0, 2, 1]);
  });

  itScoped('reruns an effect after disposing the previous run’s onCleanup callbacks', () => {
    const count = signal(0);
    const calls: string[] = [];

    const stop = effect(() => {
      const current = count.value;

      onCleanup(() => calls.push(`cleanup ${current}`));
      calls.push(`run ${current}`);
    });

    count.value = 1;
    stop.dispose();

    expect(calls).toEqual(['run 0', 'cleanup 0', 'run 1', 'cleanup 1']);
  });

  const cleanupErrors: string[] = [];

  itScoped(
    'reports a throwing onCleanup and still runs the rest',
    () => {
      const scope = createScope();
      let ran = false;

      scope.run(() => {
        onCleanup(() => {
          throw new Error('cleanup failed');
        });
        onCleanup(() => {
          ran = true;
        });
      });
      scope.dispose();

      expect(cleanupErrors).toEqual(['cleanup failed']);
      expect(ran).toBe(true);
    },
    { onError: (error) => cleanupErrors.push((error as Error).message) },
  );

  itScoped('runs onCleanup immediately when the owner is already disposed', () => {
    const calls: string[] = [];
    const scope = createScope();

    scope.run(() => {
      onCleanup(() => {
        onCleanup(() => calls.push('nested'));
        calls.push('outer');
      });
    });
    scope.dispose();

    expect(calls).toEqual(['nested', 'outer']);
  });

  itScoped('runs an effect’s returned cleanup before the onCleanup callbacks of the same run', () => {
    const calls: string[] = [];

    const stop = effect(() => {
      onCleanup(() => calls.push('onCleanup'));
      effect(() => () => calls.push('child'));
      return () => calls.push('returned');
    });

    stop.dispose();

    expect(calls).toEqual(['child', 'returned', 'onCleanup']);
  });

  itScoped('disposes effects created while a scope runs its cleanups', () => {
    const source = signal(0);
    const values: number[] = [];
    const scope = createScope();

    scope.run(() => {
      onCleanup(() => {
        effect(() => {
          values.push(source.value);
        });
      });
    });
    scope.dispose();
    source.value = 1;

    expect(values).toEqual([]);
  });

  const retryErrors: string[] = [];

  itScoped(
    'retries an effect after its first run fails',
    () => {
      const enabled = signal(true);
      const values: boolean[] = [];

      effect(() => {
        if (enabled.value) throw new Error('not ready');

        values.push(enabled.value);
      });
      enabled.value = false;

      expect(retryErrors).toEqual(['effect:not ready']);
      expect(values).toEqual([false]);
    },
    { onError: (error, context) => retryErrors.push(`${context.kind}:${(error as Error).message}`) },
  );

  const cleanupContextErrors: string[] = [];

  itScoped(
    'reports cleanup failures without interrupting disposal',
    () => {
      const scope = createScope();
      let disposed = false;

      scope.run(() => {
        effect(() => () => {
          throw new Error('cleanup failed');
        });
        effect(() => () => {
          disposed = true;
        });
      });
      scope.dispose();

      expect(cleanupContextErrors).toEqual(['cleanup:cleanup failed']);
      expect(disposed).toBe(true);
    },
    { onError: (error, context) => cleanupContextErrors.push(`${context.kind}:${(error as Error).message}`) },
  );

  const scopeDisposalErrors: string[] = [];

  itScoped(
    'reports cleanup failures raised during scope disposal',
    () => {
      const scope = createScope();
      scope.run(() =>
        effect(() => () => {
          throw new Error('cleanup failed');
        }),
      );
      scope.dispose();

      expect(scopeDisposalErrors).toEqual(['cleanup:cleanup failed']);
    },
    { onError: (error, context) => scopeDisposalErrors.push(`${context.kind}:${(error as Error).message}`) },
  );

  itScoped('returns last cached value from peek on disposed computed', () => {
    const scope = createScope();
    let value!: Readable<number>;
    scope.run(() => {
      const source = signal(1);
      value = computed(() => source.value * 2);
      expect(value.value).toBe(2);
    });
    scope.dispose();
    expect(value.peek()).toBe(2);
  });

  itScoped('throws from peek on a computed disposed before it was ever evaluated', () => {
    const scope = createScope();
    let value!: Readable<number>;
    scope.run(() => {
      const source = signal(1);
      value = computed(() => source.value * 2);
    });
    scope.dispose();
    expect(() => value.peek()).toThrow(RippleDisposedError);
    expect(() => value.peek()).toThrow('disposed before it was ever evaluated');
  });

  itScoped('propagates derivation errors through computed peek', () => {
    const enabled = signal(false);
    const value = computed(() => {
      if (!enabled.value) throw new Error('disabled');

      return 42;
    });

    expect(() => value.peek()).toThrow('disabled');
    enabled.value = true;
    expect(value.peek()).toBe(42);
  });
});

describe('scheduling edge cases', () => {
  itScoped('keeps updating an effect whose first run changed a source it reads', () => {
    const source = signal(0);
    const doubled = computed(() => source.value * 2);
    const seen: number[] = [];

    effect(() => {
      seen.push(doubled.value);
      if (source.peek() === 0) source.value = 1;
    });
    source.value = 5;

    expect(seen).toEqual([0, 2, 10]);
  });

  itScoped('does not leak a running effect’s tracking into listeners its writes flush', () => {
    const trigger = signal(0);
    const unrelated = signal(0);
    let runs = 0;

    trigger.subscribe(() => void unrelated.value);
    effect(() => {
      runs++;
      trigger.value = 1;
    });
    unrelated.value = 5;

    expect(runs).toBe(1);
  });

  itScoped('reruns a parent before the child effects it created', () => {
    const user = signal<{ name: string } | null>({ name: 'Ada' });

    effect(() => {
      if (user.value) effect(() => void user.value!.name);
    });
    user.value = null;
  });

  itScoped('keeps effects schedulable after a runaway flush is abandoned', () => {
    const queued: VoidFunction[] = [];
    const queueMicrotask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queued.push(callback);
    });
    const shared = signal(0);
    const other = signal(0);
    const seen: number[] = [];

    effect(() => {
      void shared.value;
      seen.push(other.value);
    });
    const stop = effect(() => {
      shared.value = shared.value + 1;
    });
    seen.length = 0;
    other.value = 1;

    expect(seen).toEqual([1]);
    expect(queued).toHaveLength(1);
    expect(() => queued[0]?.()).toThrow(RippleCycleError);
    stop.dispose();
    queueMicrotask.mockRestore();
  });

  itScoped('does not rerun an effect for a write its own cleanup makes', () => {
    const source = signal(0);
    const counter = signal(0);
    let runs = 0;

    effect(() => {
      runs++;
      void source.value;
      void counter.value;
      return () => {
        counter.value = counter.peek() + 1;
      };
    });
    source.value = 1;

    expect(runs).toBe(2);
  });

  itScoped('creates scopes inside a rerun under the effect’s own scope', () => {
    const source = signal(0);
    const outer = createScope();
    const other = createScope();
    let inner: Scope | undefined;

    outer.run(() =>
      effect(() => {
        void source.value;
        inner = createScope();
      }),
    );
    other.run(() => {
      source.value = 1;
    });
    other.dispose();

    expect(inner?.disposed).toBe(false);
    outer.dispose();
    expect(inner?.disposed).toBe(true);
  });

  itScoped('drops the edges of an effect disposed during its own run', () => {
    const source = signal(0);
    let runs = 0;
    const stop = effect(() => {
      runs++;
      if (source.value === 1) stop.dispose();
    });

    source.value = 1;
    source.value = 2;

    expect(runs).toBe(2);
    expect(stop.disposed).toBe(true);
  });

  itScoped('treats a throwing equals as a derivation failure', () => {
    const source = signal(0);
    const derived = computed(() => source.value, {
      equals: () => {
        throw new Error('bad equals');
      },
    });

    expect(derived.value).toBe(0);
    source.value = 1;
    expect(() => derived.value).toThrow('bad equals');
  });

  itScoped('rejects signal writes during a computed derive', () => {
    const source = signal(1, { name: 'source' });
    const derived = computed(() => {
      source.value++;

      return source.value;
    });

    expect(() => derived.value).toThrow(RippleError);
    expect(() => derived.value).toThrow('Cannot write signal "source" during a computed derive');
    expect(source.peek()).toBe(1);
  });

  itScoped('rejects signal writes hidden inside untrack during a computed derive', () => {
    const source = signal(1, { name: 'source' });
    const derived = computed(() => untrack(() => (source.value += 1)));

    expect(() => derived.value).toThrow('Cannot write signal "source" during a computed derive');
    expect(source.peek()).toBe(1);
  });
});

describe('bound helpers', () => {
  itScoped('watches explicit source with the immediate option', () => {
    const count = signal(1);
    const values: Array<[number, number | undefined]> = [];
    const stop = watch(count, (value, previous) => values.push([value, previous]), { immediate: true });

    count.value = 2;
    count.value = 3;
    stop.dispose();
    count.value = 4;

    expect(values).toEqual([
      [1, undefined],
      [2, 1],
      [3, 2],
    ]);
  });

  itScoped('supports caller-managed one-shot watching via the returned handle', () => {
    const count = signal(1);
    const values: number[] = [];
    const stop = watch(count, (value) => {
      values.push(value);
      stop.dispose();
    });

    count.value = 2;
    count.value = 3;

    expect(values).toEqual([2]);
    expect(stop.disposed).toBe(true);
  });

  itScoped('updates immutable state via signal.update', () => {
    const cart = signal({ items: 0, label: 'empty' });
    const items = computed(() => cart.value.items);

    cart.update((state) => ({ ...state, items: 3 }));

    expect(items.value).toBe(3);
  });
});

describe('error handling', () => {
  itScoped('uses the nearest scope error handler', () => {
    const errors: string[] = [];
    const parent = createScope({ onError: () => errors.push('parent') });
    const child = parent.run(() => createScope({ onError: () => errors.push('child') }));

    child.run(() =>
      effect(() => {
        throw new Error('failure');
      }),
    );

    expect(errors).toEqual(['child']);
    parent.dispose();
  });

  const effectErrors: Array<{ context: { kind: string }; message: string }> = [];

  itScoped(
    'reports effect failures with their context',
    () => {
      const enabled = signal(true);
      effect(
        () => {
          if (enabled.value) throw new Error('boom');
        },
        { name: 'guarded' },
      );

      expect(effectErrors).toEqual([{ context: { kind: 'effect', name: 'guarded' }, message: 'boom' }]);
    },
    {
      onError: (error, context) => effectErrors.push({ context, message: (error as Error).message }),
    },
  );

  itScoped('keeps listeners quiet while a computed fails with the same error', () => {
    const flag = signal(0);
    const boom = new Error('boom');
    const failing = computed(() => {
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
  });

  itScoped('fires listeners when a failing computed fails with a new error', () => {
    const flag = signal(0);
    const failing = computed(() => {
      throw new Error(`boom ${flag.value}`);
    });

    expect(() => failing.value).toThrow('boom 0');

    let fires = 0;

    failing.subscribe(() => void fires++);
    flag.value = 1;
    flag.value = 2;

    // Each write produces a different error, so the failure state really changed.
    expect(fires).toBe(2);
  });

  itScoped('escalates a throwing scope error handler to its parent', () => {
    const errors: unknown[] = [];
    const parent = createScope({ onError: (error) => errors.push(error) });
    const child = parent.run(() =>
      createScope({
        onError: () => {
          throw new Error('handler failed');
        },
      }),
    );

    child.run(() => {
      effect(() => {
        throw new Error('original failure');
      });
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ message: 'handler failed' });
    parent.dispose();
  });

  itScoped('rethrows unhandled errors in a microtask', () => {
    const queued: VoidFunction[] = [];
    const queueMicrotask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queued.push(callback);
    });
    const scope = createScope();

    scope.run(() =>
      effect(() => {
        throw new Error('unhandled');
      }),
    );

    expect(queued).toHaveLength(1);
    expect(() => queued[0]?.()).toThrow('unhandled');
    scope.dispose();
    queueMicrotask.mockRestore();
  });

  itScoped('routes listener errors to the root instead of the owning scope', () => {
    const queued: VoidFunction[] = [];
    const scopedErrors: unknown[] = [];
    const queueMicrotask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queued.push(callback);
    });
    const scope = createScope({ onError: (error) => scopedErrors.push(error) });

    scope.run(() => {
      const value = signal(0);
      value.subscribe(() => {
        throw new Error('listener failure');
      });
      value.value = 1;
    });

    expect(scopedErrors).toEqual([]);
    expect(queued).toHaveLength(1);
    expect(() => queued[0]?.()).toThrow('listener failure');
    scope.dispose();
    queueMicrotask.mockRestore();
  });

  itScoped('reports a runaway flush instead of throwing from the write site', () => {
    const queued: VoidFunction[] = [];
    const queueMicrotask = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      queued.push(callback);
    });
    const armed = signal(false);
    const shared = signal(0);
    const unrelated = signal(0);
    const healthy: number[] = [];

    const stopRunaway = effect(() => {
      if (armed.value) shared.value = shared.value + 1;
    });
    const stop = effect(() => {
      healthy.push(unrelated.value);
    });

    expect(() => (armed.value = true)).not.toThrow();
    expect(queued).toHaveLength(1);
    expect(() => queued[0]?.()).toThrow(RippleCycleError);

    expect(() => (unrelated.value = 1)).not.toThrow();
    expect(healthy).toEqual([0, 1]);
    stopRunaway.dispose();
    stop.dispose();
    queueMicrotask.mockRestore();
  });

  itScoped('throws a cycle error when a computed reads itself', () => {
    const counter: { current?: { value: number } } = {};

    counter.current = computed((): number => (counter.current?.value ?? 0) + 1);

    expect(() => counter.current?.value).toThrow(RippleCycleError);
  });

  itScoped('surfaces a cycle between two computeds after a source change instead of recursing', () => {
    const enabled = signal(false);
    const refs: { left?: { value: number }; right?: { value: number } } = {};

    refs.left = computed((): number => (enabled.value ? (refs.right?.value ?? 0) : 0) + 1);
    refs.right = computed((): number => (refs.left?.value ?? 0) + 1);

    expect(refs.right.value).toBe(2);
    enabled.value = true;
    expect(() => refs.right?.value).toThrow(RippleCycleError);
  });

  itScoped('does not call a listener unsubscribed after its write was queued', () => {
    const count = signal(0);
    let calls = 0;
    let unsubscribe = (): void => undefined;

    effect(() => {
      if (count.value === 1) unsubscribe();
    });
    unsubscribe = count.subscribe(() => calls++);
    count.value = 1;

    expect(calls).toBe(0);
  });
});

describe('isReactive', () => {
  itScoped('requires the complete readable surface', async () => {
    const { isReactive } = await import('../index');
    const marker = Symbol.for('@vielzeug/ripple/reactive');

    expect(isReactive({ [marker]: true, peek: () => 1, subscribe: () => () => {} } as never)).toBe(false);
    expect(isReactive({ [marker]: true, peek: () => 1, subscribe: () => () => {}, value: 1 } as never)).toBe(true);
  });
});

describe('fromSubscribable', () => {
  itScoped('bridges an external source into a reactive readable', async () => {
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

  itScoped('works without importing ripple in the source', async () => {
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

  itScoped('closes the getSnapshot-to-subscribe race', async () => {
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

  itScoped('keeps the last value but rejects subscriptions after disposal', () => {
    const readable = fromSubscribable({ getSnapshot: () => 7, subscribe: () => () => undefined });

    readable.dispose();

    expect(readable.value).toBe(7);
    expect(() => readable.subscribe(() => undefined)).toThrow(RippleDisposedError);
  });

  itScoped('does not resubscribe when a signal read by the source changes', () => {
    const dep = signal(0);
    let subscriptions = 0;
    const readable = fromSubscribable({
      getSnapshot: () => dep.value,
      subscribe: () => {
        subscriptions++;
        return () => undefined;
      },
    });

    dep.value = 1;

    expect(subscriptions).toBe(1);
    readable.dispose();
  });

  itScoped('disposes the bridge when its abort signal fires', () => {
    const controller = new AbortController();
    let unsubscribed = 0;
    const readable = fromSubscribable(
      { getSnapshot: () => 1, subscribe: () => () => unsubscribed++ },
      { signal: controller.signal },
    );

    controller.abort();

    expect(readable.disposed).toBe(true);
    expect(unsubscribed).toBe(1);
  });

  itScoped('binds bridges to scope ownership', () => {
    let unsubscribed = 0;
    const scope = createScope();
    const readable = scope.run(() =>
      fromSubscribable({
        getSnapshot: () => 1,
        subscribe: () => () => unsubscribed++,
      }),
    );
    scope.dispose();

    expect(readable.disposed).toBe(true);
    expect(unsubscribed).toBe(1);
  });
});
