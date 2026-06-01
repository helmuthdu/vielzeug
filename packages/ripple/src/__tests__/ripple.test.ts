import {
  asyncComputed,
  asyncScope,
  batch,
  computed,
  effect,
  effectAsync,
  getDevToolsHook,
  getSignalName,
  installDevTools,
  isComputed,
  isSignal,
  isStore,
  onCleanup,
  readonly,
  scope,
  signal,
  StateError,
  store,
  storeWithHistory,
  untrack,
  watch,
} from '../';
import { debugEffect } from '../debug';

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

    it('update applies atomic transforms', () => {
      const count = signal(0);

      count.update((value) => value + 1);
      count.update((value) => value + 5);

      expect(count.value).toBe(6);
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

    it('dispose throws when subscribing after dispose', () => {
      const n = signal(1);

      n.dispose();

      let caught: unknown;

      try {
        n.subscribe(() => {});
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('DISPOSED_READ');
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

    it('throws StateError when read after dispose', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      c.dispose();

      let caught: unknown;

      try {
        void c.value;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('DISPOSED_READ');
    });

    it('throws StateError when subscribing after dispose', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      c.dispose();

      let caught: unknown;

      try {
        c.subscribe(() => {});
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('DISPOSED_READ');
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

  describe('computed — explicit dep array (F5)', () => {
    it('derives a value from an explicit dep array without auto-tracking', () => {
      const a = signal(2);
      const b = signal(3);
      const sum = computed([a, b], (av, bv) => av + bv);

      expect(sum.value).toBe(5);

      a.value = 10;
      expect(sum.value).toBe(13);

      b.value = 7;
      expect(sum.value).toBe(17);

      sum.dispose();
    });

    it('does not re-run when an untracked signal changes', () => {
      const tracked = signal(1);
      const untracked = signal(100);
      const runCount = { n: 0 };
      const c = computed([tracked], (t) => {
        runCount.n++;

        return t + untracked.value; // reads untracked inside, but not in dep list
      });

      void c.value;
      expect(runCount.n).toBe(1);

      untracked.value = 200; // not in dep list → should NOT re-run
      void c.value;
      expect(runCount.n).toBe(1);

      tracked.value = 2; // in dep list → should re-run
      void c.value;
      expect(runCount.n).toBe(2);

      c.dispose();
    });

    it('is branded as computed', () => {
      const a = signal(0);
      const c = computed([a], (v) => v * 2);

      expect(isComputed(c)).toBe(true);
      expect(isSignal(c)).toBe(true);

      c.dispose();
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

      await stop.disposeAsync();
      order.push('after-dispose');

      expect(order).toEqual(['async-done', 'after-dispose']);
    });

    it('disposeAsync returns an AsyncSubscription with correct shape', () => {
      const stop = effectAsync(async () => {});

      expect(typeof stop).toBe('object');
      expect(typeof stop.dispose).toBe('function');
      expect(typeof stop.disposeAsync).toBe('function');
      expect(typeof stop[Symbol.dispose]).toBe('function');

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

    it('supports getter sources', () => {
      const cart = store({ count: 0, label: 'x' });
      const listener = vi.fn();

      const stop = watch(
        () => cart.value.count,
        (next, prev) => {
          listener(next, prev);
        },
      );

      cart.patch({ label: 'y' });
      expect(listener).not.toHaveBeenCalled();

      cart.patch({ count: 2 });
      expect(listener).toHaveBeenCalledWith(2, 0);

      stop.dispose();
      cart.patch({ count: 3 });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not spuriously fire on first run for getter sources returning new references', () => {
      const n = signal(1);
      const listener = vi.fn();

      const stop = watch(() => ({ value: n.value }), listener, { equals: (a, b) => a.value === b.value });

      expect(listener).not.toHaveBeenCalled();

      n.value = 2;
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenLastCalledWith({ value: 2 }, { value: 1 });

      stop.dispose();
    });

    it('does not fire after stop', () => {
      const s = signal({ x: 0, y: 0 });
      const log: number[] = [];

      const stop = watch(
        () => s.value.x,
        (next) => {
          log.push(next);
        },
      );

      s.value = { x: 1, y: 99 };
      stop.dispose();
      s.value = { x: 2, y: 0 };

      expect(log).toEqual([1]);
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

    it('rethrows original function error when flush succeeds', () => {
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

      expect(log).toContain(1);
    });

    it('aggregates function and flush errors together', () => {
      const n = signal(0);

      effect(() => {
        if (n.value === 1) throw new Error('subscriber-boom');
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

      expect(caught).toBeInstanceOf(AggregateError);

      const agg = caught as AggregateError;

      expect(agg.errors[0]).toMatchObject({ message: 'fn-boom' });
      expect(agg.errors[1]).toMatchObject({ message: 'subscriber-boom' });
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

    it('readonly() is recognized by isSignal and isComputed', () => {
      const n = signal(0);

      expect(isSignal(readonly(n))).toBe(true);
      expect(isComputed(readonly(n))).toBe(true);
    });
  });

  describe('store', () => {
    it('supports patch, update, and reset', () => {
      const user = store({ count: 0, profile: { name: 'Ada' } });

      user.patch({ count: 1 });
      user.replace((state) => ({ ...state, count: state.count + 1 }));

      const external = user.value;

      external.profile.name = 'Grace';
      user.reset();

      expect(user.value).toEqual({ count: 0, profile: { name: 'Ada' } });
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

      expect(s.value.count).toBe(5);
      expect(listener).not.toHaveBeenCalled();

      stop.dispose();
    });
  });

  describe('store — value proxy protection (F3)', () => {
    it('throws StateError when attempting to write a top-level property on store.value', () => {
      const s = store({ count: 0, name: 'Ada' });
      const snapshot = s.value;

      let caught: unknown;

      try {
        (snapshot as { count: number }).count = 99;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
      expect(s.value.count).toBe(0);
    });

    it('throws StateError when attempting to delete a property on store.value', () => {
      const s = store<{ count: number; name?: string }>({ count: 0, name: 'Ada' });
      const snapshot = s.value;

      let caught: unknown;

      try {
        delete (snapshot as { name?: string }).name;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
      expect(s.value.name).toBe('Ada');
    });

    it('read access through store.value still works normally', () => {
      const s = store({ x: 1, y: 2 });

      expect(s.value.x).toBe(1);
      expect(s.value.y).toBe(2);
    });

    it('store.peek() also returns the protected proxy', () => {
      const s = store({ count: 0 });
      const peeked = s.peek();

      let caught: unknown;

      try {
        (peeked as { count: number }).count = 42;
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
      expect(s.value.count).toBe(0);
    });
  });

  describe('store.map() and filter()', () => {
    it('map() creates a computed slice from a store', () => {
      const cart = store({ count: 0, label: 'empty' });
      const count = cart.map((s) => s.count);

      expect(count.value).toBe(0);

      cart.patch({ count: 5 });
      expect(count.value).toBe(5);

      count.dispose();
    });

    it('map() suppresses downstream effects when the mapped value is unchanged', () => {
      const cart = store({ count: 0, label: 'empty' });
      const label = cart.map((s) => s.label);
      const listener = vi.fn();

      const unsubscribe = label.subscribe(listener);

      cart.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled();

      cart.patch({ label: 'full' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe.dispose();
      label.dispose();
    });

    it('filter() returns undefined when predicate is false', () => {
      const s = store({ active: false, name: 'test' });
      const activeStore = s.filter((v) => v.active);

      expect(activeStore.value).toBeUndefined();

      s.patch({ active: true });
      expect(activeStore.value).toEqual({ active: true, name: 'test' });

      activeStore.dispose();
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

  describe('effect options — maxIterations and trace', () => {
    it('maxIterations limits the self-cascade loop', () => {
      const n = signal(0);
      let caught: unknown;

      try {
        effect(
          () => {
            if (n.value < 200) n.value++;
          },
          { maxIterations: 5 },
        );
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
          { maxIterations: 3, name: 'myEffect' },
        );
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).message).toContain('myEffect');
    });

    it('trace logs changed sources on re-run without throwing', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

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
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('counter'));

      stop.dispose();
      vi.restoreAllMocks();
    });

    it('trace does not log on the first run', () => {
      const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const n = signal(0);

      const stop = debugEffect(() => {
        void n.value;
      });

      expect(groupSpy).not.toHaveBeenCalled();

      stop.dispose();
      vi.restoreAllMocks();
    });
  });

  describe('batch options — maxIterations', () => {
    it('passes maxIterations to the flush pipeline — does not throw for a normal cascade', () => {
      const n = signal(0);
      const log: number[] = [];
      const stop = effect(() => {
        log.push(n.value);
      });

      expect(() => {
        batch(
          () => {
            n.value = 1;
          },
          { maxIterations: 50 },
        );
      }).not.toThrow();

      expect(log).toContain(1);
      stop.dispose();
    });
  });

  describe('StateError', () => {
    it('is instanceof Error with correct name and code', () => {
      const err = new StateError('COMPUTED_CYCLE', 'test message');

      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(StateError);
      expect(err.name).toBe('StateError');
      expect(err.code).toBe('COMPUTED_CYCLE');
      expect(err.message).toContain('COMPUTED_CYCLE');
      expect(err.message).toContain('test message');
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

      // DISPOSED_READ
      const c = computed(() => 1);

      c.dispose();
      caught = undefined;

      try {
        void c.value;
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).code).toBe('DISPOSED_READ');

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

    it('isolates scope cleanups from enclosing effect cleanups', () => {
      const n = signal(0);
      const scopeLog: number[] = [];
      const effectLog: number[] = [];
      const s = scope();

      const stop = effect(() => {
        void n.value;
        s.run(() => onCleanup(() => scopeLog.push(1)));
        onCleanup(() => effectLog.push(1));
      });

      n.value = 1;
      stop.dispose();

      expect(effectLog).toEqual([1, 1]);
      expect(scopeLog).toEqual([]);

      s.dispose();
      expect(scopeLog).toEqual([1, 1]);
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

  describe('asyncScope (F6)', () => {
    it('creates a scope and awaits async setup before returning it', async () => {
      const log: string[] = [];

      const s = await asyncScope(async () => {
        onCleanup(() => log.push('setup-cleanup')); // sync, before any await
        await Promise.resolve(); // async work after cleanup is registered
      });

      expect(log).toEqual([]);
      s.dispose();
      expect(log).toEqual(['setup-cleanup']);
    });

    it('captures multiple cleanups registered synchronously in setup', async () => {
      const log: string[] = [];

      const s = await asyncScope(async () => {
        onCleanup(() => log.push('first'));
        onCleanup(() => log.push('second'));
        await Promise.resolve();
      });

      s.dispose();
      expect(log).toEqual(['second', 'first']);
    });

    it('dispose is idempotent', async () => {
      const log: number[] = [];
      const s = await asyncScope(async () => {
        onCleanup(() => log.push(1));
      });

      s.dispose();
      s.dispose();
      expect(log).toEqual([1]);
    });

    it('returns a Scope that can run further synchronous work after setup', async () => {
      const log: string[] = [];

      const s = await asyncScope(async () => {
        onCleanup(() => log.push('setup'));
        await Promise.resolve();
      });

      s.run(() => onCleanup(() => log.push('extra')));
      s.dispose();
      expect(log).toEqual(['extra', 'setup']);
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

  describe('map() and filter() combinators', () => {
    it('signal.map() creates a computed from a signal', () => {
      const n = signal(2);
      const doubled = n.map((x) => x * 2);

      expect(doubled.value).toBe(4);
      n.value = 5;
      expect(doubled.value).toBe(10);
      doubled.dispose();
    });

    it('signal.map() chains on computed signals', () => {
      const n = signal(2);
      const doubled = computed(() => n.value * 2);
      const quadrupled = doubled.map((x) => x * 2);

      n.value = 3;
      expect(quadrupled.value).toBe(12);
      quadrupled.dispose();
      doubled.dispose();
    });

    it('map() works on readonly() wrappers', () => {
      const n = signal(10);
      const ro = readonly(n);
      const half = ro.map((x) => x / 2);

      expect(half.value).toBe(5);
      half.dispose();
    });

    it('signal.filter() returns value when predicate is true, undefined otherwise', () => {
      const n = signal(4);
      const evens = n.filter((x) => x % 2 === 0);

      expect(evens.value).toBe(4);

      n.value = 3;
      expect(evens.value).toBeUndefined();

      n.value = 8;
      expect(evens.value).toBe(8);

      evens.dispose();
    });

    it('signal.filter() with type predicate narrows the output type', () => {
      const mixed = signal<number | string>(42);
      const nums = mixed.filter((v): v is number => typeof v === 'number');

      expect(nums.value).toBe(42);

      mixed.value = 'hello';
      expect(nums.value).toBeUndefined();

      nums.dispose();
    });

    it('computed.filter() works the same as signal.filter()', () => {
      const n = signal(2);
      const doubled = computed(() => n.value * 2);
      const bigDoubles = doubled.filter((x) => x > 5);

      expect(bigDoubles.value).toBeUndefined(); // 4 is not > 5

      n.value = 4;
      expect(bigDoubles.value).toBe(8); // 8 > 5

      bigDoubles.dispose();
      doubled.dispose();
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

    it('disposed computed read error includes name when provided', () => {
      const c = computed(() => 1, { name: 'myDisposed' });

      c.dispose();

      let caught: unknown;

      try {
        void c.value;
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).message).toContain('myDisposed');
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
      expect(s.value.name).toBe('Bob');
    });

    it('lens is cached — store.lens("x") === store.lens("x")', () => {
      const s = store({ x: 1, y: 2 });

      expect(s.lens('x')).toBe(s.lens('x'));
    });

    it('lens write propagates via patch — other keys unchanged', () => {
      const s = store({ x: 1, y: 2 });
      const xLens = s.lens('x');

      xLens.value = 99;

      expect(s.value.x).toBe(99);
      expect(s.value.y).toBe(2);
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
      expect(s.value.x).toBe(42);
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

      expect(s.value.user.address.city).toBe('LA');
      expect(s.value.user.name).toBe('Alice'); // sibling preserved
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

  describe('batched signal (F3)', () => {
    it('coalesces multiple synchronous writes into one microtask notification', async () => {
      const n = signal(0, { batched: true });
      const log: number[] = [];
      const stop = effect(() => {
        log.push(n.value);
      });

      // Initial run is synchronous
      expect(log).toEqual([0]);

      n.value = 1;
      n.value = 2;
      n.value = 3;

      // Not yet — batched defers until next microtask
      expect(log).toEqual([0]);

      await Promise.resolve();

      // One notification with the final value
      expect(log).toEqual([0, 3]);

      stop.dispose();
    });

    it('batched signal only notifies once for rapid writes even if value returns to original', async () => {
      const n = signal(5, { batched: true });
      const log: number[] = [];
      const sub = n.subscribe(() => {
        log.push(n.value);
      });

      n.value = 10;
      n.value = 20;
      n.value = 30;

      expect(log).toHaveLength(0); // nothing fired yet

      await Promise.resolve();

      // Exactly one notification, not three
      expect(log).toHaveLength(1);
      expect(log[0]).toBe(30);

      sub.dispose();
    });
  });

  describe('computed fallback (F4)', () => {
    it('returns fallback value when compute throws', () => {
      let shouldThrow = false;
      const n = signal(1);
      const safe = computed(
        () => {
          if (shouldThrow) throw new Error('boom');

          return n.value * 2;
        },
        { fallback: (_err, last) => last ?? -1 },
      );

      expect(safe.value).toBe(2);

      shouldThrow = true;
      n.value = 2; // triggers recompute → throws → fallback called with last=2

      expect(safe.value).toBe(2); // last value preserved

      safe.dispose();
    });

    it('calls fallback with undefined lastValue on first-run failure', () => {
      const safe = computed<number>(
        () => {
          throw new Error('always fails');
        },
        { fallback: (_err, last) => last ?? -1 },
      );

      expect(safe.value).toBe(-1);

      safe.dispose();
    });

    it('without fallback, throws on compute error', () => {
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

  describe('R5 — signal.subscribe throws on disposed signal', () => {
    it('throws StateError with DISPOSED_READ when subscribing after dispose', () => {
      const n = signal(1);

      n.dispose();

      expect(() => n.subscribe(() => {})).toThrow(StateError);
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

  describe('R11 — readonly().dispose() delegates to source', () => {
    it('disposes the underlying computed when readonly is disposed', () => {
      const n = signal(1);
      const doubled = computed(() => n.value * 2);
      const r = readonly(doubled);

      expect(r.value).toBe(2);
      r.dispose();

      // doubled should be disposed too
      expect(() => {
        void doubled.value;
      }).toThrow(StateError);
    });
  });

  describe('F2 — asyncComputed', () => {
    it('starts in pending state', () => {
      let resolvePromise!: () => void;
      const ac = asyncComputed(
        () =>
          new Promise<string>((resolve) => {
            resolvePromise = () => resolve('done');
          }),
      );

      // The effect runs synchronously (before the async factory resolves),
      // so the state is 'pending' right away.
      expect(ac.value.status).toBe('pending');

      resolvePromise();
      ac.dispose();
    });

    it('transitions to resolved after promise resolves', async () => {
      const s = signal('hi');
      const ac = asyncComputed(() => Promise.resolve(s.value.toUpperCase()));

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('fulfilled');
      expect(ac.value.value).toBe('HI');

      ac.dispose();
    });

    it('transitions to rejected on error', async () => {
      const ac = asyncComputed(() => Promise.reject(new Error('oops')));

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('error');
      expect((ac.value as { error: Error; status: 'error' }).error.message).toBe('oops');

      ac.dispose();
    });

    it('re-runs when reactive dependency changes', async () => {
      const n = signal(1);
      const calls: number[] = [];
      const ac = asyncComputed(async () => {
        const v = n.value;

        calls.push(v);

        return v * 2;
      });

      await new Promise((r) => setTimeout(r, 0));

      n.value = 2;

      await new Promise((r) => setTimeout(r, 0));

      expect(calls).toContain(1);
      expect(calls).toContain(2);
      expect(ac.value.value).toBe(4);

      ac.dispose();
    });
  });

  describe('F3 — DevTools hook', () => {
    it('installDevTools sets a global hook', () => {
      const calls: string[] = [];

      installDevTools({ onSignalWrite: (_, name) => calls.push(name ?? '?') });

      const n = signal(0, { name: 'devtest' });

      n.value = 1;
      n.dispose();

      installDevTools(null);

      expect(calls).toContain('devtest');
    });

    it('getDevToolsHook returns null when not installed', () => {
      installDevTools(null);

      expect(getDevToolsHook()).toBeNull();
    });

    it('onEffectRun is called when effect runs', () => {
      const runNames: Array<string | undefined> = [];

      installDevTools({ onEffectRun: (name) => runNames.push(name) });

      const stop = effect(() => {}, { name: 'myEffect' });

      stop.dispose();
      installDevTools(null);

      expect(runNames).toContain('myEffect');
    });

    it('onEffectDispose is called when effect is disposed', () => {
      const disposeNames: Array<string | undefined> = [];

      installDevTools({ onEffectDispose: (name) => disposeNames.push(name) });

      const stop = effect(() => {}, { name: 'myEffect' });

      stop.dispose();
      installDevTools(null);

      expect(disposeNames).toContain('myEffect');
    });
  });

  describe('F4 — custom scheduler function', () => {
    it('defers effects via custom scheduler', () => {
      const n = signal(0);
      const runs: number[] = [];
      const scheduled: Array<() => void> = [];

      const stop = effect(
        () => {
          runs.push(n.value);
        },
        { scheduler: (run) => scheduled.push(run) },
      );

      expect(runs).toEqual([0]); // initial eager run

      n.value = 1;
      n.value = 2;

      // Effects deferred — scheduled array has pending runs
      expect(runs).toEqual([0]);
      expect(scheduled.length).toBeGreaterThan(0);

      // Drain the scheduler
      scheduled.forEach((r) => r());

      expect(runs[runs.length - 1]).toBe(2);

      stop.dispose();
    });
  });

  describe('getSignalName', () => {
    it('returns the name for a named signal', () => {
      const n = signal(0, { name: 'mySignal' });

      expect(getSignalName(n)).toBe('mySignal');
    });

    it('returns the name for a named computed', () => {
      const c = computed(() => 1, { name: 'myComputed' });

      expect(getSignalName(c)).toBe('myComputed');

      c.dispose();
    });

    it('returns undefined for an unnamed signal', () => {
      const n = signal(0);

      expect(getSignalName(n)).toBeUndefined();
    });

    it('returns undefined for an unnamed computed', () => {
      const c = computed(() => 1);

      expect(getSignalName(c)).toBeUndefined();

      c.dispose();
    });
  });

  describe('F5 — storeWithHistory', () => {
    it('records and replays history via undo/redo', () => {
      const h = storeWithHistory({ count: 0 });

      h.patch({ count: 1 });
      h.patch({ count: 2 });

      expect(h.value.count).toBe(2);
      expect(h.historyLength).toBe(3); // initial + 2 patches

      h.undo();

      expect(h.value.count).toBe(1);

      h.redo();

      expect(h.value.count).toBe(2);
    });

    it('historyAt returns snapshot at index', () => {
      const h = storeWithHistory({ x: 'a' });

      h.patch({ x: 'b' });

      expect(h.historyAt(0)!.x).toBe('a');
      expect(h.historyAt(1)!.x).toBe('b');
    });

    it('undo does nothing at oldest state', () => {
      const h = storeWithHistory({ n: 0 });

      h.undo(); // no-op

      expect(h.value.n).toBe(0);
    });

    it('redo does nothing at newest state', () => {
      const h = storeWithHistory({ n: 0 });

      h.patch({ n: 1 });
      h.redo(); // no-op — already at newest

      expect(h.value.n).toBe(1);
    });

    it('caps history at maxHistory', () => {
      const h = storeWithHistory({ n: 0 }, { maxHistory: 3 });

      h.patch({ n: 1 });
      h.patch({ n: 2 });
      h.patch({ n: 3 });
      h.patch({ n: 4 }); // oldest entry evicted

      expect(h.historyLength).toBe(3);
    });

    it('lens writes push a history snapshot', () => {
      const h = storeWithHistory({ name: 'Alice', score: 0 });
      const scoreLens = h.lens('score');

      scoreLens.value = 10;

      expect(h.value.score).toBe(10);
      expect(h.historyLength).toBe(2); // initial + lens write

      h.undo();
      expect(h.value.score).toBe(0);
    });

    it('lens writes are undoable independently from patch writes', () => {
      const h = storeWithHistory({ count: 0 });
      const lens = h.lens('count');

      h.patch({ count: 1 });
      lens.value = 2;

      expect(h.historyLength).toBe(3); // initial + patch + lens
      expect(h.value.count).toBe(2);

      h.undo();
      expect(h.value.count).toBe(1);

      h.undo();
      expect(h.value.count).toBe(0);
    });
  });

  describe('readonly().filter() delegation', () => {
    it('filter() on readonly delegates to source filter — no extra graph node', () => {
      const n = signal(4);
      const ro = readonly(n);
      const evens = ro.filter((x) => x % 2 === 0);

      expect(evens.value).toBe(4);

      n.value = 3;
      expect(evens.value).toBeUndefined();

      n.value = 8;
      expect(evens.value).toBe(8);

      evens.dispose();
    });

    it('filter() on readonly with type predicate narrows correctly', () => {
      const mixed = signal<string | number>(42);
      const ro = readonly(mixed);
      const nums = ro.filter((v): v is number => typeof v === 'number');

      expect(nums.value).toBe(42);

      mixed.value = 'hello';
      expect(nums.value).toBeUndefined();

      nums.dispose();
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
    it('batch() wrapping multiple lens writes still pushes one snapshot per lens write', () => {
      const h = storeWithHistory({ a: 0, b: 0 });
      const aLens = h.lens('a');
      const bLens = h.lens('b');

      batch(() => {
        aLens.value = 1;
        bLens.value = 2;
      });

      expect(h.value).toEqual({ a: 1, b: 2 });
      expect(h.historyLength).toBeGreaterThanOrEqual(2);
    });

    it('batch() wrapping patch() pushes exactly one snapshot', () => {
      const h = storeWithHistory({ x: 0 });

      batch(() => {
        h.patch({ x: 1 });
        h.patch({ x: 2 });
      });

      expect(h.value.x).toBe(2);
      expect(h.historyLength).toBe(3);
    });
  });

  describe('asyncScope — setup throws', () => {
    it('rejects when synchronous setup throws before first await', async () => {
      await expect(
        asyncScope(() => {
          throw new Error('setup-fail');
        }),
      ).rejects.toThrow('setup-fail');
    });
  });

  describe('store.replace() — new keys', () => {
    it('adds keys that were not in the original shape', () => {
      const s = store<{ a: number; b?: number }>({ a: 1 });

      s.replace((state) => ({ ...state, b: 99 }));

      expect(s.value.a).toBe(1);
      expect(s.value.b).toBe(99);
    });
  });

  describe('asyncComputed — dispose mid-flight guard', () => {
    it('does not throw when disposed while a promise is in flight', async () => {
      let resolve!: (v: number) => void;
      const ac = asyncComputed(
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

  describe('readonly() — double-wrap short-circuit', () => {
    it('readonly(readonly(x)) returns the same object reference', () => {
      const s = signal(0);
      const r1 = readonly(s);
      const r2 = readonly(r1);

      expect(r2).toBe(r1);
    });

    it('readonly(computed()) returns the computed directly', () => {
      const c = computed(() => 1);
      const r = readonly(c);

      expect(r).toBe(c);

      c.dispose();
    });
  });

  describe('F2 — asyncComputed with initialValue', () => {
    it('exposes initialValue while pending', () => {
      let resolve!: (v: number) => void;
      const ac = asyncComputed(
        () =>
          new Promise<number>((r) => {
            resolve = r;
          }),
        { initialValue: 42 },
      );

      expect(ac.value.status).toBe('pending');
      expect(ac.value.value).toBe(42);

      resolve(99);
      ac.dispose();
    });

    it('transitions to fulfilled and exposes resolved value', async () => {
      const ac = asyncComputed(() => Promise.resolve(7), { initialValue: 0 });

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('fulfilled');
      expect(ac.value.value).toBe(7);

      ac.dispose();
    });

    it('preserves initialValue in error state when previous state was pending', async () => {
      const ac = asyncComputed(() => Promise.reject(new Error('oops')), { initialValue: 5 });

      await new Promise((r) => setTimeout(r, 0));

      expect(ac.value.status).toBe('error');
      expect(ac.value.value).toBe(5);

      ac.dispose();
    });
  });
});
