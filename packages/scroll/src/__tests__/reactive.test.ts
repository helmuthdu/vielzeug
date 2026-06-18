import { describe, expect, it } from 'vitest';

import { createReactiveGroupedVirtualizer, createReactiveVirtualizer } from '../reactive';
import { flushMicrotasks, makeContainer } from './test-utils';

function scrollEl(el: HTMLElement, top: number) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top });
  el.dispatchEvent(new Event('scroll'));
}

// ─── Live getter semantics (Proxy correctness) ────────────────────────────────

describe('createReactiveVirtualizer – live getters', () => {
  it('count reflects current value after update', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.count).toBe(5);
    rv.update({ count: 10 });
    // With object spread this would return the snapshotted value 5.
    expect(rv.count).toBe(10);
    rv.dispose();
  });

  it('totalSize reflects current value after update', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.totalSize).toBe(100);
    rv.update({ count: 10 });
    expect(rv.totalSize).toBe(200);
    rv.dispose();
  });

  it('items returns current rendered items, not a snapshot', () => {
    const el = makeContainer({ clientHeight: 100 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    const initialCount = rv.items.length;

    rv.update({ count: 100 });

    // items should reflect the new larger render window
    expect(rv.items.length).toBeGreaterThan(0);
    expect(rv.items.length).toBeGreaterThanOrEqual(initialCount);
    rv.dispose();
  });

  it('scrollOffset updates after scroll event', () => {
    const el = makeContainer({ clientHeight: 100 });
    const rv = createReactiveVirtualizer(el, { count: 50, estimateSize: 20 });

    expect(rv.scrollOffset).toBe(0);
    scrollEl(el, 100);
    expect(rv.scrollOffset).toBe(100);
    rv.dispose();
  });
});

// ─── state signal ─────────────────────────────────────────────────────────────

describe('createReactiveVirtualizer – state signal', () => {
  it('state.value is populated after construction', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.state.value.totalSize).toBe(100);
    expect(rv.state.value.items.length).toBeGreaterThan(0);
    rv.dispose();
  });

  it('state.value updates when options change', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.state.value.totalSize).toBe(100);
    rv.update({ count: 10 });
    expect(rv.state.value.totalSize).toBe(200);
    rv.dispose();
  });

  it('state.value updates when measurements arrive', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    expect(rv.state.value.items[0]?.size).toBe(20);
    rv.measure(0, 60);
    await flushMicrotasks();
    expect(rv.state.value.items[0]?.size).toBe(60);
    rv.dispose();
  });

  it('state signal is the same reference as rv.state', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    // Accessing .state twice returns the same object
    expect(rv.state).toBe(rv.state);
    rv.dispose();
  });
});

// ─── Virtualizer method passthrough ───────────────────────────────────────────

describe('createReactiveVirtualizer – method passthrough', () => {
  it('scrollToIndex scrolls the element', () => {
    const el = makeContainer({ clientHeight: 100 });
    const rv = createReactiveVirtualizer(el, { count: 50, estimateSize: 20 });

    rv.scrollToIndex(10, { align: 'start' });
    expect(el.scrollTop).toBe(200);
    rv.dispose();
  });

  it('measure + measureBatch work through the proxy', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    rv.measureBatch([{ index: 0, size: 50 }]);
    await flushMicrotasks();
    expect(rv.items.find((i) => i.index === 0)?.size).toBe(50);
    rv.dispose();
  });

  it('refresh() re-emits state', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });
    const before = rv.state.value;

    rv.refresh();

    // state.value should be a new object reference (re-emitted)
    expect(rv.state.value).not.toBe(before);
    rv.dispose();
  });

  it('destroy is idempotent', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(() => {
      rv.dispose();
      rv.dispose();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(() => rv[Symbol.dispose]()).not.toThrow();
  });
});

// ─── disposed getter ───────────────────────────────────────────────────────────

describe('createReactiveVirtualizer – disposed', () => {
  it('disposed is false before dispose()', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.disposed).toBe(false);
    rv.dispose();
  });

  it('disposed is true after dispose()', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    rv.dispose();
    expect(rv.disposed).toBe(true);
  });

  it('methods are no-ops after dispose', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    rv.dispose();
    expect(() => {
      rv.update({ count: 10 });
      rv.refresh();
      rv.invalidate();
    }).not.toThrow();
  });
});

// ─── createReactiveGroupedVirtualizer ─────────────────────────────────────────

describe('createReactiveGroupedVirtualizer', () => {
  const makeSections = () => [
    { items: ['a', 'b'], label: 'Group 1' },
    { items: ['c'], label: 'Group 2' },
  ];

  it('state.value is populated after construction', () => {
    const el = makeContainer({ clientHeight: 300 });
    const rv = createReactiveGroupedVirtualizer(el, { estimateItemSize: 30, sections: makeSections() });

    expect(rv.state.value.items.length).toBeGreaterThan(0);
    expect(rv.state.value.totalSize).toBeGreaterThan(0);
    rv.dispose();
  });

  it('state.value updates when sections change via update()', () => {
    const el = makeContainer({ clientHeight: 300 });
    const rv = createReactiveGroupedVirtualizer(el, { estimateItemSize: 30, sections: makeSections() });

    const before = rv.state.value.totalSize;

    rv.update([{ items: ['a', 'b', 'c', 'd'], label: 'Big Group' }]);
    expect(rv.state.value.totalSize).not.toBe(before);
    rv.dispose();
  });

  it('state signal is the same reference on repeated access', () => {
    const el = makeContainer({ clientHeight: 300 });
    const rv = createReactiveGroupedVirtualizer(el, { estimateItemSize: 30, sections: makeSections() });

    expect(rv.state).toBe(rv.state);
    rv.dispose();
  });

  it('state.value.headers contains header entries for each section', () => {
    const el = makeContainer({ clientHeight: 300 });
    const rv = createReactiveGroupedVirtualizer(el, { estimateItemSize: 30, sections: makeSections() });

    // 2 sections → 2 header entries
    expect(rv.state.value.headers.length).toBe(2);
    rv.dispose();
  });

  it('live getters proxy through to the underlying virtualizer', () => {
    const el = makeContainer({ clientHeight: 300 });
    const rv = createReactiveGroupedVirtualizer(el, { estimateItemSize: 30, sections: makeSections() });

    expect(rv.count).toBeGreaterThan(0);
    expect(rv.disposed).toBe(false);
    rv.dispose();
    expect(rv.disposed).toBe(true);
  });

  it('dispose() is idempotent', () => {
    const el = makeContainer({ clientHeight: 300 });
    const rv = createReactiveGroupedVirtualizer(el, { estimateItemSize: 30, sections: makeSections() });

    expect(() => {
      rv.dispose();
      rv.dispose();
    }).not.toThrow();
  });
});
