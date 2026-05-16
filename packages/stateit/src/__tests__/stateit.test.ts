import {
  batch,
  computed,
  effect,
  isSignal,
  observableSymbol,
  onCleanup,
  readonly,
  scope,
  signal,
  store,
  toObservable,
  toStore,
  untrack,
  watch,
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

    it('throws when read after dispose', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      c.dispose();

      expect(() => c.value).toThrow(/disposed/);
    });

    it('throws when subscribing after dispose', () => {
      const n = signal(1);
      const c = computed(() => n.value + 1);

      c.dispose();

      expect(() => c.subscribe(() => {})).toThrow(/disposed computed signal/);
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

    it('throws on circular computed dependency', () => {
      const proxy = { fn: (): number => 0 };
      const a = computed(() => proxy.fn() + 1);
      const b = computed(() => a.value + 1);

      proxy.fn = () => b.value;

      expect(() => a.value).toThrow(/computed cycle detected/);

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
      let shouldThrow = false;

      const value = computed(() => {
        if (!shouldThrow) {
          return 0;
        }

        (value as unknown as { deps_: Set<() => void> }).deps_.add(() => {
          throw new Error('cleanup-boom');
        });

        throw new Error('computed-boom');
      });

      expect(value.value).toBe(0);

      let caught: unknown;

      try {
        shouldThrow = true;
        (value as unknown as { dirty_: boolean }).dirty_ = true;
        void value.value;
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

      value.dispose();
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

    it('throws when onCleanup is called outside an active context', () => {
      expect(() => onCleanup(() => {})).toThrow(/active effect or scope/);
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

      expect(() => {
        effect(() => {
          if (n.value < 200) n.value++;
        });
      }).toThrow(/infinite effect loop/);
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

    it('supports immediate mode', () => {
      const s = signal(1);
      const spy = vi.fn();

      watch(s, spy, { immediate: true });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1, 1);
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

    it('toStore provides immediate value + change notifications', () => {
      const n = signal(0);
      const wrapped = toStore(n);
      const seen: number[] = [];

      const unsubscribe = wrapped.subscribe((value) => {
        seen.push(value);
      });

      n.value = 1;
      n.value = 2;
      unsubscribe();
      n.value = 3;

      expect(seen).toEqual([0, 1, 2]);
    });

    it('toStore supports computed sources', () => {
      const n = signal(1);
      const doubled = computed(() => n.value * 2);
      const wrapped = toStore(doubled);
      const seen: number[] = [];

      const unsubscribe = wrapped.subscribe((value) => {
        seen.push(value);
      });

      n.value = 2;
      n.value = 3;

      expect(seen).toEqual([2, 4, 6]);

      unsubscribe();
      doubled.dispose();
    });

    it('toObservable emits current value immediately and future changes', () => {
      const n = signal(1);
      const observable = toObservable(n);
      const seen: number[] = [];

      const sub = observable.subscribe({
        next(value) {
          seen.push(value);
        },
      });

      n.value = 2;
      n.value = 3;

      expect(seen).toEqual([1, 2, 3]);

      sub.unsubscribe();
    });

    it('toObservable supports function subscribers and unsubscribe', () => {
      const n = signal(10);
      const seen: number[] = [];
      const observable = toObservable(n);

      const sub = observable.subscribe((value) => {
        seen.push(value);
      });

      n.value = 11;
      sub.unsubscribe();
      n.value = 12;

      expect(seen).toEqual([10, 11]);
    });

    it('toObservable exposes a standard observable symbol accessor', () => {
      const n = signal(1);
      const observable = toObservable(n);

      expect(typeof observable[observableSymbol]).toBe('function');
      expect(observable[observableSymbol]()).toBe(observable);
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

    it('throws when created or patched with non-object values', () => {
      expect(() => store(42 as unknown as { count: number })).toThrow(/plain object/);

      const ok = store({ count: 0 });

      expect(() => {
        ok.patch(null as unknown as Partial<{ count: number }>);
      }).toThrow(/plain object partial/);
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

    it('run after dispose throws', () => {
      const s = scope();

      s.dispose();

      expect(() => s.run(() => {})).toThrow(/disposed scope/);
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

      // every snapshot must be internally consistent
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
});
