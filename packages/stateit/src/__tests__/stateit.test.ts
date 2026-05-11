import { batch, computed, effect, isSignal, onCleanup, scope, signal, store, untrack, watch } from '../';

describe('stateit', () => {
  it('supports direct singleton primitives', () => {
    const count = signal(0);
    const seen: number[] = [];

    const stop = effect(() => {
      seen.push(count.value);
    });

    count.value = 1;
    expect(seen).toEqual([0, 1]);

    stop();
  });

  it('supports signal + computed + effect', () => {
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

  it('computed throws when read after dispose', () => {
    const n = signal(1);
    const c = computed(() => n.value + 1);

    c.dispose();

    expect(() => c.value).toThrow(/disposed/);
  });

  it('effect teardown runs all disposers even when one throws', () => {
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

  it('onCleanup throws outside active effect or scope', () => {
    expect(() => onCleanup(() => {})).toThrow(/active effect or scope/);
  });

  it('watch supports selector overload and auto-disposes internal computed', () => {
    const cart = store({ count: 0, label: 'x' });
    const listener = vi.fn();

    const stop = watch(
      cart,
      (state) => state.count,
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

  it('batch coalesces notifications', () => {
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

  it('store is a small recipe with patch, update, and reset', () => {
    const user = store({ count: 0, profile: { name: 'Ada' } });

    user.patch({ count: 1 });
    expect(user.value.count).toBe(1);

    user.update((state) => ({ ...state, count: state.count + 1 }));
    expect(user.value.count).toBe(2);

    const external = user.value;

    external.profile.name = 'Grace';
    user.reset();

    expect(user.value).toEqual({ count: 0, profile: { name: 'Ada' } });
  });

  it('store is branded as a signal', () => {
    const user = store({ count: 0 });

    expect(isSignal(user)).toBe(true);
  });

  it('store throws when misused with non-object values', () => {
    expect(() => store(42 as unknown as { count: number })).toThrow(/plain object/);

    const ok = store({ count: 0 });

    expect(() => {
      ok.patch(null as unknown as Partial<{ count: number }>);
    }).toThrow(/plain object partial/);

    expect(() => {
      ok.update(() => 1 as unknown as { count: number });
    }).toThrow(/must return a plain object/);
  });

  // === EDGE CASES ===

  describe('track: cleanup captures subscribed effect, not current scope', () => {
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

      // changing b should only notify inner
      b.value = 1;
      expect(innerLog).toEqual([0, 1]);
      expect(outerLog).toEqual([0]);

      // changing a re-runs outer and creates a fresh inner; old inner is cleaned up
      a.value = 1;
      expect(outerLog).toEqual([0, 1]);

      // b change should still reach the new inner, not a stale one
      const prevInnerLen = innerLog.length;

      b.value = 2;
      expect(innerLog.length).toBe(prevInnerLen + 1);

      stopOuter();
    });
  });

  describe('effect: loop guard', () => {
    it('throws after maxIterations when effect re-triggers itself synchronously', () => {
      const n = signal(0);

      expect(() => {
        effect(
          () => {
            if (n.value < 200) n.value++;
          },
          { maxIterations: 10 },
        );
      }).toThrow(/infinite effect loop/);
    });

    it('respects a custom maxIterations limit', () => {
      const n = signal(0);

      expect(() => {
        effect(
          () => {
            if (n.value < 5) n.value++;
          },
          { maxIterations: 3 },
        );
      }).toThrow(/> 3 iterations/);
    });
  });

  describe('computed: disposal semantics', () => {
    it('stops updating after dispose and does not accumulate stale subscriptions', () => {
      const n = signal(1);
      const c = computed(() => n.value * 10);

      expect(c.value).toBe(10);
      c.dispose();

      // must throw on read
      expect(() => c.value).toThrow(/disposed/);
    });

    it('auto-disposes computed created inside an effect when the effect re-runs', () => {
      const toggle = signal(false);
      const inner = signal(0);
      const computedLog: number[] = [];

      const stop = effect(() => {
        if (toggle.value) {
          const c = computed(() => inner.value + 100);

          computedLog.push(c.value);
          // c is auto-disposed when this effect re-runs
        }
      });

      toggle.value = true;
      expect(computedLog).toEqual([100]);

      // re-run by changing toggle again – previous computed must be disposed
      inner.value = 5;
      toggle.value = false;
      toggle.value = true; // inner is now 5, so 5+100=105 again
      expect(computedLog).toEqual([100, 105, 105]);

      stop();
    });
  });

  describe('watch: selector overload disposal', () => {
    it('does not fire after stop()', () => {
      const s = signal({ x: 0, y: 0 });
      const log: number[] = [];

      const stop = watch(
        s,
        (v) => v.x,
        (next) => log.push(next),
      );

      s.value = { x: 1, y: 99 };
      expect(log).toEqual([1]);

      stop();
      s.value = { x: 2, y: 0 };
      expect(log).toEqual([1]); // no further calls
    });

    it('calling stop() twice does not throw', () => {
      const s = signal(0);
      const stop = watch(s, vi.fn());

      expect(() => {
        stop();
        stop();
      }).not.toThrow();
    });
  });

  describe('batch: error handling', () => {
    it('original error is thrown when fn throws with no flush error', () => {
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

      // subscribers that were queued before the throw should still have fired
      // (mutations happened; flush ran after the throw with no secondary error)
      expect(log).toContain(1);
    });

    it('wraps both errors in AggregateError when fn AND flush both throw', () => {
      const n = signal(0);

      // Make the subscriber throw during flush
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

    it('multiple subscriber errors in a flush become AggregateError', () => {
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
  });

  describe('untrack', () => {
    it('reads inside untrack do not register as dependencies', () => {
      const n = signal(0);
      const log: number[] = [];

      const stop = effect(() => {
        // read n without subscribing
        const v = untrack(() => n.value);

        log.push(v);
      });

      // changing n should NOT re-run the effect
      n.value = 1;
      n.value = 2;
      expect(log).toEqual([0]);

      stop();
    });
  });

  describe('scope', () => {
    it('collects and runs cleanups on dispose (LIFO order)', () => {
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

    it('cleanups registered inside scope.run are isolated from enclosing effect', () => {
      const n = signal(0);
      const scopeLog: number[] = [];
      const effectLog: number[] = [];
      const s = scope();

      const stop = effect(() => {
        void n.value;
        s.run(() => onCleanup(() => scopeLog.push(1)));
        onCleanup(() => effectLog.push(1));
      });

      n.value = 1; // re-run: effect teardown fires effectLog, not scopeLog
      stop();

      expect(effectLog).toEqual([1, 1]); // once on re-run, once on stop
      expect(scopeLog).toEqual([]); // scope untouched until dispose

      s.dispose();
      expect(scopeLog).toEqual([1, 1]); // registered twice across two effect runs
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

  describe('computed: glitch-free propagation', () => {
    it('effect always observes a consistent signal+computed snapshot', () => {
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

      // final state must be correct
      expect(seen.at(-1)).toEqual([5, 10]);
    });

    it('does not re-run an effect when a computed dependency changes but the computed value stays equal', () => {
      const n = signal(0);
      const parity = computed(() => n.value % 2);
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(parity.value);
      });

      n.value = 2;
      n.value = 4;

      expect(seen).toEqual([0]);

      n.value = 5;
      expect(seen).toEqual([0, 1]);

      stop();
      parity.dispose();
    });

    it('computed with no subscribers stays lazy and never glitches', () => {
      const a = signal(2);
      const b = computed(() => a.value * 3);

      a.value = 10;
      expect(b.value).toBe(30);
    });

    it('conditional computed unsubscribes from stale branches', () => {
      const toggle = signal(true);
      const left = signal(1);
      const right = signal(10);
      const selected = computed(() => (toggle.value ? left.value : right.value));
      const seen: number[] = [];

      const stop = effect(() => {
        seen.push(selected.value);
      });

      expect(seen).toEqual([1]);

      // Switch branch and then update only the stale dependency.
      toggle.value = false;
      expect(seen).toEqual([1, 10]);

      left.value = 2;
      expect(seen).toEqual([1, 10]);

      right.value = 11;
      expect(seen).toEqual([1, 10, 11]);

      stop();
      selected.dispose();
    });
  });

  describe('computed: cycle detection', () => {
    it('throws on circular computed dependency', () => {
      // proxy.fn is patched after both computeds exist so the cycle is wired at read time
      const proxy = { fn: (): number => 0 };
      const a = computed(() => proxy.fn() + 1);
      const b = computed(() => a.value + 1);

      proxy.fn = () => b.value; // a now depends on b which depends on a

      expect(() => a.value).toThrow(/computed cycle detected/);

      a.dispose();
      b.dispose();
    });
  });

  describe('watch: once semantics', () => {
    it('once + custom equals does not hit TDZ during initial run', () => {
      const s = signal(1);
      const spy = vi.fn();

      expect(() => {
        watch(s, spy, { equals: () => false, once: true });
      }).not.toThrow();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1, 1);
    });
  });
});
