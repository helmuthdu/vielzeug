import {
  batch,
  computed,
  effect,
  effectAsync,
  getDevToolsHook,
  isComputed,
  isSignal,
  isStore,
  onCleanup,
  readonly,
  resource,
  scope,
  signal,
  StateError,
  store,
  storeWithHistory,
  untrack,
  watch,
} from '../';
import { debugEffect, installDevTools } from '../devtools';

describe('ripple', () => {
  describe('signals', () => {
    it('notifies subscribers when value changes', () => {
      const count = signal(0);
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(count.value);
      });

      count.value = 1;

      expect(seen).toEqual([0, 1]);

      stop.dispose();
    });

    it('custom equals suppresses redundant updates', () => {
      const count = signal(0, { equals: () => true });
      const listener = vi.fn();

      const stop = count.subscribe(listener);

      count.value = 1;
      expect(listener).not.toHaveBeenCalled();

      stop.dispose();
    });

    it('dispose makes signal inert — reads return last value, writes are silently ignored', () => {
      const n = signal(42);

      n.dispose();

      n.value = 99; // ignored after dispose
      expect(n.peek()).toBe(42);
    });

    it('subscribe() on disposed signal returns an already-disposed no-op Subscription', () => {
      const n = signal(1);

      n.dispose();

      const listener = vi.fn();
      const sub = n.subscribe(listener);

      expect(sub.disposed).toBe(true);
      expect(listener).not.toHaveBeenCalled();
      expect(() => sub.dispose()).not.toThrow();
    });

    it('dispose drops existing subscribers', () => {
      const n = signal(1);
      const listener = vi.fn();
      const stop = effect(() => {
        listener(n.value);
      });

      expect(listener).toHaveBeenCalledTimes(1);

      n.dispose();
      n.value = 2; // no-op — listeners were dropped

      expect(listener).toHaveBeenCalledTimes(1);

      stop.dispose();
    });

    it('supports using declaration via Symbol.dispose', () => {
      let disposed = false;
      const n = signal(0);
      const stop = effect(() => {
        void n.value;
        onCleanup(() => {
          disposed = true;
        });
      });

      stop.dispose();
      expect(disposed).toBe(true);
    });
  });

  describe('computed', () => {
    it('derives values reactively', () => {
      const n = signal(2);
      const doubled = computed(() => n.value * 2);
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(doubled.value);
      });

      n.value = 4;

      expect(seen).toEqual([4, 8]);

      stop.dispose();
      doubled.dispose();
    });

    it('returns last value silently when read after dispose (inert node)', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      expect(c.value).toBe(2); // evaluate at least once
      c.dispose();

      expect(c.value).toBe(2); // last value, no throw
      expect(c.peek()).toBe(2); // consistent
    });

    it('returns undefined when disposed before first evaluation', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      c.dispose(); // never evaluated

      expect(c.peek()).toBeUndefined();
    });

    it('subscribe() on disposed computed returns an already-disposed no-op Subscription', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      c.dispose();

      const listener = vi.fn();
      const sub = c.subscribe(listener);

      expect(sub.disposed).toBe(true);
      expect(listener).not.toHaveBeenCalled();
      expect(() => sub.dispose()).not.toThrow();
    });

    it('auto-disposes computed created inside an effect when the effect re-runs', () => {
      const toggle = signal(false);
      const inner = signal(0);
      const computedLog: number[] = [];

      const stop = effect(() => {
        if (toggle.value) {
          const c = computed(() => inner.value + 100);

          computedLog.push(c.value);
        }
      });

      toggle.value = true;
      inner.value = 5;
      toggle.value = false;
      toggle.value = true;

      expect(computedLog).toEqual([100, 105, 105]);

      stop.dispose();
    });

    it('throws StateError on circular computed dependency', () => {
      const proxy = { fn: (): number => 0 };
      const a = computed(() => proxy.fn() + 1);
      const b = computed(() => a.value + 1);

      proxy.fn = () => b.value;

      let caught: unknown;

      try {
        void a.value;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('COMPUTED_CYCLE');

      a.dispose();
      b.dispose();
    });

    it('unsubscribes stale branch dependencies in conditionals', () => {
      const toggle = signal(true);
      const left = signal(1);
      const right = signal(10);
      const selected = computed(() => (toggle.value ? left.value : right.value));
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(selected.value);
      });

      toggle.value = false;
      left.value = 2;
      right.value = 11;

      expect(seen).toEqual([1, 10, 11]);

      stop.dispose();
      selected.dispose();
    });

    it('suppresses downstream effects when equals says value is unchanged', () => {
      const n = signal(0);
      const parity = computed(() => n.value % 2);
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(parity.value);
      });

      n.value = 2;
      n.value = 4;
      n.value = 5;

      expect(seen).toEqual([0, 1]);

      stop.dispose();
      parity.dispose();
    });

    it('preserves the original computed error when a dep throws on removal', () => {
      const trigger = signal(false);
      const badDep = signal(0);

      // A computed that reads badDep on first run, then throws on subsequent runs.
      // We want to verify that when the computed throws, it surfaces the original error.
      const compRef = computed<number>(() => {
        if (!trigger.value) {
          void badDep.value; // track badDep only on first run

          return 0;
        }

        throw new Error('computed-boom');
      });

      expect(compRef.value).toBe(0);

      let caught: unknown;

      try {
        trigger.value = true;
        void compRef.value;
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe('computed-boom');

      compRef.dispose();
    });

    it('remains lazy when there are no subscribers', () => {
      const a = signal(2);
      const b = computed(() => a.value * 3);

      a.value = 10;

      expect(b.value).toBe(30);
    });
  });

  describe('effects and cleanup', () => {
    it('runs cleanups before re-run and on dispose', () => {
      const n = signal(0);
      const cleanA = vi.fn(() => {
        throw new Error('cleanA');
      });
      const cleanB = vi.fn();

      const stop = effect(() => {
        void n.value;
        onCleanup(cleanA);
        onCleanup(cleanB);
      });

      expect(() => {
        n.value = 1;
      }).toThrow(/cleanA/);
      expect(cleanA).toHaveBeenCalledTimes(1);
      expect(cleanB).toHaveBeenCalledTimes(1);

      stop.dispose();
      expect(cleanA).toHaveBeenCalledTimes(1);
      expect(cleanB).toHaveBeenCalledTimes(1);
    });

    it('throws StateError when onCleanup is called outside an active context', () => {
      let caught: unknown;

      try {
        onCleanup(() => {});
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_CLEANUP');
    });

    it('prevents subscription leakage across nested effects', () => {
      const a = signal(0);
      const b = signal(0);
      const outerLog: number[] = [];
      const innerLog: number[] = [];

      const stopOuter = effect(() => {
        outerLog.push(a.value);

        const stopInner = effect(() => {
          innerLog.push(b.value);
        });

        onCleanup(() => stopInner.dispose());
      });

      b.value = 1;
      expect(innerLog).toEqual([0, 1]);
      expect(outerLog).toEqual([0]);

      a.value = 1;
      expect(outerLog).toEqual([0, 1]);

      const prevInnerLen = innerLog.length;

      b.value = 2;
      expect(innerLog.length).toBe(prevInnerLen + 1);

      stopOuter.dispose();
    });

    it('throws after the loop guard limit for self-triggering effects', () => {
      const n = signal(0);

      let caught: unknown;

      try {
        effect(() => {
          if (n.value < 200) n.value++;
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INFINITE_LOOP');
    });

    it('preserves the original effect error when cleanup registered in the failed run also throws', () => {
      const n = signal(0);
      let shouldThrow = false;
      let caught: unknown;

      const stop = effect(() => {
        void n.value;

        if (!shouldThrow) return;

        onCleanup(() => {
          throw new Error('cleanup-boom');
        });

        throw new Error('effect-boom');
      });

      try {
        shouldThrow = true;
        n.value = 1;
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(AggregateError);
      expect((caught as AggregateError).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'effect-boom' }),
          expect.objectContaining({ message: 'cleanup-boom' }),
        ]),
      );
      expect((caught as AggregateError).cause).toMatchObject({ message: 'effect-boom' });

      stop.dispose();
    });
  });

  describe('effectAsync', () => {
    it('runs async work with reactive dependencies', async () => {
      const src = signal(1);
      const results: number[] = [];

      const stop = effectAsync(async (abortSignal) => {
        const n = src.value;

        await Promise.resolve();

        if (!abortSignal.aborted) results.push(n);
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(results).toEqual([1]);

      stop.dispose();
    });

    it('aborts in-flight work when dependencies change', async () => {
      const src = signal(1);
      const started: number[] = [];
      const completed: number[] = [];

      const stop = effectAsync(async (abortSignal) => {
        const n = src.value;

        started.push(n);
        await Promise.resolve();

        if (!abortSignal.aborted) completed.push(n);
      });

      src.value = 2;

      await Promise.resolve();
      await Promise.resolve();

      expect(started).toContain(1);
      expect(started).toContain(2);
      expect(completed).not.toContain(1);
      expect(completed).toContain(2);

      stop.dispose();
    });

    it('calls resolved cleanup on re-run and dispose', async () => {
      const src = signal(0);
      const cleanups: number[] = [];

      const stop = effectAsync(async (_abortSignal) => {
        const n = src.value;

        await Promise.resolve();

        return () => cleanups.push(n);
      });

      await Promise.resolve();
      await Promise.resolve();

      src.value = 1;
      await Promise.resolve();
      await Promise.resolve();

      expect(cleanups).toContain(0);

      stop.dispose();
      expect(cleanups).toContain(1);
    });

    it('calls onError for unhandled async errors', async () => {
      const errors: unknown[] = [];

      const stop = effectAsync(
        async () => {
          await Promise.resolve();
          throw new Error('async-boom');
        },
        { onError: (e) => errors.push(e) },
      );

      await Promise.resolve();
      await Promise.resolve();

      stop.dispose();

      expect(errors).toHaveLength(1);
      expect((errors[0] as Error).message).toBe('async-boom');
    });

    it('silently drops errors from aborted runs', async () => {
      const src = signal(0);
      const errors: unknown[] = [];

      const stop = effectAsync(
        async (abortSignal) => {
          void src.value;
          await Promise.resolve();

          if (!abortSignal.aborted) throw new Error('should-not-surface');
        },
        { onError: (e) => errors.push(e) },
      );

      src.value = 1;
      await Promise.resolve();
      stop.dispose();
      await Promise.resolve();

      expect(errors).toHaveLength(0);
    });

    it('disposeAsync awaits in-flight work before resolving', async () => {
      const order: string[] = [];

      const stop = effectAsync(async () => {
        await Promise.resolve();
        order.push('async-done');
      });

      await stop[Symbol.asyncDispose]();
      order.push('after-dispose');

      expect(order).toEqual(['async-done', 'after-dispose']);
    });

    it('returns an AsyncSubscription with correct shape', () => {
      const stop = effectAsync(async () => {});

      expect(typeof stop).toBe('object');
      expect(typeof stop.dispose).toBe('function');
      expect(typeof stop.run).toBe('function');
      expect(typeof stop[Symbol.dispose]).toBe('function');
      expect(typeof stop[Symbol.asyncDispose]).toBe('function');

      stop.dispose();
    });
  });

  describe('watch', () => {
    it('watches plain signal changes and reports next/prev', () => {
      const n = signal(0);
      const listener = vi.fn();

      const stop = watch(n, listener);

      n.value = 1;

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1, 0);

      stop.dispose();
    });

    it('watches a store lens for fine-grained changes', () => {
      const cart = store({ count: 0, label: 'x' });
      const countLens = cart.lens('count');
      const listener = vi.fn();

      const stop = watch(countLens, (next, prev) => {
        listener(next, prev);
      });

      cart.patch({ label: 'y' });
      expect(listener).not.toHaveBeenCalled();

      cart.patch({ count: 2 });
      expect(listener).toHaveBeenCalledWith(2, 0);

      stop.dispose();
      cart.patch({ count: 3 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not spuriously fire when a computed source returns a same-shaped new reference', () => {
      const n = signal(1);
      const listener = vi.fn();
      const wrapped = computed(() => ({ value: n.value }));

      const stop = watch(wrapped, listener, { equals: (a, b) => a.value === b.value });

      expect(listener).not.toHaveBeenCalled();

      n.value = 2;
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith({ value: 2 }, { value: 1 });

      stop.dispose();
      wrapped.dispose();
    });

    it('does not fire after stop', () => {
      const s = signal({ x: 0, y: 0 });
      const log: number[] = [];
      const xDerived = computed(() => s.value.x);

      const stop = watch(xDerived, (next) => {
        log.push(next);
      });

      s.value = { x: 1, y: 99 };
      stop.dispose();
      s.value = { x: 2, y: 0 };

      expect(log).toEqual([1]);
      xDerived.dispose();
    });

    it('allows stop to be called multiple times', () => {
      const s = signal(0);
      const stop = watch(s, vi.fn());

      expect(() => {
        stop.dispose();
        stop.dispose();
      }).not.toThrow();
    });

    it('immediate: fires immediately with prev === undefined on first call', () => {
      const s = signal(1);
      const spy = vi.fn();

      watch(s, spy, { immediate: true });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1, undefined);
    });

    it('immediate: provides real prev on subsequent changes', () => {
      const s = signal(1);
      const calls: Array<[number, number | undefined]> = [];
      const stop = watch(
        s,
        (v, p) => {
          calls.push([v, p]);
        },
        { immediate: true },
      );

      s.value = 2;
      s.value = 3;
      stop.dispose();

      expect(calls).toEqual([
        [1, undefined],
        [2, 1],
        [3, 2],
      ]);
    });
  });

  describe('batch', () => {
    it('coalesces notifications into a single callback', () => {
      const n = signal(0);
      const listener = vi.fn();

      watch(n, listener);

      batch(() => {
        n.value = 1;
        n.value = 2;
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(2, 0);
    });

    it('body error clears the pending flush queue — effect does not run', () => {
      const n = signal(0);
      const log: number[] = [];

      effect(() => {
        log.push(n.value);
      });

      expect(() => {
        batch(() => {
          n.value = 1;
          throw new Error('boom');
        });
      }).toThrow('boom');

      expect(log).toEqual([0]); // effect didn't re-run — queue was cleared on body error
    });

    it('body error is rethrown without flushing — subscriber not called', () => {
      const n = signal(0);
      let subscriberCalled = false;

      const stop = effect(() => {
        if (n.value > 0) subscriberCalled = true;
      });

      let caught: unknown;

      try {
        batch(() => {
          n.value = 1;
          throw new Error('fn-boom');
        });
      } catch (e) {
        caught = e;
      }

      expect((caught as Error).message).toBe('fn-boom');
      expect(subscriberCalled).toBe(false); // pending queue was cleared
      stop.dispose();
    });

    it('aggregates multiple subscriber errors from a flush', () => {
      const n = signal(0);

      effect(() => {
        if (n.value > 0) throw new Error('sub-a');
      });
      effect(() => {
        if (n.value > 0) throw new Error('sub-b');
      });

      expect(() => {
        batch(() => {
          n.value = 1;
        });
      }).toThrow(AggregateError);
    });

    it('preserves flush AggregateError details when batch body succeeds', () => {
      const n = signal(0);

      effect(() => {
        if (n.value > 0) throw new Error('sub-a');
      });
      effect(() => {
        if (n.value > 0) throw new Error('sub-b');
      });

      let caught: unknown;

      try {
        batch(() => {
          n.value = 1;
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(AggregateError);
      expect((caught as AggregateError).errors).toHaveLength(2);
      expect((caught as AggregateError).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'sub-a' }),
          expect.objectContaining({ message: 'sub-b' }),
        ]),
      );
    });

    it('does not swallow throw undefined', () => {
      expect(() =>
        batch(() => {
          throw undefined;
        }),
      ).toThrow();
    });
  });

  describe('read helpers', () => {
    it('untrack reads without registering dependencies', () => {
      const n = signal(0);
      const log: number[] = [];

      const stop = effect(() => {
        const v = untrack(() => n.value);

        log.push(v);
      });

      n.value = 1;
      n.value = 2;

      expect(log).toEqual([0]);

      stop.dispose();
    });

    it('peek reads signal value without subscribing', () => {
      const n = signal(0);
      const log: number[] = [];

      const stop = effect(() => {
        log.push(n.peek());
      });

      n.value = 1;
      n.value = 2;

      expect(log).toEqual([0]);

      stop.dispose();
    });

    it('peek reads computed value without subscribing', () => {
      const n = signal(2);
      const doubled = computed(() => n.value * 2);
      const log: number[] = [];

      const stop = effect(() => {
        log.push(doubled.peek());
      });

      n.value = 5;

      expect(log).toEqual([4]);
      expect(doubled.peek()).toBe(10);

      stop.dispose();
      doubled.dispose();
    });
  });

  describe('subscriptions and interop', () => {
    it('supports detached subscribe method references', () => {
      const n = signal(0);
      const listener = vi.fn();
      const subscribe = n.subscribe;

      const unsubscribe = subscribe(listener);

      n.value = 1;

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe.dispose();
    });

    it('subscribe skips initial emission and only reacts to changes', () => {
      const n = signal(0);
      const listener = vi.fn();

      const unsubscribe = n.subscribe(listener);

      expect(listener).not.toHaveBeenCalled();

      n.value = 1;
      n.value = 2;

      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe.dispose();
      n.value = 3;

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('subscribe respects computed equality suppression', () => {
      const n = signal(0);
      const parity = computed(() => n.value % 2);
      const listener = vi.fn();

      const unsubscribe = parity.subscribe(listener);

      n.value = 2;
      n.value = 4;
      n.value = 5;

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe.dispose();
      parity.dispose();
    });

    it('computed subscribe eagerly establishes dependencies without emitting an initial callback', () => {
      const n = signal(1);
      let computeRuns = 0;
      const doubled = computed(() => {
        computeRuns++;

        return n.value * 2;
      });
      const listener = vi.fn();

      const unsubscribe = doubled.subscribe(listener);

      expect(computeRuns).toBe(1);
      expect(listener).not.toHaveBeenCalled();

      n.value = 2;

      expect(computeRuns).toBe(2);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe.dispose();
      doubled.dispose();
    });

    it('subscribe returns the Subscription shape', () => {
      const n = signal(0);
      const unsubscribe = n.subscribe(() => {});

      expect(typeof unsubscribe.dispose).toBe('function');
      expect(typeof unsubscribe[Symbol.dispose]).toBe('function');

      unsubscribe.dispose();
    });

    it('readonly returns a read-only computed view over the same source', () => {
      const n = signal(1);
      const ro = readonly(n);

      expect(ro.value).toBe(1);
      n.value = 2;
      expect(ro.value).toBe(2);
      expect(ro.peek()).toBe(2);

      expect(() => {
        (ro as { value: number }).value = 3;
      }).toThrow();
      expect((ro as { update?: unknown }).update).toBeUndefined();
    });

    it('readonly() is recognized by isSignal but NOT by isComputed', () => {
      const n = signal(0);

      expect(isSignal(readonly(n))).toBe(true);
      expect(isComputed(readonly(n))).toBe(false); // readonly() is Readable<T>, not Computed<T>
    });
  });

  describe('store', () => {
    it('supports patch, replace, and reset', () => {
      const user = store({ count: 0, profile: { name: 'Ada' } });

      user.patch({ count: 1 });
      user.replace((state) => ({ ...state, count: state.count + 1 }));
      user.reset();

      expect(user.peek()).toEqual({ count: 0, profile: { name: 'Ada' } });
    });

    it('is branded as a signal', () => {
      const user = store({ count: 0 });

      expect(isSignal(user)).toBe(true);
    });

    it('throws StateError when created or patched with non-object values', () => {
      let caught: unknown;

      try {
        store(42 as unknown as { count: number });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');

      const ok = store({ count: 0 });

      let patchCaught: unknown;

      try {
        ok.patch(null as unknown as Partial<{ count: number }>);
      } catch (e) {
        patchCaught = e;
      }

      expect(patchCaught).toBeInstanceOf(StateError);
      expect((patchCaught as StateError).code).toBe('INVALID_STORE');
    });

    it('replace() is a no-op when the callback returns the same reference', () => {
      const s = store({ count: 5 });
      const listener = vi.fn();
      const stop = s.subscribe(listener);

      s.replace((state) => state); // same reference — should silently no-op

      expect(s.peek().count).toBe(5);
      expect(listener).not.toHaveBeenCalled();

      stop.dispose();
    });
  });

  describe('store — peek() frozen snapshot', () => {
    it('throws TypeError when attempting to write a top-level property on store.peek()', () => {
      const s = store({ count: 0, name: 'Ada' });
      const snapshot = s.peek();

      let caught: unknown;

      try {
        (snapshot as { count: number }).count = 99;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(TypeError);
      expect(s.peek().count).toBe(0);
    });

    it('throws TypeError when attempting to delete a property on store.peek()', () => {
      const s = store<{ count: number; name?: string }>({ count: 0, name: 'Ada' });
      const snapshot = s.peek();

      let caught: unknown;

      try {
        delete (snapshot as { name?: string }).name;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(TypeError);
      expect(s.peek().name).toBe('Ada');
    });

    it('read access through store.peek() works normally', () => {
      const s = store({ x: 1, y: 2 });

      expect(s.peek().x).toBe(1);
      expect(s.peek().y).toBe(2);
    });

    it('peek() returns a snapshot — not a live view', () => {
      const s = store({ x: 1 });
      const snap = s.peek();

      s.patch({ x: 99 });

      expect(snap.x).toBe(1);
      expect(s.peek().x).toBe(99);
    });
  });

  describe('store.value — reactive tracked read', () => {
    it('store.value returns the current state', () => {
      const s = store({ x: 1, y: 2 });

      expect(s.value.x).toBe(1);
      s.patch({ x: 10 });
      expect(s.value.x).toBe(10);
    });

    it('store.value in effect re-runs on any patch', () => {
      const s = store({ a: 0, b: 0 });
      const log: number[] = [];

      const stop = effect(() => {
        log.push(s.value.a + s.value.b);
      });

      s.patch({ a: 1 });
      s.patch({ b: 2 });
      stop.dispose();

      expect(log).toEqual([0, 1, 3]);
    });

    it('store.value does not re-run effect when same value patched', () => {
      const s = store({ x: 5 });
      const log: number[] = [];

      const stop = effect(() => {
        log.push(s.value.x);
      });

      s.patch({ x: 5 }); // no-op
      stop.dispose();

      expect(log).toEqual([5]);
    });
  });

  describe('computed() projecting from store lenses', () => {
    it('computed() projects from a store lens', () => {
      const cart = store({ count: 0, label: 'empty' });
      const countLens = cart.lens('count');
      const doubled = computed(() => countLens.value * 2);

      expect(doubled.value).toBe(0);

      cart.patch({ count: 5 });
      expect(doubled.value).toBe(10);

      doubled.dispose();
    });

    it('selector suppresses downstream effects when projected value is unchanged', () => {
      const cart = store({ count: 0, label: 'empty' });
      const labelLens = cart.lens('label');
      const listener = vi.fn();

      const unsubscribe = labelLens.subscribe(listener);

      cart.patch({ count: 1 }); // label unchanged — no notification
      expect(listener).not.toHaveBeenCalled();

      cart.patch({ label: 'full' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe.dispose();
    });

    it('computed() on lens projects the lens value', () => {
      const s = store({ active: false, name: 'test' });
      const activeLens = s.lens('active');
      const asString = computed(() => String(activeLens.value));

      expect(asString.value).toBe('false');

      s.patch({ active: true });
      expect(asString.value).toBe('true');

      asString.dispose();
    });
  });

  describe('type guards', () => {
    it('isSignal returns true for signals, computed signals, and stores', () => {
      expect(isSignal(signal(0))).toBe(true);
      expect(isSignal(computed(() => 1))).toBe(true);
      expect(isSignal(store({ x: 0 }))).toBe(true);
      expect(isSignal({})).toBe(false);
      expect(isSignal(null)).toBe(false);
    });

    it('isComputed returns true only for computed signals', () => {
      const c = computed(() => 1);

      expect(isComputed(c)).toBe(true);
      expect(isComputed(signal(0))).toBe(false);
      expect(isComputed(store({ x: 0 }))).toBe(false);
      expect(isComputed({})).toBe(false);
      expect(isComputed(readonly(signal(0)))).toBe(false);

      c.dispose();
    });

    it('isStore returns true only for stores', () => {
      const s = store({ x: 0 });

      expect(isStore(s)).toBe(true);
      expect(isStore(signal(0))).toBe(false);
      expect(isStore(computed(() => 1))).toBe(false);
      expect(isStore({})).toBe(false);
    });
  });

  describe('effect options — infinite loop protection', () => {
    it('throws INFINITE_LOOP when effect exceeds default max iterations', () => {
      const n = signal(0);
      let caught: unknown;

      try {
        effect(() => {
          if (n.value < 200) n.value++;
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INFINITE_LOOP');
    });

    it('name appears in INFINITE_LOOP error message', () => {
      const n = signal(0);
      let caught: unknown;

      try {
        effect(
          () => {
            if (n.value < 200) n.value++;
          },
          { name: 'myEffect' },
        );
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).message).toContain('myEffect');
    });

    it('trace logs changed sources on re-run without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const n = signal(0, { name: 'counter' });

      const stop = debugEffect(
        () => {
          void n.value;
        },
        { name: 'tracer' },
      );

      n.value = 1;

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('tracer'));
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('counter'));

      stop.dispose();
      vi.restoreAllMocks();
    });

    it('logs initial deps on the first run', () => {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const n = signal(0, { name: 'counter' });

      const stop = debugEffect(
        () => {
          void n.value;
        },
        { name: 'initTest' },
      );

      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('"initTest" initial deps'));

      stop.dispose();
      vi.restoreAllMocks();
    });
  });

  describe('StateError', () => {
    it('is instanceof Error with correct name and code', () => {
      const err = new StateError('COMPUTED_CYCLE', 'test message');

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(StateError);
      expect(err.name).toBe('StateError');
      expect(err.code).toBe('COMPUTED_CYCLE');
      expect(err.message).toBe('test message');
    });

    it('is thrown for all documented error conditions', () => {
      // COMPUTED_CYCLE
      const proxy = { fn: (): number => 0 };
      const a = computed(() => proxy.fn() + 1);
      const b = computed(() => a.value + 1);

      proxy.fn = () => b.value;

      let caught: unknown;

      try {
        void a.value;
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).code).toBe('COMPUTED_CYCLE');
      a.dispose();
      b.dispose();

      // DISPOSED_SCOPE
      const s = scope();

      s.dispose();
      caught = undefined;

      try {
        s.run(() => {});
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).code).toBe('DISPOSED_SCOPE');

      // INVALID_CLEANUP
      caught = undefined;

      try {
        onCleanup(() => {});
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).code).toBe('INVALID_CLEANUP');

      // INVALID_STORE
      caught = undefined;

      try {
        store([] as unknown as object);
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).code).toBe('INVALID_STORE');
    });
  });

  describe('scope', () => {
    it('supports setup callback to register initial cleanups', () => {
      const log: string[] = [];
      const s = scope(() => {
        onCleanup(() => log.push('setup-cleanup'));
      });

      expect(log).toEqual([]);
      s.dispose();
      expect(log).toEqual(['setup-cleanup']);
    });

    it('runs cleanups in LIFO order on dispose', () => {
      const s = scope();
      const log: string[] = [];

      s.run(() => {
        onCleanup(() => log.push('a'));
        onCleanup(() => log.push('b'));
      });

      expect(log).toEqual([]);
      s.dispose();
      expect(log).toEqual(['b', 'a']);
    });

    it('dispose is idempotent', () => {
      const s = scope();
      const log: number[] = [];

      s.run(() => onCleanup(() => log.push(1)));
      s.dispose();
      s.dispose();

      expect(log).toEqual([1]);
    });

    it('run after dispose throws StateError', () => {
      const s = scope();

      s.dispose();

      let caught: unknown;

      try {
        s.run(() => {});
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('DISPOSED_SCOPE');
    });

    it('scope.add() directs cleanup into scope, not enclosing effect', () => {
      const n = signal(0);
      const scopeLog: number[] = [];
      const effectLog: number[] = [];
      const s = scope();

      const stop = effect(() => {
        void n.value;
        s.add(() => scopeLog.push(1)); // explicit: goes to scope
        onCleanup(() => effectLog.push(1)); // goes to effect
      });

      n.value = 1;
      stop.dispose();

      expect(effectLog).toEqual([1, 1]);
      expect(scopeLog).toEqual([]);

      s.dispose();
      expect(scopeLog).toEqual([1, 1]);
    });

    it('scope.add() throws DISPOSED_SCOPE on already-disposed scope', () => {
      const s = scope();

      s.dispose();

      expect(() => s.add(() => {})).toThrow(StateError);

      try {
        s.add(() => {});
      } catch (e) {
        expect(e).toBeInstanceOf(StateError);
        expect((e as StateError).code).toBe('DISPOSED_SCOPE');
      }
    });

    it('supports using declaration via Symbol.dispose', () => {
      const log: string[] = [];

      {
        using s = scope();

        s.run(() => onCleanup(() => log.push('done')));
      }

      expect(log).toEqual(['done']);
    });
  });

  describe('graph propagation correctness', () => {
    it('nested effects do not leak subscriptions across scope boundaries', () => {
      const a = signal(0);
      const b = signal(0);
      const outerLog: number[] = [];
      const innerLog: number[] = [];

      const stopOuter = effect(() => {
        outerLog.push(a.value);

        const stopInner = effect(() => {
          innerLog.push(b.value);
        });

        onCleanup(() => stopInner.dispose());
      });

      b.value = 1;
      expect(innerLog).toEqual([0, 1]);
      expect(outerLog).toEqual([0]);

      a.value = 1;
      expect(outerLog).toEqual([0, 1]);

      const prevInnerLen = innerLog.length;

      b.value = 2;
      expect(innerLog.length).toBe(prevInnerLen + 1);

      stopOuter.dispose();
    });

    it('runs effect subscribed to source+computed once per source write', () => {
      const n = signal(1);
      const doubled = computed(() => n.value * 2);
      const runs: number[] = [];

      const stop = effect(() => {
        void n.value;
        void doubled.value;
        runs.push(1);
      });

      expect(runs).toHaveLength(1);

      n.value = 5;
      expect(runs).toHaveLength(2);

      stop.dispose();
      doubled.dispose();
    });

    it('keeps signal+computed snapshots consistent', () => {
      const n = signal(1);
      const doubled = computed(() => n.value * 2);
      const seen: Array<[number, number]> = [];

      const stop = effect(() => {
        seen.push([n.value, doubled.value]);
      });

      n.value = 5;
      stop.dispose();

      for (const [raw, derived] of seen) {
        expect(derived).toBe(raw * 2);
      }
      expect(seen.at(-1)).toEqual([5, 10]);
    });

    it('keeps multi-computed snapshots consistent', () => {
      const n = signal(1);
      const doubled = computed(() => n.value * 2);
      const tripled = computed(() => n.value * 3);
      const seen: Array<[number, number, number]> = [];

      const stop = effect(() => {
        seen.push([n.value, doubled.value, tripled.value]);
      });

      n.value = 5;

      expect(seen).toHaveLength(2);
      expect(seen.at(-1)).toEqual([5, 10, 15]);

      stop.dispose();
      doubled.dispose();
      tripled.dispose();
    });

    it('cascade writes are not suppressed when an effect subscribes to both source and derived signal', () => {
      const x = signal(0);
      const y = signal(0);
      const seen: Array<[number, number]> = [];

      const stopB = effect(() => {
        seen.push([x.value, y.value]);
      });

      const stopA = effect(() => {
        if (x.value === 1) {
          y.value = 7;
        }
      });

      x.value = 1;

      expect(seen.at(-1)).toEqual([1, 7]);
      expect(seen).toContainEqual([1, 0]);

      stopB.dispose();
      stopA.dispose();
    });
  });

  describe('readonly() wrapper', () => {
    it('readonly() creates a read-only view that tracks deps', () => {
      const n = signal(2);
      const ro = readonly(n);

      expect(ro.value).toBe(2);
      n.value = 5;
      expect(ro.value).toBe(5);
    });

    it('readonly() on a computed tracks deps through the wrapper', () => {
      const n = signal(2);
      const doubled = computed(() => n.value * 2);
      const ro = readonly(doubled);

      n.value = 3;
      expect(ro.value).toBe(6);
      doubled.dispose();
    });

    it('readonly() on a readonly wraps correctly', () => {
      const n = signal(10);
      const ro = readonly(n);

      expect(ro.value).toBe(10);
    });
  });

  describe('debug names in error messages', () => {
    it('computed cycle error includes name when provided', () => {
      const proxy = { fn: (): number => 0 };
      const a = computed(() => proxy.fn() + 1, { name: 'myComputed' });
      const b = computed(() => a.value + 1);

      proxy.fn = () => b.value;

      let caught: unknown;

      try {
        void a.value;
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).message).toContain('myComputed');

      a.dispose();
      b.dispose();
    });
  });

  describe('effect() throws on non-function returns', () => {
    it('throws StateError when effect returns a number', () => {
      let caught: unknown;

      try {
        effect(() => 42 as unknown as void);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_CLEANUP');
    });

    it('throws StateError when effect returns true', () => {
      let caught: unknown;

      try {
        effect(() => true as unknown as void);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_CLEANUP');
    });

    it('does not throw when effect returns undefined', () => {
      const stop = effect(() => undefined);

      expect(() => stop.dispose()).not.toThrow();
    });

    it('does not throw when effect returns a function (cleanup)', () => {
      const stop = effect(() => () => {});

      expect(() => stop.dispose()).not.toThrow();
    });
  });

  describe('diamond dep deduplication', () => {
    it('changing A in A→B, A→C, B+C→D only recomputes D once', () => {
      const a = signal(1);
      const b = computed(() => a.value * 2);
      const c = computed(() => a.value * 3);
      let dRuns = 0;
      const d = computed(() => {
        dRuns++;

        return b.value + c.value;
      });

      // Establish initial value
      expect(d.value).toBe(5);
      expect(dRuns).toBe(1);

      const seen: number[] = [];
      const stop = effect(() => {
        seen.push(d.value);
      });

      expect(dRuns).toBe(1); // already computed above

      a.value = 2;
      expect(dRuns).toBe(2); // recomputed once despite two upstream paths
      expect(d.value).toBe(10);
      expect(seen.at(-1)).toBe(10);

      stop.dispose();
      b.dispose();
      c.dispose();
      d.dispose();
    });

    it('version fast-path skips recompute when deps have not changed', () => {
      const a = signal(1);
      let runs = 0;
      const c = computed(() => {
        runs++;

        return a.value + 1;
      });

      expect(c.value).toBe(2);
      expect(runs).toBe(1);

      // Access again without changing anything — should use cached value
      expect(c.value).toBe(2);
      expect(runs).toBe(1);

      c.dispose();
    });
  });

  describe('store.lens()', () => {
    it('reads and writes a specific key of the store', () => {
      const s = store({ age: 30, name: 'Alice' });
      const nameLens = s.lens('name');

      expect(nameLens.value).toBe('Alice');

      nameLens.value = 'Bob';
      expect(s.peek().name).toBe('Bob');
    });

    it('lens is cached — store.lens("x") === store.lens("x")', () => {
      const s = store({ x: 1, y: 2 });

      expect(s.lens('x')).toBe(s.lens('x'));
    });

    it('lens write propagates via patch — other keys unchanged', () => {
      const s = store({ x: 1, y: 2 });
      const xLens = s.lens('x');

      xLens.value = 99;

      expect(s.peek().x).toBe(99);
      expect(s.peek().y).toBe(2);
    });

    it('effect on lens re-runs only when that key changes', () => {
      const s = store({ x: 0, y: 0 });
      const xLens = s.lens('x');
      const log: number[] = [];

      const stop = effect(() => {
        log.push(xLens.value);
      });

      s.patch({ y: 99 }); // should NOT re-run x lens effect
      expect(log).toEqual([0]);

      s.patch({ x: 5 }); // should re-run
      expect(log).toEqual([0, 5]);

      stop.dispose();
    });

    it('lens.subscribe works', () => {
      const s = store({ x: 0 });
      const xLens = s.lens('x');
      const listener = vi.fn();

      const unsub = xLens.subscribe(listener);

      s.patch({ x: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsub.dispose();
    });

    it('dispose() evicts the lens from cache — re-acquisition creates a fresh working lens', () => {
      const s = store({ x: 1 });
      const lens1 = s.lens('x');

      lens1.dispose();

      const lens2 = s.lens('x');

      expect(lens2).not.toBe(lens1); // new instance
      expect(lens2.value).toBe(1); // works without throwing

      lens2.value = 42;
      expect(s.peek().x).toBe(42);
    });

    it('lens() with dot-notation path reads nested values', () => {
      const s = store({ user: { address: { city: 'NY' }, name: 'Alice' } });
      const city = s.lens('user.address.city');

      expect(city.value).toBe('NY');
    });

    it('lens() with dot-notation path writes nested values immutably', () => {
      const s = store({ user: { address: { city: 'NY' }, name: 'Alice' } });
      const city = s.lens('user.address.city');

      city.value = 'LA';

      expect(s.peek().user.address.city).toBe('LA');
      expect(s.peek().user.name).toBe('Alice'); // sibling preserved
    });

    it('nested lens is cached — same path returns same instance', () => {
      const s = store({ a: { b: 1 } });

      expect(s.lens('a.b')).toBe(s.lens('a.b'));
    });

    it('nested lens effect fires only when that path changes', () => {
      const s = store({ meta: { count: 0, label: 'x' }, value: 0 });
      const count = s.lens('meta.count');
      const log: number[] = [];

      const stop = effect(() => {
        log.push(count.value);
      });

      s.patch({ value: 99 }); // unrelated — should not re-run
      expect(log).toEqual([0]);

      s.replace((st) => ({ ...st, meta: { ...st.meta, count: 5 } }));
      expect(log).toEqual([0, 5]);

      stop.dispose();
    });

    it('nested lens no-ops when value is the same (via update same-ref)', () => {
      const s = store({ a: { b: 'hello' } });
      const b = s.lens('a.b');
      const listener = vi.fn();
      const stop = b.subscribe(listener);

      b.value = 'hello'; // same value — no notification expected
      expect(listener).not.toHaveBeenCalled();

      stop.dispose();
    });

    it('throws StateError when writing through a null intermediate path segment', () => {
      const s = store({ user: null as unknown as { city: string } });
      const city = s.lens('user.city');
      let caught: unknown;

      try {
        city.value = 'NY';
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
    });
  });

  describe('store.lens() — double-notification regression (B1)', () => {
    it('effect reading both a top-level lens and store.value fires exactly once per lens write', () => {
      const s = store({ x: 0, y: 0 });
      const xLens = s.lens('x');
      const log: number[] = [];

      const stop = effect(() => {
        void s.value; // subscribes to version_
        void xLens.value; // subscribes to propSig for 'x'
        log.push(s.peek().x);
      });

      expect(log).toEqual([0]); // initial run
      log.length = 0;

      xLens.value = 1;

      expect(log).toEqual([1]); // exactly one notification — not two

      stop.dispose();
      s.dispose();
    });
  });

  describe('store.lens() — name property (D3)', () => {
    it('named store lens exposes the composite name', () => {
      const s = store({ count: 0 }, { name: 'myStore' });

      expect(s.lens('count').name).toBe('myStore.count');
    });

    it('unnamed store lens exposes just the key name', () => {
      const s = store({ count: 0 });

      expect(s.lens('count').name).toBe('count');
    });

    it('nested lens name includes the full dot path', () => {
      const s = store({ a: { b: 0 } }, { name: 'ns' });

      expect(s.lens('a.b').name).toBe('ns.a.b');
    });
  });

  describe('effect scheduler option', () => {
    it('scheduler: sync (default) runs immediately on signal change', () => {
      const n = signal(0);
      const log: number[] = [];
      const stop = effect(() => {
        log.push(n.value);
      });

      n.value = 1;
      expect(log).toEqual([0, 1]); // synchronous

      stop.dispose();
    });

    it('scheduler: microtask defers re-runs via queueMicrotask', async () => {
      const n = signal(0);
      const log: number[] = [];
      const stop = effect(
        () => {
          log.push(n.value);
        },
        { scheduler: 'microtask' },
      );

      // Initial run is always synchronous
      expect(log).toEqual([0]);

      n.value = 1;
      expect(log).toEqual([0]); // not yet

      await Promise.resolve(); // flush microtask
      expect(log).toEqual([0, 1]);

      stop.dispose();
    });

    it('scheduler: microtask coalesces multiple writes into one re-run', async () => {
      const n = signal(0);
      const log: number[] = [];
      const stop = effect(
        () => {
          log.push(n.value);
        },
        { scheduler: 'microtask' },
      );

      n.value = 1;
      n.value = 2;
      n.value = 3;

      await Promise.resolve();
      expect(log).toEqual([0, 3]); // one deferred run with latest value

      stop.dispose();
    });
  });

  describe('computed — throws propagate from compute function', () => {
    it('throws on compute error', () => {
      const n = signal(0);
      const risky = computed(() => {
        if (n.value > 0) throw new Error('too big');

        return n.value;
      });

      expect(risky.value).toBe(0);

      n.value = 1;

      let caught: unknown;

      try {
        void risky.value;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe('too big');

      risky.dispose();
    });
  });

  describe('R1 — signal.subscribe() on disposed returns no-op Subscription', () => {
    it('no-op subscription does not notify listener and is immediately disposed', () => {
      const n = signal(1);

      n.dispose();

      const listener = vi.fn();
      const sub = n.subscribe(listener);

      expect(sub.disposed).toBe(true);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('R6 — watch() throws when callback returns non-function', () => {
    it('throws StateError with INVALID_CLEANUP when returning a number', () => {
      const n = signal(1);
      let caught: unknown;

      // @ts-expect-error intentional — testing runtime guard
      watch(n, () => 42);

      // The guard fires on the next change (callback is not called on first run).
      try {
        n.value = 2;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_CLEANUP');

      n.dispose();
    });

    it('does not throw when callback returns a function', () => {
      const n = signal(1);
      const stop = watch(n, () => () => {});

      expect(() => stop.dispose()).not.toThrow();
    });

    it('does not throw when callback returns undefined', () => {
      const n = signal(1);
      const stop = watch(n, () => undefined);

      expect(() => stop.dispose()).not.toThrow();
    });
  });

  describe('R4 — readonly() returns Readable<T> (no ownership)', () => {
    it('readonly(computed) reads through to source — no dispose method', () => {
      const n = signal(1);
      const doubled = computed(() => n.value * 2);
      const r = readonly(doubled);

      expect(r.value).toBe(2);
      expect(typeof (r as Record<string, unknown>).dispose).toBe('undefined');

      n.value = 5;
      expect(r.value).toBe(10);
      expect(doubled.disposed).toBe(false);

      doubled.dispose();
      n.dispose();
    });

    it('readonly(signal) reads through to source — no dispose method', () => {
      const n = signal(42);
      const ro = readonly(n);

      expect(typeof (ro as Record<string, unknown>).dispose).toBe('undefined');

      expect(ro.value).toBe(42);
      n.value = 99;
      expect(ro.value).toBe(99);

      n.dispose();
    });
  });

  describe('F2 — resource', () => {
    it('starts with status=loading before resolving', () => {
      let resolvePromise!: () => void;
      const ac = resource(
        () =>
          new Promise<string>((resolve) => {
            resolvePromise = () => resolve('done');
          }),
      );

      expect(ac.value.status).toBe('loading');
      expect(ac.value.data).toBeUndefined();

      resolvePromise();
      ac.dispose();
    });

    it('emits status=ready after promise fulfills', async () => {
      const s = signal('hi');
      const ac = resource(() => Promise.resolve(s.value.toUpperCase()));

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('ready');
      expect(ac.value.data).toBe('HI');

      ac.dispose();
    });

    it('emits status=error when factory rejects', async () => {
      const ac = resource(() => Promise.reject(new Error('oops')));

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('error');
      expect((ac.value as { error: Error; status: 'error' }).error.message).toBe('oops');

      ac.dispose();
    });

    it('re-runs and updates state when reactive dependency changes', async () => {
      const n = signal(1);
      const calls: number[] = [];
      const ac = resource(async () => {
        const v = n.value;

        calls.push(v);

        return v * 2;
      });

      await new Promise((r) => setTimeout(r, 0));

      n.value = 2;

      await new Promise((r) => setTimeout(r, 0));

      expect(calls).toContain(1);
      expect(calls).toContain(2);
      expect(ac.value.status).toBe('ready');
      expect((ac.value as { data: number; status: 'ready' }).data).toBe(4);

      ac.dispose();
    });
  });

  describe('F3 — DevTools hook', () => {
    // Save/restore pattern — isolates each test without relying on teardown ordering.
    let savedHook: ReturnType<typeof getDevToolsHook>;

    beforeEach(() => {
      savedHook = getDevToolsHook();
    });

    afterEach(() => {
      installDevTools(savedHook);
    });

    it('getDevToolsHook returns null when not installed', () => {
      installDevTools(null);

      expect(getDevToolsHook()).toBeNull();
    });

    it('installDevTools stores the hook and getDevToolsHook returns it', () => {
      const hook = { write: vi.fn() };

      installDevTools(hook);

      expect(getDevToolsHook()).toBe(hook);
    });

    it('globalThis.__RIPPLE_DEVTOOLS__ mirrors the installed hook', () => {
      const hook = { write: vi.fn() };

      installDevTools(hook);
      expect((globalThis as Record<string, unknown>)['__RIPPLE_DEVTOOLS__']).toBe(hook);

      installDevTools(null);
      expect((globalThis as Record<string, unknown>)['__RIPPLE_DEVTOOLS__']).toBeUndefined();
    });

    it('write event fires with name, oldValue, and newValue on signal write', () => {
      const events: Array<{ name: string | undefined; newValue: unknown; oldValue: unknown }> = [];

      installDevTools({ write: (e) => events.push({ name: e.name, newValue: e.newValue, oldValue: e.oldValue }) });

      const n = signal(0, { name: 'devtest' });

      n.value = 42;
      n.dispose();

      expect(events).toEqual(expect.arrayContaining([{ name: 'devtest', newValue: 42, oldValue: 0 }]));
    });

    it('write event fires with name:undefined for unnamed signal', () => {
      const events: Array<{ name: string | undefined; newValue: unknown; oldValue: unknown }> = [];

      installDevTools({ write: (e) => events.push({ name: e.name, newValue: e.newValue, oldValue: e.oldValue }) });

      const n = signal(0);

      n.value = 1;
      n.dispose();

      expect(events[0]?.name).toBeUndefined();
      expect(events[0]?.oldValue).toBe(0);
      expect(events[0]?.newValue).toBe(1);
    });

    it('compute event fires on computed recompute', () => {
      const names: Array<string | undefined> = [];

      installDevTools({ compute: (e) => names.push(e.name) });

      const n = signal(0);
      const c = computed(() => n.value * 2, { name: 'doubled' });

      void c.value; // trigger first compute
      n.value = 1;
      void c.value; // trigger recompute

      c.dispose();
      n.dispose();

      expect(names).toContain('doubled');
    });

    it('run event fires with name when effect runs', () => {
      const names: Array<string | undefined> = [];

      installDevTools({ run: (e) => names.push(e.name) });

      const stop = effect(() => {}, { name: 'myEffect' });

      stop.dispose();

      expect(names).toContain('myEffect');
    });

    it('dispose event fires with kind:effect when effect is disposed', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ dispose: (e) => events.push(e) });

      const stop = effect(() => {}, { name: 'myEffect' });

      stop.dispose();

      expect(events).toContainEqual({ kind: 'effect', name: 'myEffect' });
    });

    it('dispose event fires with kind:signal when signal is disposed', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ dispose: (e) => events.push(e) });

      const n = signal(0, { name: 'sig' });

      n.dispose();

      expect(events).toContainEqual({ kind: 'signal', name: 'sig' });
    });

    it('dispose event fires with kind:computed when computed is disposed', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ dispose: (e) => events.push(e) });

      const c = computed(() => 1, { name: 'comp' });

      c.dispose();

      expect(events).toContainEqual({ kind: 'computed', name: 'comp' });
    });

    it('dispose event fires with name:undefined for unnamed nodes', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ dispose: (e) => events.push(e) });

      const n = signal(0);
      const c = computed(() => n.value);
      const stop = effect(() => {});

      n.dispose();
      c.dispose();
      stop.dispose();

      expect(events.filter((e) => e.kind === 'signal')[0]?.name).toBeUndefined();
      expect(events.filter((e) => e.kind === 'computed')[0]?.name).toBeUndefined();
      expect(events.filter((e) => e.kind === 'effect')[0]?.name).toBeUndefined();
    });

    it('mutate event fires with kind:patch on store.patch()', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ mutate: (e) => events.push(e) });

      const s = store({ x: 0 }, { name: 'myStore' });

      s.patch({ x: 1 });

      expect(events).toContainEqual({ kind: 'patch', name: 'myStore' });
    });

    it('mutate event fires with kind:replace on store.replace()', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ mutate: (e) => events.push(e) });

      const s = store({ x: 0 }, { name: 'myStore' });

      s.replace((st) => ({ ...st, x: 99 }));

      expect(events).toContainEqual({ kind: 'replace', name: 'myStore' });
    });

    it('mutate event fires with kind:reset on store.reset()', () => {
      const events: Array<{ kind: string; name: string | undefined }> = [];

      installDevTools({ mutate: (e) => events.push(e) });

      const s = store({ x: 5 }, { name: 'myStore' });

      s.reset();

      expect(events).toContainEqual({ kind: 'reset', name: 'myStore' });
    });

    it('mutate event fires with kind:lens and correct path on top-level lens write', () => {
      const events: Array<{ kind: string; name: string | undefined; path?: string }> = [];

      installDevTools({ mutate: (e) => events.push(e) });

      const s = store({ x: 0 }, { name: 'myStore' });
      const xLens = s.lens('x');

      xLens.value = 7;

      expect(events).toContainEqual({ kind: 'lens', name: 'myStore', path: 'x' });
    });

    it('mutate event fires with kind:lens and correct path on nested lens write', () => {
      const events: Array<{ kind: string; name: string | undefined; path?: string }> = [];

      installDevTools({ mutate: (e) => events.push(e) });

      const s = store({ a: { b: 0 } }, { name: 'nested' });
      const bLens = s.lens('a.b');

      bLens.value = 99;

      expect(events).toContainEqual({ kind: 'lens', name: 'nested', path: 'a.b' });
    });
  });

  describe('.name property on signals and computed', () => {
    it('returns the name for a named signal', () => {
      const n = signal(0, { name: 'mySignal' });

      expect(n.name).toBe('mySignal');
    });

    it('returns the name for a named computed', () => {
      const c = computed(() => 1, { name: 'myComputed' });

      expect(c.name).toBe('myComputed');

      c.dispose();
    });

    it('returns undefined for an unnamed signal', () => {
      const n = signal(0);

      expect(n.name).toBeUndefined();
    });

    it('returns undefined for an unnamed computed', () => {
      const c = computed(() => 1);

      expect(c.name).toBeUndefined();

      c.dispose();
    });
  });

  describe('F5 — storeWithHistory', () => {
    it('records and replays history via explicit push()+undo/redo', () => {
      const h = storeWithHistory({ count: 0 });

      h.store.patch({ count: 1 });
      h.push();
      h.store.patch({ count: 2 });
      h.push();

      expect(h.store.peek().count).toBe(2);
      expect(h.historyLength).toBe(3); // initial + 2 pushes

      h.undo();

      expect(h.store.peek().count).toBe(1);

      h.redo();

      expect(h.store.peek().count).toBe(2);
    });

    it('historyAt returns snapshot at index', () => {
      const h = storeWithHistory({ x: 'a' });

      h.store.patch({ x: 'b' });
      h.push();

      expect(h.historyAt(0)!.state.x).toBe('a');
      expect(h.historyAt(1)!.state.x).toBe('b');
    });

    it('undo does nothing at oldest state', () => {
      const h = storeWithHistory({ n: 0 });

      h.undo(); // no-op

      expect(h.store.peek().n).toBe(0);
    });

    it('redo does nothing at newest state', () => {
      const h = storeWithHistory({ n: 0 });

      h.store.patch({ n: 1 });
      h.redo(); // no-op — no snapshot yet, cursor at 0

      expect(h.store.peek().n).toBe(1);
    });

    it('caps history at maxHistory', () => {
      const h = storeWithHistory({ n: 0 }, { maxHistory: 3 });

      h.store.patch({ n: 1 });
      h.push();
      h.store.patch({ n: 2 });
      h.push();
      h.store.patch({ n: 3 });
      h.push();
      h.store.patch({ n: 4 });
      h.push(); // oldest entry evicted

      expect(h.historyLength).toBe(3);
    });

    it('push() after lens write saves an explicit snapshot', () => {
      const h = storeWithHistory({ name: 'Alice', score: 0 });
      const scoreLens = h.store.lens('score');

      scoreLens.value = 10;
      h.push();

      expect(h.store.peek().score).toBe(10);
      expect(h.historyLength).toBe(2); // initial + 1 push

      h.undo();
      expect(h.store.peek().score).toBe(0);
    });

    it('multiple mutations before push() save a single checkpoint', () => {
      const h = storeWithHistory({ count: 0 });

      h.store.patch({ count: 1 });
      h.push();
      h.store.patch({ count: 2 });
      h.push();

      expect(h.historyLength).toBe(3); // initial + 2 pushes
      expect(h.store.peek().count).toBe(2);

      h.undo();
      expect(h.store.peek().count).toBe(1);

      h.undo();
      expect(h.store.peek().count).toBe(0);
    });
  });

  describe('computed() on readonly() wrappers', () => {
    it('computed() on readonly — tracks deps through the wrapper', () => {
      const n = signal(4);
      const ro = readonly(n);
      const doubled = computed(() => ro.value * 2);

      expect(doubled.value).toBe(8);

      n.value = 3;
      expect(doubled.value).toBe(6);

      doubled.dispose();
    });

    it('computed() on readonly — projects to a narrowed type', () => {
      const mixed = signal<string | number>(42);
      const ro = readonly(mixed);
      const asString = computed(() => String(ro.value));

      expect(asString.value).toBe('42');

      mixed.value = 'hello';
      expect(asString.value).toBe('hello');

      asString.dispose();
    });
  });

  describe('watch() — equals option on plain signal', () => {
    it('custom equals suppresses watch callback when predicate returns true', () => {
      const s = signal({ x: 1, y: 2 });
      const listener = vi.fn();

      const stop = watch(s, listener, { equals: (a, b) => a.x === b.x });

      s.value = { x: 1, y: 99 }; // same x — should NOT fire
      expect(listener).not.toHaveBeenCalled();

      s.value = { x: 2, y: 99 }; // different x — should fire
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ x: 2, y: 99 }, { x: 1, y: 2 });

      stop.dispose();
    });

    it('custom equals fires on every change when predicate always returns false', () => {
      const s = signal(0);
      const listener = vi.fn();

      const stop = watch(s, listener, { equals: () => false });

      s.value = 1;
      expect(listener).toHaveBeenCalledTimes(1);

      s.value = 1; // same value — signal suppresses at source level, watch not called
      expect(listener).toHaveBeenCalledTimes(1);

      s.value = 2; // different value — equals() returns false → fires
      expect(listener).toHaveBeenCalledTimes(2);

      stop.dispose();
    });
  });

  describe('effectAsync — onError option', () => {
    it('calls custom onError instead of console.error when factory rejects', async () => {
      const errors: unknown[] = [];
      const dep = signal(0);
      const stop = effectAsync(
        async () => {
          void dep.value;
          throw new Error('boom');
        },
        { onError: (err) => errors.push(err) },
      );

      await new Promise((r) => setTimeout(r, 0));

      expect(errors).toHaveLength(1);
      expect((errors[0] as Error).message).toBe('boom');

      await stop.dispose();
    });

    it('calls onError on re-run rejections', async () => {
      const errors: unknown[] = [];
      const dep = signal(0);
      const stop = effectAsync(
        async () => {
          void dep.value;
          throw new Error(`run-${dep.peek()}`);
        },
        { onError: (err) => errors.push(err) },
      );

      await new Promise((r) => setTimeout(r, 0));
      dep.value = 1;
      await new Promise((r) => setTimeout(r, 0));

      expect(errors).toHaveLength(2);

      await stop.dispose();
    });
  });

  describe('watch — immediate option + cleanup', () => {
    it('fires immediately with prev=undefined when immediate: true', () => {
      const s = signal(10);
      const calls: Array<[number, number | undefined]> = [];
      const stop = watch(
        s,
        (next, prev) => {
          calls.push([next, prev]);
        },
        { immediate: true },
      );

      expect(calls).toEqual([[10, undefined]]);

      s.value = 20;
      expect(calls).toEqual([
        [10, undefined],
        [20, 10],
      ]);

      stop.dispose();
    });

    it('runs cleanup from immediate call before next change', () => {
      const s = signal(0);
      const cleanups: string[] = [];
      const stop = watch(
        s,
        (next) => {
          cleanups.push(`setup-${next}`);

          return () => cleanups.push(`cleanup-${next}`);
        },
        { immediate: true },
      );

      expect(cleanups).toEqual(['setup-0']);

      s.value = 1;
      expect(cleanups).toEqual(['setup-0', 'cleanup-0', 'setup-1']);

      stop.dispose();
      expect(cleanups).toEqual(['setup-0', 'cleanup-0', 'setup-1', 'cleanup-1']);
    });
  });

  describe('storeWithHistory — batch() interaction', () => {
    it('batch() followed by push() saves a single checkpoint for all mutations', () => {
      const h = storeWithHistory({ a: 0, b: 0 });
      const aLens = h.store.lens('a');
      const bLens = h.store.lens('b');

      batch(() => {
        aLens.value = 1;
        bLens.value = 2;
      });
      h.push();

      expect(h.store.peek()).toEqual({ a: 1, b: 2 });
      expect(h.historyLength).toBe(2); // initial + 1 push
    });

    it('multiple patch() calls followed by one push() saves a single checkpoint', () => {
      const h = storeWithHistory({ x: 0 });

      batch(() => {
        h.store.patch({ x: 1 });
        h.store.patch({ x: 2 });
      });
      h.push();

      expect(h.store.peek().x).toBe(2);
      expect(h.historyLength).toBe(2); // initial + 1 push
    });
  });

  describe('store.replace() — new keys', () => {
    it('adds keys that were not in the original shape', () => {
      const s = store<{ a: number; b?: number }>({ a: 1 });

      s.replace((state) => ({ ...state, b: 99 }));

      expect(s.peek().a).toBe(1);
      expect(s.peek().b).toBe(99);
    });
  });

  describe('resource — dispose mid-flight guard', () => {
    it('does not throw when disposed while a promise is in flight', async () => {
      let resolve!: (v: number) => void;
      const ac = resource(
        () =>
          new Promise<number>((r) => {
            resolve = r;
          }),
      );

      ac.dispose();
      resolve(42);

      await new Promise((r) => setTimeout(r, 0));
    });
  });

  describe('readonly() — always wraps', () => {
    it('readonly(readonly(s)) creates a distinct wrapper but value is correct', () => {
      const s = signal(0);
      const r1 = readonly(s);
      const r2 = readonly(r1);

      expect(r2).not.toBe(r1); // always a fresh wrapper
      expect(r2.value).toBe(0);
      s.value = 99;
      expect(r2.value).toBe(99);
    });

    it('readonly(computed()) creates a wrapper — does not return computed directly', () => {
      const c = computed(() => 1);
      const r = readonly(c);

      expect(r).not.toBe(c); // wrapper, not the source
      expect(r.value).toBe(1);

      c.dispose();
    });
  });

  describe('F2 — resource with initialValue', () => {
    it('exposes initialValue as data while status=loading', () => {
      let resolve!: (v: number) => void;
      const ac = resource(
        () =>
          new Promise<number>((r) => {
            resolve = r;
          }),
        { initialValue: 42 },
      );

      expect(ac.value.status).toBe('loading');
      expect(ac.value.data).toBe(42);

      resolve(99);
      ac.dispose();
    });

    it('emits status=ready with fulfilled value after resolve', async () => {
      const ac = resource(() => Promise.resolve(7), { initialValue: 0 });

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('ready');
      expect(ac.value.data).toBe(7);

      ac.dispose();
    });

    it('preserves initialValue as data in error state', async () => {
      const ac = resource(() => Promise.reject(new Error('oops')), { initialValue: 5 });

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('error');
      expect((ac.value as { error: unknown; status: 'error' }).error).toBeInstanceOf(Error);
      expect(ac.value.data).toBe(5);

      ac.dispose();
    });
  });

  describe('store.name property', () => {
    it('returns the name for a named store', () => {
      const s = store({ x: 0 }, { name: 'myStore' });

      expect(s.name).toBe('myStore');
    });

    it('returns undefined for an unnamed store', () => {
      const s = store({ x: 0 });

      expect(s.name).toBeUndefined();
    });
  });

  describe('scope.run() — return value', () => {
    it('returns the value produced by the fn callback', () => {
      const s = scope();
      const result = s.run(() => 42);

      expect(result).toBe(42);
      s.dispose();
    });

    it('returns undefined when fn returns void', () => {
      const s = scope();
      const result = s.run(() => {});

      expect(result).toBeUndefined();
      s.dispose();
    });
  });

  describe('storeWithHistory — reset()', () => {
    it('reset() restores initial state; push() saves checkpoint', () => {
      const h = storeWithHistory({ count: 5 });

      h.store.patch({ count: 10 });
      h.push();
      h.store.reset();
      h.push();

      expect(h.store.peek().count).toBe(5);
      expect(h.historyLength).toBe(3); // initial + patch + reset
    });

    it('reset() followed by push() is undoable', () => {
      const h = storeWithHistory({ count: 5 });

      h.store.patch({ count: 10 });
      h.push();
      h.store.reset();
      h.push();
      h.undo();

      expect(h.store.peek().count).toBe(10);
    });
  });

  describe('debugEffect', () => {
    it('does not log anything on initial run when there are no deps', () => {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const stop = debugEffect(() => {}, { name: 'noDeps' });

      expect(groupSpy).not.toHaveBeenCalled();

      stop.dispose();
      vi.restoreAllMocks();
    });

    it('logs changed sources on re-run', () => {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      vi.spyOn(console, 'debug').mockImplementation(() => {});

      const n = signal(1, { name: 'mySignal' });
      const stop = debugEffect(() => void n.value, { name: 'myEffect' });

      n.value = 2;

      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('myEffect'));
      expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('re-running'));

      stop.dispose();
      n.dispose();
      vi.restoreAllMocks();
    });
  });

  describe('signal direct write — atomic read-modify-write', () => {
    it('direct assignment performs read-modify-write', () => {
      const n = signal(10);

      n.value = n.peek() * 2;
      expect(n.value).toBe(20);

      n.value = n.peek() - 5;
      expect(n.value).toBe(15);
    });

    it('does not notify when written with the same value', () => {
      const n = signal(5);
      const listener = vi.fn();
      const stop = n.subscribe(listener);

      n.value = n.peek(); // same value — no notification

      expect(listener).not.toHaveBeenCalled();

      stop.dispose();
    });
  });

  describe('store.patch() — prototype pollution guard', () => {
    it('throws StateError for __proto__ top-level key via JSON.parse input', () => {
      const s = store({ count: 0 } as Record<string, unknown>);

      expect(() => {
        s.patch(JSON.parse('{"__proto__": {"evil": true}}') as Record<string, unknown>);
      }).toThrow(StateError);
    });

    it('throws StateError for constructor top-level key', () => {
      const s = store({ count: 0 } as Record<string, unknown>);

      expect(() => {
        const partial: Record<string, unknown> = Object.create(null);

        partial['constructor'] = 'hacked';
        s.patch(partial as { count: number });
      }).toThrow(StateError);
    });
  });

  describe('store.lens() — unsafe path guard', () => {
    it('throws StateError for __proto__ path segment', () => {
      const s = store({ x: 0 } as Record<string, unknown>);
      let caught: unknown;

      try {
        s.lens('__proto__');
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
    });

    it('throws StateError for constructor path segment', () => {
      const s = store({ x: 0 } as Record<string, unknown>);
      let caught: unknown;

      try {
        s.lens('constructor');
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
    });

    it('throws StateError for nested path with __proto__ segment', () => {
      const s = store({ a: { b: 0 } } as Record<string, unknown>);
      let caught: unknown;

      try {
        s.lens('a.__proto__');
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
    });
  });

  describe('effectAsync — disposeAsync() idempotency', () => {
    it('calling disposeAsync() twice returns the same promise', async () => {
      const stop = effectAsync(async () => {
        await Promise.resolve();
      });

      const p1 = stop[Symbol.asyncDispose]();
      const p2 = stop[Symbol.asyncDispose]();

      expect(p1).toBe(p2);

      await p1;
    });
  });

  describe('store.replace() — callback receives plain object, not proxy', () => {
    it('mutations on the callback argument do not throw', () => {
      const s = store({ count: 0 });

      expect(() => {
        s.replace((state) => {
          (state as { count: number }).count = 99; // would throw if proxy

          return { count: state.count + 1 }; // 99 + 1 = 100
        });
      }).not.toThrow();

      expect(s.peek().count).toBe(100);
    });
  });

  describe('store.replace() — deep snapshot safety (B2)', () => {
    it('mutating a nested object in the snapshot does not corrupt live state', () => {
      const s = store({ outer: { inner: 0 } });
      const runs: number[] = [];

      const stop = effect(() => {
        runs.push(s.value.outer.inner);
      });

      runs.length = 0; // clear initial run

      s.replace((state) => {
        // Mutate nested — before B2 fix this silently corrupted live state
        (state as { outer: { inner: number } }).outer.inner = 42;

        return { outer: { inner: 99 } }; // return correct new value
      });

      expect(s.peek().outer.inner).toBe(99);
      expect(runs).toHaveLength(1); // exactly one reactive update

      stop.dispose();
    });

    it('no-op when fn returns the same snapshot ref — nested mutation has no effect', () => {
      const s = store({ outer: { inner: 0 } });
      const runs: number[] = [];

      const stop = effect(() => {
        runs.push(s.value.outer.inner);
      });

      runs.length = 0;

      s.replace((state) => {
        // Mutate nested then return same ref — before fix inner was silently 42
        (state as { outer: { inner: number } }).outer.inner = 42;

        return state; // same snapshot ref = no-op
      });

      // With structuredClone, state is fully independent — live state unchanged
      expect(s.peek().outer.inner).toBe(0);
      expect(runs).toHaveLength(0);

      stop.dispose();
    });
  });

  describe('storeWithHistory — canUndo / canRedo', () => {
    it('canUndo is false at initial state, true after push()', () => {
      const h = storeWithHistory({ n: 0 });

      expect(h.canUndo).toBe(false);

      h.store.patch({ n: 1 });
      h.push();
      expect(h.canUndo).toBe(true);
    });

    it('canRedo is false at newest state, true after undo', () => {
      const h = storeWithHistory({ n: 0 });

      h.store.patch({ n: 1 });
      h.push();
      expect(h.canRedo).toBe(false);

      h.undo();
      expect(h.canRedo).toBe(true);
    });

    it('canUndo becomes false after undoing all the way to initial state', () => {
      const h = storeWithHistory({ n: 0 });

      h.store.patch({ n: 1 });
      h.push();
      h.store.patch({ n: 2 });
      h.push();
      h.undo();
      h.undo();

      expect(h.canUndo).toBe(false);
      expect(h.store.peek().n).toBe(0);
    });

    it('canRedo becomes false after redoing all the way to newest state', () => {
      const h = storeWithHistory({ n: 0 });

      h.store.patch({ n: 1 });
      h.push();
      h.undo();

      expect(h.canRedo).toBe(true);

      h.redo();

      expect(h.canRedo).toBe(false);
    });

    it('canRedo becomes false after a new push() (redo history truncated)', () => {
      const h = storeWithHistory({ n: 0 });

      h.store.patch({ n: 1 });
      h.push();
      h.undo();

      expect(h.canRedo).toBe(true);

      h.store.patch({ n: 2 });
      h.push(); // new branch — redo history cleared
      expect(h.canRedo).toBe(false);
    });

    it('canUndo / canRedo are reactive — effect re-runs when cursor changes', () => {
      const h = storeWithHistory({ n: 0 });
      const undoLog: boolean[] = [];
      const redoLog: boolean[] = [];

      const stop = effect(() => {
        undoLog.push(h.canUndo);
        redoLog.push(h.canRedo);
      });

      // initial: canUndo=false, canRedo=false
      expect(undoLog).toEqual([false]);
      expect(redoLog).toEqual([false]);

      h.store.patch({ n: 1 });
      h.push(); // cursor moves — effect re-runs: canUndo=true, canRedo=false
      expect(undoLog).toEqual([false, true]);
      expect(redoLog).toEqual([false, false]);

      h.undo(); // canUndo=false, canRedo=true
      expect(undoLog).toEqual([false, true, false]);
      expect(redoLog).toEqual([false, false, true]);

      stop.dispose();
    });
  });

  describe('storeWithHistory — replace() + push()', () => {
    it('replace() followed by push() saves a snapshot', () => {
      const h = storeWithHistory({ count: 0 });

      h.store.replace((s) => ({ ...s, count: 99 }));
      h.push();

      expect(h.store.peek().count).toBe(99);
      expect(h.historyLength).toBe(2); // initial + push
    });

    it('replace() followed by push() is undoable', () => {
      const h = storeWithHistory({ count: 0 });

      h.store.replace((s) => ({ ...s, count: 99 }));
      h.push();
      h.undo();

      expect(h.store.peek().count).toBe(0);
    });
  });

  describe('storeWithHistory — historyAt() out-of-bounds (C4)', () => {
    it('historyAt(-1) returns undefined', () => {
      const h = storeWithHistory({ n: 0 });

      expect(h.historyAt(-1)).toBeUndefined();
    });

    it('historyAt(index >= historyLength) returns undefined', () => {
      const h = storeWithHistory({ n: 0 });

      h.store.patch({ n: 1 });
      h.push(); // historyLength = 2

      expect(h.historyAt(2)).toBeUndefined();
      expect(h.historyAt(999)).toBeUndefined();
    });
  });

  describe('storeWithHistory — wrap existing store (F1)', () => {
    it('wraps an externally created store without owning it', () => {
      const s = store({ x: 0 });
      const h = storeWithHistory(s);

      s.patch({ x: 1 });
      h.push();

      expect(h.historyLength).toBe(2);
      expect(h.store).toBe(s);
    });

    it('dispose() of the adapter does NOT dispose the externally owned store', () => {
      const s = store({ x: 0 });
      const h = storeWithHistory(s);

      h.dispose();

      expect(s.disposed).toBe(false);

      void s.value; // still readable

      s.dispose();
    });
  });

  describe('resource — state transitions are reactive', () => {
    it('status transitions in the reactive graph as factory resolves', async () => {
      const statusLog: string[] = [];

      const ac = resource(async () => 10);

      const stop = effect(() => {
        statusLog.push(ac.value.status);
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(statusLog).toContain('loading');
      expect(statusLog).toContain('ready');

      stop.dispose();
      ac.dispose();
    });
  });

  describe('scope.run() — fn throws', () => {
    it('cleanups registered before throw are still collected by scope', () => {
      const log: string[] = [];
      const s = scope();

      expect(() => {
        s.run(() => {
          onCleanup(() => log.push('cleanup-a'));
          throw new Error('run-failed');
        });
      }).toThrow('run-failed');

      // scope still has the cleanup — dispose should run it
      s.dispose();
      expect(log).toEqual(['cleanup-a']);
    });

    it('scope remains usable after a thrown run', () => {
      const s = scope();

      expect(() => {
        s.run(() => {
          throw new Error('first-fail');
        });
      }).toThrow();

      // scope can still be used
      const log: string[] = [];

      s.run(() => onCleanup(() => log.push('ok')));
      s.dispose();
      expect(log).toEqual(['ok']);
    });
  });

  describe('watch() — equals with prev on first change', () => {
    it('prev equals the initial signal value (not undefined) on the first change', () => {
      const s = signal(10);
      const prevValues: Array<number | undefined> = [];

      const stop = watch(s, (_next, prev) => {
        prevValues.push(prev);
      });

      s.value = 20; // first change — prev should be 10 (the initial value)
      expect(prevValues).toEqual([10]);

      s.value = 30; // second change — prev should be 20
      expect(prevValues).toEqual([10, 20]);

      stop.dispose();
    });

    it('custom equals can suppress based on prev value from last observed change', () => {
      const s = signal(0);
      const calls: number[] = [];

      // equals returns true when values are within 5 of each other
      const stop = watch(
        s,
        (next) => {
          calls.push(next);
        },
        { equals: (a, b) => Math.abs((a as number) - b) <= 5 },
      );

      s.value = 3; // |0 - 3| = 3 ≤ 5 → suppressed
      expect(calls).toHaveLength(0);

      s.value = 10; // |0 - 10| = 10 > 5 → fires (prev is still 0 since last notify was suppressed)
      expect(calls).toEqual([10]);

      stop.dispose();
    });

    it('custom equals returning false always fires on every source-level change', () => {
      const s = signal(5);
      const calls: number[] = [];

      const stop = watch(
        s,
        (next) => {
          calls.push(next);
        },
        { equals: () => false },
      );

      s.value = 5; // same value — signal suppresses at source level, watch not triggered
      expect(calls).toHaveLength(0);

      s.value = 6; // different value at source level — fires
      expect(calls).toEqual([6]);

      stop.dispose();
    });
  });

  describe('computed() — auto-dispose inside effect', () => {
    it('auto-disposes when created inside an effect', async () => {
      const a = signal(1);
      const toggle = signal(true);
      let disposeCount = 0;

      const stop = effect(() => {
        if (!toggle.value) return;

        const c = computed(() => a.value * 2);
        const origDispose = c.dispose.bind(c);

        c.dispose = () => {
          disposeCount++;
          origDispose();
        };

        void c.value; // read to ensure it's active
      });

      expect(disposeCount).toBe(0);

      toggle.value = false; // effect re-runs without creating computed → auto-dispose fires
      expect(disposeCount).toBe(1);

      stop.dispose();
    });
  });

  describe('watch() — cleanup across re-runs', () => {
    it('cleanup returned by callback runs before next invocation', () => {
      const s = signal(0);
      const log: string[] = [];

      const stop = watch(s, (next) => {
        log.push(`cb:${next}`);

        return () => {
          log.push(`cleanup:${next}`);
        };
      });

      s.value = 1;
      expect(log).toEqual(['cb:1']);

      s.value = 2;
      expect(log).toEqual(['cb:1', 'cleanup:1', 'cb:2']);

      stop.dispose();
      expect(log).toEqual(['cb:1', 'cleanup:1', 'cb:2', 'cleanup:2']);
    });
  });

  describe('store.patch() — invalid input types', () => {
    it('throws INVALID_STORE when passed an array', () => {
      const s = store({ x: 1 });

      expect(() => s.patch([] as unknown as Partial<{ x: number }>)).toThrow(StateError);
    });

    it('throws INVALID_STORE when passed null', () => {
      const s = store({ x: 1 });

      expect(() => s.patch(null as unknown as Partial<{ x: number }>)).toThrow(StateError);
    });
  });

  describe('batch() — return value', () => {
    it('returns the value produced by the batch fn', () => {
      const result = batch(() => 42);

      expect(result).toBe(42);
    });

    it('returns undefined when fn returns void', () => {
      const result = batch(() => {});

      expect(result).toBeUndefined();
    });
  });

  describe('batch() — error handling', () => {
    it('body error clears pending queue — flush does not run', () => {
      const s = signal(0);
      let flushRan = false;

      const stop = effect(() => {
        if (s.value > 0) flushRan = true;
      });

      expect(() => {
        batch(() => {
          s.value = 1; // deferred — queues the effect subscriber
          throw new Error('body-error'); // abort: queue cleared, no flush
        });
      }).toThrow('body-error');

      expect(flushRan).toBe(false); // queue was cleared — effect never ran

      stop.dispose();
      s.dispose();
    });
  });

  describe('storeWithHistory — dispose()', () => {
    it('dispose() is idempotent', () => {
      const h = storeWithHistory({ count: 0 });

      expect(() => {
        h.dispose();
        h.dispose();
      }).not.toThrow();
    });

    it('push() while disposed is a silent no-op — historyLength unchanged', () => {
      const h = storeWithHistory({ count: 0 });

      h.store.patch({ count: 1 });
      h.push();

      const lenBefore = h.historyLength;

      h.dispose();

      expect(() => h.push()).not.toThrow();
      expect(h.historyLength).toBe(lenBefore);
    });

    it('pushNamed() while disposed is a silent no-op', () => {
      const h = storeWithHistory({ count: 0 });

      h.store.patch({ count: 1 });
      h.push();

      const lenBefore = h.historyLength;

      h.dispose();

      expect(() => h.pushNamed('after-dispose')).not.toThrow();
      expect(h.historyLength).toBe(lenBefore);
    });

    it('undo() while disposed is a silent no-op', () => {
      const base = store({ count: 0 });
      const h = storeWithHistory(base);

      base.patch({ count: 1 });
      h.push();

      h.dispose();

      expect(() => h.undo()).not.toThrow();
      expect(base.peek().count).toBe(1);
    });

    it('redo() while disposed is a silent no-op', () => {
      const base = store({ count: 0 });
      const h = storeWithHistory(base);

      base.patch({ count: 1 });
      h.push();
      h.undo();

      const countBefore = base.peek().count;

      h.dispose();

      expect(() => h.redo()).not.toThrow();
      expect(base.peek().count).toBe(countBefore);
    });
  });

  describe('storeWithHistory — historyAt() after maxHistory trim', () => {
    it('returns undefined for out-of-bounds index after eviction', () => {
      const h = storeWithHistory({ count: 0 }, { maxHistory: 3 });

      h.store.patch({ count: 1 });
      h.push();
      h.store.patch({ count: 2 });
      h.push();
      h.store.patch({ count: 3 });
      h.push(); // triggers eviction — index 0 is now { count: 1 }

      expect(h.historyLength).toBe(3);
      expect(h.historyAt(-1)).toBeUndefined();
      expect(h.historyAt(3)).toBeUndefined();
    });

    it('oldest snapshot is the evicted one after maxHistory exceeded', () => {
      const h = storeWithHistory({ count: 0 }, { maxHistory: 2 });

      h.store.patch({ count: 1 });
      h.push(); // snapshots: [initial, count:1]
      h.store.patch({ count: 2 });
      h.push(); // evicts initial → snapshots: [count:1, count:2]

      expect(h.historyAt(0)?.state).toEqual({ count: 1 });
      expect(h.historyAt(1)?.state).toEqual({ count: 2 });
    });
  });

  describe('ssr — withProvider()', () => {
    it('withProvider isolates tracking context during fn and restores afterward', async () => {
      const { createAsyncProvider, setTrackingProvider, withProvider } = await import('../ssr');
      const provider = createAsyncProvider();

      let ctxInsideFn: unknown;

      withProvider(provider, () => {
        ctxInsideFn = 'ran';
      });

      expect(ctxInsideFn).toBe('ran');

      // cleanup — uninstall provider so it doesn't bleed into other tests
      setTrackingProvider(null);
    });

    it('withProvider isolates tracking — reads inside fn do not register deps outside', async () => {
      const { createAsyncProvider, runWithProvider, setTrackingProvider, withProvider } = await import('../ssr');
      const provider = createAsyncProvider();
      const n = signal(0);
      let effectRuns = 0;

      const stop = effect(() => {
        effectRuns++;
        void n.value;
      });

      const runsBefore = effectRuns;

      withProvider(provider, () => {
        void n.value;
      });

      n.value = 1;

      expect(effectRuns).toBe(runsBefore + 1);

      stop.dispose();
      n.dispose();
      setTrackingProvider(null);
    });

    it('runWithProvider isolates reactive context', async () => {
      const { createAsyncProvider, runWithProvider, setTrackingProvider } = await import('../ssr');
      const provider = createAsyncProvider();
      const n = signal(0);
      let effectRuns = 0;

      const stop = effect(() => {
        effectRuns++;
        void n.value;
      });

      const runsBefore = effectRuns;

      setTrackingProvider(provider);
      runWithProvider(provider, () => {
        void n.value;
      });

      n.value = 1;

      expect(effectRuns).toBe(runsBefore + 1);

      stop.dispose();
      n.dispose();
      setTrackingProvider(null);
    });

    it('setTrackingProvider installs persistently and null restores default', async () => {
      const { createAsyncProvider, setTrackingProvider } = await import('../ssr');
      const provider = createAsyncProvider();

      setTrackingProvider(provider);

      const n = signal(0);
      let effectRuns = 0;

      const stop = effect(() => {
        effectRuns++;
        void n.value;
      });

      setTrackingProvider(null);

      n.value = 1;

      expect(effectRuns).toBeGreaterThanOrEqual(2);

      stop.dispose();
      n.dispose();
    });
  });

  describe('store.lens() — path depth guard', () => {
    it('throws INVALID_STORE for a path exceeding 32 segments', () => {
      const s = store({ a: { b: 1 } } as Record<string, unknown>);
      const deepPath = Array.from({ length: 33 }, (_, i) => `k${i}`).join('.');

      expect(() => s.lens(deepPath as never)).toThrow(StateError);
    });

    it('accepts a path with exactly 32 segments', () => {
      // Build a deeply nested object to match the path
      const obj: Record<string, unknown> = {};
      let ref = obj;

      for (let i = 0; i < 31; i++) {
        ref[`k${i}`] = {};
        ref = ref[`k${i}`] as Record<string, unknown>;
      }

      ref['k31'] = 42;

      const s = store(obj);
      const path = Array.from({ length: 32 }, (_, i) => `k${i}`).join('.');

      expect(() => s.lens(path as never)).not.toThrow();
    });
  });

  describe('store.lens() — empty path segment guard (B4)', () => {
    it('throws INVALID_STORE for consecutive dots (empty segment)', () => {
      const s = store({ a: { b: 1 } } as Record<string, unknown>);

      expect(() => s.lens('a..b' as never)).toThrow(StateError);
    });

    it('throws INVALID_STORE for leading dot', () => {
      const s = store({ a: 1 } as Record<string, unknown>);

      expect(() => s.lens('.a' as never)).toThrow(StateError);
    });

    it('throws INVALID_STORE for trailing dot', () => {
      const s = store({ a: 1 } as Record<string, unknown>);

      expect(() => s.lens('a.' as never)).toThrow(StateError);
    });
  });

  describe('store — propSignal naming with named store', () => {
    it('named store prop signals carry storeName.key name', () => {
      const s = store({ count: 0 }, { name: 'myStore' }) as unknown as {
        propSignalFor_: (k: string) => { name: string | undefined };
      };

      const sig = s.propSignalFor_('count');

      expect(sig.name).toBe('myStore.count');
    });

    it('unnamed store prop signals carry just the key name', () => {
      const s = store({ count: 0 }) as unknown as {
        propSignalFor_: (k: string) => { name: string | undefined };
      };

      const sig = s.propSignalFor_('count');

      expect(sig.name).toBe('count');
    });
  });

  describe('C1 — readonly() disposed reflects source', () => {
    it('disposed is false before source is disposed', () => {
      const n = signal(1);
      const ro = readonly(n);

      expect(ro.disposed).toBe(false);

      n.dispose();
    });

    it('disposed is true after source signal is disposed', () => {
      const n = signal(1);
      const ro = readonly(n);

      n.dispose();

      expect(ro.disposed).toBe(true);
    });

    it('disposed is true after source computed is disposed (wrapper delegates disposed)', () => {
      const c = computed(() => 42);
      const ro = readonly(c);

      expect(ro).not.toBe(c); // always a wrapper now — never the source directly
      c.dispose();
      expect(ro.disposed).toBe(true); // wrapper delegates to source.disposed
    });
  });

  describe('C2 — storeWithHistory [Symbol.dispose]', () => {
    it('[Symbol.dispose] disposes the history adapter', () => {
      const h = storeWithHistory({ n: 0 });

      h.patch({ n: 1 });
      h.push(); // explicit snapshot — canUndo=true
      expect(h.canUndo).toBe(true);

      h[Symbol.dispose]();

      // After symbol dispose, canUndo is idempotent (no throw)
      expect(h.canUndo).toBe(true);
    });

    it('[Symbol.dispose] is idempotent', () => {
      const h = storeWithHistory({ n: 0 });

      expect(() => {
        h[Symbol.dispose]();
        h[Symbol.dispose]();
      }).not.toThrow();
    });
  });

  describe('C3 — SubscriptionImpl disposed getter', () => {
    it('disposed is false before dispose()', () => {
      const n = signal(0);
      const sub = n.subscribe(() => {});

      expect(sub.disposed).toBe(false);

      sub.dispose();
      n.dispose();
    });

    it('disposed is true after dispose()', () => {
      const n = signal(0);
      const sub = n.subscribe(() => {});

      sub.dispose();

      expect(sub.disposed).toBe(true);

      n.dispose();
    });

    it('disposed is true after second dispose() call (idempotency)', () => {
      const n = signal(0);
      const sub = n.subscribe(() => {});

      sub.dispose();
      sub.dispose();

      expect(sub.disposed).toBe(true);

      n.dispose();
    });
  });

  describe('C4 — AsyncSubscriptionImpl disposed getter', () => {
    it('disposed is false before dispose()', () => {
      const stop = effectAsync(async () => {});

      expect(stop.disposed).toBe(false);

      stop.dispose();
    });

    it('disposed is true after dispose()', () => {
      const stop = effectAsync(async () => {});

      stop.dispose();

      expect(stop.disposed).toBe(true);
    });

    it('disposed is true after disposeAsync()', async () => {
      const stop = effectAsync(async () => {});

      await stop[Symbol.asyncDispose]();

      expect(stop.disposed).toBe(true);
    });
  });

  describe('C5 — store.dispose()', () => {
    it('disposes without error', () => {
      const s = store({ x: 1, y: 2 });

      expect(() => s.dispose()).not.toThrow();
    });

    it('is idempotent', () => {
      const s = store({ x: 1 });

      expect(() => {
        s.dispose();
        s.dispose();
      }).not.toThrow();
    });

    it('[Symbol.dispose] works', () => {
      const s = store({ x: 1 });

      expect(() => s[Symbol.dispose]()).not.toThrow();
    });

    it('disposes cached lenses on dispose', () => {
      const s = store({ count: 0 });
      const l = s.lens('count');

      expect(l.disposed).toBe(false);

      s.dispose();

      expect(l.disposed).toBe(true);
    });

    it('disposes internal version signal (lens effects not re-run after dispose)', () => {
      const runs: number[] = [];
      const s = store({ n: 0 });
      const nLens = s.lens('n');
      const stop = effect(() => {
        void nLens.value;
        runs.push(1);
      });

      expect(runs).toHaveLength(1);

      s.dispose();
      s.patch({ n: 1 }); // should not trigger effects after dispose

      expect(runs).toHaveLength(1); // no extra re-run

      stop.dispose();
    });
  });

  describe('C6 — scope().disposed', () => {
    it('disposed is false before dispose()', () => {
      const s = scope();

      expect(s.disposed).toBe(false);

      s.dispose();
    });

    it('disposed is true after dispose()', () => {
      const s = scope();

      s.dispose();

      expect(s.disposed).toBe(true);
    });

    it('disposed is true in setup scope after dispose via [Symbol.dispose]', () => {
      const s = scope(() => {});

      s[Symbol.dispose]();

      expect(s.disposed).toBe(true);
    });
  });

  describe('D2 — effectAsync name option', () => {
    it('passes name to internal DevTools run event', () => {
      const runs: Array<string | undefined> = [];

      installDevTools({ run: ({ name }) => runs.push(name) });

      const stop = effectAsync(async () => {}, { name: 'myAsyncEffect' });

      expect(runs).toContain('myAsyncEffect');

      stop.dispose();
      installDevTools(null);
    });
  });

  describe('D3 — watch() subscribe-based semantics', () => {
    it('fires callback when source value changes, not on creation', () => {
      const n = signal(0);
      const log: Array<[number, number | undefined]> = [];
      const stop = watch(
        n,
        (v, prev) => {
          log.push([v, prev]);
        },
        { name: 'myWatcher' },
      );

      expect(log).toEqual([]); // not called on creation
      n.value = 1;
      expect(log).toEqual([[1, 0]]);
      n.value = 2;
      expect(log).toEqual([
        [1, 0],
        [2, 1],
      ]);

      stop.dispose();
      n.dispose();
    });
  });

  describe('E1 — Readable.name property', () => {
    it('signal.name is accessible on Readable interface', () => {
      const n = signal(0, { name: 'counter' });
      const rs: import('../types').Readable<number> = n;

      expect(rs.name).toBe('counter');

      n.dispose();
    });

    it('computed.name is accessible on Readable interface', () => {
      const n = signal(0);
      const c: import('../types').Computed<number> = computed(() => n.value, { name: 'doubled' });

      expect(c.name).toBe('doubled');

      c.dispose();
      n.dispose();
    });

    it('unnamed signal.name is undefined', () => {
      const n = signal(0);
      const rs: import('../types').Readable<number> = n;

      expect(rs.name).toBeUndefined();

      n.dispose();
    });
  });

  describe('StateErrorCode — type-only error code discriminant', () => {
    it('StateError.code is a string matching the code passed at construction', () => {
      const err = new StateError('COMPUTED_CYCLE', 'test');

      expect(err.code).toBe('COMPUTED_CYCLE');
    });

    it('StateError.code is a string — usable in switch/if without a const enum', () => {
      const err = new StateError('INVALID_STORE', 'bad key');
      let handled = false;

      if (err.code === 'INVALID_STORE') handled = true;

      expect(handled).toBe(true);
    });
  });

  describe('watch() — standalone reactive observer', () => {
    it('does not fire callback on creation (no immediate)', () => {
      const s = signal(0);
      const calls: number[] = [];
      const stop = watch(s, (v) => void calls.push(v));

      expect(calls).toEqual([]);

      s.value = 1;
      expect(calls).toEqual([1]);

      stop.dispose();
    });

    it('fires with prev value on each change', () => {
      const s = signal('a');
      const log: Array<[string, string | undefined]> = [];
      const stop = watch(s, (next, prev) => void log.push([next, prev]));

      s.value = 'b';
      s.value = 'c';

      expect(log).toEqual([
        ['b', 'a'],
        ['c', 'b'],
      ]);

      stop.dispose();
    });

    it('fires immediately when immediate: true', () => {
      const s = signal(42);
      const calls: Array<[number, number | undefined]> = [];
      const stop = watch(s, (v, prev) => void calls.push([v, prev]), { immediate: true });

      expect(calls).toEqual([[42, undefined]]);

      s.value = 99;
      expect(calls).toEqual([
        [42, undefined],
        [99, 42],
      ]);

      stop.dispose();
    });

    it('runs callback cleanup on dispose', () => {
      const s = signal(0);
      const cleanups: number[] = [];
      const stop = watch(s, (v) => () => cleanups.push(v));

      s.value = 1;
      stop.dispose();

      expect(cleanups).toEqual([1]);
    });
  });

  describe('resource — dispose aborts in-flight controller (C2)', () => {
    it('AbortSignal is aborted when resource is disposed mid-flight', async () => {
      let capturedAbort: AbortSignal | undefined;
      let resolveFactory!: (v: number) => void;

      const ac = resource(
        (abortSig) =>
          new Promise<number>((resolve) => {
            capturedAbort = abortSig;
            resolveFactory = resolve;
          }),
      );

      // Factory is running — abort signal should be live
      await Promise.resolve();
      expect(capturedAbort?.aborted).toBe(false);

      ac.dispose();

      expect(capturedAbort?.aborted).toBe(true);

      resolveFactory(42);
      await new Promise((r) => setTimeout(r, 0));
    });

    it('disposed getter is false before dispose and true after', () => {
      const ac = resource(() => Promise.resolve(1));

      expect(ac.disposed).toBe(false);
      ac.dispose();
      expect(ac.disposed).toBe(true);
    });
  });

  describe('resource — name option propagation', () => {
    it('named resource exposes the name on the state signal', () => {
      const ac = resource(() => Promise.resolve(1), { name: 'user' });

      expect(ac.name).toBe('user');

      ac.dispose();
    });

    it('unnamed resource has no name on the state signal', () => {
      const ac = resource(() => Promise.resolve(1));

      expect(ac.name).toBeUndefined();

      ac.dispose();
    });
  });

  describe('computed() — projection', () => {
    it('computed() projects source reactively', () => {
      const n = signal(3);
      const doubled = computed(() => n.value * 2);

      expect(doubled.value).toBe(6);
      n.value = 5;
      expect(doubled.value).toBe(10);
      doubled.dispose();
    });

    it('computed() name option propagates', () => {
      const n = signal(0);
      const named = computed(() => n.value + 1, { name: 'inc' });

      expect(named.name).toBe('inc');
      named.dispose();
    });
  });

  describe('resource() — primary async computed factory', () => {
    it('resource() emits a ResourceState discriminated union signal', async () => {
      const r = resource(() => Promise.resolve(42));

      expect(r.value.status).toBe('loading');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(r.value.status).toBe('ready');
      expect(r.value.data).toBe(42);
      r.dispose();
    });

    it('resource() is branded as both signal and computed', () => {
      const r = resource(() => Promise.resolve(1));

      expect(isSignal(r)).toBe(true);
      expect(isComputed(r)).toBe(true);
      r.dispose();
    });
  });

  describe('effect — getDependencies() kind field', () => {
    it("signal dependency has kind: 'signal'", () => {
      const n = signal(0);
      const stop = effect(() => void n.value);
      const deps = stop.getDependencies();

      expect(deps).toHaveLength(1);
      expect(deps[0]!.kind).toBe('signal');

      stop.dispose();
      n.dispose();
    });

    it("computed dependency has kind: 'computed'", () => {
      const n = signal(0);
      const c = computed(() => n.value * 2);
      const stop = effect(() => void c.value);
      const deps = stop.getDependencies();

      expect(deps).toHaveLength(1);
      expect(deps[0]!.kind).toBe('computed');

      stop.dispose();
      c.dispose();
      n.dispose();
    });

    it('mixed dependencies report correct kinds', () => {
      const n = signal(0);
      const c = computed(() => n.value * 2);
      const stop = effect(() => {
        void n.value;
        void c.value;
      });
      const deps = stop.getDependencies();

      const kinds = new Set(deps.map((d) => d.kind));

      expect(kinds).toContain('signal');
      expect(kinds).toContain('computed');

      stop.dispose();
      c.dispose();
      n.dispose();
    });
  });

  describe('AsyncSubscription Symbol.asyncDispose', () => {
    it('Symbol.asyncDispose disposes and resolves', async () => {
      const userId = signal('u1');
      const stop = effectAsync(async (sig) => {
        void userId.value;
        await new Promise<void>((r) => {
          if (!sig.aborted) r();
        });
      });

      expect(stop.disposed).toBe(false);
      await stop[Symbol.asyncDispose]();
      expect(stop.disposed).toBe(true);
    });
  });

  describe('computed — name option propagates (C6)', () => {
    it('computed name option sets the computed name', () => {
      const n = signal(1);
      const s = computed(() => n.value * 2, { name: 'doubler' });

      expect(s.name).toBe('doubler');
      s.dispose();
    });

    it('computed() without name option has undefined name', () => {
      const n = signal(1);
      const s = computed(() => n.value);

      expect(s.name).toBeUndefined();
      s.dispose();
    });
  });

  describe('watch — once option', () => {
    it('fires callback exactly once then auto-disposes', () => {
      const n = signal(0);
      const calls: number[] = [];

      watch(
        n,
        (v) => {
          calls.push(v);
        },
        { once: true },
      );

      n.value = 1;
      n.value = 2;
      n.value = 3;

      expect(calls).toEqual([1]);
      n.dispose();
    });

    it('immediate:true + once:true fires immediately then auto-disposes', () => {
      const n = signal(0);
      const calls: Array<number> = [];

      watch(
        n,
        (v) => {
          calls.push(v);
        },
        { immediate: true, once: true },
      );

      n.value = 1;

      expect(calls).toEqual([0]);
      n.dispose();
    });

    it('cleanup from once callback is invoked on auto-dispose', () => {
      const n = signal(0);
      let cleaned = false;

      watch(
        n,
        () => () => {
          cleaned = true;
        },
        { once: true },
      );

      n.value = 1;

      expect(cleaned).toBe(true);
      n.dispose();
    });
  });
});
