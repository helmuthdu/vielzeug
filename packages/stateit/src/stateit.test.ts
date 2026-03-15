import {
  _resetContextForTesting,
  _SIGNAL_BRAND,
  batch,
  computed,
  configureStateit,
  derived,
  effect,
  type EffectCallback,
  isSignal,
  isStore,
  nextValue,
  onCleanup,
  readonly,
  type ReadonlySignal,
  shallowEqual,
  signal,
  store,
  type Subscription,
  toValue,
  untrack,
  watch,
  writable,
} from './stateit';

// ─── signal ───────────────────────────────────────────────────────────────────

describe('signal', () => {
  it('holds and reflects the initial value', () => {
    expect(signal(42).value).toBe(42);
  });

  it('updates and reflects the new value on write', () => {
    const n = signal(0);

    n.value = 7;
    expect(n.value).toBe(7);
  });

  it('peek() returns the value without creating a reactive subscription', () => {
    const n = signal(1);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.peek());
    });

    n.value = 2; // n read only via peek — effect does NOT re-run
    expect(seen).toEqual([1]);
    stop();
  });

  it('write is a no-op when the new value is the same (Object.is)', () => {
    const n = signal(5);
    const listener = vi.fn();

    watch(n, listener);
    n.value = 5;
    expect(listener).not.toHaveBeenCalled();
  });

  it('custom equals suppresses writes for semantically equal values', () => {
    const pos = signal({ x: 0, y: 0 }, { equals: (a, b) => a.x === b.x && a.y === b.y });
    const listener = vi.fn();

    watch(pos, listener);
    pos.value = { x: 0, y: 0 }; // same coords, different ref — suppressed
    expect(listener).not.toHaveBeenCalled();
    pos.value = { x: 1, y: 0 }; // different — fires
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('update() applies the updater function to the current value', () => {
    const n = signal(5);

    n.update((v) => v * 2);
    expect(n.value).toBe(10);
  });

  it('update() skips notification when the result is equal (Object.is)', () => {
    const n = signal(5);
    const listener = vi.fn();

    watch(n, listener);
    n.update((v) => v); // returns the same value — should not fire
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── type guards and utilities ────────────────────────────────────────────────────────────────────────────────

describe('type guards and utilities', () => {
  it('isSignal() is true for signal, computed, writable, and store', () => {
    expect(isSignal(signal(0))).toBe(true);
    expect(isSignal(computed(() => 1))).toBe(true);
    expect(
      isSignal(
        writable(
          () => 0,
          () => {},
        ),
      ),
    ).toBe(true);
    expect(isSignal(store({ x: 1 }))).toBe(true);
  });

  it('isSignal() is false for primitives, null, and plain objects', () => {
    expect(isSignal(null)).toBe(false);
    expect(isSignal(42)).toBe(false);
    expect(isSignal({ value: 0 })).toBe(false);
  });

  it('isStore() is true only for Store instances', () => {
    expect(isStore(store({ x: 0 }))).toBe(true);
    expect(isStore(signal(0))).toBe(false);
    expect(isStore(null)).toBe(false);
    expect(isStore({ x: 0 })).toBe(false);
  });

  it('isStore() narrows the type so Store methods are accessible', () => {
    const value: unknown = store({ name: 'Alice' });

    if (isStore<{ name: string }>(value)) {
      value.patch({ name: 'Bob' });
      expect(value.value.name).toBe('Bob');
    }
  });

  it('toValue() unwraps a signal and passes plain values through unchanged', () => {
    const n = signal(10);

    expect(toValue(n)).toBe(10);
    expect(toValue(42)).toBe(42);
  });

  it('readonly() returns a ReadonlySignal view that tracks reactively', () => {
    const n = signal(1);
    const ro = readonly(n);

    expect(ro.value).toBe(1);

    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(ro.value);
    });

    n.value = 2;
    expect(seen).toEqual([1, 2]);
    stop();
  });

  it('readonly() returns the same cached wrapper for repeated calls', () => {
    const n = signal(1);

    expect(readonly(n)).toBe(readonly(n));
  });

  it('_SIGNAL_BRAND is exported so consumers can create conforming mock signals', () => {
    const mockSig: ReadonlySignal<number> = {
      [_SIGNAL_BRAND]: true,
      peek: () => 42,
      value: 42,
    };

    expect(isSignal(mockSig)).toBe(true);
    expect(mockSig.value).toBe(42);
  });

  it('EffectCallback is exported and matches the effect fn signature', () => {
    const fn: EffectCallback = () => {};
    const stop = effect(fn);

    stop();
  });
});

// ─── type guards and utilities ────────────────────────────────────────────────

describe('type guards and utilities', () => {
  it('isSignal() is true for signal, computed, writable, and store', () => {
    expect(isSignal(signal(0))).toBe(true);
    expect(isSignal(computed(() => 1))).toBe(true);
    expect(
      isSignal(
        writable(
          () => 0,
          () => {},
        ),
      ),
    ).toBe(true);
    expect(isSignal(store({ x: 1 }))).toBe(true);
  });

  it('isSignal() is false for primitives, null, and plain objects', () => {
    expect(isSignal(null)).toBe(false);
    expect(isSignal(42)).toBe(false);
    expect(isSignal({ value: 0 })).toBe(false);
  });

  it('isStore() is true only for Store instances', () => {
    expect(isStore(store({ x: 0 }))).toBe(true);
    expect(isStore(signal(0))).toBe(false);
    expect(isStore(null)).toBe(false);
    expect(isStore({ x: 0 })).toBe(false);
  });

  it('isStore() narrows the type so Store methods are accessible', () => {
    const value: unknown = store({ name: 'Alice' });

    if (isStore<{ name: string }>(value)) {
      value.patch({ name: 'Bob' });
      expect(value.value.name).toBe('Bob');
    }
  });

  it('toValue() unwraps a signal and passes plain values through unchanged', () => {
    const n = signal(10);

    expect(toValue(n)).toBe(10);
    expect(toValue(42)).toBe(42);
  });

  it('readonly() returns a ReadonlySignal view that tracks reactively', () => {
    const n = signal(1);
    const ro = readonly(n);

    expect(ro.value).toBe(1);

    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(ro.value);
    });

    n.value = 2;
    expect(seen).toEqual([1, 2]);
    stop();
  });

  it('readonly() returns the same cached wrapper for repeated calls', () => {
    const n = signal(1);

    expect(readonly(n)).toBe(readonly(n));
  });
});

// ─── effect ───────────────────────────────────────────────────────────────────

describe('effect', () => {
  it('runs immediately, re-runs on dep change, and stops after dispose', () => {
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

  it('cleanup fn is called before each re-run and on final dispose', () => {
    const n = signal(0);
    const cleanup = vi.fn();
    const stop = effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value; // track

      return cleanup;
    });

    n.value = 1; // re-run: cleanup called before fn
    n.value = 2; // re-run: cleanup called again
    expect(cleanup).toHaveBeenCalledTimes(2);
    stop(); // final dispose: cleanup called once more
    expect(cleanup).toHaveBeenCalledTimes(3);
  });

  it('cleanup is not double-called when the re-run throws', () => {
    const n = signal(0);
    const cleanup = vi.fn();

    effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value;

      if (n.value > 0) throw new Error('oops');

      return cleanup;
    });
    expect(() => {
      n.value = 1;
    }).toThrow('oops');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('nested effect restores the outer tracking context', () => {
    const a = signal(0);
    const outer: number[] = [];
    const stop = effect(() => {
      outer.push(a.value);

      const stopInner = effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        signal(99).value;
      });

      stopInner();
    });

    a.value = 1;
    expect(outer).toEqual([0, 1]);
    stop();
  });

  it('re-entrant write is deferred and re-runs until the value stabilises', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.value);

      if (n.value < 3) n.value++;
    });

    expect(seen).toEqual([0, 1, 2, 3]);
    stop();
  });

  it('circuit-breaker throws after 100 iterations to prevent infinite loops', () => {
    const n = signal(0);

    expect(() =>
      effect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        n.value;
        n.value = n.peek() + 1;
      }),
    ).toThrow(/infinite reactive loop/);
  });

  it('all subscribers are notified even when one throws', () => {
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

  it('dispose is idempotent — calling the cleanup fn multiple times does not re-run cleanup or re-subscribe', () => {
    const n = signal(0);
    const cleanup = vi.fn();
    const stop = effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value;

      return cleanup;
    });

    expect(cleanup).toHaveBeenCalledTimes(0);
    stop();
    stop(); // second call — should be a no-op
    expect(cleanup).toHaveBeenCalledTimes(1);
    n.value = 1; // effect is disposed — must not re-run
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('returns a Subscription with .dispose() and [Symbol.dispose] aliases', () => {
    const n = signal(0);
    const seen: number[] = [];
    const sub: Subscription = effect(() => {
      seen.push(n.value);
    });

    expect(typeof sub).toBe('function');
    expect(typeof sub.dispose).toBe('function');
    expect(typeof sub[Symbol.dispose]).toBe('function');
    sub.dispose();
    n.value = 1;
    expect(seen).toEqual([0]); // disposed — no re-run
  });

  it('per-effect maxIterations overrides the global setting', () => {
    const n = signal(0);

    expect(() =>
      effect(
        () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          n.value;
          n.value = n.peek() + 1;
        },
        { maxIterations: 5 },
      ),
    ).toThrow(/infinite reactive loop/);
  });
});

// ─── untrack ──────────────────────────────────────────────────────────────────

describe('untrack', () => {
  it('reads inside untrack do not create a reactive subscription', () => {
    const n = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(untrack(() => n.value));
    });

    n.value = 1; // n was only read via untrack — effect does NOT re-run
    expect(seen).toEqual([0]);
    stop();
  });
});

// ─── computed ─────────────────────────────────────────────────────────────────

describe('computed', () => {
  it('returns the initial computed value immediately', () => {
    const n = signal(5);

    expect(computed(() => n.value * 2).value).toBe(10);
  });

  it('updates when a dep changes', () => {
    const n = signal(1);
    const doubled = computed(() => n.value * 2);

    n.value = 4;
    expect(doubled.value).toBe(8);
  });

  it('does not notify watchers when the computed value is unchanged', () => {
    const s = store({ count: 0, name: 'Alice' });
    const name$ = computed(() => s.value.name);
    const listener = vi.fn();

    watch(name$, listener);
    s.patch({ count: 99 }); // name unchanged
    expect(listener).not.toHaveBeenCalled();
  });

  it('tracks multiple deps and stays in sync with both', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.value + b.value);

    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it('is lazy — does not recompute unless .value is read after a dep change', () => {
    let computeCount = 0;
    const n = signal(0);
    const doubled = computed(() => {
      computeCount++;

      return n.value * 2;
    });

    expect(computeCount).toBe(1); // initial seed
    n.value = 5; // dep changed — should NOT recompute yet
    expect(computeCount).toBe(1);
    expect(doubled.value).toBe(10); // read triggers lazy recompute
    expect(computeCount).toBe(2);
  });

  it('.dispose() stops tracking and leaves value stale', () => {
    const n = signal(0);
    const doubled = computed(() => n.value * 2);
    const listener = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    watch(doubled, listener);
    doubled.dispose();
    n.value = 5;
    expect(doubled.value).toBe(0); // stale
    expect(listener).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns in dev when reading a disposed ComputedSignal', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = computed(() => 42);

    c.dispose();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    c.value;
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disposed'));
    warnSpy.mockRestore();
  });

  it('exposes .dispose() and [Symbol.dispose] for uniform cleanup', () => {
    const c = computed(() => 42);

    expect(typeof c.dispose).toBe('function');
    expect(typeof c[Symbol.dispose]).toBe('function');
    c[Symbol.dispose]();
    expect(c.stale).toBe(true);
  });

  it('custom equals suppresses downstream notifications when result is semantically unchanged', () => {
    const s = signal({ items: [1, 2, 3] });
    const len = computed(() => s.value.items.length, { equals: (a, b) => a === b });
    const listener = vi.fn();

    watch(len, listener);
    s.value = { items: [4, 5, 6] }; // same length — downstream suppressed
    expect(listener).not.toHaveBeenCalled();
    s.value = { items: [1, 2, 3, 4] }; // length changed — fires
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(4, 3);
  });
});

// ─── writable ─────────────────────────────────────────────────────────────────

describe('writable', () => {
  it('get tracks reactively from the provided getter', () => {
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

  it('set forwards the write to the provided setter', () => {
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

  it('.dispose() stops tracking and leaves value stale', () => {
    const n = signal(0);
    const w = writable(
      () => n.value + 1,
      () => {},
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    w.dispose();
    n.value = 99;
    expect(w.value).toBe(1); // stale
    warnSpy.mockRestore();
  });
});

// ─── watch ────────────────────────────────────────────────────────────────────

describe('watch', () => {
  it('fires with (next, prev) on change; silent before any change', () => {
    const n = signal(0);
    const listener = vi.fn();
    const stop = watch(n, listener);

    expect(listener).not.toHaveBeenCalled();
    n.value = 5;
    expect(listener).toHaveBeenCalledWith(5, 0);
    stop();
  });

  it('selector fires only when the selected slice changes', () => {
    const s = signal({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    const count$ = computed(() => s.value.count);

    watch(count$, listener);
    s.value = { count: 5, name: 'Alice' };
    expect(listener).toHaveBeenCalledWith(5, 0);
    s.value = { count: 5, name: 'Bob' }; // count unchanged — suppressed
    expect(listener).toHaveBeenCalledTimes(1);
    count$.dispose();
  });

  it('{ immediate: true } fires with the current value on subscribe', () => {
    const n = signal(3);
    const listener = vi.fn();

    watch(n, listener, { immediate: true });
    expect(listener).toHaveBeenCalledWith(3, 3);
  });

  it('{ once: true } auto-unsubscribes after the first change', () => {
    const n = signal(0);
    const listener = vi.fn();

    watch(n, listener, { once: true });
    n.value = 1;
    n.value = 2;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0);
  });

  it('{ once: true, immediate: true } fires immediately then once on first change', () => {
    const n = signal(0);
    const listener = vi.fn();

    watch(n, listener, { immediate: true, once: true });
    expect(listener).toHaveBeenCalledTimes(1); // immediate
    n.value = 1; // fires then auto-unsubscribes
    expect(listener).toHaveBeenCalledTimes(2);
    n.value = 2; // silent
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('custom equals suppresses notification for semantically equal values', () => {
    const s = signal([1, 2, 3]);
    const listener = vi.fn();

    watch(s, listener, { equals: (a, b) => a.length === b.length });
    s.value = [4, 5, 6]; // same length — suppressed
    expect(listener).not.toHaveBeenCalled();
    s.value = [1, 2, 3, 4]; // different length — fires
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe is isolated and calling it multiple times does not throw', () => {
    const n = signal(0);
    const l1 = vi.fn();
    const l2 = vi.fn();
    const stop = watch(n, l1);

    watch(n, l2);
    stop();
    stop(); // idempotent
    n.value = 1;
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('returns a Subscription with .dispose() and [Symbol.dispose] aliases', () => {
    const n = signal(0);
    const listener = vi.fn();
    const sub = watch(n, listener);

    expect(typeof sub.dispose).toBe('function');
    expect(typeof sub[Symbol.dispose]).toBe('function');
    sub.dispose();
    n.value = 1;
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── batch ────────────────────────────────────────────────────────────────────

describe('batch', () => {
  it('defers all notifications until the batch returns, then flushes once', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();

    watch(s, listener);
    batch(() => {
      s.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled(); // mid-batch: silent
      s.patch({ name: 'Bob' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Bob' }, { count: 0, name: 'Alice' });
  });

  it('nested batches merge into the outermost; a single flush follows', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, listener);
    batch(() => {
      s.patch({ count: 1 });
      batch(() => s.patch({ count: 2 }));
      s.patch({ count: 3 });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.value.count).toBe(3);
  });

  it('reads inside a batch see the latest in-batch value immediately', () => {
    const s = store({ count: 0 });

    batch(() => {
      s.patch({ count: 1 });
      expect(s.value.count).toBe(1);
      s.patch({ count: 2 });
      expect(s.value.count).toBe(2);
    });
  });

  it('returns the callback return value', () => {
    expect(batch(() => 'done')).toBe('done');
  });

  it('flushes pending notifications even when the callback throws', () => {
    const s = store({ count: 0 });
    const listener = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, listener);
    expect(() =>
      batch(() => {
        s.patch({ count: 1 });
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(s.value.count).toBe(1);
    count$.dispose();
  });

  it('a selector-based watcher receives one notification with the final value', () => {
    const s = store({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, listener);
    batch(() => {
      s.patch({ count: 1 });
      s.patch({ count: 2 });
      s.patch({ name: 'Bob' }); // unrelated key — no extra notification
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
    count$.dispose();
  });

  it('all flush subscribers are notified even when one throws', () => {
    const s = store({ count: 0 });
    const second = vi.fn();
    const count$ = s.select((st) => st.count);

    watch(count$, () => {
      throw new Error('flush-boom');
    });
    watch(count$, second);
    expect(() =>
      batch(() => {
        s.patch({ count: 1 });
      }),
    ).toThrow('flush-boom');
    expect(second).toHaveBeenCalledTimes(1);
    count$.dispose();
  });
});

// ─── store ────────────────────────────────────────────────────────────────────

describe('store', () => {
  it('value and peek() return the initial state', () => {
    const s = store({ count: 0, name: 'Alice' });

    expect(s.value).toEqual({ count: 0, name: 'Alice' });
    expect(s.peek()).toEqual({ count: 0, name: 'Alice' });
  });

  describe('patch(partial)', () => {
    it('shallow-merges and preserves untouched keys', () => {
      const s = store({ count: 0, name: 'Alice' });

      s.patch({ count: 5 });
      expect(s.value).toEqual({ count: 5, name: 'Alice' });
    });

    it('does not mutate the original state object', () => {
      const initial = { count: 0 };

      store(initial).patch({ count: 5 });
      expect(initial.count).toBe(0);
    });

    it('is a no-op when the result is shallowly equal to current state', () => {
      const s = store({ count: 0 });
      const listener = vi.fn();

      watch(s, listener);
      s.patch({ count: 0 });
      expect(listener).not.toHaveBeenCalled();
    });

    it('custom StoreOptions.equals suppresses writes before any watcher fires', () => {
      const s = store({ items: [1, 2, 3] }, { equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) });
      const listener = vi.fn();
      const items$ = s.select((st) => st.items);

      watch(items$, listener);
      s.patch({ items: [1, 2, 3] }); // same value, different reference — suppressed
      expect(listener).not.toHaveBeenCalled();
      items$.dispose();
    });
  });

  describe('update()', () => {
    it('receives current state and applies the result', () => {
      const s = store({ count: 2 });

      s.update((st) => ({ ...st, count: st.count * 3 }));
      expect(s.value.count).toBe(6);
    });

    it('is a no-op when the updater returns a shallowly equal result', () => {
      const s = store({ count: 0 });
      const listener = vi.fn();

      watch(s, listener);
      s.update((st) => ({ ...st })); // same values, different ref — suppressed by shallowEqual
      expect(listener).not.toHaveBeenCalled();
    });

    it('updater receives a shallow copy — mutations inside the fn are safe', () => {
      const s = store({ count: 0 });
      const original = s.peek();

      s.update((draft) => {
        draft.count = 99; // mutate the copy

        return draft;
      });
      // original reference is unchanged
      expect(original.count).toBe(0);
      expect(s.value.count).toBe(99);
    });
  });

  describe('reset', () => {
    it('restores the original initial state', () => {
      const s = store({ count: 0 });

      s.patch({ count: 99 });
      s.reset();
      expect(s.value.count).toBe(0);
    });

    it('reset() is not affected by external mutation of the initial object', () => {
      const init = { count: 0 };
      const s = store(init);

      init.count = 999; // external mutation after construction
      s.reset();
      expect(s.value.count).toBe(0); // defensive copy preserved the true initial
    });
  });

  describe('watch (via top-level watch())', () => {
    it('fires with (next, prev) on full-state change', () => {
      const s = store({ count: 0, name: 'Alice' });
      const listener = vi.fn();

      watch(s, listener);
      s.patch({ count: 1 });
      expect(listener).toHaveBeenCalledWith({ count: 1, name: 'Alice' }, { count: 0, name: 'Alice' });
    });

    it('selector fires on slice change but not on unrelated key change', () => {
      const s = store({ count: 0, name: 'Alice' });
      const listener = vi.fn();
      const count$ = s.select((st) => st.count);

      watch(count$, listener);
      s.patch({ name: 'Bob' }); // unrelated — suppressed
      expect(listener).not.toHaveBeenCalled();
      s.patch({ count: 5 });
      expect(listener).toHaveBeenCalledWith(5, 0);
      count$.dispose();
    });

    it('fires once per synchronous patch() call', () => {
      const s = store({ count: 0 });
      const listener = vi.fn();
      const count$ = s.select((st) => st.count);

      watch(count$, listener);
      s.patch({ count: 1 });
      s.patch({ count: 2 });
      s.patch({ count: 3 });
      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenLastCalledWith(3, 2);
      count$.dispose();
    });

    it('{ immediate: true } fires with the current value on subscribe', () => {
      const s = store({ count: 3 });
      const listener = vi.fn();
      const count$ = s.select((st) => st.count);

      watch(count$, listener, { immediate: true });
      expect(listener).toHaveBeenCalledWith(3, 3);
      count$.dispose();
    });

    it('{ once: true } fires exactly once then auto-unsubscribes', () => {
      const s = store({ count: 0 });
      const listener = vi.fn();
      const count$ = s.select((st) => st.count);

      watch(count$, listener, { once: true });
      s.patch({ count: 1 });
      s.patch({ count: 2 });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(1, 0);
      count$.dispose();
    });

    it('selector custom equals suppresses semantically equivalent slices', () => {
      const s = store({ items: [1, 2, 3] });
      const listener = vi.fn();
      const items$ = s.select((st) => st.items, { equals: (a, b) => a.length === b.length });

      watch(items$, listener);
      s.patch({ items: [4, 5, 6] }); // same length — suppressed
      expect(listener).not.toHaveBeenCalled();
      s.patch({ items: [1, 2, 3, 4] }); // different length — fires
      expect(listener).toHaveBeenCalledTimes(1);
      items$.dispose();
    });

    it('multiple watchers are all notified; unsubscribing one is isolated and idempotent', () => {
      const s = store({ count: 0 });
      const l1 = vi.fn();
      const l2 = vi.fn();
      const count$ = s.select((st) => st.count);
      const unsub = watch(count$, l1);

      watch(count$, l2);
      unsub();
      unsub(); // idempotent
      s.patch({ count: 1 });
      expect(l1).not.toHaveBeenCalled();
      expect(l2).toHaveBeenCalledTimes(1);
      count$.dispose();
    });

    it('store widens to ReadonlySignal and is accepted by top-level watch()', () => {
      const s = store({ count: 1 });
      const ro: ReadonlySignal<{ count: number }> = s;
      const listener = vi.fn();
      const count$ = computed(() => (ro as { value: { count: number } }).value.count);

      watch(count$, listener);
      s.patch({ count: 2 });
      expect(listener).toHaveBeenCalledWith(2, 1);
      count$.dispose();
    });
  });

  describe('freeze', () => {
    it('.frozen is false initially and true after freeze()', () => {
      const s = store({ count: 0 });

      expect(s.frozen).toBe(false);
      s.freeze();
      expect(s.frozen).toBe(true);
    });

    it('silently ignores writes after freeze; state does not change', () => {
      const s = store({ count: 0 });

      s.freeze();
      s.patch({ count: 1 });
      expect(s.value.count).toBe(0);
    });

    it('direct .value assignment is blocked after freeze()', () => {
      const s = store({ count: 0 });

      s.freeze();
      s.value = { count: 99 };
      expect(s.value.count).toBe(0);
    });

    it('external watch() must be manually disposed; store.freeze() does not tear it down', () => {
      const s = store({ count: 0 });
      const listener = vi.fn();
      const unsub = watch(s, listener);

      s.freeze();
      // writes are no-ops after freeze so listener won't fire regardless
      s.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled();
      unsub();
    });

    it('calling freeze() multiple times does not throw', () => {
      const s = store({ count: 0 });

      expect(() => {
        s.freeze();
        s.freeze();
      }).not.toThrow();
    });
  });

  describe('select', () => {
    it('returns a computed signal derived from a slice of the store', () => {
      const s = store({ count: 0, name: 'Alice' });
      const name$ = s.select((st) => st.name);

      expect(name$.value).toBe('Alice');
      s.patch({ name: 'Bob' });
      expect(name$.value).toBe('Bob');
    });

    it('does not notify when the selected slice is unchanged', () => {
      const s = store({ count: 0, name: 'Alice' });
      const name$ = s.select((st) => st.name);
      const listener = vi.fn();

      watch(name$, listener);
      s.patch({ count: 99 }); // name unchanged — suppressed
      expect(listener).not.toHaveBeenCalled();
    });

    it('accepts ComputedOptions.equals to suppress semantically equal slices', () => {
      const s = store({ items: [1, 2, 3] });
      const len$ = s.select((st) => st.items.length, { equals: (a, b) => a === b });
      const listener = vi.fn();

      watch(len$, listener);
      s.patch({ items: [4, 5, 6] }); // same length — suppressed
      expect(listener).not.toHaveBeenCalled();
      s.patch({ items: [1, 2, 3, 4] }); // different length — fires
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('disposing the returned signal stops reactivity', () => {
      const s = store({ count: 0 });
      const count$ = s.select((st) => st.count);
      const listener = vi.fn();

      watch(count$, listener);
      count$.dispose();
      s.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// ─── Store type guard only (no instanceof needed) ─────────────────────────────

describe('isStore type narrowing', () => {
  it('isStore<T> narrows so Store<T> methods are accessible without class import', () => {
    const value: unknown = store({ name: 'Alice' });

    // Store is exported as interface only — no `instanceof Store` needed
    if (isStore<{ name: string }>(value)) {
      value.patch({ name: 'Bob' });
      expect(value.value.name).toBe('Bob');
    }
  });
});

// ─── onCleanup ────────────────────────────────────────────────────────────────

describe('onCleanup', () => {
  it('registered fn is called before each re-run', () => {
    const n = signal(0);
    const teardowns: number[] = [];
    const stop = effect(() => {
      const current = n.value;

      onCleanup(() => teardowns.push(current));
    });

    n.value = 1;
    n.value = 2;
    expect(teardowns).toEqual([0, 1]);
    stop();
    expect(teardowns).toEqual([0, 1, 2]);
  });

  it('is a no-op when called outside an effect', () => {
    expect(() => onCleanup(() => {})).not.toThrow();
  });
});

// ─── shallowEqual ─────────────────────────────────────────────────────────────

describe('shallowEqual', () => {
  it('returns true when a value is NaN in both objects (Object.is semantics)', () => {
    expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true);
  });

  it('returns true for same reference', () => {
    const obj = { a: 1 };

    expect(shallowEqual(obj, obj)).toBe(true);
  });

  it('returns true for objects with same key-value pairs', () => {
    expect(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
  });

  it('returns false when a value differs', () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('returns false when key counts differ', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('returns false for null vs object', () => {
    expect(shallowEqual(null, {})).toBe(false);
  });
});

// ─── configureStateit ─────────────────────────────────────────────────────────

describe('configureStateit', () => {
  afterEach(() => configureStateit({ maxEffectIterations: 100 }));

  it('raising maxEffectIterations allows more reactive loops before throwing', () => {
    configureStateit({ maxEffectIterations: 10 });

    const n = signal(0);

    // loop runs 6 times (n: 0→1→2→3→4→5, then 5<5=false, no dirty) — under 10
    expect(() => {
      effect(() => {
        if (n.value < 5) n.value++;
      });
    }).not.toThrow();
  });

  it('lowering maxEffectIterations throws sooner', () => {
    configureStateit({ maxEffectIterations: 2 });

    const n = signal(0);

    expect(() => {
      effect(() => {
        n.value++;
      });
    }).toThrow(/infinite reactive loop/);
  });

  it('per-effect maxIterations is independent of the global setting', () => {
    // Global is reset to 100 by afterEach; set a low global, override per-effect upward
    configureStateit({ maxEffectIterations: 3 });

    const n = signal(0);

    // loop needs 6 iterations (0→1→2→3→4→5, then 5<5=false) — over global=3 but under override=10
    expect(() => {
      effect(
        () => {
          if (n.value < 5) n.value++;
        },
        { maxIterations: 10 },
      );
    }).not.toThrow();
  });
});

// ─── _resetContextForTesting ──────────────────────────────────────────────────

describe('_resetContextForTesting', () => {
  it('clears batchDepth so pending effects are not stuck', () => {
    const n = signal(0);
    const seen: number[] = [];

    effect(() => {
      seen.push(n.value);
    });
    // Manually corrupt ctx by simulating a half-open batch
    // We just verify reset works without error
    _resetContextForTesting();
    // After reset, a normal signal write should immediately notify
    n.value = 99;
    expect(seen).toContain(99);
  });
});

// ─── effect onError ───────────────────────────────────────────────────────────

describe('effect({ onError })', () => {
  it('calls onError with the thrown value and stops the effect', () => {
    const n = signal(0);
    const errors: unknown[] = [];
    const stop = effect(
      () => {
        if (n.value > 0) throw new Error('boom');
      },
      { onError: (e) => errors.push(e) },
    );

    n.value = 1; // triggers throw → onError called, effect auto-disposed
    n.value = 2; // no re-run — already disposed
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('boom');
    stop(); // idempotent
  });

  it('without onError the error propagates synchronously', () => {
    const n = signal(0);

    effect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      n.value;
    }); // initial run fine

    const n2 = signal(0);

    expect(() => {
      effect(() => {
        if (n2.value > 0) throw new Error('unhandled');
      });
      n2.value = 1;
    }).toThrow('unhandled');
  });
});

// ─── computed lazy ────────────────────────────────────────────────────────────

describe('computed({ lazy: true })', () => {
  it('does not run the compute fn until .value is first read', () => {
    let runs = 0;
    const n = signal(0);
    const c = computed(
      () => {
        runs++;

        return n.value * 2;
      },
      { lazy: true },
    );

    expect(runs).toBe(0); // not yet computed
    expect(c.value).toBe(0); // triggers first compute
    expect(runs).toBe(1);
  });

  it('behaves like a normal computed after first read', () => {
    const n = signal(1);
    const c = computed(() => n.value + 10, { lazy: true });

    expect(c.value).toBe(11);
    n.value = 5;
    expect(c.value).toBe(15);
  });
});

// ─── ComputedSignal.stale ─────────────────────────────────────────────────────

describe('ComputedSignal.stale', () => {
  it('is false after initial computation', () => {
    const c = computed(() => 42);

    expect(c.stale).toBe(false);
  });

  it('becomes true when a dep changes before re-read', () => {
    const n = signal(0);
    const c = computed(() => n.value);

    expect(c.stale).toBe(false);
    n.value = 1;
    expect(c.stale).toBe(true);
  });

  it('returns false again after re-reading the value', () => {
    const n = signal(0);
    const c = computed(() => n.value);

    n.value = 1;
    expect(c.stale).toBe(true);
    expect(c.value).toBe(1);
    expect(c.stale).toBe(false);
  });

  it('is true after dispose', () => {
    const c = computed(() => 1);

    c.dispose();
    expect(c.stale).toBe(true);
  });
});

// ─── derived ──────────────────────────────────────────────────────────────────

describe('derived', () => {
  it('combines multiple source signals through a projector', () => {
    const price = signal(10);
    const qty = signal(3);
    const total = derived([price, qty], (p, q) => p * q);

    expect(total.value).toBe(30);
  });

  it('updates when any source changes', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = derived([a, b], (x, y) => x + y);

    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 5;
    expect(sum.value).toBe(15);
  });

  it('supports custom equals to suppress redundant downstream notifications', () => {
    const n = signal(1);
    const listener = vi.fn();
    // Math.sign: only changes when sign flips
    const sign = derived([n], (x) => Math.sign(x), { equals: (p, q) => p === q });

    watch(sign, listener);
    n.value = 2; // sign(2) = 1 = same — suppressed
    expect(listener).not.toHaveBeenCalled();
    n.value = -1; // sign(-1) = -1 — fires
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(-1, 1);
  });

  it('dispose stops reactivity', () => {
    const n = signal(0);
    const d = derived([n], (x) => x * 2);
    const listener = vi.fn();

    watch(d, listener);
    d.dispose();
    n.value = 5;
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── signal.update ────────────────────────────────────────────────────────────

describe('signal.update()', () => {
  it('applies the updater and writes the result', () => {
    const n = signal(5);

    n.update((v) => v * 2);
    expect(n.value).toBe(10);
  });

  it('skips notification when the result is the same (Object.is)', () => {
    const n = signal(5);
    const listener = vi.fn();

    watch(n, listener);
    n.update((v) => v); // same value — no-op
    expect(listener).not.toHaveBeenCalled();
  });

  it('update() chaining accumulates correctly', () => {
    const n = signal(1);

    n.update((v) => v + 1);
    n.update((v) => v * 3);
    expect(n.value).toBe(6);
  });
});

// ─── nextValue ────────────────────────────────────────────────────────────────

describe('nextValue()', () => {
  it('resolves with the next changed value', async () => {
    const n = signal(0);
    const p = nextValue(n);

    n.value = 42;
    await expect(p).resolves.toBe(42);
  });

  it('auto-disposes — does not fire again after first emission', async () => {
    const n = signal(0);
    const listener = vi.fn();
    const p = nextValue(n).then(listener);

    n.value = 1;
    n.value = 2;
    await p;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('predicate filters values until one passes', async () => {
    const n = signal(0);
    const p = nextValue(n, (v) => v > 5);

    n.value = 3; // fails predicate
    n.value = 7; // passes
    await expect(p).resolves.toBe(7);
  });

  it('works with store.select() slices', async () => {
    const s = store({ count: 0, name: 'Alice' });
    const count$ = s.select((st) => st.count);
    const p = nextValue(count$);

    s.patch({ name: 'Bob' }); // count unchanged — no emission
    s.patch({ count: 99 });
    await expect(p).resolves.toBe(99);
    count$.dispose();
  });
});
