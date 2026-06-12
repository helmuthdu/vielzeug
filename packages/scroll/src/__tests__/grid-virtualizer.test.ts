import { describe, expect, it, vi } from 'vitest';

import { createGridVirtualizer } from '../grid-virtualizer';
import { flushMicrotasks, makeContainer } from './test-utils';

function makeGrid(clientHeight = 300, clientWidth = 400) {
  return makeContainer({ clientHeight, clientWidth });
}

// ─── Visible rows and cols ───────────────────────────────────────────────────

describe('createGridVirtualizer – visible rows and cols', () => {
  it('emits rows and cols covering the initial viewport', () => {
    const el = makeGrid(100, 120);
    const v = createGridVirtualizer(el, {
      colCount: 10,
      estimateColSize: 40,
      estimateRowSize: 30,
      overscanX: { end: 0, start: 0 },
      overscanY: { end: 0, start: 0 },
      rowCount: 10,
    });

    expect(v.rows.length).toBeGreaterThanOrEqual(3);
    expect(v.cols.length).toBeGreaterThanOrEqual(3);
    v.dispose();
  });

  it('emits no rows when rowCount is 0', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 5, estimateColSize: 40, estimateRowSize: 30, rowCount: 0 });

    expect(v.rows).toHaveLength(0);
    expect(v.cols).toHaveLength(0);
    v.dispose();
  });

  it('emits no cols when colCount is 0', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 0, estimateColSize: 40, estimateRowSize: 30, rowCount: 5 });

    expect(v.rows).toHaveLength(0);
    expect(v.cols).toHaveLength(0);
    v.dispose();
  });

  it('row and col item shapes have correct position info', () => {
    const el = makeGrid(100, 120);
    const v = createGridVirtualizer(el, {
      colCount: 5,
      estimateColSize: 40,
      estimateRowSize: 30,
      overscanX: { end: 0, start: 0 },
      overscanY: { end: 0, start: 0 },
      rowCount: 5,
    });

    expect(v.rows[0]).toMatchObject({ end: 30, index: 0, size: 30, start: 0 });
    expect(v.cols[0]).toMatchObject({ end: 40, index: 0, size: 40, start: 0 });
    v.dispose();
  });
});

// ─── totalSize ────────────────────────────────────────────────────────────────

describe('createGridVirtualizer – totalSize', () => {
  it('computes totalHeight and totalWidth from estimates', () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, {
      colCount: 5,
      estimateColSize: 80,
      estimateRowSize: 50,
      rowCount: 4,
    });

    expect(v.totalHeight).toBe(4 * 50);
    expect(v.totalWidth).toBe(5 * 80);
    v.dispose();
  });

  it('includes row and column gaps', () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, {
      colCount: 3,
      colGap: 10,
      estimateColSize: 100,
      estimateRowSize: 50,
      rowCount: 3,
      rowGap: 8,
    });

    expect(v.totalHeight).toBe(3 * 50 + 2 * 8);
    expect(v.totalWidth).toBe(3 * 100 + 2 * 10);
    v.dispose();
  });
});

// ─── onChange ─────────────────────────────────────────────────────────────────

describe('createGridVirtualizer – onChange', () => {
  it('calls onChange on creation with initial rows, cols, and size', () => {
    const el = makeGrid(100, 120);
    const onChange = vi.fn();

    createGridVirtualizer(el, { colCount: 5, estimateColSize: 40, estimateRowSize: 30, onChange, rowCount: 5 });

    expect(onChange).toHaveBeenCalled();

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state).toHaveProperty('rows');
    expect(state).toHaveProperty('cols');
    expect(state).toHaveProperty('totalHeight');
    expect(state).toHaveProperty('totalWidth');
    expect(Array.isArray(state.rows)).toBe(true);
    expect(Array.isArray(state.cols)).toBe(true);
  });
});

// ─── onRangeChange ────────────────────────────────────────────────────────────

describe('createGridVirtualizer – onRangeChange', () => {
  it('fires with initial rendered range', () => {
    const el = makeGrid(100, 120);
    const onRangeChange = vi.fn();

    createGridVirtualizer(el, {
      colCount: 10,
      estimateColSize: 40,
      estimateRowSize: 30,
      onRangeChange,
      overscanX: { end: 0, start: 0 },
      overscanY: { end: 0, start: 0 },
      rowCount: 10,
    });

    expect(onRangeChange).toHaveBeenCalled();

    const range = onRangeChange.mock.calls.at(-1)?.[0];

    expect(range).toHaveProperty('firstRow');
    expect(range).toHaveProperty('lastRow');
    expect(range).toHaveProperty('firstCol');
    expect(range).toHaveProperty('lastCol');
  });
});

// ─── measurement ─────────────────────────────────────────────────────────────

describe('createGridVirtualizer – measurement', () => {
  it('measureRow applies in next microtask', async () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 100, estimateRowSize: 50, rowCount: 10 });

    v.measureRow(0, 80);
    await flushMicrotasks();

    expect(v.totalHeight).toBe(80 + 9 * 50);
    v.dispose();
  });

  it('measureColumn applies in next microtask', async () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, { colCount: 5, estimateColSize: 80, estimateRowSize: 50, rowCount: 4 });

    v.measureColumn(0, 120);
    await flushMicrotasks();

    expect(v.totalWidth).toBe(120 + 4 * 80);
    v.dispose();
  });

  it('measureBatch batches row and col updates into one pass', async () => {
    const el = makeGrid(300, 400);
    const onChange = vi.fn();
    const v = createGridVirtualizer(el, {
      colCount: 5,
      estimateColSize: 80,
      estimateRowSize: 50,
      onChange,
      rowCount: 4,
    });

    const callsBefore = onChange.mock.calls.length;

    v.measureBatch(
      [
        { index: 0, size: 70 },
        { index: 1, size: 90 },
      ],
      [{ index: 0, size: 100 }],
    );
    await flushMicrotasks();

    // R4: single coordinated flush — both axes trigger exactly one onChange call
    expect(onChange.mock.calls.length).toBe(callsBefore + 1);
    expect(v.totalHeight).toBe(70 + 90 + 2 * 50);
    expect(v.totalWidth).toBe(100 + 4 * 80);
    v.dispose();
  });

  it('measureRowEl returns a disconnect function', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 100, estimateRowSize: 50, rowCount: 5 });
    const rowEl = document.createElement('div');
    const disconnect = v.measureRowEl(0, rowEl);

    expect(typeof disconnect).toBe('function');
    expect(() => disconnect()).not.toThrow();
    v.dispose();
  });

  it('measureColEl returns a disconnect function', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 100, estimateRowSize: 50, rowCount: 5 });
    const colEl = document.createElement('div');
    const disconnect = v.measureColEl(0, colEl);

    expect(typeof disconnect).toBe('function');
    expect(() => disconnect()).not.toThrow();
    v.dispose();
  });
});

// ─── external measurement caches ──────────────────────────────────────────────

describe('createGridVirtualizer – measurementCache', () => {
  it('uses external row and col caches', async () => {
    const el = makeGrid(300, 400);
    const rowCache = new Map<number, number>();
    const colCache = new Map<number, number>();
    const v = createGridVirtualizer(el, {
      colCount: 3,
      colMeasurementCache: colCache,
      estimateColSize: 80,
      estimateRowSize: 50,
      rowCount: 5,
      rowMeasurementCache: rowCache,
    });

    v.measureRow(0, 70);
    v.measureColumn(0, 110);
    await flushMicrotasks();

    expect(rowCache.get(0)).toBe(70);
    expect(colCache.get(0)).toBe(110);
    v.dispose();
  });

  it('restores from pre-populated caches', () => {
    const el = makeGrid(300, 400);
    const rowCache = new Map([[0, 75]]);
    const colCache = new Map([[0, 120]]);
    const v = createGridVirtualizer(el, {
      colCount: 3,
      colMeasurementCache: colCache,
      estimateColSize: 80,
      estimateRowSize: 50,
      rowCount: 5,
      rowMeasurementCache: rowCache,
    });

    expect(v.totalHeight).toBe(75 + 4 * 50);
    expect(v.totalWidth).toBe(120 + 2 * 80);
    v.dispose();
  });
});

// ─── invalidate / refresh ─────────────────────────────────────────────────────

describe('createGridVirtualizer – invalidate / refresh', () => {
  it('invalidate clears all row and col measurements', async () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });

    v.measureRow(0, 100);
    v.measureColumn(0, 120);
    await flushMicrotasks();

    v.invalidate();

    expect(v.totalHeight).toBe(5 * 50);
    expect(v.totalWidth).toBe(3 * 80);
    v.dispose();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('createGridVirtualizer – update', () => {
  it('applies rowCount and colCount', () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, { colCount: 5, estimateColSize: 80, estimateRowSize: 50, rowCount: 4 });

    v.update({ colCount: 3, rowCount: 6 });

    expect(v.totalHeight).toBe(6 * 50);
    expect(v.totalWidth).toBe(3 * 80);
    v.dispose();
  });

  it('is a no-op after destroy', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });

    v.dispose();

    expect(() => v.update({ rowCount: 10 })).not.toThrow();
  });
});

// ─── scrollToCell ─────────────────────────────────────────────────────────────

describe('createGridVirtualizer – scrollToCell', () => {
  it('scrolls so the target cell is visible', () => {
    const el = makeGrid(100, 120);
    const v = createGridVirtualizer(el, {
      colCount: 20,
      estimateColSize: 40,
      estimateRowSize: 30,
      overscanX: { end: 0, start: 0 },
      overscanY: { end: 0, start: 0 },
      rowCount: 20,
    });

    v.scrollToCell(10, 10, { colAlign: 'start', rowAlign: 'start' });

    expect(el.scrollTop).toBe(10 * 30);
    expect(el.scrollLeft).toBe(10 * 40);
    v.dispose();
  });

  it('no-ops when cell is already in view (auto)', () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, {
      colCount: 20,
      estimateColSize: 40,
      estimateRowSize: 30,
      overscanX: { end: 0, start: 0 },
      overscanY: { end: 0, start: 0 },
      rowCount: 20,
    });

    const topBefore = el.scrollTop;
    const leftBefore = el.scrollLeft;

    v.scrollToCell(0, 0);

    expect(el.scrollTop).toBe(topBefore);
    expect(el.scrollLeft).toBe(leftBefore);
    v.dispose();
  });
});

// ─── scrollTop / scrollLeft properties ────────────────────────────────────────

describe('createGridVirtualizer – scroll position properties', () => {
  it('scrollTop and scrollLeft are readable', () => {
    const el = makeGrid(100, 120);
    const v = createGridVirtualizer(el, {
      colCount: 10,
      estimateColSize: 40,
      estimateRowSize: 30,
      rowCount: 10,
    });

    expect(typeof v.scrollTop).toBe('number');
    expect(typeof v.scrollLeft).toBe('number');
    v.dispose();
  });

  it('can be used to restore scroll position via initialScrollTop/Left', () => {
    const el = makeGrid(100, 120);
    const v1 = createGridVirtualizer(el, { colCount: 10, estimateColSize: 40, estimateRowSize: 30, rowCount: 10 });

    v1.scrollToCell(5, 5, { colAlign: 'start', rowAlign: 'start' });

    const savedTop = el.scrollTop;
    const savedLeft = el.scrollLeft;

    v1.dispose();

    // Re-read scroll position from element since the virtualizer was destroyed
    Object.defineProperty(el, 'scrollTop', { configurable: true, get: () => savedTop });
    Object.defineProperty(el, 'scrollLeft', { configurable: true, get: () => savedLeft });

    const v2 = createGridVirtualizer(el, {
      colCount: 10,
      estimateColSize: 40,
      estimateRowSize: 30,
      initialScrollLeft: savedLeft,
      initialScrollTop: savedTop,
      overscanX: { end: 0, start: 0 },
      overscanY: { end: 0, start: 0 },
      rowCount: 10,
    });

    expect(v2.scrollTop).toBe(savedTop);
    expect(v2.scrollLeft).toBe(savedLeft);
    v2.dispose();
  });
});

// ─── prependRows ─────────────────────────────────────────────────────────────

describe('createGridVirtualizer – prependRows', () => {
  it('increases rowCount and totalHeight', () => {
    const el = makeGrid(300, 400);
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });

    v.prependRows(3);

    expect(v.totalHeight).toBe(8 * 50);
    v.dispose();
  });

  it('is a no-op for 0', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });
    const before = v.totalHeight;

    v.prependRows(0);

    expect(v.totalHeight).toBe(before);
    v.dispose();
  });

  it('is a no-op after destroy', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });

    v.dispose();

    expect(() => v.prependRows(3)).not.toThrow();
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('createGridVirtualizer – lifecycle', () => {
  it('destroy is idempotent', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });

    expect(() => {
      v.dispose();
      v.dispose();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const el = makeGrid();
    const v = createGridVirtualizer(el, { colCount: 3, estimateColSize: 80, estimateRowSize: 50, rowCount: 5 });

    v[Symbol.dispose]();

    expect(() => v[Symbol.dispose]()).not.toThrow();
  });

  it('does not emit after destroy', () => {
    const el = makeGrid();
    const onChange = vi.fn();
    const v = createGridVirtualizer(el, {
      colCount: 3,
      estimateColSize: 80,
      estimateRowSize: 50,
      onChange,
      rowCount: 5,
    });
    const callsBefore = onChange.mock.calls.length;

    v.dispose();
    el.dispatchEvent(new Event('scroll'));

    expect(onChange.mock.calls.length).toBe(callsBefore);
  });
});
