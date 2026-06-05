import { signal } from '@vielzeug/ripple';
import { describe, expect, it, vi } from 'vitest';

import { createDataGridControl } from '../datagrid';

type Row = { age: number; id: string; name: string };

const ROWS: Row[] = [
  { age: 30, id: '1', name: 'Charlie' },
  { age: 25, id: '2', name: 'Alice' },
  { age: 35, id: '3', name: 'Bob' },
];

function makeCtrl(rows = ROWS) {
  const items = signal<Row[]>(rows);
  const ctrl = createDataGridControl<Row>({
    columns: () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'age', label: 'Age', sortable: true },
    ],
    getRowKey: (r) => r.id,
    items,
    pageSize: () => 10,
    selectionMode: () => 'multi',
    signal: new AbortController().signal,
  });

  return { ctrl, items };
}

describe('createDataGridControl()', () => {
  describe('initial state', () => {
    it('exposes all items on the first page', () => {
      const { ctrl } = makeCtrl();

      expect(ctrl.currentPageItems.value).toHaveLength(3);
    });

    it('starts with no sort applied', () => {
      const { ctrl } = makeCtrl();

      expect(ctrl.sortState.value).toEqual({ direction: 'none', key: '' });
    });

    it('starts with no rows selected', () => {
      const { ctrl } = makeCtrl();

      expect(ctrl.selectedKeys.value.size).toBe(0);
    });

    it('pageIndex starts at 0', () => {
      const { ctrl } = makeCtrl();

      expect(ctrl.pageIndex.value).toBe(0);
    });
  });

  describe('sorting', () => {
    it('sortBy() cycles: none → asc → desc → none', () => {
      const { ctrl } = makeCtrl();

      ctrl.sortBy('name');
      expect(ctrl.sortState.value).toEqual({ direction: 'asc', key: 'name' });

      ctrl.sortBy('name');
      expect(ctrl.sortState.value).toEqual({ direction: 'desc', key: 'name' });

      ctrl.sortBy('name');
      expect(ctrl.sortState.value).toEqual({ direction: 'none', key: '' });
    });

    it('switching column resets to asc', () => {
      const { ctrl } = makeCtrl();

      ctrl.sortBy('name');
      ctrl.sortBy('age');

      expect(ctrl.sortState.value).toEqual({ direction: 'asc', key: 'age' });
    });

    it('sorts strings ascending', () => {
      const { ctrl } = makeCtrl();

      ctrl.sortBy('name');

      expect(ctrl.currentPageItems.value.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('sorts numbers descending', () => {
      const { ctrl } = makeCtrl();

      ctrl.sortBy('age');
      ctrl.sortBy('age');

      expect(ctrl.currentPageItems.value.map((r) => r.age)).toEqual([35, 30, 25]);
    });

    it('fires onSortChange callback', () => {
      const items = signal<Row[]>(ROWS);
      const onSortChange = vi.fn();
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        onSortChange,
        pageSize: () => 10,
        selectionMode: () => 'none',
        signal: new AbortController().signal,
      });

      ctrl.sortBy('name');

      expect(onSortChange).toHaveBeenCalledWith({ direction: 'asc', key: 'name' });
    });

    it('resets page to 0 when sort changes', () => {
      const items = signal<Row[]>(Array.from({ length: 15 }, (_, i) => ({ age: i, id: String(i), name: `Item${i}` })));
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        pageSize: () => 5,
        selectionMode: () => 'none',
        signal: new AbortController().signal,
      });

      ctrl.goToPage(2);
      expect(ctrl.pageIndex.value).toBe(2);

      ctrl.sortBy('name');
      expect(ctrl.pageIndex.value).toBe(0);
    });
  });

  describe('server-side sort via items signal', () => {
    it('when items signal changes, currentPageItems reflects the new value immediately', () => {
      const { ctrl, items } = makeCtrl();

      const preSorted: Row[] = [
        { age: 25, id: '2', name: 'Alice' },
        { age: 35, id: '3', name: 'Bob' },
        { age: 30, id: '1', name: 'Charlie' },
      ];

      items.value = preSorted;

      expect(ctrl.currentPageItems.value.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('pagination', () => {
    function makePagedCtrl(total: number, pageSize = 5) {
      const rows = Array.from({ length: total }, (_, i) => ({ age: i, id: String(i), name: `Item${i}` }));
      const items = signal<Row[]>(rows);
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        pageSize: () => pageSize,
        selectionMode: () => 'none',
        signal: new AbortController().signal,
      });

      return ctrl;
    }

    it('pageCount equals ceil(total / pageSize)', () => {
      expect(makePagedCtrl(12, 5).pageCount.value).toBe(3);
      expect(makePagedCtrl(10, 5).pageCount.value).toBe(2);
      expect(makePagedCtrl(0, 5).pageCount.value).toBe(0);
    });

    it('nextPage() increments the page index', () => {
      const ctrl = makePagedCtrl(15, 5);

      ctrl.nextPage();
      expect(ctrl.pageIndex.value).toBe(1);
    });

    it('prevPage() decrements the page index', () => {
      const ctrl = makePagedCtrl(15, 5);

      ctrl.goToPage(2);
      ctrl.prevPage();
      expect(ctrl.pageIndex.value).toBe(1);
    });

    it('nextPage() is a no-op on the last page', () => {
      const ctrl = makePagedCtrl(10, 5);

      ctrl.nextPage();
      ctrl.nextPage();
      expect(ctrl.pageIndex.value).toBe(1);
    });

    it('prevPage() is a no-op on the first page', () => {
      const ctrl = makePagedCtrl(10, 5);

      ctrl.prevPage();
      expect(ctrl.pageIndex.value).toBe(0);
    });

    it('goToPage() clamps to valid range', () => {
      const ctrl = makePagedCtrl(10, 5);

      ctrl.goToPage(-1);
      expect(ctrl.pageIndex.value).toBe(0);

      ctrl.goToPage(100);
      expect(ctrl.pageIndex.value).toBe(1);
    });

    it('hasNextPage and hasPrevPage are correct', () => {
      const ctrl = makePagedCtrl(15, 5);

      expect(ctrl.hasPrevPage.value).toBe(false);
      expect(ctrl.hasNextPage.value).toBe(true);

      ctrl.goToPage(2);
      expect(ctrl.hasPrevPage.value).toBe(true);
      expect(ctrl.hasNextPage.value).toBe(false);
    });

    it('pageSize 0 disables pagination and shows all items', () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({ age: i, id: String(i), name: `Item${i}` }));
      const items = signal<Row[]>(rows);
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        pageSize: () => 0,
        selectionMode: () => 'none',
        signal: new AbortController().signal,
      });

      expect(ctrl.currentPageItems.value).toHaveLength(20);
    });
  });

  describe('selection', () => {
    it('toggleRow() selects and deselects a row', () => {
      const { ctrl } = makeCtrl();

      ctrl.toggleRow('1');
      expect(ctrl.selectedKeys.value.has('1')).toBe(true);

      ctrl.toggleRow('1');
      expect(ctrl.selectedKeys.value.has('1')).toBe(false);
    });

    it('selectAll() selects all current-page rows', () => {
      const { ctrl } = makeCtrl();

      ctrl.selectAll();

      expect(ctrl.selectedKeys.value.size).toBe(3);
    });

    it('clearSelection() deselects all rows', () => {
      const { ctrl } = makeCtrl();

      ctrl.selectAll();
      ctrl.clearSelection();

      expect(ctrl.selectedKeys.value.size).toBe(0);
    });

    it('isAllSelected() returns true when all page rows are selected', () => {
      const { ctrl } = makeCtrl();

      ctrl.selectAll();

      expect(ctrl.isAllSelected()).toBe(true);
    });

    it('isSelected() returns true for selected rows', () => {
      const { ctrl } = makeCtrl();

      ctrl.toggleRow('2');

      expect(ctrl.isSelected('2')).toBe(true);
      expect(ctrl.isSelected('1')).toBe(false);
    });

    it('selectedRows is a reactive signal of selected row objects', () => {
      const { ctrl } = makeCtrl();

      ctrl.toggleRow('1');
      ctrl.toggleRow('3');

      const rows = ctrl.selectedRows.value;

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.id).sort()).toEqual(['1', '3']);
    });

    it('setSelection() replaces the selection', () => {
      const { ctrl } = makeCtrl();

      ctrl.toggleRow('1');
      ctrl.setSelection(new Set(['2', '3']));

      expect(ctrl.selectedKeys.value).toEqual(new Set(['2', '3']));
    });

    it('fires onSelectionChange on toggle', () => {
      const items = signal<Row[]>(ROWS);
      const onSelectionChange = vi.fn();
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        onSelectionChange,
        pageSize: () => 10,
        selectionMode: () => 'multi',
        signal: new AbortController().signal,
      });

      ctrl.toggleRow('1');

      expect(onSelectionChange).toHaveBeenCalledWith(new Set(['1']));
    });

    it('single selection mode: toggling one row deselects the previous', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        pageSize: () => 10,
        selectionMode: () => 'single',
        signal: new AbortController().signal,
      });

      ctrl.toggleRow('1');
      ctrl.toggleRow('2');

      expect(ctrl.selectedKeys.value).toEqual(new Set(['2']));
    });

    it('none selection mode: toggleRow() is a no-op', () => {
      const items = signal<Row[]>(ROWS);
      const ctrl = createDataGridControl<Row>({
        columns: () => [],
        getRowKey: (r) => r.id,
        items,
        pageSize: () => 10,
        selectionMode: () => 'none',
        signal: new AbortController().signal,
      });

      ctrl.toggleRow('1');

      expect(ctrl.selectedKeys.value.size).toBe(0);
    });
  });

  describe('totalItems', () => {
    it('reflects the current items length', () => {
      const { ctrl, items } = makeCtrl();

      expect(ctrl.totalItems.value).toBe(3);

      items.value = [];
      expect(ctrl.totalItems.value).toBe(0);
    });
  });
});
