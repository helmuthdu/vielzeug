import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import {
  createGroupedVirtualizer,
  createVirtualizer,
  type GroupVirtualizerState,
  type VirtualizerState,
} from '../index';
import { flushMicrotasks, makeContainer } from './test-utils';

function scrollEl(el: HTMLElement, top: number) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => top });
  el.dispatchEvent(new Event('scroll'));
}

// ─── Virtualizer with signal ──────────────────────────────────────────────────

describe('createVirtualizer with signal option', () => {
  it('signal is created and initialized with correct state', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(stateSignal.value.totalSize).toBe(100);
    expect(stateSignal.value.items.length).toBeGreaterThan(0);
    v.dispose();
  });

  it('signal updates when options change', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(stateSignal.value.totalSize).toBe(100);
    v.update({ count: 10 });
    expect(stateSignal.value.totalSize).toBe(200);
    v.dispose();
  });

  it('signal updates when measurements arrive', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      overscan: { end: 0, start: 0 },
      signal: () => stateSignal,
    });

    expect(stateSignal.value.items[0]?.size).toBe(20);
    v.measure(0, 60);
    await flushMicrotasks();
    expect(stateSignal.value.items[0]?.size).toBe(60);
    v.dispose();
  });

  it('signal is updated but onChange callback is also called', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const onChange = vi.fn();

    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      onChange,
      signal: () => stateSignal,
    });

    expect(onChange).toHaveBeenCalled();
    expect(stateSignal.value.totalSize).toBe(100);
    v.dispose();
  });

  it('signal updates are reactive', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const effects = { count: 0 };

    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    // Subscribe to changes
    stateSignal.subscribe(() => {
      effects.count++;
    });

    const initialCount = effects.count;
    v.update({ count: 10 });
    expect(effects.count).toBeGreaterThan(initialCount);
    v.dispose();
  });

  it('count reflects current value after update', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(v.count).toBe(5);
    v.update({ count: 10 });
    expect(v.count).toBe(10);
    v.dispose();
  });

  it('totalSize reflects current value after update', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(v.totalSize).toBe(100);
    v.update({ count: 10 });
    expect(v.totalSize).toBe(200);
    v.dispose();
  });

  it('items returns current rendered items, not a snapshot', () => {
    const el = makeContainer({ clientHeight: 100 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      overscan: { end: 0, start: 0 },
      signal: () => stateSignal,
    });

    const initialCount = v.items.length;

    v.update({ count: 100 });

    expect(v.items.length).toBeGreaterThan(0);
    expect(v.items.length).toBeGreaterThanOrEqual(initialCount);
    v.dispose();
  });

  it('scrollOffset updates after scroll event', () => {
    const el = makeContainer({ clientHeight: 100 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 50,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(v.scrollOffset).toBe(0);
    scrollEl(el, 100);
    expect(v.scrollOffset).toBe(100);
    v.dispose();
  });

  it('scrollToIndex scrolls the element', () => {
    const el = makeContainer({ clientHeight: 100 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 50,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    v.scrollToIndex(10, { align: 'start' });
    expect(el.scrollTop).toBe(200);
    v.dispose();
  });

  it('measure + measureBatch work with signal', async () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      overscan: { end: 0, start: 0 },
      signal: () => stateSignal,
    });

    v.measureBatch([{ index: 0, size: 50 }]);
    await flushMicrotasks();
    expect(v.items.find((i) => i.index === 0)?.size).toBe(50);
    v.dispose();
  });

  it('refresh re-updates signal', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });
    const before = stateSignal.value;

    v.refresh();

    expect(stateSignal.value).not.toBe(before);
    v.dispose();
  });

  it('dispose is idempotent', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(() => {
      v.dispose();
      v.dispose();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to dispose', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(() => v[Symbol.dispose]()).not.toThrow();
  });

  it('disposed is false before dispose', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    expect(v.disposed).toBe(false);
    v.dispose();
  });

  it('disposed is true after dispose', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    v.dispose();
    expect(v.disposed).toBe(true);
  });

  it('methods are no-ops after dispose', () => {
    const el = makeContainer({ clientHeight: 200 });
    const stateSignal = signal<VirtualizerState>({ items: [], stickyItems: [], totalSize: 0 });
    const v = createVirtualizer(el, {
      count: 5,
      estimateSize: 20,
      signal: () => stateSignal,
    });

    v.dispose();
    expect(() => {
      v.update({ count: 10 });
      v.refresh();
      v.invalidate();
    }).not.toThrow();
  });
});

// ─── GroupedVirtualizer with signal ───────────────────────────────────────────

describe('createGroupedVirtualizer with signal option', () => {
  const makeSections = () => [
    { items: ['a', 'b'], label: 'Group 1' },
    { items: ['c'], label: 'Group 2' },
  ];

  it('signal is created and initialized', () => {
    const el = makeContainer({ clientHeight: 300 });
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    expect(stateSignal.value.items.length).toBeGreaterThan(0);
    expect(stateSignal.value.totalSize).toBeGreaterThan(0);
    v.dispose();
  });

  it('signal updates when sections change via update', () => {
    const el = makeContainer({ clientHeight: 300 });
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    const before = stateSignal.value.totalSize;

    v.update([{ items: ['a', 'b', 'c', 'd'], label: 'Big Group' }]);
    expect(stateSignal.value.totalSize).not.toBe(before);
    v.dispose();
  });

  it('keeps signal current after replacing onChange', () => {
    const el = makeContainer({ clientHeight: 300 });
    const onChange = vi.fn();
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    v.update([{ items: ['a', 'b', 'c', 'd'], label: 'Big Group' }], { onChange });

    expect(onChange).toHaveBeenCalled();
    expect(stateSignal.value.totalSize).toBeGreaterThan(0);
    v.dispose();
  });

  it('signal is reactive', () => {
    const el = makeContainer({ clientHeight: 300 });
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const effects = { count: 0 };

    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    stateSignal.subscribe(() => {
      effects.count++;
    });

    const initialCount = effects.count;
    v.update([{ items: ['a', 'b', 'c', 'd'], label: 'Big Group' }]);
    expect(effects.count).toBeGreaterThan(initialCount);
    v.dispose();
  });

  it('state.value.headers contains header entries for each section', () => {
    const el = makeContainer({ clientHeight: 300 });
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    expect(stateSignal.value.headers.length).toBe(2);
    v.dispose();
  });

  it('live getters proxy through to the underlying virtualizer', () => {
    const el = makeContainer({ clientHeight: 300 });
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    expect(v.count).toBeGreaterThan(0);
    expect(v.disposed).toBe(false);
    v.dispose();
    expect(v.disposed).toBe(true);
  });

  it('dispose is idempotent', () => {
    const el = makeContainer({ clientHeight: 300 });
    const stateSignal = signal<GroupVirtualizerState<string>>({
      headers: [],
      items: [],
      stickyHeader: null,
      totalSize: 0,
    });
    const v = createGroupedVirtualizer(el, {
      estimateItemSize: 30,
      sections: makeSections(),
      signal: () => stateSignal,
    });

    expect(() => {
      v.dispose();
      v.dispose();
    }).not.toThrow();
  });
});
