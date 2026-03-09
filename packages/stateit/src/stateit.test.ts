import {
  ComputedSignal,
  Store,
  batch,
  computed,
  effect,
  isStore,
  shallowEqual,
  signal,
  store,
  watch,
  writable,
  type ReadonlySignal,
} from './stateit';

// ─── shallowEqual ─────────────────────────────────────────────────────────────

describe('shallowEqual', () => {
  it('primitives: same value or same reference -> true, different value -> false', () => {
    expect(shallowEqual(5, 5)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(true, false)).toBe(false);
    const obj = { a: 1 };
    expect(shallowEqual(obj, obj)).toBe(true); // strict reference
  });

  it('objects: same props -> true, different value -> false, extra key -> false', () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('null / undefined edge cases', () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(undefined, undefined)).toBe(true);
    expect(shallowEqual(null, undefined)).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual({}, undefined)).toBe(false);
  });

  it('shallow semantics: nested objects with equal shape are not equal', () => {
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
  });
});

// ─── value ────────────────────────────────────────────────────────────────────

describe('value', () => {
  it('returns the initial state', () => {
    const s = store({ count: 0, name: 'Alice' });
    expect(s.value).toEqual({ count: 0, name: 'Alice' });
  });

  it('reflects the latest state after set()', () => {
    const s = store({ count: 0 });
    s.set({ count: 5 });
    expect(s.value).toEqual({ count: 5 });
  });
});

// ─── set / reset ──────────────────────────────────────────────────────────────

describe('set / reset', () => {
  it('set(patch) shallow-merges and preserves untouched keys', () => {
    const s = store({ count: 0, name: 'Alice' });
    s.set({ count: 5 });
    expect(s.value).toEqual({ count: 5, name: 'Alice' });
  });

  it('set(patch) is a no-op when the new state would be equal', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st, listener);
    s.set({ count: 0 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('set(patch) does not mutate the original state object', () => {
    const initial = { count: 0 };
    store(initial).set({ count: 5 });
    expect(initial.count).toBe(0);
  });

  it('set(updater): receives current state, result applied immediately', () => {
    const s = store({ count: 2 });
    s.set((st) => ({ ...st, count: st.count * 3 }));
    expect(s.value.count).toBe(6);
  });

  it('set(updater): no-op when updater returns same reference', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st, listener);
    s.set((st) => st);
    expect(listener).not.toHaveBeenCalled();
  });

  it('reset() restores to the captured initial state', () => {
    const s = store({ count: 0 });
    s.set({ count: 99 });
    s.reset();
    expect(s.value.count).toBe(0);
  });
});

// ─── watch ────────────────────────────────────────────────────────────────────

describe('watch', () => {
  it('does not fire immediately by default', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it('{ immediate: true } fires with the current value on subscription', () => {
    const s = store({ count: 3 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener, { immediate: true });
    expect(listener).toHaveBeenCalledWith(3, 3);
  });

  it('fires with (next, prev) when the watched slice changes', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    s.set({ count: 5 });
    expect(listener).toHaveBeenCalledWith(5, 0);
  });

  it('does not fire when an unrelated key changes', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    s.set({ name: 'Bob' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('multiple synchronous set() calls each fire their own notification', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    s.set({ count: 1 });
    s.set({ count: 2 });
    s.set({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenLastCalledWith(3, 2);
  });

  it('multiple watchers all notified; unsubscribing one is isolated', () => {
    const s = store({ count: 0 });
    const l1 = vi.fn();
    const l2 = vi.fn();
    const unsub = s.watch((st) => st.count, l1);
    s.watch((st) => st.count, l2);
    unsub();
    s.set({ count: 1 });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('calling unsubscribe multiple times does not throw', () => {
    const s = store({ count: 0 });
    const unsub = s.watch(
      (st) => st.count,
      () => {},
    );
    expect(() => {
      unsub();
      unsub();
      unsub();
    }).not.toThrow();
  });

  it('watch selector default equality is Object.is -- different arrays fire on each set', () => {
    const s = store({ items: [1, 2, 3] });
    const listener = vi.fn();
    s.watch((st) => st.items, listener);
    s.set({ items: [1, 2, 3] }); // new array reference — Object.is = false — fires
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('custom equals suppresses notification for semantically equal slices', () => {
    const s = store({ items: [1, 2, 3] });
    const listener = vi.fn();
    s.watch((st) => st.items, listener, {
      equals: (a, b) => a.length === b.length,
    });
    s.set({ items: [4, 5, 6] }); // same length — suppressed
    expect(listener).not.toHaveBeenCalled();
    s.set({ items: [1, 2, 3, 4] }); // different length — fires
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('custom StoreOptions.equals suppresses set() before any watcher fires', () => {
    const s = store({ items: [1, 2, 3] }, { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
    const listener = vi.fn();
    s.watch((st) => st.items, listener);
    s.set({ items: [1, 2, 3] }); // same value, different reference — suppressed at store level
    expect(listener).not.toHaveBeenCalled();
  });

  it('watch(cb) without selector watches the full state', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    s.watch(listener);
    s.set({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Alice' }, { count: 0, name: 'Alice' });
  });

  it('watch(s => s, cb) watches the full state', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    s.watch((st) => st, listener);
    s.set({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Alice' }, { count: 0, name: 'Alice' });
  });

  it('top-level watch() works identically on a store', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    watch(s, (st) => st.count, listener);
    s.set({ count: 7 });
    expect(listener).toHaveBeenCalledWith(7, 0);
  });

  it('top-level watch() with selector works on a plain signal', () => {
    const s = signal({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    watch(s, (v) => v.count, listener);
    s.value = { count: 5, name: 'Alice' };
    expect(listener).toHaveBeenCalledWith(5, 0);
    s.value = { count: 5, name: 'Bob' }; // count unchanged — suppressed
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('{ once: true } fires exactly once on the first change then stops', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener, { once: true });
    s.set({ count: 1 });
    s.set({ count: 2 });
    s.set({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0);
  });

  it('{ once: true, immediate: true } fires immediately then fires once on first change', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener, { immediate: true, once: true });
    expect(listener).toHaveBeenCalledTimes(1); // immediate fire
    s.set({ count: 1 }); // first change fires then auto-unsubscribes
    expect(listener).toHaveBeenCalledTimes(2);
    s.set({ count: 2 }); // silent
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('top-level watch(signal, cb, { once: true }) auto-unsubscribes after first change', () => {
    const n = signal(0);
    const listener = vi.fn();
    watch(n, listener, { once: true });
    n.value = 1;
    n.value = 2;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0);
  });
});

// ─── batch ────────────────────────────────────────────────────────────────────

describe('batch', () => {
  it('batches all set() calls into a single notification; no notification fires mid-batch', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    s.watch((st) => st, listener);
    batch(() => {
      s.set({ count: 1 });
      expect(listener).not.toHaveBeenCalled();
      s.set({ name: 'Bob' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Bob' }, { count: 0, name: 'Alice' });
  });

  it('nested batches are merged into the outermost', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    batch(() => {
      s.set({ count: 1 });
      batch(() => s.set({ count: 2 }));
      s.set({ count: 3 });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.value.count).toBe(3);
  });

  it('batch() works on stores', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    batch(() => {
      s.set({ count: 1 });
      s.set({ count: 2 });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
  });

  it('state reads inside see the latest in-batch value', () => {
    const s = store({ count: 0 });
    batch(() => {
      s.set({ count: 1 });
      expect(s.value.count).toBe(1);
      s.set({ count: 2 });
      expect(s.value.count).toBe(2);
    });
    expect(s.value.count).toBe(2);
  });

  it('returns the callback return value', () => {
    const s = store({ count: 0 });
    const result = batch(() => {
      s.set({ count: 5 });
      return 'done';
    });
    expect(result).toBe('done');
    expect(s.value.count).toBe(5);
  });

  it('still notifies and keeps partial changes when the callback throws', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    expect(() =>
      batch(() => {
        s.set({ count: 1 });
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.value.count).toBe(1);
  });

  it('watch() receives a single notification for the final slice value', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    batch(() => {
      s.set({ count: 1 });
      s.set({ count: 2 });
      s.set({ name: 'Bob' }); // unrelated — no extra call
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
  });
  it('all subscribers in a batch flush are notified even if one throws', () => {
    const s = store({ count: 0 });
    const second = vi.fn();
    s.watch(
      (st) => st.count,
      () => {
        throw new Error('flush-boom');
      },
    );
    s.watch((st) => st.count, second);
    expect(() =>
      batch(() => {
        s.set({ count: 1 });
      }),
    ).toThrow('flush-boom');
    expect(second).toHaveBeenCalledTimes(1);
  });
});

// ─── dispose ──────────────────────────────────────────────────────────────────

describe('dispose', () => {
  it('clears all watchers; further set() produces no notifications', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    s.watch((st) => st.count, listener);
    s.dispose();
    s.set({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('set() is a no-op after dispose; state does not change', () => {
    const s = store({ count: 0 });
    s.dispose();
    s.set({ count: 1 });
    expect(s.value.count).toBe(0);
  });

  it('set() and repeated dispose() after dispose do not throw', () => {
    const s = store({ count: 0 });
    s.dispose();
    expect(() => {
      s.dispose();
      s.set({ count: 1 });
    }).not.toThrow();
  });

  it('watch() after dispose returns a no-op unsubscribe and never fires', () => {
    const s = store({ count: 0 });
    s.dispose();
    const listener = vi.fn();
    const unsub = s.watch((st) => st.count, listener);
    expect(listener).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
  });

  it('dispose() tears down live subscriptions — watch cleanups are called eagerly', () => {
    const s = store({ count: 0 });
    const l1 = vi.fn();
    const l2 = vi.fn();
    s.watch((st) => st.count, l1);
    s.watch((st) => st.count, l2);
    s.dispose();
    s.set({ count: 1 });
    expect(l1).not.toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });

  it('disposed getter reflects store state', () => {
    const s = store({ count: 0 });
    expect(s.disposed).toBe(false);
    s.dispose();
    expect(s.disposed).toBe(true);
  });
});

// ─── ReadonlySignal (store as signal) ─────────────────────────────────────────

describe('ReadonlySignal', () => {
  it('a Store can be widened to ReadonlySignal and used for observation', () => {
    const s = store({ count: 1 });
    const ro: ReadonlySignal<{ count: number }> = s;
    expect(ro.value.count).toBe(1);
    const listener = vi.fn();
    // ReadonlySignal<T> is accepted directly by watch() with a selector
    watch(ro, (st) => st.count, listener);
    s.set({ count: 2 });
    expect(listener).toHaveBeenCalledWith(2, 1);
  });
});

// ─── computed on store (replaces derived) ────────────────────────────────────

describe('computed on store', () => {
  it('exposes the initial computed value', () => {
    const s = store({ count: 5, name: 'Alice' });
    const count$ = computed(() => s.value.count);
    expect(count$.value).toBe(5);
  });

  it('updates synchronously when the source slice changes', () => {
    const s = store({ count: 0 });
    const count$ = computed(() => s.value.count);
    const listener = vi.fn();
    watch(count$, listener);
    s.set({ count: 3 });
    expect(listener).toHaveBeenCalledWith(3, 0);
    expect(count$.value).toBe(3);
  });

  it('does not notify when the source changes but the computed value does not', () => {
    const s = store({ count: 0, name: 'Alice' });
    const name$ = computed(() => s.value.name);
    const listener = vi.fn();
    watch(name$, listener);
    s.set({ count: 99 }); // name unchanged
    expect(listener).not.toHaveBeenCalled();
    expect(name$.value).toBe('Alice');
  });

  it('{ immediate: true } fires with current value as both curr and prev', () => {
    const s = store({ count: 7 });
    const count$ = computed(() => s.value.count);
    const listener = vi.fn();
    watch(count$, listener, { immediate: true });
    expect(listener).toHaveBeenCalledWith(7, 7);
  });

  it('computed across two stores stays in sync', () => {
    const a = store({ x: 1 });
    const b = store({ y: 2 });
    const sum$ = computed(() => a.value.x + b.value.y);
    expect(sum$.value).toBe(3);
    a.set({ x: 10 });
    expect(sum$.value).toBe(12);
    b.set({ y: 20 });
    expect(sum$.value).toBe(30);
  });

  it('computed() returns a ComputedSignal with a dispose function', () => {
    const c = computed(() => 42);
    expect(c).toBeInstanceOf(ComputedSignal);
    expect(typeof c.dispose).toBe('function');
    c.dispose();
  });

  it('Store is a proper class — instanceof works', () => {
    const s = store({ count: 0 });
    expect(s).toBeInstanceOf(Store);
  });

  it('dispose() stops recomputation and frees subscribers', () => {
    const s = store({ count: 0 });
    const count$ = computed(() => s.value.count);
    const listener = vi.fn();
    watch(count$, listener);
    count$.dispose();
    s.set({ count: 99 });
    expect(count$.value).toBe(0); // stale — no longer recomputes
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── effect ───────────────────────────────────────────────────────────────────

describe('effect', () => {
  it('runs immediately and tracks reactive reads', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.value);
    });
    n.value = 1;
    n.value = 2;
    expect(seen).toEqual([0, 1, 2]);
    stop();
    n.value = 3;
    expect(seen).toEqual([0, 1, 2]);
  });

  it('nested effect does not break the outer tracking context', () => {
    const a = signal(0);
    const b = signal(0);
    const outer: number[] = [];
    const inner: number[] = [];

    const stop = effect(() => {
      outer.push(a.value);
      // Create an inner effect while outer is tracking
      const stopInner = effect(() => {
        inner.push(b.value);
      });
      stopInner();
    });

    // a.value should still be tracked by the outer effect
    a.value = 1;
    expect(outer).toEqual([0, 1]);
    stop();
  });

  it('re-entrancy: writing to a read signal does not overflow; re-runs until stable', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.value);
      if (n.value < 3) n.value++;
    });
    expect(seen).toEqual([0, 1, 2, 3]);
    stop();
  });

  it('cleanup is not double-called when fn throws on re-run', () => {
    const n = signal(0);
    const cleanup = vi.fn();
    effect(() => {
      n.value; // subscribe
      if (n.value > 0) throw new Error('oops');
      return cleanup;
    });
    expect(() => {
      n.value = 1;
    }).toThrow('oops');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('all subscribers are notified even if one throws; error is re-thrown', () => {
    const n = signal(0);
    const second = vi.fn();
    const stop1 = effect(() => {
      if (n.value > 0) throw new Error('boom');
    });
    const stop2 = effect(() => {
      if (n.value > 0) second();
    });
    expect(() => {
      n.value = 1;
    }).toThrow('boom');
    expect(second).toHaveBeenCalledTimes(1);
    stop1();
    stop2();
  });

  it('circuit-breaker: throws after 100 iterations instead of hanging', () => {
    const n = signal(0);
    // unconditionally increments -- loop never stabilises
    expect(() =>
      effect(() => {
        n.value;
        n.value = n.peek() + 1;
      }),
    ).toThrow(/infinite reactive loop/);
  });
});

// ─── writable ─────────────────────────────────────────────────────────────────

describe('writable', () => {
  it('reads track reactively from the getter', () => {
    const n = signal(2);
    const doubled = writable(
      () => n.value * 2,
      (v) => {
        n.value = v / 2;
      },
    );
    expect(doubled.value).toBe(4);
    n.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('writes are forwarded to the setter', () => {
    const n = signal(2);
    const doubled = writable(
      () => n.value * 2,
      (v) => {
        n.value = v / 2;
      },
    );
    doubled.value = 20;
    expect(n.value).toBe(10);
  });

  it('exposes dispose() to stop tracking the getter', () => {
    const n = signal(0);
    const w = writable(
      () => n.value + 1,
      () => {},
    );
    expect(w.value).toBe(1);
    w.dispose();
    n.value = 99;
    expect(w.value).toBe(1); // stale — getter no longer tracked
  });
});

// ─── isStore ──────────────────────────────────────────────────────────────────

describe('isStore', () => {
  it('returns true for a store instance', () => {
    const s = store({ count: 0 });
    expect(isStore(s)).toBe(true);
  });

  it('returns false for a plain signal', () => {
    const s = signal(0);
    expect(isStore(s)).toBe(false);
  });

  it('returns false for null, primitives, and plain objects', () => {
    expect(isStore(null)).toBe(false);
    expect(isStore(42)).toBe(false);
    expect(isStore({ count: 0 })).toBe(false);
  });

  it('narrows the type to Store<T>', () => {
    const value: unknown = store({ name: 'Alice' });
    if (isStore<{ name: string }>(value)) {
      // TypeScript should allow .set() here
      value.set({ name: 'Bob' });
      expect(value.value.name).toBe('Bob');
    }
  });
});
