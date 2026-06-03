import { computed, signal } from '@vielzeug/craft';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Sort direction for a column. */
export type SortDirection = 'asc' | 'desc' | 'none';

/** Per-column sort state. */
export type SortState = {
  /** The column key being sorted. */
  key: string;
  /** Current sort direction. */
  direction: SortDirection;
};

/** Column definition for the datagrid. */
export type DataGridColumn<T = Record<string, unknown>> = {
  /**
   * Custom cell renderer. Receives the row item and returns a string.
   * Use for formatted values (e.g. dates, numbers).
   */
  cell?: (item: T) => string;
  /** Accessible label for the column header. Defaults to `label`. */
  headerLabel?: string;
  /** Column key — must match a property of the row object. */
  key: string;
  /** Display label for the column header. */
  label: string;
  /** Column is not sortable. Defaults to `false`. */
  sortable?: boolean;
  /** Column width (any valid CSS width value). */
  width?: string;
};

/** Row selection mode. */
export type SelectionMode = 'multi' | 'none' | 'single';

export type DataGridControlOptions<T = Record<string, unknown>> = {
  /** Column definitions — may be a static array or a getter that returns a reactive array. */
  columns: DataGridColumn<T>[] | (() => DataGridColumn<T>[]);
  /** Whether row clicking fires a selection change. */
  getItems: () => T[];
  /** Return a unique string key for each row item. */
  getRowKey: (item: T) => string;
  /** Called when selection changes. */
  onSelectionChange?: (keys: Set<string>) => void;
  /** Called when sort state changes. */
  onSortChange?: (sort: SortState) => void;
  /** Initial page size. Defaults to 10. */
  pageSize?: number;
  /** Row selection mode. Defaults to `'none'`. */
  selectionMode?: SelectionMode;
};

export type DataGridControl<T = Record<string, unknown>> = {
  /** All column definitions. */
  readonly columns: DataGridColumn<T>[];
  /** Current page items (sorted + paginated). */
  readonly currentPageItems: T[];
  /** Whether there is a next page. */
  readonly hasNextPage: boolean;
  /** Whether there is a previous page. */
  readonly hasPrevPage: boolean;
  /** Whether all current-page rows are selected. */
  isAllSelected(): boolean;
  /** Whether a given row key is selected. */
  isSelected(key: string): boolean;
  /** Navigate to the next page. */
  nextPage(): void;
  /** Total page count. */
  readonly pageCount: number;
  /** Current 0-based page index. */
  readonly pageIndex: number;
  /** Navigate to the previous page. */
  prevPage(): void;
  /** Go to an absolute page index. */
  goToPage(index: number): void;
  /** Current selected row keys. */
  readonly selectedKeys: Set<string>;
  /** Current selection mode. */
  readonly selectionMode: SelectionMode;
  /** Select all rows on the current page. */
  selectAll(): void;
  /** Deselect all rows. */
  clearSelection(): void;
  /** Toggle selection for a single row. */
  toggleRow(key: string): void;
  /** Current sort state. */
  readonly sortState: SortState;
  /** Sort by the given column key — cycles asc → desc → none. */
  sortBy(key: string): void;
  /** Total item count (all pages). */
  readonly totalItems: number;
};

// ── Implementation ─────────────────────────────────────────────────────────────

/**
 * Headless datagrid control — sorting, pagination, and row selection.
 *
 * All state is reactive. Pass reactive item sources via `getItems`.
 *
 * @example
 * ```ts
 * const ctrl = createDataGridControl({
 *   columns: [{ key: 'name', label: 'Name', sortable: true }],
 *   getItems: () => myItems,
 *   getRowKey: (item) => item.id,
 *   selectionMode: 'multi',
 *   pageSize: 20,
 * });
 * ```
 */
export const createDataGridControl = <T = Record<string, unknown>>(
  options: DataGridControlOptions<T>,
): DataGridControl<T> => {
  const selectionMode: SelectionMode = options.selectionMode ?? 'none';
  const resolveColumns = (): DataGridColumn<T>[] =>
    typeof options.columns === 'function' ? options.columns() : options.columns;

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
    const items = options.getItems();
    const key = _sortKey.value;
    const dir = _sortDir.value;

    if (!key || dir === 'none') return items.slice();

    return items.slice().sort((a, b) => {
      const av = (a as Record<string, unknown>)[key];
      const bv = (b as Record<string, unknown>)[key];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''));

      return dir === 'asc' ? cmp : -cmp;
    });
  });

  // ── Pagination ────────────────────────────────────────────────────────────────

  const resolvedPageSize = (): number => options.pageSize ?? 10;

  const _pageIndex = signal(0);

  const pageCount = computed(() => Math.max(1, Math.ceil(sortedItems.value.length / resolvedPageSize())));

  const safePage = computed(() => Math.min(_pageIndex.value, pageCount.value - 1));

  const currentPageItems = computed<T[]>(() => {
    const start = safePage.value * resolvedPageSize();

    return sortedItems.value.slice(start, start + resolvedPageSize());
  });

  const hasNextPage = computed(() => safePage.value < pageCount.value - 1);
  const hasPrevPage = computed(() => safePage.value > 0);

  const nextPage = (): void => {
    if (hasNextPage.value) _pageIndex.value = safePage.value + 1;
  };

  const prevPage = (): void => {
    if (hasPrevPage.value) _pageIndex.value = safePage.value - 1;
  };

  const goToPage = (index: number): void => {
    _pageIndex.value = Math.max(0, index);
  };

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
    if (selectionMode === 'none') return;

    const next = new Set(_selectedKeys.value);

    if (next.has(key)) {
      next.delete(key);
    } else if (selectionMode === 'single') {
      next.clear();
      next.add(key);
    } else {
      next.add(key);
    }

    _commitSelection(next);
  };

  const selectAll = (): void => {
    if (selectionMode !== 'multi') return;

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

  return {
    get columns() {
      return resolveColumns();
    },
    get currentPageItems() {
      return currentPageItems.value;
    },
    get hasNextPage() {
      return hasNextPage.value;
    },
    get hasPrevPage() {
      return hasPrevPage.value;
    },
    isAllSelected,
    isSelected,
    nextPage,
    get pageCount() {
      return pageCount.value;
    },
    get pageIndex() {
      return safePage.value;
    },
    prevPage,
    goToPage,
    get selectedKeys() {
      return _selectedKeys.value;
    },
    selectionMode,
    selectAll,
    clearSelection,
    toggleRow,
    get sortState() {
      return sortState.value;
    },
    sortBy,
    get totalItems() {
      return sortedItems.value.length;
    },
  };
};
