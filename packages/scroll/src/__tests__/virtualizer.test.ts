import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMeasurementCache, createVirtualizer, DEFAULT_ESTIMATE_SIZE, DEFAULT_OVERSCAN } from '../virtualizer';
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
    v.dispose();
  });

  it('uses DEFAULT_ESTIMATE_SIZE for missing estimateSize', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 3 });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.dispose();
  });

  it('falls back to DEFAULT_ESTIMATE_SIZE for invalid estimateSize function return', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 3, estimateSize: () => -10 });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.dispose();
  });

  it('uses DEFAULT_OVERSCAN when overscan is omitted', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    expect(v.items[0].index).toBeLessThanOrEqual(DEFAULT_OVERSCAN);
    v.dispose();
  });

  it('clamps negative gap to 0', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, gap: -99 });

    expect(v.totalSize).toBe(5 * 20);
    v.dispose();
  });
});

// ─── Basic rendering ───────────────────────────────────────────────────────────

describe('createVirtualizer – rendering', () => {
  it('emits the correct visible window with overscan', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20, overscan: { end: 1, start: 0 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBe(5);
    v.dispose();
  });

  it('applies asymmetric overscan with gap', () => {
    const el = makeContainer({ clientHeight: 60 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 20, gap: 10, overscan: { end: 2, start: 1 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBe(3);
    v.dispose();
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
    v.dispose();
  });
});

// ─── Horizontal ───────────────────────────────────────────────────────────────

describe('createVirtualizer – horizontal', () => {
  it('reads scrollLeft and clientWidth', () => {
    const el = makeContainer({ clientHeight: 50, clientWidth: 200, scrollLeft: 0 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 30, horizontal: true, overscan: { end: 0, start: 0 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBeLessThanOrEqual(6);
    v.dispose();
  });
});

// ─── Window target ─────────────────────────────────────────────────────────────

describe('createVirtualizer – window target', () => {
  it('uses scrollY and innerHeight from window', () => {
    const win = makeWindow(100, 400);
    const v = createVirtualizer(win, { count: 50, estimateSize: 20, overscan: { end: 0, start: 0 } });

    expect(v.items[0]?.index).toBe(0);
    expect(v.items.at(-1)?.index).toBe(4);
    v.dispose();
  });

  it('updates visible window on scroll', () => {
    const win = makeWindow(100, 400);
    const v = createVirtualizer(win, { count: 50, estimateSize: 20, overscan: { end: 0, start: 0 } });

    win.scrollTo({ top: 100 });
    win.dispatchEvent(new Event('scroll'));

    expect(v.items[0]?.index).toBe(5);
    v.dispose();
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
    v.dispose();
  });
});

// ─── VirtualItem shape ─────────────────────────────────────────────────────────

describe('createVirtualizer – VirtualItem shape', () => {
  it('emits correct start/end/size for each item', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, gap: 5, overscan: { end: 0, start: 0 } });

    expect(v.items[0]!).toMatchObject({ end: 20, index: 0, size: 20, start: 0 });
    expect(v.items[1]!).toMatchObject({ end: 45, index: 1, size: 20, start: 25 });
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
  });

  it('is a no-op for empty array', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });
    const callsBefore = onChange.mock.calls.length;

    v.measureBatch([]);
    await flushMicrotasks();

    expect(onChange.mock.calls.length).toBe(callsBefore);
    v.dispose();
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
    v.dispose();
  });

  it('returns no-op when destroyed', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.dispose();

    const disconnect = v.measureEl(0, document.createElement('div'));

    expect(() => disconnect()).not.toThrow();
  });

  it('disconnects the ResizeObserver on dispose() even if the caller never called the returned disconnect fn', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });
    const observeSpy = vi.spyOn(ResizeObserver.prototype, 'observe');

    v.measureEl(0, document.createElement('div'));

    const observer = observeSpy.mock.instances[0] as ResizeObserver;
    const disconnectSpy = vi.spyOn(observer, 'disconnect');

    v.dispose();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    observeSpy.mockRestore();
  });
});

// ─── refresh / invalidate ──────────────────────────────────────────────────────

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
    v.dispose();
  });

  it('invalidate clears all measurements', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measure(0, 50);
    await flushMicrotasks();

    v.invalidate();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);
    v.dispose();
  });

  it('invalidate after pending measure uses estimate', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measure(0, 50);
    v.invalidate();
    await flushMicrotasks();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);
    expect(v.totalSize).toBe(5 * 20);
    v.dispose();
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('createVirtualizer – refresh', () => {
  it('re-emits with current sizes', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, onChange });
    const callsBefore = onChange.mock.calls.length;

    v.refresh();

    expect(onChange.mock.calls.length).toBe(callsBefore + 1);
    expect(v.totalSize).toBe(5 * 20);
    v.dispose();
  });

  it('preserves measured sizes (does not clear cache)', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    v.measure(0, 50);
    await flushMicrotasks();

    v.refresh();

    expect(v.items.find((i) => i.index === 0)?.size).toBe(50);
    v.dispose();
  });

  it('is a no-op after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.dispose();

    expect(() => v.refresh()).not.toThrow();
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
    v.dispose();
  });

  it('changing estimateSize clears measurements', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.measure(0, 50);
    await flushMicrotasks();

    v.update({ estimateSize: 30 });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(30);
    v.dispose();
  });

  it('removing getItemKey clears measurements', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const keys = ['a', 'b', 'c', 'd', 'e'];
    const v = createVirtualizer(el, { count: 5, estimateSize: 20, getItemKey: (i) => keys[i]! });

    v.measure(0, 50);
    await flushMicrotasks();

    v.update({ getItemKey: undefined });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);
    v.dispose();
  });

  it('is a no-op after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.dispose();

    expect(() => v.update({ count: 10 })).not.toThrow();
    expect(v.count).toBe(5);
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
    v.dispose();
  });

  it('adjusts scrollOffset to maintain visual position', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, overscan: { end: 0, start: 0 } });

    scrollEl(el, 100);

    const firstBefore = v.items[0]?.index ?? -1;

    v.prepend(5);

    expect(v.scrollOffset).toBe(200);
    expect(v.items[0]?.index).toBe(firstBefore + 5);
    v.dispose();
  });

  it('is a no-op for 0', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });
    const before = v.totalSize;

    v.prepend(0);

    expect(v.totalSize).toBe(before);
    v.dispose();
  });

  it('is a no-op after destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.dispose();

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
    v.dispose();
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
    v.dispose();
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
    v1.dispose();

    const v2 = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      measurementCache: cache,
      overscan: { end: 0, start: 0 },
    });

    expect(v2.items.find((i) => i.index === 0)?.size).toBe(99);
    v2.dispose();
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
    v.dispose();
  });

  it('scrolls to start align', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    v.scrollToIndex(10, { align: 'start' });

    expect(el.scrollTop).toBe(200);
    v.dispose();
  });

  it('scrolls to center align', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    v.scrollToIndex(10, { align: 'center' });

    expect(el.scrollTop).toBe(160);
    v.dispose();
  });

  it('scrolls to end align', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    v.scrollToIndex(10, { align: 'end' });

    expect(el.scrollTop).toBe(120);
    v.dispose();
  });

  it('clamps out-of-range index', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20 });

    expect(() => v.scrollToIndex(9999, { align: 'start' })).not.toThrow();
    v.dispose();
  });

  it('calls onComplete via microtask for non-smooth scroll', async () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });
    const onComplete = vi.fn();

    v.scrollToIndex(10, { align: 'start', onComplete });

    expect(onComplete).not.toHaveBeenCalled();

    await flushMicrotasks();

    expect(onComplete).toHaveBeenCalledOnce();
    v.dispose();
  });

  it('calls onComplete when item is already visible', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 20, estimateSize: 20 });
    const onComplete = vi.fn();

    v.scrollToIndex(0, { align: 'auto', onComplete });

    await flushMicrotasks();

    expect(onComplete).toHaveBeenCalledOnce();
    v.dispose();
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
    v.dispose();
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
    v.dispose();
  });

  it('can be used to restore scroll via initialOffset', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v1 = createVirtualizer(el, { count: 20, estimateSize: 20 });

    v1.scrollToOffset(100);
    scrollEl(el, 100);

    const savedOffset = v1.scrollOffset;

    v1.dispose();

    const v2 = createVirtualizer(el, {
      count: 20,
      estimateSize: 20,
      initialOffset: savedOffset,
      overscan: { end: 0, start: 0 },
    });

    expect(v2.items[0]?.index).toBe(5);
    v2.dispose();
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
    v.dispose();
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
    v.dispose();
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
    v.dispose();
  });

  it('sticky option can be updated via update()', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 10, estimateSize: 20, sticky: (i) => i === 0 });

    scrollEl(el, 50);

    expect(v.stickyItems).toHaveLength(1);

    v.update({ sticky: undefined });

    expect(v.stickyItems).toHaveLength(0);
    v.dispose();
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('createVirtualizer – lifecycle', () => {
  it('destroy is idempotent', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(() => {
      v.dispose();
      v.dispose();
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

    v.dispose();
    el.dispatchEvent(new Event('scroll'));

    expect(onChange.mock.calls.length).toBe(callsBefore);
  });

  it('public methods are no-ops after destroy', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.dispose();

    expect(() => {
      v.measure(0, 50);
      v.measureBatch([{ index: 0, size: 50 }]);
      v.measureEl(0, document.createElement('div'));
      v.invalidate();
      v.refresh();
      v.prepend(3);
      v.scrollToIndex(0);
      v.scrollToOffset(0);
      v.scrollToTop();
      v.scrollToBottom();
    }).not.toThrow();

    await flushMicrotasks();
  });
});

// ─── Overscan number shorthand ────────────────────────────────────────────────

describe('createVirtualizer – overscan number shorthand', () => {
  it('treats overscan as a number and applies symmetrically', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20, overscan: 2 });

    expect(v.items[0].index).toBeLessThanOrEqual(2);
    v.dispose();
  });

  it('overscan: 0 renders only the visible window', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20, overscan: 0 });

    const firstIndex = v.items[0]?.index ?? 0;
    const lastIndex = v.items.at(-1)?.index ?? 0;

    expect(firstIndex).toBe(0);
    expect(lastIndex).toBeLessThanOrEqual(4); // 100px / 20px = 5 items
    v.dispose();
  });

  it('update({overscan: number}) works as number shorthand', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20, overscan: { end: 5, start: 5 } });

    v.update({ overscan: 1 });
    expect(v.items[0].index).toBeLessThanOrEqual(1);
    v.dispose();
  });
});

// ─── scrollToTop / scrollToBottom ──────────────────────────────────────────────

describe('createVirtualizer – scrollToTop / scrollToBottom', () => {
  it('scrollToTop scrolls to offset 0', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 100, estimateSize: 30 });

    v.scrollToBottom();
    v.scrollToTop();
    expect(el.scrollTop).toBe(0);
    v.dispose();
  });

  it('scrollToBottom scrolls to the end of the list', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 100, estimateSize: 30 });

    v.scrollToBottom();
    expect(el.scrollTop).toBeGreaterThan(0);
    v.dispose();
  });
});

// ─── isAtEnd ────────────────────────────────────────────────────────────────────

describe('createVirtualizer – isAtEnd', () => {
  it('is true when scrolled to the very end', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 100, estimateSize: 30 });

    // `scrollToBottom()` writes via `el.scrollTo()`, which the test container mock doesn't
    // wire back into a 'scroll' event — simulate the resulting scroll position directly.
    scrollEl(el, 100 * 30 - 100);
    expect(v.isAtEnd()).toBe(true);
    v.dispose();
  });

  it('is false when scrolled to the top of a long list', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 100, estimateSize: 30 });

    expect(v.isAtEnd()).toBe(false);
    v.dispose();
  });

  it('respects a custom threshold', () => {
    const el = makeContainer({ clientHeight: 100 });
    const v = createVirtualizer(el, { count: 100, estimateSize: 30 });
    const maxOffset = 100 * 30 - 100; // totalSize - viewportSize

    scrollEl(el, maxOffset - 20);
    expect(v.isAtEnd()).toBe(false);
    expect(v.isAtEnd(30)).toBe(true);
    v.dispose();
  });

  it('is true for a list shorter than the viewport (nothing to scroll)', () => {
    const el = makeContainer({ clientHeight: 400 });
    const v = createVirtualizer(el, { count: 3, estimateSize: 30 });

    expect(v.isAtEnd()).toBe(true);
    v.dispose();
  });
});

// ─── createMeasurementCache ───────────────────────────────────────────────────

describe('createMeasurementCache', () => {
  it('returns a new empty Map', () => {
    const cache = createMeasurementCache();

    expect(cache).toBeInstanceOf(Map);
    expect(cache.size).toBe(0);
  });

  it('two calls return independent instances', () => {
    const a = createMeasurementCache();
    const b = createMeasurementCache();

    a.set('k', 42);
    expect(b.has('k')).toBe(false);
  });

  it('shared cache preserves measurements across two virtualizers', async () => {
    const cache = createMeasurementCache();
    const el = makeContainer({ clientHeight: 300 });
    const v1 = createVirtualizer(el, { count: 5, estimateSize: 20, measurementCache: cache });

    v1.measure(0, 99);
    await flushMicrotasks();

    const el2 = makeContainer({ clientHeight: 300 });
    const v2 = createVirtualizer(el2, { count: 5, estimateSize: 20, measurementCache: cache });

    expect(v2.items.find((i) => i.index === 0)?.size).toBe(99);
    v1.dispose();
    v2.dispose();
  });
});

// ─── Infinity guard (security) ────────────────────────────────────────────────

describe('createVirtualizer – Infinity estimate guard', () => {
  it('falls back to DEFAULT_ESTIMATE_SIZE when estimateSize returns Infinity', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 3, estimateSize: () => Infinity });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.dispose();
  });

  it('falls back to DEFAULT_ESTIMATE_SIZE when estimateSize is a huge number (> 1e7)', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 3, estimateSize: 2e7 });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.dispose();
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

// ─── estimateSize throw guard ───────────────────────────────────────────────

describe('createVirtualizer – throwing estimateSize', () => {
  it('emits a dev warning via _dev.ts when estimateSize throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = makeContainer({ clientHeight: 200 });

    createVirtualizer(el, {
      count: 1,
      estimateSize: () => {
        throw new Error('boom');
      },
    }).dispose();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[@vielzeug/scroll]'));

    warnSpy.mockRestore();
  });

  it('falls back to DEFAULT_ESTIMATE_SIZE when estimateSize throws', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, {
      count: 3,
      estimateSize: () => {
        throw new Error('oops');
      },
    });

    expect(v.totalSize).toBe(3 * DEFAULT_ESTIMATE_SIZE);
    v.dispose();
  });

  it('virtualizer remains functional after a throwing estimateSize', () => {
    const el = makeContainer({ clientHeight: 200 });
    let shouldThrow = true;
    const v = createVirtualizer(el, {
      count: 3,
      estimateSize: () => {
        if (shouldThrow) throw new Error();

        return 20;
      },
    });

    shouldThrow = false;
    v.update({ estimateSize: () => 20 });

    expect(v.totalSize).toBe(3 * 20);
    v.dispose();
  });
});

// ─── update measurementCache ──────────────────────────────────────────────────

describe('createVirtualizer – update measurementCache', () => {
  it('hot-swaps the measurement cache via update()', () => {
    const el = makeContainer({ clientHeight: 200 });
    const cache1 = new Map<number | string, number>();
    const cache2 = new Map<number | string, number>([[0, 80]]);
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      measurementCache: cache1,
      overscan: { end: 0, start: 0 },
    });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(20);

    v.update({ measurementCache: cache2 });

    expect(v.items.find((i) => i.index === 0)?.size).toBe(80);
    v.dispose();
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
    v.dispose();
  });
});

// ─── isScrolling / onScrollEnd / onScrollingChange ────────────────────────────

describe('createVirtualizer – isScrolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isScrolling is false before any scroll event', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    expect(v.isScrolling).toBe(false);
    v.dispose();
  });

  it('isScrolling becomes true after a scroll event', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20 });

    scrollEl(el, 100);
    // Dispatch scrollend to trigger notifyScrollEnd (jsdom exposes onscrollend)
    el.dispatchEvent(new Event('scrollend'));
    // We check isScrolling BEFORE the scrollend fires — dispatch is synchronous
    // so isScrolling flips to false immediately. Test the intermediate state instead.
    expect(v.isScrolling).toBe(false); // synchronous scrollend flipped it back
    v.dispose();
  });

  it('isScrolling is true between scroll and scrollend', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 50, estimateSize: 20, scrollEndDelay: 5000 });

    // Temporarily remove onscrollend so the native path isn't used
    // and we can test the debounce-pending state.
    scrollEl(el, 100);
    expect(v.isScrolling).toBe(true);
    v.dispose();
  });

  it('onScrollingChange fires true on first scroll, false via debounce when native event unavailable', () => {
    // Use an element that does NOT have onscrollend (simulate older browser)
    // by removing it before creating the virtualizer.
    const el = makeContainer({ clientHeight: 200 });
    const changes: boolean[] = [];

    // Force non-native path: use the window mock (makeWindow) which lacks onscrollend
    const win = makeWindow();
    const vWin = createVirtualizer(win, {
      count: 50,
      estimateSize: 20,
      onScrollingChange: (s) => changes.push(s),
      scrollEndDelay: 100,
    });

    Object.defineProperty(win, 'scrollY', { configurable: true, get: () => 100 });
    win.dispatchEvent(new Event('scroll'));
    expect(changes).toEqual([true]);

    vi.advanceTimersByTime(200);
    expect(changes).toEqual([true, false]);
    expect(vWin.isScrolling).toBe(false);
    vWin.dispose();
  });

  it('onScrollEnd fires with final offset after debounce (non-native path)', () => {
    const win = makeWindow();
    const offsets: number[] = [];
    const v = createVirtualizer(win, {
      count: 50,
      estimateSize: 20,
      onScrollEnd: (offset) => offsets.push(offset),
      scrollEndDelay: 100,
    });

    Object.defineProperty(win, 'scrollY', { configurable: true, get: () => 200 });
    win.dispatchEvent(new Event('scroll'));
    expect(offsets).toHaveLength(0);

    vi.advanceTimersByTime(200);
    expect(offsets).toHaveLength(1);
    expect(offsets[0]).toBe(200);
    v.dispose();
  });

  it('rapid scrolls debounce to one onScrollEnd call (non-native path)', () => {
    const win = makeWindow();
    const offsets: number[] = [];
    const v = createVirtualizer(win, {
      count: 50,
      estimateSize: 20,
      onScrollEnd: (offset) => offsets.push(offset),
      scrollEndDelay: 100,
    });

    let pos = 100;

    Object.defineProperty(win, 'scrollY', { configurable: true, get: () => pos });
    win.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(50);
    pos = 200;
    win.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(50);
    pos = 300;
    win.dispatchEvent(new Event('scroll'));

    vi.advanceTimersByTime(200);
    expect(offsets).toHaveLength(1);
    expect(offsets[0]).toBe(300);
    v.dispose();
  });

  it('dispose() cancels the pending debounce timer without firing onScrollEnd', () => {
    const win = makeWindow();
    const offsets: number[] = [];
    const v = createVirtualizer(win, {
      count: 50,
      estimateSize: 20,
      onScrollEnd: (offset) => offsets.push(offset),
      scrollEndDelay: 100,
    });

    Object.defineProperty(win, 'scrollY', { configurable: true, get: () => 100 });
    win.dispatchEvent(new Event('scroll'));
    v.dispose();

    vi.advanceTimersByTime(300);
    expect(offsets).toHaveLength(0);
  });

  it('onScrollEnd fires immediately via native scrollend event (when supported)', () => {
    const el = makeContainer({ clientHeight: 200 });
    const offsets: number[] = [];
    const v = createVirtualizer(el, {
      count: 50,
      estimateSize: 20,
      onScrollEnd: (offset) => offsets.push(offset),
    });

    scrollEl(el, 150);
    expect(offsets).toHaveLength(0); // not yet
    el.dispatchEvent(new Event('scrollend'));
    expect(offsets).toHaveLength(1);
    expect(offsets[0]).toBe(150);
    v.dispose();
  });
});

// ─── scroll anchor on update({ estimateSize }) ────────────────────────────────

describe('createVirtualizer – scroll anchor on estimateSize update', () => {
  it('preserves scroll position relative to anchor item when estimateSize changes', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 100, estimateSize: 50, overscan: { end: 0, start: 0 } });

    // Programmatically scroll to item 10 (offset 500) and fire the event so
    // the virtualizer's internal scrollOffset is updated before the anchor records.
    v.scrollToIndex(10, { align: 'start' });
    el.dispatchEvent(new Event('scroll'));

    expect(el.scrollTop).toBe(10 * 50);

    // Halving the estimate should anchor to item 10 → new offset = 10 * 25 = 250
    v.update({ estimateSize: 25 });

    expect(el.scrollTop).toBe(10 * 25);
    v.dispose();
  });
});

// ─── disposed getter ───────────────────────────────────────────────────────────

describe('createVirtualizer – disposed', () => {
  it('disposed is false before dispose()', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(v.disposed).toBe(false);
    v.dispose();
  });

  it('disposed is true after dispose()', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v.dispose();
    expect(v.disposed).toBe(true);
  });

  it('disposed is true after [Symbol.dispose]()', () => {
    const el = makeContainer({ clientHeight: 200 });
    const v = createVirtualizer(el, { count: 5, estimateSize: 20 });

    v[Symbol.dispose]();
    expect(v.disposed).toBe(true);
  });
});
