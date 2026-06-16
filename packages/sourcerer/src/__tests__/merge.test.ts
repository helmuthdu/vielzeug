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
});
