import { describe, expect, it, vi } from 'vitest';

import { createVirtualizer, DEFAULT_ESTIMATE_SIZE, DEFAULT_OVERSCAN } from '../virtualizer';
import { flushMicrotasks, makeContainer, makeWindow } from './test-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scrollEl(el: HTMLElement, top: number) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top });
  el.dispatchEvent(new Event('scroll'));
}

// ─── Normalization ────────────────────────────────────────────────────────────

describe('createVirtualizer – normalization', () => {
  it('clamps negative count to 0', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: -5, estimateSize: 20 });

    expect(v.count).toBe(0);
    expect(v.items).toHaveLength(0);
    v.destroy();
  });

  it('uses DEFAULT_ESTIMATE_SIZE for missing estimateSize', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 3 });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.destroy();
  });

  it('falls back to DEFAULT_ESTIMATE_SIZE for invalid estimateSize function return', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 3, estimateSize: () => -10 });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.destroy();
  });

  it('uses DEFAULT_OVERSCAN when overscan is omitted', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    expect(v.items[0].index).toBeLessThanOrEqual(DEFAULT_OVERSCAN);
    v.destroy();
  });

  it('clamps negative gap to 0', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, gap: -99 });

    expect(v.totalSize).toBe(5 * 20);
    v.destroy();
  });
});

// ─── Basic rendering ───────────────────────────────────────────────────────────

describe('createVirtualizer – rendering', () => {
  it('emits the correct visible window with overscan', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20, overscan: { end: 1, start: 0 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBe(5);
    v.destroy();
  });

  it('applies asymmetric overscan with gap', () => {
    const el = makeContainer({ clientHeight: 60 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 20, gap: 10, overscan: { end: 2, start: 1 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBe(3);
    v.destroy();
  });

  it('emits empty items when count is 0', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();

    createVirtualizer(el, { count: 0, estimateSize: 20, onChange });

    const last = onChange.mock.calls.at(-1)?.[0];

    expect(last?.items).toHaveLength(0);
    expect(last?.totalSize).toBe(0);
  });

  it('emits empty items when viewport size is 0', () => {
    const el = makeContainer({ clientHeight: 0 });
    const onChange = vi.fn();

    createVirtualizer(el, { count: 10, estimateSize: 20, onChange });

    expect(onChange.mock.calls.at(-1)?.[0].items).toHaveLength(0);
  });

  it('applies gap to totalSize correctly', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 4, estimateSize: 10, gap: 5 });

    expect(v.totalSize).toBe(55);
    v.destroy();
  });
});

// ─── Horizontal ───────────────────────────────────────────────────────────────

describe('createVirtualizer – horizontal', () => {
  it('reads scrollLeft and clientWidth', () => {
    const el = makeContainer({ clientHeight: 50, clientWidth: 200, scrollLeft: 0 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 30, horizontal: true, overscan: { end: 0, start: 0 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBeLessThanOrEqual(6);
    v.destroy();
  });
});

// ─── Window target ─────────────────────────────────────────────────────────────

describe('createVirtualizer – window target', () => {
  it('uses scrollY and innerHeight from window', () => {
    const win = makeWindow(100, 400);
    const v = createVirtualizer(win, { count: 50, estimateSize: 20, overscan: { end: 0, start: 0 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBe(4);
    v.destroy();
  });

  it('updates visible window on scroll', () => {
    const win = makeWindow(100, 400);
    const v = createVirtualizer(win, { count: 50, estimateSize: 20, overscan: { end: 0, start: 0 } });

    win.scrollTo({ top: 100 });
    win.dispatchEvent(new Event('scroll'));

    expect(v.items[0]?.index).toBe(5);
    v.destroy();
  });
});

// ─── initialOffset ─────────────────────────────────────────────────────────────

describe('createVirtualizer – initialOffset', () => {
  it('positions viewport at initialOffset on creation', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, {
      count: 50,
      estimateSize: 20,
      initialOffset: 200,
      overscan: { end: 0, start: 0 },
    });

    expect(v.items[0]?.index).toBe(10);
    v.destroy();
  });
});

// ─── VirtualItem shape ─────────────────────────────────────────────────────────

describe('createVirtualizer – VirtualItem shape', () => {
  it('emits correct start/end/size for each item', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, gap: 5, overscan: { end: 0, start: 0 } });

    expect(v.items[0]!).toMatchObject({ end: 20, index: 0, size: 20, start: 0 });
    expect(v.items[1]!).toMatchObject({ end: 45, index: 1, size: 20, start: 25 });
    v.destroy();
  });
});

// ─── measure ──────────────────────────────────────────────────────────────────

describe('createVirtualizer – measure', () => {
  it('applies measured size in the next microtask', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    v.measure(0, 50);
    await flushMicrotasks();

    const item0 = v.items.find((i) => i.index === 0)!;

    expect(item0.size).toBe(50);
    expect(item0.end).toBe(50);
    v.destroy();
  });

  it('rebuilds only from the changed index forward (incremental)', async () => {
    const el = makeContainer({ clientHeight: 1000 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, overscan: { end: 0, start: 0 } });

    v.measure(2, 40);
    await flushMicrotasks();

    expect(v.items.find((i) => i.index === 0)?.start).toBe(0);
    expect(v.items.find((i) => i.index === 1)?.start).toBe(20);
    expect(v.items.find((i) => i.index === 2)?.size).toBe(40);
    expect(v.items.find((i) => i.index === 3)?.start).toBe(80);
    v.destroy();
  });

  it('ignores measure with invalid index or size', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });
    const before = v.totalSize;

    v.measure(-1, 50);
    v.measure(100, 50);
    v.measure(0, -10);
    await flushMicrotasks();

    expect(v.totalSize).toBe(before);
    v.destroy();
  });

  it('skips rebuild when measured size is unchanged', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });

    v.measure(0, 20);
    await flushMicrotasks();

    const callsBefore = onChange.mock.calls.length;

    v.measure(0, 20);
    await flushMicrotasks();

    expect(onChange.mock.calls.length).toBe(callsBefore);
    v.destroy();
  });

  it('batches multiple measure calls into one microtask rebuild', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, onChange });

    const callsBefore = onChange.mock.calls.length;

    v.measure(0, 50);
    v.measure(1, 60);
    v.measure(2, 70);
    await flushMicrotasks();

    expect(onChange.mock.calls.length).toBe(callsBefore + 1);
    v.destroy();
  });
});

// ─── measureBatch ─────────────────────────────────────────────────────────────

describe('createVirtualizer – measureBatch', () => {
  it('applies all valid entries in one microtask', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, onChange });

    const callsBefore = onChange.mock.calls.length;

    v.measureBatch([
      { index: 0, size: 50 },
      { index: 1, size: 60 },
    ]);
    await flushMicrotasks();

    expect(onChange.mock.calls.length).toBe(callsBefore + 1);
    expect(v.items.find((i) => i.index === 0)?.size).toBe(50);
    v.destroy();
  });

  it('skips rebuild when size is already recorded at the same value', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });

    v.measure(0, 42);
    await flushMicrotasks();

    const callsBefore = onChange.mock.calls.length;

    v.measureBatch([{ index: 0, size: 42 }]);
    await flushMicrotasks();

    expect(onChange.mock.calls.length).toBe(callsBefore);
    v.destroy();
  });

  it('ignores invalid entries', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });
    const before = v.totalSize;

    v.measureBatch([
      { index: -1, size: 50 },
      { index: 999, size: 50 },
    ]);
    await flushMicrotasks();

    expect(v.totalSize).toBe(before);
    v.destroy();
  });

  it('uses the last valid size for duplicate indices', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measureBatch([
      { index: 0, size: 30 },
      { index: 0, size: 50 },
    ]);
    await flushMicrotasks();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(50);
    v.destroy();
  });

  it('is a no-op for empty array', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });
    const callsBefore = onChange.mock.calls.length;

    v.measureBatch([]);
    await flushMicrotasks();

    expect(onChange.mock.calls.length).toBe(callsBefore);
    v.destroy();
  });
});

// ─── measureEl ────────────────────────────────────────────────────────────────

describe('createVirtualizer – measureEl', () => {
  it('returns a disconnect function', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });
    const disconnect = v.measureEl(0, document.createElement('div'));

    expect(typeof disconnect).toBe('function');
    expect(() => disconnect()).not.toThrow();
    v.destroy();
  });

  it('returns no-op when destroyed', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.destroy();

    const disconnect = v.measureEl(0, document.createElement('div'));

    expect(() => disconnect()).not.toThrow();
  });
});

// ─── refresh / invalidate / redraw ─────────────────────────────────────────────

describe('createVirtualizer – refresh / invalidate', () => {
  it('refresh keeps measured sizes', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const keys = [10, 20, 30, 40, 50];
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      getItemKey: (i) => keys[i]!,
      overscan: { end: 0, start: 0 },
    });

    v.measure(0, 50);
    await flushMicrotasks();

    v.refresh();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(50);
    v.destroy();
  });

  it('invalidate clears all measurements', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measure(0, 50);
    await flushMicrotasks();

    v.invalidate();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);
    v.destroy();
  });

  it('invalidate after pending measure uses estimate', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measure(0, 50);
    v.invalidate();
    await flushMicrotasks();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);
    expect(v.totalSize).toBe(5 * 20);
    v.destroy();
  });
});

// ─── redraw ───────────────────────────────────────────────────────────────────

describe('createVirtualizer – redraw', () => {
  it('re-emits without changing sizes or offsets (O(1) path)', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });
    const callsBefore = onChange.mock.calls.length;

    v.redraw();

    expect(onChange.mock.calls.length).toBe(callsBefore + 1);
    // Sizes unchanged
    expect(v.totalSize).toBe(5 * 20);
    v.destroy();
  });

  it('preserves measured sizes (does not clear cache)', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    v.measure(0, 50);
    await flushMicrotasks();

    v.redraw();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(50);
    v.destroy();
  });

  it('is a no-op after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.destroy();

    expect(() => v.redraw()).not.toThrow();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('createVirtualizer – update', () => {
  it('applies count, estimateSize, gap, overscan atomically', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, gap: 0 });

    v.update({ count: 5, estimateSize: 30, gap: 5 });

    expect(v.count).toBe(5);
    expect(v.totalSize).toBe(170);
    v.destroy();
  });

  it('changing estimateSize clears measurements', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measure(0, 50);
    await flushMicrotasks();

    v.update({ estimateSize: 30 });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(30);
    v.destroy();
  });

  it('removing getItemKey clears measurements', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const keys = ['a', 'b', 'c', 'd', 'e'];
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, getItemKey: (i) => keys[i]! });

    v.measure(0, 50);
    await flushMicrotasks();

    v.update({ getItemKey: undefined });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);
    v.destroy();
  });

  it('is a no-op after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.destroy();

    expect(() => v.update({ count: 10 })).not.toThrow();
    expect(v.count).toBe(5);
  });
});

// ─── onRangeChange ────────────────────────────────────────────────────────────

describe('createVirtualizer – onRangeChange', () => {
  it('fires on initial render', () => {
    const el = makeContainer({ clientHeight: 100 });
    const onRangeChange = vi.fn();

    createVirtualizer(el, { count: 50, estimateSize: 20, onRangeChange, overscan: { end: 0, start: 0 } });

    expect(onRangeChange).toHaveBeenCalledWith(0, 4);
  });

  it('fires with -1,-1 when count is 0', () => {
    const el = makeContainer({ clientHeight: 100 });
    const onRangeChange = vi.fn();

    createVirtualizer(el, { count: 0, estimateSize: 20, onRangeChange });

    expect(onRangeChange).toHaveBeenCalledWith(-1, -1);
  });

  it('works without onChange', () => {
    const el = makeContainer({ clientHeight: 100 });
    const onRangeChange = vi.fn();

    const v = createVirtualizer(el, { count: 50, estimateSize: 20, onRangeChange, overscan: { end: 0, start: 0 } });

    expect(onRangeChange).toHaveBeenCalledWith(0, 4);

    scrollEl(el, 100);

    expect(onRangeChange).toHaveBeenLastCalledWith(5, 9);
    v.destroy();
  });

  it('fires before onChange', () => {
    const el = makeContainer({ clientHeight: 100 });
    const order: string[] = [];
    const v = createVirtualizer(el, {
      count: 50,
      estimateSize: 20,
      onChange: () => order.push('onChange'),
      onRangeChange: () => order.push('onRangeChange'),
      overscan: { end: 0, start: 0 },
    });

    order.length = 0;
    scrollEl(el, 100);

    expect(order).toEqual(['onRangeChange', 'onChange']);
    v.destroy();
  });
});

// ─── prepend ──────────────────────────────────────────────────────────────────

describe('createVirtualizer – prepend', () => {
  it('increases count and totalSize', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.prepend(3);

    expect(v.count).toBe(8);
    expect(v.totalSize).toBe(8 * 20);
    v.destroy();
  });

  it('adjusts scrollOffset to maintain visual position', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, overscan: { end: 0, start: 0 } });

    scrollEl(el, 100);

    const firstBefore = v.items[0]?.index ?? -1;

    v.prepend(5);

    expect(v.scrollOffset).toBe(200);
    expect(v.items[0]?.index).toBe(firstBefore + 5);
    v.destroy();
  });

  it('is a no-op for 0', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });
    const before = v.totalSize;

    v.prepend(0);

    expect(v.totalSize).toBe(before);
    v.destroy();
  });

  it('is a no-op after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.destroy();

    expect(() => v.prepend(3)).not.toThrow();
  });
});

// ─── measurementCache ─────────────────────────────────────────────────────────

describe('createVirtualizer – measurementCache', () => {
  it('uses an external cache', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const cache = new Map<number | string, number>();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, measurementCache: cache });

    v.measure(0, 50);
    await flushMicrotasks();

    expect(cache.get(0)).toBe(50);
    v.destroy();
  });

  it('restores measurements from a pre-populated cache', () => {
    const el = makeContainer({ clientHeight: 200 });
    const cache = new Map<number | string, number>([
      [0, 80],
      [1, 60],
    ]);
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      measurementCache: cache,
      overscan: { end: 0, start: 0 },
    });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(80);
    expect(v.items.find((i) => i.index === 1)?.size).toBe(60);
    v.destroy();
  });

  it('persists measurements across virtualizer instances', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const cache = new Map<number | string, number>();

    const v1 = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      measurementCache: cache,
      overscan: { end: 0, start: 0 },
    });

    v1.measure(0, 99);
    await flushMicrotasks();
    v1.destroy();

    const v2 = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      measurementCache: cache,
      overscan: { end: 0, start: 0 },
    });

    expect(v2.items.find((i) => i.index === 0)?.size).toBe(99);
    v2.destroy();
  });
});

// ─── scrollToIndex ─────────────────────────────────────────────────────────────

describe('createVirtualizer – scrollToIndex', () => {
  it('does not scroll when already visible (auto)', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 20 });
    const before = el.scrollTop;

    v.scrollToIndex(0);

    expect(el.scrollTop).toBe(before);
    v.destroy();
  });

  it('scrolls to start align', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    v.scrollToIndex(10, { align: 'start' });

    expect(el.scrollTop).toBe(200);
    v.destroy();
  });

  it('scrolls to center align', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    v.scrollToIndex(10, { align: 'center' });

    expect(el.scrollTop).toBe(160);
    v.destroy();
  });

  it('scrolls to end align', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    v.scrollToIndex(10, { align: 'end' });

    expect(el.scrollTop).toBe(120);
    v.destroy();
  });

  it('clamps out-of-range index', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20 });

    expect(() => v.scrollToIndex(9999, { align: 'start' })).not.toThrow();
    v.destroy();
  });

  it('calls onComplete via microtask for non-smooth scroll', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });
    const onComplete = vi.fn();

    v.scrollToIndex(10, { align: 'start', onComplete });

    expect(onComplete).not.toHaveBeenCalled();

    await flushMicrotasks();

    expect(onComplete).toHaveBeenCalledOnce();
    v.destroy();
  });

  it('calls onComplete when item is already visible', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 20 });
    const onComplete = vi.fn();

    v.scrollToIndex(0, { align: 'auto', onComplete });

    await flushMicrotasks();

    expect(onComplete).toHaveBeenCalledOnce();
    v.destroy();
  });
});

// ─── scrollToOffset ────────────────────────────────────────────────────────────

describe('createVirtualizer – scrollToOffset', () => {
  it('clamps to valid range', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.scrollToOffset(-999);

    expect(el.scrollTop).toBe(0);

    v.scrollToOffset(999999);

    expect(el.scrollTop).toBe(Math.max(0, v.totalSize - 100));
    v.destroy();
  });
});

// ─── scrollOffset property ────────────────────────────────────────────────────

describe('createVirtualizer – scrollOffset property', () => {
  it('reflects the current scroll position', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 20 });

    v.scrollToOffset(80);
    scrollEl(el, 80);

    expect(v.scrollOffset).toBe(80);
    v.destroy();
  });

  it('can be used to restore scroll via initialOffset', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v1 = createVirtualizer(el, { count: 20, estimateSize: 20 });

    v1.scrollToOffset(100);
    scrollEl(el, 100);

    const savedOffset = v1.scrollOffset;

    v1.destroy();

    const v2 = createVirtualizer(el, {
      count: 20,
      estimateSize: 20,
      initialOffset: savedOffset,
      overscan: { end: 0, start: 0 },
    });

    expect(v2.items[0]?.index).toBe(5);
    v2.destroy();
  });
});

// ─── VirtualizerState ─────────────────────────────────────────────────────────

describe('createVirtualizer – VirtualizerState', () => {
  it('onChange receives items, stickyItems, totalSize', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();

    createVirtualizer(el, { count: 10, estimateSize: 20, onChange });

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state).toHaveProperty('items');
    expect(state).toHaveProperty('stickyItems');
    expect(state).toHaveProperty('totalSize');
    expect(state.stickyItems).toHaveLength(0);
  });
});

// ─── Sticky ───────────────────────────────────────────────────────────────────

describe('createVirtualizer – sticky', () => {
  it('returns empty stickyItems without sticky option', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20 });

    expect(v.stickyItems).toHaveLength(0);
    v.destroy();
  });

  it('pins the last sticky item above the fold', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, {
      count: 20,
      estimateSize: 20,
      overscan: { end: 0, start: 0 },
      sticky: (i) => i === 0 || i === 5,
    });

    expect(v.stickyItems).toHaveLength(0);

    scrollEl(el, 60);

    expect(v.stickyItems).toHaveLength(1);
    expect(v.stickyItems[0]?.index).toBe(0);
    expect(v.stickyItems[0]?.start).toBe(60);
    v.destroy();
  });

  it('pushes pinned sticky off when next sticky approaches', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, {
      count: 20,
      estimateSize: 20,
      overscan: { end: 0, start: 0 },
      sticky: (i) => i === 0 || i === 5,
    });

    scrollEl(el, 90);

    expect(v.stickyItems[0]?.start).toBe(80);
    v.destroy();
  });

  it('sticky option can be updated via update()', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, sticky: (i) => i === 0 });

    scrollEl(el, 50);

    expect(v.stickyItems).toHaveLength(1);

    v.update({ sticky: undefined });

    expect(v.stickyItems).toHaveLength(0);
    v.destroy();
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('createVirtualizer – lifecycle', () => {
  it('destroy is idempotent', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(() => {
      v.destroy();
      v.destroy();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v[Symbol.dispose]();

    expect(() => v[Symbol.dispose]()).not.toThrow();
  });

  it('does not emit after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });
    const callsBefore = onChange.mock.calls.length;

    v.destroy();
    el.dispatchEvent(new Event('scroll'));

    expect(onChange.mock.calls.length).toBe(callsBefore);
  });

  it('public methods are no-ops after destroy', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.destroy();

    expect(() => {
      v.measure(0, 50);
      v.measureBatch([{ index: 0, size: 50 }]);
      v.measureEl(0, document.createElement('div'));
      v.invalidate();
      v.refresh();
      v.redraw();
      v.prepend(3);
      v.scrollToIndex(0);
      v.scrollToOffset(0);
    }).not.toThrow();

    await flushMicrotasks();
  });
});

// ─── Exported constants ────────────────────────────────────────────────────────

describe('exported constants', () => {
  it('DEFAULT_ESTIMATE_SIZE is 36', () => {
    expect(DEFAULT_ESTIMATE_SIZE).toBe(36);
  });

  it('DEFAULT_OVERSCAN is 3', () => {
    expect(DEFAULT_OVERSCAN).toBe(3);
  });
});

// ─── Empty-state dedup (Bug 2) ────────────────────────────────────────────────

describe('createVirtualizer – empty-state dedup', () => {
  it('does not re-emit on repeated scroll events when count is 0', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();

    createVirtualizer(el, { count: 0, estimateSize: 20, onChange });

    const callsAfterConstruct = onChange.mock.calls.length;

    // commitDedup(-1,-1) records prevTotalSize=0 so prevTotalSize===totalSize
    // on subsequent calls. Without the fix this re-emits on every scroll event.
    el.dispatchEvent(new Event('scroll'));
    el.dispatchEvent(new Event('scroll'));
    el.dispatchEvent(new Event('scroll'));

    expect(onChange.mock.calls.length).toBe(callsAfterConstruct);
  });

  it('does not re-emit when viewport size is 0 and scroll fires', () => {
    const el = makeContainer({ clientHeight: 0 });
    const onChange = vi.fn();

    createVirtualizer(el, { count: 10, estimateSize: 20, onChange });

    const callsAfterConstruct = onChange.mock.calls.length;

    el.dispatchEvent(new Event('scroll'));
    el.dispatchEvent(new Event('scroll'));

    expect(onChange.mock.calls.length).toBe(callsAfterConstruct);
  });

  it('re-emits once when count transitions from 0 to positive', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 0, estimateSize: 20, onChange });

    const callsBefore = onChange.mock.calls.length;

    v.update({ count: 5 });

    expect(onChange.mock.calls.length).toBe(callsBefore + 1);
    expect(onChange.mock.calls.at(-1)?.[0].items.length).toBeGreaterThan(0);
    v.destroy();
  });
});
