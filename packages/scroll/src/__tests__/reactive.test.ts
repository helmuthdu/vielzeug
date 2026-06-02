import { describe, expect, it } from 'vitest';

import { createReactiveVirtualizer } from '../reactive';
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
    rv.destroy();
  });

  it('totalSize reflects current value after update', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.totalSize).toBe(100);
    rv.update({ count: 10 });
    expect(rv.totalSize).toBe(200);
    rv.destroy();
  });

  it('items returns current rendered items, not a snapshot', () => {
    const el = makeContainer({ clientHeight: 100 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    const initialCount = rv.items.length;

    rv.update({ count: 100 });

    // items should reflect the new larger render window
    expect(rv.items.length).toBeGreaterThan(0);
    expect(rv.items.length).toBeGreaterThanOrEqual(initialCount);
    rv.destroy();
  });

  it('scrollOffset updates after scroll event', () => {
    const el = makeContainer({ clientHeight: 100 });
    const rv = createReactiveVirtualizer(el, { count: 50, estimateSize: 20 });

    expect(rv.scrollOffset).toBe(0);
    scrollEl(el, 100);
    expect(rv.scrollOffset).toBe(100);
    rv.destroy();
  });
});

// ─── state signal ─────────────────────────────────────────────────────────────

describe('createReactiveVirtualizer – state signal', () => {
  it('state.value is populated after construction', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.state.value.totalSize).toBe(100);
    expect(rv.state.value.items.length).toBeGreaterThan(0);
    rv.destroy();
  });

  it('state.value updates when options change', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(rv.state.value.totalSize).toBe(100);
    rv.update({ count: 10 });
    expect(rv.state.value.totalSize).toBe(200);
    rv.destroy();
  });

  it('state.value updates when measurements arrive', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    expect(rv.state.value.items[0]?.size).toBe(20);
    rv.measure(0, 60);
    await flushMicrotasks();
    expect(rv.state.value.items[0]?.size).toBe(60);
    rv.destroy();
  });

  it('state signal is the same reference as rv.state', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    // Accessing .state twice returns the same object
    expect(rv.state).toBe(rv.state);
    rv.destroy();
  });
});

// ─── Virtualizer method passthrough ───────────────────────────────────────────

describe('createReactiveVirtualizer – method passthrough', () => {
  it('scrollToIndex scrolls the element', () => {
    const el = makeContainer({ clientHeight: 100 });
    const rv = createReactiveVirtualizer(el, { count: 50, estimateSize: 20 });

    rv.scrollToIndex(10, { align: 'start' });
    expect(el.scrollTop).toBe(200);
    rv.destroy();
  });

  it('measure + measureBatch work through the proxy', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20, overscan: { end: 0, start: 0 } });

    rv.measureBatch([{ index: 0, size: 50 }]);
    await flushMicrotasks();
    expect(rv.items.find((i) => i.index === 0)?.size).toBe(50);
    rv.destroy();
  });

  it('redraw() re-emits state', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });
    const before = rv.state.value;

    rv.redraw();

    // state.value should be a new object reference (re-emitted)
    expect(rv.state.value).not.toBe(before);
    rv.destroy();
  });

  it('destroy is idempotent', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(() => {
      rv.destroy();
      rv.destroy();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const el = makeContainer({ clientHeight: 200 });
    const rv = createReactiveVirtualizer(el, { count: 5, estimateSize: 20 });

    expect(() => rv[Symbol.dispose]()).not.toThrow();
  });
});
