import { describe, expect, it, vi } from 'vitest';

import { createDomVirtualList, createVirtualScroller } from '../dom-virtual-list';
import { flushMicrotasks, makeContainer } from './test-utils';

type Row = { id: number; label: string; size: number };

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, label: `Item ${i}`, size: 30 }));
}

function makeList(scrollHeight = 120) {
  const scrollEl = makeContainer({ clientHeight: scrollHeight });
  const listEl = document.createElement('div');

  return { listEl, scrollEl };
}

// ─── Basic rendering ───────────────────────────────────────────────────────────

describe('createDomVirtualList – rendering', () => {
  it('calls render with visible virtual items and totalSize', () => {
    const { listEl, scrollEl } = makeList(120);
    const render = vi.fn();
    const rows = makeRows(100);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    expect(render).toHaveBeenCalled();

    const args = render.mock.calls.at(-1)?.[0];

    expect(args?.totalSize).toBe(100 * 30);
    expect(args?.items.length).toBeGreaterThan(0);
    ctrl.destroy();
  });

  it('render items have data property merged with VirtualItem fields', () => {
    const { listEl, scrollEl } = makeList(120);
    const renders: unknown[] = [];
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      listElement: listEl,
      render: ({ items }) => renders.push(...items),
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    const first = renders[0] as { data: Row; index: number; start: number };

    expect(first.data).toEqual(rows[first.index]);
    expect(typeof first.start).toBe('number');
    ctrl.destroy();
  });

  it('sets height on listEl in vertical mode', () => {
    const { listEl, scrollEl } = makeList(120);
    const rows = makeRows(50);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    expect(listEl.style.height).toBe(`${50 * 30}px`);
    expect(listEl.style.width).toBe('');
    ctrl.destroy();
  });

  it('sets width (not height) in horizontal mode', () => {
    const { listEl, scrollEl } = makeList();
    const rows = makeRows(20);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      horizontal: true,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    expect(listEl.style.width).toBe(`${20 * 30}px`);
    expect(listEl.style.height).toBe('');
    ctrl.destroy();
  });

  it('sets position:relative and contain:layout on listEl when items are set', () => {
    const { listEl, scrollEl } = makeList();
    const ctrl = createDomVirtualList<Row>({
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(makeRows(5));

    expect(listEl.style.position).toBe('relative');
    expect(listEl.style.contain).toBe('layout');
    ctrl.destroy();
  });

  it('re-renders when content changes with same length', async () => {
    const { listEl, scrollEl } = makeList(120);
    const render = vi.fn();
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    const callsBefore = render.mock.calls.length;

    const changed = rows.map((r) => ({ ...r, label: 'Updated' }));

    ctrl.setItems(changed);

    expect(render.mock.calls.length).toBeGreaterThan(callsBefore);
    ctrl.destroy();
  });
});

// ─── Measurement API ──────────────────────────────────────────────────────────

describe('createDomVirtualList – measurement', () => {
  it('preserves measured sizes across setItems when getItemKey is stable', async () => {
    const { listEl, scrollEl } = makeList(300);
    const sizes: number[] = [];
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render: ({ items }) => {
        for (const item of items) sizes[item.index] = item.size;
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.measure(0, 100);
    await flushMicrotasks();

    // setItems with same key set — should preserve measurement
    ctrl.setItems([...rows]);
    await flushMicrotasks();

    expect(sizes[0]).toBe(100);
    ctrl.destroy();
  });

  it('drops measured sizes on setItems when no getItemKey', async () => {
    const { listEl, scrollEl } = makeList(300);
    const sizes: number[] = [];
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      listElement: listEl,
      render: ({ items }) => {
        for (const item of items) sizes[item.index] = item.size;
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.measure(0, 100);
    await flushMicrotasks();

    ctrl.setItems([...rows]); // same items but no stable key → invalidate
    await flushMicrotasks();

    expect(sizes[0]).toBe(30); // back to estimate
    ctrl.destroy();
  });

  it('measureBatch applies multiple measurements in one rebuild', async () => {
    const { listEl, scrollEl } = makeList(300);
    const render = vi.fn();
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: (_, r) => r.size,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    const callsBefore = render.mock.calls.length;

    ctrl.measureBatch([
      { index: 0, size: 50 },
      { index: 1, size: 60 },
      { index: 2, size: 70 },
    ]);
    await flushMicrotasks();

    expect(render.mock.calls.length).toBe(callsBefore + 1);
    ctrl.destroy();
  });
});

// ─── Node recycling ───────────────────────────────────────────────────────────

describe('createDomVirtualList – recycle', () => {
  it('recycle returns same node for the same key across renders', () => {
    const { listEl, scrollEl } = makeList(300);
    const rows = makeRows(20);
    const nodeMap = new Map<number, HTMLElement>();

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render: ({ items, recycle }) => {
        for (const item of items) {
          const el = recycle(item.data.id, () => document.createElement('div'));

          nodeMap.set(item.data.id, el);
          listEl.appendChild(el);
        }
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    const firstNode = nodeMap.get(0)!;

    // Trigger a second render — same items, should reuse node 0
    ctrl.setItems([...rows]);

    expect(nodeMap.get(0)).toBe(firstNode);
    ctrl.destroy();
  });

  it('recycle removes nodes from DOM that are no longer visible', () => {
    const { listEl, scrollEl } = makeList(60); // small viewport
    const rows = makeRows(100);
    const rendered = new Set<number>();

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render: ({ items, recycle }) => {
        for (const item of items) {
          const el = recycle(item.data.id, () => document.createElement('div'));

          rendered.add(item.data.id);
          listEl.appendChild(el);
        }
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    const renderedIds = [...rendered];

    // Only a small window is visible initially; verify pool cleanup happens implicitly
    expect(renderedIds.length).toBeLessThan(rows.length);
    ctrl.destroy();
  });

  it('pool.clear is called on destroy, removing all live nodes', () => {
    const { listEl, scrollEl } = makeList(300);
    const rows = makeRows(5);
    const nodes: HTMLElement[] = [];

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render: ({ items, recycle }) => {
        for (const item of items) {
          const el = recycle(item.data.id, () => document.createElement('div'));

          nodes.push(el);
          listEl.appendChild(el);
        }
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.destroy();

    // All nodes should have been removed from DOM by pool.clear()
    for (const node of nodes) {
      expect(node.parentElement).toBeNull();
    }
  });
});

// ─── Empty list handling ──────────────────────────────────────────────────────

describe('createDomVirtualList – empty state', () => {
  it('clears and resets styles when items are empty', () => {
    const { listEl, scrollEl } = makeList();
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);

    expect(listEl.style.height).not.toBe('');

    ctrl.setItems([]);

    expect(listEl.style.height).toBe('');
    expect(listEl.style.position).toBe('');
    ctrl.destroy();
  });

  it('setItems to empty then back to non-empty re-applies container styles', () => {
    const { listEl, scrollEl } = makeList();
    const rows = makeRows(10);
    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.setItems([]);
    ctrl.setItems(rows);

    expect(listEl.style.position).toBe('relative');
    ctrl.destroy();
  });
});

// ─── scrollToIndex delegation ─────────────────────────────────────────────────

describe('createDomVirtualList – scrollToIndex', () => {
  it('delegates scrollToIndex to the underlying virtualizer', () => {
    const { listEl, scrollEl } = makeList(60);
    const rows = makeRows(100);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.scrollToIndex(50, { align: 'start' });

    expect(scrollEl.scrollTop).toBe(50 * 30);
    ctrl.destroy();
  });
});

// ─── invalidate ───────────────────────────────────────────────────────────────

describe('createDomVirtualList – invalidate', () => {
  it('forwards invalidate to the underlying virtualizer', async () => {
    const { listEl, scrollEl } = makeList(300);
    const rows = makeRows(10);
    const render = vi.fn();

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.measure(0, 100);
    await flushMicrotasks();

    ctrl.invalidate();

    // After invalidate, item 0 is back to estimate size in next render
    const args = render.mock.calls.at(-1)?.[0];

    expect(args?.items.find((i: { index: number }) => i.index === 0)?.size).toBe(30);
    ctrl.destroy();
  });
});

// ─── R11: Virtualizer interface delegation ────────────────────────────────────

describe('createDomVirtualList – Virtualizer interface (R11)', () => {
  it('count, totalSize, scrollOffset, items, stickyItems are readable', () => {
    const { listEl, scrollEl } = makeList(120);
    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    // before setItems: all defaults
    expect(ctrl.count).toBe(0);
    expect(ctrl.totalSize).toBe(0);
    expect(ctrl.scrollOffset).toBe(0);
    expect(ctrl.items).toEqual([]);
    expect(ctrl.stickyItems).toEqual([]);

    ctrl.setItems(makeRows(10));

    expect(ctrl.count).toBe(10);
    expect(ctrl.totalSize).toBe(10 * 30);
    ctrl.destroy();
  });

  it('scrollToOffset is forwarded to underlying virtualizer', () => {
    const { listEl, scrollEl } = makeList(120);
    const rows = makeRows(100);
    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.scrollToOffset(300);

    expect(scrollEl.scrollTop).toBe(300);
    ctrl.destroy();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const { listEl, scrollEl } = makeList();
    const ctrl = createDomVirtualList<Row>({
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    expect(() => ctrl[Symbol.dispose]()).not.toThrow();
  });
});

// ─── R3: redraw() ──────────────────────────────────────────────────────────────

describe('createDomVirtualList – redraw', () => {
  it('re-emits render without clearing measurements', async () => {
    const { listEl, scrollEl } = makeList(300);
    const render = vi.fn();
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.measure(0, 80);
    await flushMicrotasks();

    const callsBefore = render.mock.calls.length;

    ctrl.redraw();

    expect(render.mock.calls.length).toBe(callsBefore + 1);

    // Measurement still intact
    const args = render.mock.calls.at(-1)?.[0];

    expect(args?.items.find((i: { index: number }) => i.index === 0)?.size).toBe(80);
    ctrl.destroy();
  });

  it('stable-key setItems uses redraw (not invalidate)', async () => {
    const { listEl, scrollEl } = makeList(300);
    const renderSizes: number[] = [];
    const rows = makeRows(10);

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, r) => r.id,
      listElement: listEl,
      render: ({ items }) => {
        for (const item of items) renderSizes[item.index] = item.size;
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(rows);
    ctrl.measure(0, 80);
    await flushMicrotasks();

    // setItems with same keys — should redraw, NOT invalidate
    ctrl.setItems([...rows]);

    // measurement should still be present after redraw
    expect(renderSizes[0]).toBe(80);
    ctrl.destroy();
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('createDomVirtualList – lifecycle', () => {
  it('destroy is idempotent', () => {
    const { listEl, scrollEl } = makeList();
    const ctrl = createDomVirtualList<Row>({
      listElement: listEl,
      render: () => {},
      scrollElement: scrollEl,
    });

    expect(() => {
      ctrl.destroy();
      ctrl.destroy();
    }).not.toThrow();
  });

  it('setItems after destroy is a no-op', () => {
    const { listEl, scrollEl } = makeList();
    const render = vi.fn();
    const ctrl = createDomVirtualList<Row>({
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.destroy();

    const callsBefore = render.mock.calls.length;

    ctrl.setItems(makeRows(5));

    expect(render.mock.calls.length).toBe(callsBefore);
  });

  it('measureBatch after destroy is a no-op', async () => {
    const { listEl, scrollEl } = makeList();
    const render = vi.fn();
    const ctrl = createDomVirtualList<Row>({
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(makeRows(5));
    ctrl.destroy();

    const callsBefore = render.mock.calls.length;

    ctrl.measureBatch([{ index: 0, size: 100 }]);
    await flushMicrotasks();

    expect(render.mock.calls.length).toBe(callsBefore);
  });

  it('clears listEl content and styles on destroy', () => {
    const { listEl, scrollEl } = makeList();
    const ctrl = createDomVirtualList<Row>({
      listElement: listEl,
      render: () => {
        listEl.innerHTML = '<div>item</div>';
      },
      scrollElement: scrollEl,
    });

    ctrl.setItems(makeRows(5));
    ctrl.destroy();

    expect(listEl.textContent).toBe('');
    expect(listEl.style.height).toBe('');
    expect(listEl.style.position).toBe('');
  });
});

// ─── setItems double-render fix (Bug 5) ───────────────────────────────────────

describe('createDomVirtualList – setItems double-render', () => {
  it('does not double-render when count changes with stable keys', () => {
    const { listEl, scrollEl } = makeList(500);
    const render = vi.fn();

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, row) => row.id,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(makeRows(5));

    const callsAfterFirst = render.mock.calls.length;

    // Adding items changes count — render should fire exactly once more.
    ctrl.setItems(makeRows(10));
    expect(render.mock.calls.length).toBe(callsAfterFirst + 1);
    ctrl.destroy();
  });

  it('does render when count is unchanged with stable keys', () => {
    const { listEl, scrollEl } = makeList(500);
    const render = vi.fn();

    const ctrl = createDomVirtualList<Row>({
      estimateSize: 30,
      getItemKey: (_, row) => row.id,
      listElement: listEl,
      render,
      scrollElement: scrollEl,
    });

    ctrl.setItems(makeRows(5));

    const callsAfterFirst = render.mock.calls.length;

    // Same count but different data — redraw() must fire.
    const replaced = makeRows(5).map((r) => ({ ...r, label: 'updated' }));

    ctrl.setItems(replaced);
    expect(render.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    ctrl.destroy();
  });
});

// ─── createVirtualScroller ────────────────────────────────────────────────────

describe('createVirtualScroller', () => {
  it('appends a scroll container to the given container', () => {
    const container = document.createElement('div');

    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 300 });

    const ctrl = createVirtualScroller<Row>(container, {
      estimateSize: 30,
      render: () => {},
    });

    expect(container.children.length).toBe(1);

    const scrollEl = container.children[0] as HTMLElement;

    expect(scrollEl.style.overflow).toContain('auto');
    ctrl.destroy();
  });

  it('destroy() removes the scroll container from the DOM', () => {
    const container = document.createElement('div');

    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 300 });

    const ctrl = createVirtualScroller<Row>(container, {
      estimateSize: 30,
      render: () => {},
    });

    expect(container.children.length).toBe(1);
    ctrl.destroy();
    expect(container.children.length).toBe(0);
  });

  it('live getter count reflects current value after setItems', () => {
    const container = document.createElement('div');

    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 300 });

    const ctrl = createVirtualScroller<Row>(container, {
      estimateSize: 30,
      render: () => {},
    });

    expect(ctrl.count).toBe(0);
    ctrl.setItems(makeRows(10));
    // With spread snapshot this returns 0; Proxy returns the current value.
    expect(ctrl.count).toBe(10);
    ctrl.destroy();
  });

  it('live getter totalSize reflects current value after setItems', () => {
    const container = document.createElement('div');

    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 300 });

    const ctrl = createVirtualScroller<Row>(container, {
      estimateSize: 30,
      render: () => {},
    });

    ctrl.setItems(makeRows(5));
    expect(ctrl.totalSize).toBe(5 * 30);
    ctrl.setItems(makeRows(10));
    expect(ctrl.totalSize).toBe(10 * 30);
    ctrl.destroy();
  });

  it('applies containerClass to the scroll element', () => {
    const container = document.createElement('div');

    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 300 });

    const ctrl = createVirtualScroller<Row>(container, {
      containerClass: 'my-scroller',
      estimateSize: 30,
      render: () => {},
    });

    const scrollEl = container.children[0] as HTMLElement;

    expect(scrollEl.className).toBe('my-scroller');
    ctrl.destroy();
  });
});
