import { computed, type ReadonlySignal, signal } from '@vielzeug/ripple';

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
  items: ReadonlySignal<T[]>;
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
  readonly currentPageItems: ReadonlySignal<T[]>;
  /** Go to an absolute page index. */
  goToPage(index: number): void;
  /** Whether there is a next page. Reactive signal. */
  readonly hasNextPage: ReadonlySignal<boolean>;
  /** Whether there is a previous page. Reactive signal. */
  readonly hasPrevPage: ReadonlySignal<boolean>;
  /** Whether all current-page rows are selected. */
  isAllSelected(): boolean;
  /** Whether a given row key is selected. */
  isSelected(key: string): boolean;
  /** Navigate to the next page. */
  nextPage(): void;
  /** Total page count. Reactive signal. */
  readonly pageCount: ReadonlySignal<number>;
  /** Current 0-based page index. Reactive signal. */
  readonly pageIndex: ReadonlySignal<number>;
  /** Navigate to the previous page. */
  prevPage(): void;
  /** Select all rows on the current page. */
  selectAll(): void;
  /** Current selected row keys. Reactive signal. */
  readonly selectedKeys: ReadonlySignal<Set<string>>;
  /** All rows whose keys are in `selectedKeys`. Reactive signal. */
  readonly selectedRows: ReadonlySignal<T[]>;
  /** Set the selection to an explicit set of keys. */
  setSelection(keys: Set<string>): void;
  /** Sort by the given column key — cycles asc → desc → none. */
  sortBy(key: string): void;
  /** Current sort state. Reactive signal. */
  readonly sortState: ReadonlySignal<SortState>;
  /** Toggle selection for a single row. */
  toggleRow(key: string): void;
  /** Total item count across all pages. Reactive signal. */
  readonly totalItems: ReadonlySignal<number>;
};

// ── Implementation ─────────────────────────────────────────────────────────────

/**
 * Headless datagrid control — sorting, pagination, and row selection.
 *
 * All mutable state is exposed as reactive `ReadonlySignal` values so
 * consumers can bind directly in templates without manual invalidation.
 *
 * Pass `items` as a `ReadonlySignal<T[]>`. For client-side sorting, wrap your
 * full dataset; for server-side sorting, pass a signal whose value is the
 * pre-sorted result. The control fires `onSortChange` in both cases.
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
 *
 * // In template — subscribes automatically:
 * ctrl.currentPageItems.value.map(...)
 * ctrl.sortState.value.direction
 * ctrl.selectedKeys.value.has(key)
 * ```
 */
export const createDataGridControl = <T = Record<string, unknown>>(
  options: DataGridControlOptions<T>,
): DataGridControl<T> => {
  // ── Sorting ──────────────────────────────────────────────────────────────────

  const _sortKey = signal<string>('');
  const _sortDir = signal<SortDirection>('none');

  const sortState = computed<SortState>(() => ({ direction: _sortDir.value, key: _sortKey.value }));

  const sortBy = (key: string): void => {
    if (_sortKey.value !== key) {
      _sortKey.value = key;
      _sortDir.value = 'asc';
    } else if (_sortDir.value === 'asc') {
      _sortDir.value = 'desc';
    } else if (_sortDir.value === 'desc') {
      _sortKey.value = '';
      _sortDir.value = 'none';
    }

    _pageIndex.value = 0;
    options.onSortChange?.({ direction: _sortDir.value, key: _sortKey.value });
  };

  // ── Sorted items ─────────────────────────────────────────────────────────────

  const sortedItems = computed<T[]>(() => {
    const items = options.items.value;
    const key = _sortKey.value;
    const dir = _sortDir.value;

    if (!key || dir === 'none') return items;

    return items.slice().sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      const cmp =
        typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));

      return dir === 'asc' ? cmp : -cmp;
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────────

  const _pageIndex = signal(0);

  const pageCount = computed(() => {
    const ps = options.pageSize();
    const len = sortedItems.value.length;

    if (ps <= 0 || len === 0) return 0;

    return Math.ceil(len / ps);
  });

  const safePage = computed(() => {
    const pc = pageCount.value;

    return pc === 0 ? 0 : Math.min(_pageIndex.value, pc - 1);
  });

  const currentPageItems = computed<T[]>(() => {
    const ps = options.pageSize();

    if (ps <= 0) return sortedItems.value;

    const start = safePage.value * ps;

    return sortedItems.value.slice(start, start + ps);
  });

  const hasNextPage = computed(() => options.pageSize() > 0 && safePage.value < pageCount.value - 1);
  const hasPrevPage = computed(() => options.pageSize() > 0 && safePage.value > 0);

  const nextPage = (): void => {
    if (hasNextPage.value) _pageIndex.value = safePage.value + 1;
  };

  const prevPage = (): void => {
    if (hasPrevPage.value) _pageIndex.value = safePage.value - 1;
  };

  const goToPage = (index: number): void => {
    _pageIndex.value = Math.max(0, index);
  };

  const totalItems = computed(() => sortedItems.value.length);

  // ── Selection ─────────────────────────────────────────────────────────────────

  const _selectedKeys = signal<Set<string>>(new Set());

  const isSelected = (key: string): boolean => _selectedKeys.value.has(key);

  const isAllSelected = (): boolean => {
    const page = currentPageItems.value;

    if (!page.length) return false;

    return page.every((item) => _selectedKeys.value.has(options.getRowKey(item)));
  };

  const _commitSelection = (next: Set<string>): void => {
    _selectedKeys.value = next;
    options.onSelectionChange?.(next);
  };

  const toggleRow = (key: string): void => {
    const mode = options.selectionMode();

    if (mode === 'none') return;

    const next = new Set(_selectedKeys.value);

    if (next.has(key)) {
      next.delete(key);
    } else if (mode === 'single') {
      next.clear();
      next.add(key);
    } else {
      next.add(key);
    }

    _commitSelection(next);
  };

  const selectAll = (): void => {
    if (options.selectionMode() !== 'multi') return;

    const page = currentPageItems.value;

    if (isAllSelected()) {
      const next = new Set(_selectedKeys.value);

      for (const item of page) next.delete(options.getRowKey(item));

      _commitSelection(next);
    } else {
      const next = new Set(_selectedKeys.value);

      for (const item of page) next.add(options.getRowKey(item));

      _commitSelection(next);
    }
  };

  const clearSelection = (): void => {
    _commitSelection(new Set());
  };

  const setSelection = (keys: Set<string>): void => {
    _commitSelection(new Set(keys));
  };

  const selectedRows = computed<T[]>(() =>
    options.items.value.filter((item) => _selectedKeys.value.has(options.getRowKey(item))),
  );

  return {
    clearSelection,
    currentPageItems,
    goToPage,
    hasNextPage,
    hasPrevPage,
    isAllSelected,
    isSelected,
    nextPage,
    pageCount,
    pageIndex: safePage,
    prevPage,
    selectAll,
    selectedKeys: _selectedKeys,
    selectedRows,
    setSelection,
    sortBy,
    sortState,
    toggleRow,
    totalItems,
  };
};
