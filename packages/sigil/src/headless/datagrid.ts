import { computed, type Readable } from '@vielzeug/ripple';

import { createPaginatedList } from './paginated-list';
import { createSelectionControl } from './selection-control';
import { createSortControl } from './sort-control';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Sort direction for a column. */
export type SortDirection = 'asc' | 'desc' | 'none';

/** Per-column sort state. */
export type SortState = {
  /** Current sort direction. */
  direction: SortDirection;
  /** The column key being sorted. Empty string when unsorted. */
  key: string;
};

/** Column definition for the datagrid. */
export type DataGridColumn<T = Record<string, unknown>> = {
  /**
   * Custom cell renderer. Receives the row item and returns a string.
   * Use for formatted values (e.g. dates, currency, booleans).
   */
  cell?: (item: T) => string;
  /** Accessible label for the column header. Defaults to `label`. */
  headerLabel?: string;
  /** Column key — must match a property of the row object. */
  key: string;
  /** Display label for the column header. */
  label: string;
  /**
   * Renders the expanded detail panel for a row. When provided on any column,
   * `<sg-datagrid expandable>` shows a toggle button in each row.
   * Receives the full row item and returns an HTML string.
   *
   * @security The returned string is inserted via `innerHTML`. If the data
   * originates from untrusted user input, sanitize it before returning
   * (e.g. with DOMPurify or your CSP-compliant sanitizer).
   *
   * @example
   * ```js
   * grid.columns = [{
   *   key: 'name', label: 'Name',
   *   renderExpanded: (row) => `<div class="detail"><b>${row.name}</b>: ${row.bio}</div>`,
   * }];
   * ```
   */
  renderExpanded?: (item: T) => string;
  /** Whether the column can be resized via a drag handle. Defaults to `false`. */
  resizable?: boolean;
  /** Whether the column is sortable. Defaults to `false`. */
  sortable?: boolean;
  /**
   * Custom sort key extractor for client-side sorting.
   * Return a `number` or `string` for comparison.
   * When omitted, the column's `key` property is used as a plain property lookup.
   *
   * @example
   * ```ts
   * { key: 'createdAt', label: 'Date', sortValue: (row) => new Date(row.createdAt).getTime() }
   * ```
   */
  sortValue?: (item: T) => number | string;
  /** Column width (any valid CSS width value, e.g. `'12rem'`). */
  width?: string;
};

/** Row selection mode. */
export type SelectionMode = 'multi' | 'none' | 'single';

export type DataGridControlOptions<T = Record<string, unknown>> = {
  /** Returns the current column definitions reactively. */
  columns: () => DataGridColumn<T>[];
  /** Returns a unique string key for each row item. */
  getRowKey: (item: T) => string;
  /**
   * Reactive signal of the current row items.
   *
   * For server-side sorting, pass a signal whose value is the pre-sorted result
   * from your server. For client-side sorting, pass a plain signal wrapping your
   * full dataset — the control will sort it automatically via `sortBy()`.
   */
  items: Readable<T[]>;
  /** Called when selection changes. Receives the full set of selected keys. */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Called when sort state changes. */
  onSortChange?: (sort: SortState) => void;
  /** Returns the current page size reactively. Use `0` to disable pagination. */
  pageSize: () => number;
  /** Returns the current selection mode reactively. */
  selectionMode: () => SelectionMode;
  /** `AbortSignal` from the component lifecycle. */
  signal: AbortSignal;
};

export type DataGridControl<T = Record<string, unknown>> = {
  /** Deselect all rows. */
  clearSelection(): void;
  /** Current page items (sorted + paginated). Reactive signal. */
  readonly currentPageItems: Readable<T[]>;
  /** Go to an absolute page index. The index is clamped to the valid page range `[0, pageCount - 1]`. */
  goToPage(index: number): void;
  /** Whether there is a next page. Reactive signal. */
  readonly hasNextPage: Readable<boolean>;
  /** Whether there is a previous page. Reactive signal. */
  readonly hasPrevPage: Readable<boolean>;
  /** Whether all current-page rows are selected. */
  isAllSelected(): boolean;
  /** Whether a given row key is selected. */
  isSelected(key: string): boolean;
  /** Navigate to the next page. */
  nextPage(): void;
  /** Total page count. Reactive signal. */
  readonly pageCount: Readable<number>;
  /** Current 0-based page index. Reactive signal. */
  readonly pageIndex: Readable<number>;
  /** Navigate to the previous page. */
  prevPage(): void;
  /** Select all rows on the current page. */
  selectAll(): void;
  /** Current selected row keys. Reactive signal. Returns a snapshot copy — mutating the returned set has no effect on reactive state; use `toggleRow`, `selectAll`, `setSelection`, or `clearSelection` to update selection. */
  readonly selectedKeys: Readable<ReadonlySet<string>>;
  /** All rows whose keys are in `selectedKeys`. Reactive signal. */
  readonly selectedRows: Readable<T[]>;
  /** Set the selection to an explicit set of keys. */
  setSelection(keys: Set<string>): void;
  /** Sort by the given column key — cycles asc → desc → none. */
  sortBy(key: string): void;
  /** Current sort state. Reactive signal. */
  readonly sortState: Readable<SortState>;
  /** Set sort to an explicit key and direction. Passing `'none'` clears the sort. */
  sortTo(key: string, direction: SortDirection): void;
  /** Toggle selection for a single row. */
  toggleRow(key: string): void;
  /** Total item count across all pages. Reactive signal. */
  readonly totalItems: Readable<number>;
};

// ── Implementation ─────────────────────────────────────────────────────────────

/**
 * Headless datagrid control — sorting, pagination, and row selection.
 *
 * Composed from three focused primitives:
 * - `createSortControl` — client-side sorting with a cycle (asc → desc → none)
 * - `createPaginatedList` — reactive pagination over the sorted items
 * - `createSelectionControl` — single/multi/none row selection
 *
 * All mutable state is exposed as reactive `Reactive` values so
 * consumers can bind directly in templates without manual invalidation.
 *
 * @example
 * ```ts
 * const rows = signal(myItems);
 * const ctrl = createDataGridControl({
 *   columns: () => myColumns,
 *   items: rows,
 *   getRowKey: (item) => item.id,
 *   selectionMode: () => 'multi',
 *   pageSize: () => 20,
 *   signal: lifecycleSignal(onCleanup),
 * });
 * ```
 */
export const createDataGridControl = <T = Record<string, unknown>>(
  options: DataGridControlOptions<T>,
): DataGridControl<T> => {
  // ── Sort ──────────────────────────────────────────────────────────────────
  const sort = createSortControl<T>({
    columns: options.columns,
    items: options.items,
    onSortChange: options.onSortChange,
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  // pageSize 0 means "disabled" — pass Number.MAX_SAFE_INTEGER so all items fit on one page.
  const _pageSize = computed(() => {
    const ps = options.pageSize();

    return ps <= 0 ? Number.MAX_SAFE_INTEGER : ps;
  });

  const pagination = createPaginatedList({
    getItems: () => sort.sortedItems.value,
    pageSize: _pageSize,
  });

  const totalItems = computed(() => sort.sortedItems.value.length);

  // When pageSize is 0 (disabled), bypass pagination and show all items.
  const currentPageItems = computed<T[]>(() =>
    options.pageSize() <= 0 ? sort.sortedItems.value : pagination.pageItems.value,
  );

  // Reset to page 0 whenever sort changes.
  const _sortByAndReset = (key: string): void => {
    sort.sortBy(key);
    pagination.reset();
  };

  const _sortToAndReset = (key: string, direction: SortDirection): void => {
    sort.sortTo(key, direction);
    pagination.reset();
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const selection = createSelectionControl<T>({
    getRowKey: options.getRowKey,
    onSelectionChange: options.onSelectionChange,
    pageItems: () => pagination.pageItems.value,
    selectionMode: options.selectionMode,
  });

  const selectedRows = computed<T[]>(() =>
    options.items.value.filter((item) => selection.selectedKeys.value.has(options.getRowKey(item))),
  );

  return {
    clearSelection: selection.clearSelection,
    currentPageItems,
    goToPage: (index: number) => {
      if (!Number.isFinite(index)) return;

      pagination.goTo(Math.max(0, index));
    },
    hasNextPage: pagination.hasNext,
    hasPrevPage: pagination.hasPrev,
    isAllSelected: selection.isAllSelected,
    isSelected: selection.isSelected,
    nextPage: pagination.next,
    pageCount: pagination.pageCount,
    pageIndex: pagination.pageIndex,
    prevPage: pagination.prev,
    selectAll: selection.selectAll,
    selectedKeys: selection.selectedKeys,
    selectedRows,
    setSelection: selection.setSelection,
    sortBy: _sortByAndReset,
    sortState: sort.sortState,
    sortTo: _sortToAndReset,
    toggleRow: selection.toggleRow,
    totalItems,
  };
};
