import {
  StateError,
  type TrackingProvider,
  batch,
  computed,
  configure,
  createAsyncProvider,
  deepEqual,
  effect,
  effectAsync,
  isComputed,
  isReactive,
  isReactiveArray,
  isSignal,
  isStore,
  onCleanup,
  reactive,
  reactiveArray,
  readonly,
  runWithProvider,
  scope,
  setTrackingProvider,
  shallowEqual,
  signal,
  store,
  tick,
  untrack,
  watch,
  withReactiveContext,
} from '../';

describe('stateit', () => {
  describe('signals', () => {
    it('notifies subscribers when value changes', () => {
      const count = signal(0);
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(count.value);
      });

      count.value = 1;

      expect(seen).toEqual([0, 1]);

      stop();
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

      stop();
    });

    it('dispose makes signal inert — reads return last value, writes are silently ignored', () => {
      const n = signal(42);

      n.dispose();

      n.value = 99; // ignored after dispose
      expect(n.peek()).toBe(42);
    });

    it('dispose stops new subscriptions from receiving notifications', () => {
      const n = signal(1);
      const listener = vi.fn();

      n.dispose();

      const unsub = n.subscribe(listener);

      n.value = 2; // no-op
      expect(listener).not.toHaveBeenCalled();

      unsub();
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

      stop();
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

      stop();
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

      stop();
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

      stop();
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

      stop();
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

      stop();
      parity.dispose();
    });

    it('preserves the original computed error when dependency cleanup also throws', () => {
      const trigger = signal(false);

      let compRef!: ReturnType<typeof computed<number>>;

      // eslint-disable-next-line prefer-const
      compRef = computed<number>(() => {
        void trigger.value;

        if (!trigger.peek()) return 0;

        // Inject a throwing cleanup into subscriptions_ to simulate an unsubscription that throws.
        (compRef as unknown as { subscriptions_: Set<() => void> }).subscriptions_.add(() => {
          throw new Error('cleanup-boom');
        });

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

      expect(caught).toBeInstanceOf(AggregateError);
      expect((caught as AggregateError).errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'computed-boom' }),
          expect.objectContaining({ message: 'cleanup-boom' }),
        ]),
      );
      expect((caught as AggregateError).cause).toMatchObject({ message: 'computed-boom' });

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

      stop();
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

        onCleanup(stopInner);
      });

      b.value = 1;
      expect(innerLog).toEqual([0, 1]);
      expect(outerLog).toEqual([0]);

      a.value = 1;
      expect(outerLog).toEqual([0, 1]);

      const prevInnerLen = innerLog.length;

      b.value = 2;
      expect(innerLog.length).toBe(prevInnerLen + 1);

      stopOuter();
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

      stop();
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

      stop();
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

      stop();
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

      stop();
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

      stop();

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
      stop();
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

      expect(typeof stop).toBe('function');
      expect(typeof stop.dispose).toBe('function');
      expect(typeof stop.disposeAsync).toBe('function');
      expect(typeof stop[Symbol.dispose]).toBe('function');

      stop();
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

      stop();
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

      stop();
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

      stop();
    });

    it('does not fire after stop', () => {
      const s = signal({ x: 0, y: 0 });
      const log: number[] = [];

      const stop = watch(
        () => s.value.x,
        (next) => log.push(next),
      );

      s.value = { x: 1, y: 99 };
      stop();
      s.value = { x: 2, y: 0 };

      expect(log).toEqual([1]);
    });

    it('allows stop to be called multiple times', () => {
      const s = signal(0);
      const stop = watch(s, vi.fn());

      expect(() => {
        stop();
        stop();
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
      const stop = watch(s, (v, p) => calls.push([v, p]), { immediate: true });

      s.value = 2;
      s.value = 3;
      stop();

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

      stop();
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

      stop();
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

      stop();
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

      unsubscribe();
    });

    it('subscribe skips initial emission and only reacts to changes', () => {
      const n = signal(0);
      const listener = vi.fn();

      const unsubscribe = n.subscribe(listener);

      expect(listener).not.toHaveBeenCalled();

      n.value = 1;
      n.value = 2;

      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
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

      unsubscribe();
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

      unsubscribe();
      doubled.dispose();
    });

    it('subscribe returns the Subscription shape', () => {
      const n = signal(0);
      const unsubscribe = n.subscribe(() => {});

      expect(typeof unsubscribe.dispose).toBe('function');
      expect(typeof unsubscribe[Symbol.dispose]).toBe('function');

      unsubscribe.dispose();
    });

    it('readonly returns a read-only view over the same source', () => {
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

    it('readonly() is recognized by isSignal', () => {
      const n = signal(0);

      expect(isSignal(readonly(n))).toBe(true);
    });
  });

  describe('store', () => {
    it('supports patch, update, and reset', () => {
      const user = store({ count: 0, profile: { name: 'Ada' } });

      user.patch({ count: 1 });
      user.update((state) => ({ ...state, count: state.count + 1 }));

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

    it('update throws StateError when the callback returns the same reference (mutation-in-place)', () => {
      const s = store({ count: 0 });

      let caught: unknown;

      try {
        s.update((state) => {
          state.count++; // mutates in place

          return state; // same reference — must throw
        });
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_STORE');
    });
  });

  describe('store.select()', () => {
    it('creates a computed that selects a slice from a store', () => {
      const cart = store({ count: 0, label: 'empty' });
      const count = cart.select((s) => s.count);

      expect(count.value).toBe(0);

      cart.patch({ count: 5 });
      expect(count.value).toBe(5);

      count.dispose();
    });

    it('suppresses downstream effects when the selected value is unchanged', () => {
      const cart = store({ count: 0, label: 'empty' });
      const label = cart.select((s) => s.label);
      const listener = vi.fn();

      const unsubscribe = label.subscribe(listener);

      cart.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled();

      cart.patch({ label: 'full' });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      label.dispose();
    });

    it('supports custom equality on the selected value', () => {
      const data = store({ items: [1, 2, 3] });
      const itemCount = data.select((s) => s.items.length);
      const listener = vi.fn();

      const unsubscribe = itemCount.subscribe(listener);

      data.patch({ items: [4, 5, 6] });
      expect(listener).not.toHaveBeenCalled();

      data.patch({ items: [1, 2] });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      itemCount.dispose();
    });

    it('works with plain signal sources via derive()', () => {
      const n = signal({ x: 0, y: 0 });
      const x = n.derive((s) => s.x);

      expect(x.value).toBe(0);

      n.value = { x: 5, y: 99 };
      expect(x.value).toBe(5);

      x.dispose();
    });
  });

  describe('reactive', () => {
    it('tracks property reads independently', () => {
      const state = reactive({ a: 1, b: 2 });
      const aSeen: number[] = [];
      const bSeen: number[] = [];

      const stopA = effect(() => {
        aSeen.push(state.a);
      });
      const stopB = effect(() => {
        bSeen.push(state.b);
      });

      state.a = 10;
      state.b = 20;

      expect(aSeen).toEqual([1, 10]);
      expect(bSeen).toEqual([2, 20]);

      stopA();
      stopB();
    });

    it('changing one property does not re-run effects subscribed to a different property', () => {
      const state = reactive({ x: 0, y: 0 });
      const xRuns: number[] = [];

      const stop = effect(() => {
        xRuns.push(state.x);
      });

      state.y = 99; // y changed — x effect should NOT re-run

      expect(xRuns).toEqual([0]);

      state.x = 1;
      expect(xRuns).toEqual([0, 1]);

      stop();
    });

    it('handles nested object property tracking', () => {
      const state = reactive({ user: { age: 30, name: 'Alice' } });
      const nameLog: string[] = [];

      const stop = effect(() => {
        nameLog.push(state.user.name);
      });

      state.user.age = 31; // name not changed — effect must NOT re-run
      expect(nameLog).toEqual(['Alice']);

      state.user.name = 'Bob'; // effect re-runs
      expect(nameLog).toEqual(['Alice', 'Bob']);

      stop();
    });

    it('re-runs effects when a nested object is replaced wholesale', () => {
      const state = reactive({ user: { age: 30, name: 'Alice' } });
      const nameLog: string[] = [];

      const stop = effect(() => {
        nameLog.push(state.user.name);
      });

      state.user = { age: 25, name: 'Carol' };
      expect(nameLog).toEqual(['Alice', 'Carol']);

      stop();
    });

    it('initial values are deep-cloned from the source object', () => {
      const src = { count: 0 };
      const state = reactive(src);

      src.count = 99; // mutate original
      expect(state.count).toBe(0); // proxy is independent
    });

    it('isReactive returns true for reactive proxies and false for plain objects', () => {
      const plain = { x: 1 };
      const r = reactive({ x: 1 });

      expect(isReactive(r)).toBe(true);
      expect(isReactive(plain)).toBe(false);
      expect(isReactive(null)).toBe(false);
      expect(isReactive(42)).toBe(false);
    });

    it('throws StateError when called with a non-plain-object', () => {
      let caught: unknown;

      try {
        reactive([] as unknown as object);
      } catch (e) {
        caught = e;
      }

      expect(caught).toBeInstanceOf(StateError);
      expect((caught as StateError).code).toBe('INVALID_REACTIVE');
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

  describe('equality helpers', () => {
    it('shallowEqual compares object properties by reference', () => {
      const arr = [1, 2, 3];

      expect(shallowEqual({ a: 1, b: arr }, { a: 1, b: arr })).toBe(true);
      expect(shallowEqual({ a: 1, b: arr }, { a: 1, b: [1, 2, 3] })).toBe(false);
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('shallowEqual handles primitives and same reference', () => {
      expect(shallowEqual(42, 42)).toBe(true);
      expect(shallowEqual('x', 'x')).toBe(true);
      expect(shallowEqual(null, null)).toBe(true);
      expect(shallowEqual(1, 2)).toBe(false);
    });

    it('deepEqual compares nested structures recursively', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
      expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
    });
  });

  describe('configure', () => {
    afterEach(() => {
      configure({ maxIterations: 100 });
    });

    it('changes the max iterations limit for infinite loop detection', () => {
      configure({ maxIterations: 5 });

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

    it('returns a cleanup function that restores the previous configuration', () => {
      const restore = configure({ maxIterations: 42 });

      expect(typeof restore).toBe('function');
      restore();

      const n = signal(0);

      expect(() => {
        const stop = effect(() => {
          if (n.value < 5) n.value++;
        });

        stop();
      }).not.toThrow();
    });

    it('throws TypeError for invalid maxIterations values', () => {
      expect(() => configure({ maxIterations: 0 })).toThrow(TypeError);
      expect(() => configure({ maxIterations: -1 })).toThrow(TypeError);
      expect(() => configure({ maxIterations: 1.5 })).toThrow(TypeError);
    });

    it('accepts options without maxIterations gracefully', () => {
      expect(() => configure({})).not.toThrow();
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

      // INVALID_REACTIVE
      caught = undefined;

      try {
        reactive([] as unknown as object);
      } catch (e) {
        caught = e;
      }

      expect((caught as StateError).code).toBe('INVALID_REACTIVE');
    });
  });

  describe('setTrackingProvider', () => {
    it('uses the custom provider for tracking and returns the previous provider', () => {
      let stored: unknown = null;

      const customProvider: TrackingProvider = {
        get: () => stored,
        run: (ctx, fn) => {
          const prev = stored;

          stored = ctx;

          try {
            return fn();
          } finally {
            stored = prev;
          }
        },
      };

      const prev = setTrackingProvider(customProvider);

      try {
        const n = signal(0);
        const log: number[] = [];
        const stop = effect(() => {
          log.push(n.value);
        });

        n.value = 1;
        expect(log).toEqual([0, 1]);
        stop();
      } finally {
        setTrackingProvider(prev);
      }
    });
  });

  describe('runWithProvider', () => {
    it('runs fn with the given provider then restores the previous one', () => {
      let stored: unknown = null;

      const provider: TrackingProvider = {
        get: () => stored,
        run: (ctx, fn) => {
          const prev = stored;

          stored = ctx;

          try {
            return fn();
          } finally {
            stored = prev;
          }
        },
      };

      const outerProvider = setTrackingProvider(provider);

      try {
        const log: number[] = [];

        runWithProvider(provider, () => {
          const n = signal(0);

          effect(() => {
            log.push(n.value);
          });
          n.value = 1;
        });
        expect(log).toEqual([0, 1]);
      } finally {
        setTrackingProvider(outerProvider);
      }
    });
  });

  describe('withReactiveContext', () => {
    it('passes the return value through', () => {
      expect(withReactiveContext(() => 42)).toBe(42);
    });

    it('isolates tracking: signal read inside is not tracked by the outer computed', () => {
      const n = signal(0);
      let outerEvals = 0;

      const c = computed(() => {
        outerEvals++;

        return withReactiveContext(() => n.value);
      });

      expect(c.value).toBe(0);
      expect(outerEvals).toBe(1);

      n.value = 1;
      expect(outerEvals).toBe(1);
    });

    it('effects inside the context are independent of any outer context', () => {
      const n = signal(0);
      const log: number[] = [];

      withReactiveContext(() => {
        effect(() => {
          log.push(n.value);
        });
      });

      n.value = 1;
      expect(log).toEqual([0, 1]);
    });
  });

  describe('createAsyncProvider', () => {
    it('creates a working provider from an ALS-like store', () => {
      let stored: unknown = null;

      const fakeAls = {
        getStore: () => stored,
        run: <T>(value: unknown, fn: () => T): T => {
          const prev = stored;

          stored = value;

          try {
            return fn();
          } finally {
            stored = prev;
          }
        },
      };

      const prev = setTrackingProvider(createAsyncProvider(fakeAls));

      try {
        const n = signal(0);
        const log: number[] = [];
        const stop = effect(() => {
          log.push(n.value);
        });

        n.value = 1;
        expect(log).toEqual([0, 1]);
        stop();
      } finally {
        setTrackingProvider(prev);
      }
    });

    it('returns null when the store is empty (getStore returns undefined)', () => {
      const fakeAls = {
        getStore: (): unknown => undefined,
        run: <T>(_value: unknown, fn: () => T): T => fn(),
      };

      const provider = createAsyncProvider(fakeAls);

      expect(provider.get()).toBeNull();
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
      stop();

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

        onCleanup(stopInner);
      });

      b.value = 1;
      expect(innerLog).toEqual([0, 1]);
      expect(outerLog).toEqual([0]);

      a.value = 1;
      expect(outerLog).toEqual([0, 1]);

      const prevInnerLen = innerLog.length;

      b.value = 2;
      expect(innerLog.length).toBe(prevInnerLen + 1);

      stopOuter();
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

      stop();
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
      stop();

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

      stop();
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

      stopB();
      stopA();
    });
  });

  describe('signal.derive()', () => {
    it('creates a computed from a signal', () => {
      const n = signal(2);
      const doubled = n.derive((x) => x * 2);

      expect(doubled.value).toBe(4);
      n.value = 5;
      expect(doubled.value).toBe(10);
      doubled.dispose();
    });

    it('works on computed signals', () => {
      const n = signal(2);
      const doubled = computed(() => n.value * 2);
      const quadrupled = doubled.derive((x) => x * 2);

      n.value = 3;
      expect(quadrupled.value).toBe(12);
      quadrupled.dispose();
      doubled.dispose();
    });

    it('works on readonly() wrappers', () => {
      const n = signal(10);
      const ro = readonly(n);
      const half = ro.derive((x) => x / 2);

      expect(half.value).toBe(5);
      half.dispose();
    });
  });

  describe('tick()', () => {
    it('returns a promise that resolves', async () => {
      await expect(tick()).resolves.toBeUndefined();
    });

    it('allows async effects to start after a signal write', async () => {
      const n = signal(0);
      const log: number[] = [];

      const stop = effectAsync(async (abortSignal) => {
        const val = n.value;

        await Promise.resolve();

        if (!abortSignal.aborted) log.push(val);
      });

      n.value = 1;
      await tick();
      await tick();

      expect(log).toContain(1);
      await stop.disposeAsync();
    });
  });

  describe('reactiveArray()', () => {
    it('tracks length independently', () => {
      const arr = reactiveArray([1, 2, 3]);
      let lengthRuns = 0;

      const stop = effect(() => {
        void arr.length;
        lengthRuns++;
      });

      arr[0] = 99; // no length change
      expect(lengthRuns).toBe(1);

      arr.push(4);
      expect(lengthRuns).toBe(2);

      stop();
    });

    it('tracks individual indices independently', () => {
      const arr = reactiveArray([1, 2, 3]);
      const log: number[] = [];

      const stop = effect(() => {
        log.push(arr[0] as number);
      });

      arr[1] = 99; // different index — should not re-run
      expect(log).toEqual([1]);

      arr[0] = 10;
      expect(log).toEqual([1, 10]);

      stop();
    });

    it('changing one index does not re-run effects subscribed to a different index', () => {
      const arr = reactiveArray([0, 0, 0]);
      let runs = 0;

      const stop = effect(() => {
        void arr[2];
        runs++;
      });

      arr[0] = 1;
      arr[1] = 2;
      expect(runs).toBe(1);

      arr[2] = 3;
      expect(runs).toBe(2);

      stop();
    });

    it('push updates length and new index', () => {
      const arr = reactiveArray<number>([]);

      arr.push(42);

      expect(arr.length).toBe(1);
      expect(arr[0]).toBe(42);
    });

    it('pop updates length and last index', () => {
      const arr = reactiveArray([1, 2, 3]);

      arr.pop();

      expect(arr.length).toBe(2);
      expect(arr[2]).toBeUndefined();
    });

    it('splice updates affected indices', () => {
      const arr = reactiveArray([10, 20, 30]);

      arr.splice(1, 1, 99);

      expect(arr[1]).toBe(99);
      expect(arr.length).toBe(3);
    });

    it('mutating methods are batched', () => {
      const arr = reactiveArray([3, 1, 2]);
      let runs = 0;

      const stop = effect(() => {
        void arr[0];
        void arr[1];
        void arr[2];
        runs++;
      });

      arr.sort();
      expect(runs).toBe(2); // initial + one batched update

      stop();
    });

    it('isReactiveArray returns true for reactive arrays and false otherwise', () => {
      const arr = reactiveArray([1, 2, 3]);

      expect(isReactiveArray(arr)).toBe(true);
      expect(isReactiveArray([1, 2, 3])).toBe(false);
      expect(isReactiveArray(null)).toBe(false);
      expect(isReactiveArray(42)).toBe(false);
    });

    it('iteration methods (map) track element reads', () => {
      const arr = reactiveArray([1, 2, 3]);
      const log: number[][] = [];

      const stop = effect(() => {
        log.push(arr.map((x) => x * 2));
      });

      arr[0] = 10;
      expect(log.at(-1)).toEqual([20, 4, 6]);

      stop();
    });
  });
});
