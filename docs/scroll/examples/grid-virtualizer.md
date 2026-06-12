---
title: 'Scroll Examples — Grid Virtualizer'
description: 'Virtualize a two-dimensional grid with independent row and column measurement.'
---

## Grid Virtualizer

### Problem

Render a large spreadsheet-style grid with thousands of rows and many columns without mounting all cells at once.

### Solution

Use `createGridVirtualizer` for two-dimensional virtualization. It maintains independent row and column axes. `onChange` provides the cross-product of visible `rows` and `cols`.

```ts
import { createGridVirtualizer } from '@vielzeug/scroll';

const ROW_COUNT = 100_000;
const COL_COUNT = 20;
const ROW_H = 36;
const COL_W = 150;

const scrollEl = document.getElementById('scroll')!;
const containerEl = document.getElementById('container')!;

const grid = createGridVirtualizer(scrollEl, {
  colCount: COL_COUNT,
  estimateColSize: COL_W,
  estimateRowSize: ROW_H,
  rowCount: ROW_COUNT,
  onChange: ({ cols, rows, totalHeight, totalWidth }) => {
    containerEl.style.cssText = `position:relative;height:${totalHeight}px;width:${totalWidth}px;`;
    containerEl.innerHTML = '';

    for (const row of rows) {
      for (const col of cols) {
        const cell = document.createElement('div');
        cell.style.cssText = `
          position: absolute;
          top: ${row.start}px;
          left: ${col.start}px;
          height: ${row.size}px;
          width: ${col.size}px;
          box-sizing: border-box;
          border-right: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 8px;
          line-height: ${row.size}px;
          overflow: hidden;
          white-space: nowrap;
        `;
        cell.textContent = `R${row.index} C${col.index}`;
        containerEl.appendChild(cell);
      }
    }
  },
});

// Scroll to a cell
grid.scrollToCell(500, 3, { colAlign: 'start', rowAlign: 'center' });

// Update row/col counts after data changes
grid.update({ colCount: 25, rowCount: 200_000 });

// Cleanup
grid.destroy();
```

```html
<div id="scroll" style="height:600px;overflow:auto;position:relative;">
  <div id="container"></div>
</div>
```

### Variable-height rows with ResizeObserver

```ts
const observer = new ResizeObserver((entries) => {
  grid.measureBatch(
    entries.map((e) => ({ index: Number((e.target as HTMLElement).dataset.row), size: e.contentRect.height })),
    [],
  );
});

// After rendering
for (const row of grid.rows) {
  const rowEl = document.querySelector<HTMLElement>(`[data-row="${row.index}"]`);
  if (rowEl) observer.observe(rowEl);
}
```

---

### Pitfalls

- `onChange` fires with `rows × cols` items. For a grid with 20 columns and 30 visible rows, that is 600 DOM nodes per render. Keep `overscan` tight (`{ start: 1, end: 1 }`) in very wide grids.
- Both the scroll element and the container must have `position: relative` or `position: absolute` for absolute cell positioning to work.
- `scrollToCell` uses estimated row/column offsets before any measurements. If rows have highly variable heights, scroll to cell and then call `measureBatch` after the DOM paints.

### Related

- [Basic Fixed-Height List](./basic-fixed-height-list.md)
- [Variable Height With Measurement](./variable-height-with-measurement.md)
- [Reactive Virtualizer](./reactive-virtualizer.md)
