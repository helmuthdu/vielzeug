import { createSourceCore } from '../core';
import { mergeSource } from '../merge';

const makeSource = (initial: readonly number[]) => {
  const core = createSourceCore();
  let current: readonly number[] = initial;

  return {
    get current() {
      return current;
    },
    dispose: () => core.dispose(),
    set(items: readonly number[]) {
      current = items;
      core.notify();
    },
    subscribe: (l: () => void) => core.subscribe(l),
  };
};

// Same as makeSource(), but also exposes disposalSignal — the auto-dispose-on-all-parents-gone
// behavior only activates when every source in the array exposes one (see merge.ts).
const makeDisposableSource = (initial: readonly number[]) => {
  const core = createSourceCore();
  let current: readonly number[] = initial;

  return {
    get current() {
      return current;
    },
    get disposalSignal() {
      return core.disposalSignal;
    },
    dispose: () => core.dispose(),
    set(items: readonly number[]) {
      current = items;
      core.notify();
    },
    subscribe: (l: () => void) => core.subscribe(l),
  };
};

describe('mergeSource', () => {
  it('computes initial value from parents at construction', () => {
    const a = makeSource([1, 2]);
    const b = makeSource([3, 4]);
    const merged = mergeSource([a, b], (all) => all.flat());

    expect(merged.current).toEqual([1, 2, 3, 4]);
  });

  it('recomputes when first parent changes', () => {
    const a = makeSource([1]);
    const b = makeSource([2]);
    const merged = mergeSource([a, b], (all) => all.flat());

    a.set([10]);

    expect(merged.current).toEqual([10, 2]);
  });

  it('recomputes when second parent changes', () => {
    const a = makeSource([1]);
    const b = makeSource([2]);
    const merged = mergeSource([a, b], (all) => all.flat());

    b.set([20]);

    expect(merged.current).toEqual([1, 20]);
  });

  it('notifies subscribers when any parent changes', () => {
    const a = makeSource([1]);
    const b = makeSource([2]);
    const merged = mergeSource([a, b], (all) => all.flat());
    const listener = vi.fn();

    merged.subscribe(listener);
    a.set([99]);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe works correctly', () => {
    const a = makeSource([1]);
    const merged = mergeSource([a], (all) => all.flat());
    const listener = vi.fn();

    const unsub = merged.subscribe(listener);

    unsub();
    a.set([99]);

    expect(listener).not.toHaveBeenCalled();
  });

  it('dispose stops all subscriptions', () => {
    const a = makeSource([1]);
    const b = makeSource([2]);
    const merged = mergeSource([a, b], (all) => all.flat());
    const listener = vi.fn();

    merged.subscribe(listener);
    merged.dispose();

    a.set([99]);
    b.set([88]);

    // After dispose, no notifications
    expect(listener).not.toHaveBeenCalled();
  });

  it('supports custom combine logic (e.g. dedup)', () => {
    const a = makeSource([1, 2, 3]);
    const b = makeSource([2, 3, 4]);
    const merged = mergeSource([a, b], (all) => [...new Set(all.flat())]);

    expect(merged.current).toEqual([1, 2, 3, 4]);
  });

  it('works with a single source', () => {
    const a = makeSource([5, 6]);
    const merged = mergeSource([a], (all) => all.flat());

    expect(merged.current).toEqual([5, 6]);

    a.set([7]);

    expect(merged.current).toEqual([7]);
  });

  it('combine() throw during parent update propagates the error', () => {
    const a = makeSource([1, 2]);
    let shouldThrow = false;
    const merged = mergeSource([a], (all) => {
      if (shouldThrow) throw new Error('combine-boom');

      return all.flat();
    });

    merged.subscribe(() => {});

    shouldThrow = true;

    expect(() => a.set([99])).toThrow('combine-boom');
  });

  it('double-dispose is idempotent (no throw)', () => {
    const a = makeSource([1]);
    const merged = mergeSource([a], (all) => all.flat());

    merged.dispose();

    expect(() => merged.dispose()).not.toThrow();
  });

  it('disposed getter reflects lifecycle state', () => {
    const a = makeSource([1]);
    const merged = mergeSource([a], (all) => all.flat());

    expect(merged.disposed).toBe(false);

    merged.dispose();

    expect(merged.disposed).toBe(true);
  });

  it('disposalSignal aborts on dispose()', () => {
    const a = makeSource([1]);
    const merged = mergeSource([a], (all) => all.flat());

    expect(merged.disposalSignal.aborted).toBe(false);

    merged.dispose();

    expect(merged.disposalSignal.aborted).toBe(true);
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const a = makeSource([1]);
    const merged = mergeSource([a], (all) => all.flat());

    merged[Symbol.dispose]();

    expect(merged.disposed).toBe(true);
  });

  it('[Symbol.dispose] works when destructured off the source', () => {
    const a = makeSource([1]);
    const merged = mergeSource([a], (all) => all.flat());
    const dispose = merged[Symbol.dispose];

    dispose();

    expect(merged.disposed).toBe(true);
  });

  describe('auto-dispose when every parent disposes (only when all parents expose disposalSignal)', () => {
    it('auto-disposes once the single tracked parent disposes', () => {
      const a = makeDisposableSource([1]);
      const merged = mergeSource([a], (all) => all.flat());

      expect(merged.disposed).toBe(false);

      a.dispose();

      expect(merged.disposed).toBe(true);
    });

    it('stays alive until every parent has disposed, not just the first', () => {
      const a = makeDisposableSource([1]);
      const b = makeDisposableSource([2]);
      const merged = mergeSource([a, b], (all) => all.flat());

      a.dispose();
      expect(merged.disposed).toBe(false);

      b.dispose();
      expect(merged.disposed).toBe(true);
    });

    it('auto-disposes immediately when every parent is already disposed before mergeSource() is called', () => {
      const a = makeDisposableSource([1]);
      const b = makeDisposableSource([2]);

      a.dispose();
      b.dispose();

      const merged = mergeSource([a, b], (all) => all.flat());

      expect(merged.disposed).toBe(true);
    });

    it('does not auto-dispose when any parent lacks a disposalSignal', () => {
      const a = makeDisposableSource([1]);
      const b = makeSource([2]);
      const merged = mergeSource([a, b], (all) => all.flat());

      a.dispose();

      expect(merged.disposed).toBe(false);
    });

    it('does not auto-dispose when no parent exposes a disposalSignal (existing behavior, unchanged)', () => {
      const a = makeSource([1]);
      const merged = mergeSource([a], (all) => all.flat());

      a.dispose();

      expect(merged.disposed).toBe(false);
    });
  });
});
