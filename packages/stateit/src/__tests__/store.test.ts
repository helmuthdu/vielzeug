import { computed, isStore, type ReadonlySignal, shallowEqual, store, watch } from '../';

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

// ─── isStore type narrowing ───────────────────────────────────────────────────

describe('isStore type narrowing', () => {
  it('isStore<T> narrows so Store<T> methods are accessible without class import', () => {
    const value: unknown = store({ name: 'Alice' });

    if (isStore<{ name: string }>(value)) {
      value.patch({ name: 'Bob' });
      expect(value.value.name).toBe('Bob');
    }
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

    it('ignores writes after freeze and warns in dev; state does not change', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const s = store({ count: 0 });

      s.freeze();
      s.patch({ count: 1 });
      expect(s.value.count).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('frozen'));
      warnSpy.mockRestore();
    });

    it('direct .value assignment is blocked after freeze() and warns in dev', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const s = store({ count: 0 });

      s.freeze();
      s.value = { count: 99 };
      expect(s.value.count).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('frozen'));
      warnSpy.mockRestore();
    });

    it('external watch() must be manually disposed; store.freeze() does not tear it down', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const s = store({ count: 0 });
      const listener = vi.fn();
      const unsub = watch(s, listener);

      s.freeze();
      s.patch({ count: 1 });
      expect(listener).not.toHaveBeenCalled();
      unsub();
      warnSpy.mockRestore();
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

// ─── store.reset() isolation ──────────────────────────────────────────────────

describe('store.reset() isolation', () => {
  it('direct mutation of the post-reset value does not corrupt the initial snapshot', () => {
    const s = store({ count: 0 });

    s.reset();

    (s.value as { count: number }).count = 99;

    s.reset();
    expect(s.value.count).toBe(0);
  });

  it('each reset() produces a fresh object so watchers receive distinct references', () => {
    const s = store({ count: 0 });

    s.patch({ count: 5 });

    const before = s.value;

    s.reset();
    s.patch({ count: 7 });
    s.reset();

    expect(s.value.count).toBe(0);
    expect(s.value).not.toBe(before);
  });
});
