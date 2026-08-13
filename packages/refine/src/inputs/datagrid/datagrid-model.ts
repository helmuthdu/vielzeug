import { computed, type Readable, signal } from '@vielzeug/ripple';
import { watch } from '@vielzeug/ripple/watch';

export type SortDirection = 'asc' | 'desc' | 'none';

export type SortState = {
  direction: SortDirection;
  key: string;
};

export type DataGridColumn<T = Record<string, unknown>> = {
  align?: 'left' | 'center' | 'right';
  cell?: (item: T) => string;
  headerLabel?: string;
  key: string;
  label: string;
  renderExpanded?: (item: T) => string;
  resizable?: boolean;
  sortable?: boolean;
  sortValue?: (item: T) => number | string;
  width?: string;
};

export type SelectionMode = 'multi' | 'none' | 'single';

export type FilterOption = {
  key: string;
  label: string;
  operators?: { label: string; value: string }[];
  options: { label?: string; value: string }[];
};

export type FilterOperator = 'contains' | 'equals' | 'gt' | 'lt';

export type FilterRule = {
  operator: FilterOperator;
  values: Set<string>;
};

export type DataGridView = {
  id: string;
  label: string;
};

export type DataGridModelOptions<T = Record<string, unknown>> = {
  clientSide: Readable<boolean>;
  columns: Readable<DataGridColumn<T>[]>;
  filterOptions: Readable<FilterOption[] | undefined>;
  getRowKey: (item: T) => string;
  items: Readable<T[]>;
  onSelectionChange?: (keys: Set<string>) => void;
  onSortChange?: (sort: SortState) => void;
  pageSize: Readable<number>;
  selectionMode: Readable<SelectionMode>;
  sortMode: Readable<'client' | 'server'>;
};

export type DataGridModel<T = Record<string, unknown>> = {
  activateFilterKey(key: string): void;
  clearAllFilters(): void;
  clearSelection(): void;
  readonly currentPageItems: Readable<T[]>;
  readonly filterDefs: Readable<FilterOption[]>;
  readonly filteredRows: Readable<T[]>;
  readonly filterValues: Readable<Map<string, FilterRule>>;
  goToPage(index: number): void;
  readonly hasNextPage: Readable<boolean>;
  readonly hasPrevPage: Readable<boolean>;
  readonly hiddenColumns: Readable<Set<string>>;
  isAllSelected(): boolean;
  nextPage(): void;
  readonly pageCount: Readable<number>;
  readonly pageIndex: Readable<number>;
  prevPage(): void;
  removeFilter(key: string): void;
  resetFilters(): void;
  resetSearch(): void;
  readonly searchActive: Readable<boolean>;
  readonly searchQuery: Readable<string>;
  selectAll(): void;
  readonly selectedKeys: Readable<ReadonlySet<string>>;
  readonly selectedRows: Readable<T[]>;
  setActiveFilterKeys(keys: string[]): void;
  setFilter(key: string, values: string[]): void;
  setFilterOperator(key: string, operator: FilterOperator): void;
  setSearchQuery(query: string): void;
  setSelection(keys: Set<string>): void;
  sortBy(key: string): void;
  readonly sortState: Readable<SortState>;
  sortTo(key: string, direction: SortDirection): void;
  toggleColumnVisibility(key: string): void;
  toggleRow(key: string): void;
  toggleSearch(): void;
  readonly totalItems: Readable<number>;
  readonly visibleColumns: Readable<DataGridColumn<T>[]>;
};

const DEFAULT_OPERATORS: { label: string; value: FilterOperator }[] = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Greater than', value: 'gt' },
  { label: 'Less than', value: 'lt' },
];

/**
 * Feature-owned state and transform pipeline for `ore-datagrid`.
 *
 * Rows flow through query, filters, sorting, and pagination in order. Selection
 * and column visibility share the same model so every interactive grid concern
 * has one reactive owner. Source-backed grids retain their server-owned rows by
 * setting `clientSide` to false.
 */
export const createDataGridModel = <T extends Record<string, unknown>>(
  options: DataGridModelOptions<T>,
): DataGridModel<T> => {
  const searchQuery = signal('');
  const searchActive = signal(false);
  const hiddenColumns = signal(new Set<string>());
  const activeFilterKeys = signal(new Set<string>());
  const filterValues = signal(new Map<string, FilterRule>());
  const sortKey = signal('');
  const sortDirection = signal<SortDirection>('none');
  const selectedKeys = signal(new Set<string>());
  const pageIndex = signal(0);

  const columnKeys = computed(() => new Set(options.columns.value.map((column) => column.key)));
  const visibleColumns = computed(() => options.columns.value.filter((column) => !hiddenColumns.value.has(column.key)));

  const colOptions = computed(() => {
    const externalKeys = new Set((options.filterOptions.value ?? []).map((filter) => filter.key));
    const activeKeys = [...activeFilterKeys.value].filter((key) => !externalKeys.has(key));

    if (!activeKeys.length) return new Map<string, { label: string; value: string }[]>();

    const derived = new Map<string, { label: string; value: string }[]>();

    for (const key of activeKeys) {
      const seen = new Set<string>();
      const values: { label: string; value: string }[] = [];

      for (const row of options.items.value) {
        const value = row[key];
        const stringValue = value == null ? '' : String(value);

        if (!seen.has(stringValue)) {
          seen.add(stringValue);
          values.push({ label: stringValue || '(empty)', value: stringValue });
        }
      }

      derived.set(key, values);
    }

    return derived;
  });

  const filterDefs = computed<FilterOption[]>(() => {
    const provided = options.filterOptions.value ?? [];
    const providedKeys = new Set(provided.map((filter) => filter.key));
    const derived = [...activeFilterKeys.value]
      .filter((key) => !providedKeys.has(key))
      .map((key) => {
        const column = options.columns.value.find((candidate) => candidate.key === key);

        return {
          key,
          label: column?.label ?? key,
          operators: DEFAULT_OPERATORS,
          options: colOptions.value.get(key) ?? [],
        };
      });

    return [...provided.map((filter) => ({ ...filter, operators: filter.operators ?? DEFAULT_OPERATORS })), ...derived];
  });

  const searchedRows = computed(() => {
    const rows = options.items.value;

    if (!options.clientSide.value) return rows;

    const query = searchQuery.value.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) => value != null && String(value).toLowerCase().includes(query)),
    );
  });

  const filteredRows = computed(() => {
    const rows = searchedRows.value;

    if (!options.clientSide.value || !filterValues.value.size) return rows;

    return rows.filter((row) => {
      for (const [key, rule] of filterValues.value) {
        if (!rule.values.size || !columnKeys.value.has(key)) continue;

        const value = row[key];
        const stringValue = value == null ? '' : String(value);

        if (rule.operator === 'equals' && !rule.values.has(stringValue)) return false;

        if (
          rule.operator === 'contains' &&
          ![...rule.values].some((target) => stringValue.toLowerCase().includes(target.toLowerCase()))
        ) {
          return false;
        }

        if (rule.operator === 'gt' || rule.operator === 'lt') {
          const numericValue = parseFloat(stringValue);
          const targets = [...rule.values].map(parseFloat).filter((target) => !Number.isNaN(target));

          if (!targets.length) continue;

          if (rule.operator === 'gt' && !targets.some((target) => numericValue > target)) return false;

          if (rule.operator === 'lt' && !targets.some((target) => numericValue < target)) return false;
        }
      }

      return true;
    });
  });

  const sortState = computed<SortState>(() => ({ direction: sortDirection.value, key: sortKey.value }));
  const sortedRows = computed(() => {
    const rows = filteredRows.value;

    if (!options.clientSide.value || options.sortMode.value === 'server') return rows;

    const { direction, key } = sortState.value;

    if (!key || direction === 'none') return rows;

    const column = options.columns.value.find((candidate) => candidate.key === key);

    return rows.slice().sort((a, b) => {
      const aValue = column?.sortValue ? column.sortValue(a) : (a[key] as number | string);
      const bValue = column?.sortValue ? column.sortValue(b) : (b[key] as number | string);
      const comparison =
        typeof aValue === 'number' && typeof bValue === 'number'
          ? aValue - bValue
          : String(aValue ?? '').localeCompare(String(bValue ?? ''));

      return direction === 'asc' ? comparison : -comparison;
    });
  });

  const totalItems = computed(() => sortedRows.value.length);
  const pageCount = computed(() => {
    const size = options.pageSize.value;

    return Math.ceil(totalItems.value / (size <= 0 ? Number.MAX_SAFE_INTEGER : size));
  });
  const safePageIndex = computed(() => (pageCount.value ? Math.min(pageIndex.value, pageCount.value - 1) : -1));
  const currentPageItems = computed(() => {
    const size = options.pageSize.value;

    if (size <= 0) return sortedRows.value;

    const start = safePageIndex.value * size;

    return sortedRows.value.slice(start, start + size);
  });
  const hasNextPage = computed(() => pageCount.value > 0 && safePageIndex.value < pageCount.value - 1);
  const hasPrevPage = computed(() => safePageIndex.value > 0);
  const selectedRows = computed(() =>
    options.items.value.filter((item) => selectedKeys.value.has(options.getRowKey(item))),
  );

  watch(
    columnKeys,
    (keys) => {
      const nextActiveKeys = new Set([...activeFilterKeys.value].filter((key) => keys.has(key)));
      const nextValues = new Map([...filterValues.value].filter(([key]) => keys.has(key)));

      if (nextActiveKeys.size !== activeFilterKeys.value.size) activeFilterKeys.value = nextActiveKeys;

      if (nextValues.size !== filterValues.value.size) filterValues.value = nextValues;
    },
    { immediate: false },
  );

  watch(sortedRows, () => {
    pageIndex.value = 0;
  });

  const commitSelection = (next: Set<string>): void => {
    selectedKeys.value = next;
    options.onSelectionChange?.(next);
  };

  const setFilter = (key: string, values: string[]): void => {
    const next = new Map(filterValues.value);

    if (values.length) {
      next.set(key, { operator: next.get(key)?.operator ?? 'contains', values: new Set(values) });
    } else {
      next.delete(key);
    }

    filterValues.value = next;
  };

  const setFilterOperator = (key: string, operator: FilterOperator): void => {
    const rule = filterValues.value.get(key);

    if (rule) filterValues.value = new Map(filterValues.value).set(key, { ...rule, operator });
  };

  const sortTo = (key: string, direction: SortDirection): void => {
    sortKey.value = direction === 'none' ? '' : key;
    sortDirection.value = direction;
    pageIndex.value = 0;
    options.onSortChange?.(sortState.value);
  };

  return {
    activateFilterKey: (key) => {
      if (!activeFilterKeys.value.has(key)) activeFilterKeys.value = new Set([...activeFilterKeys.value, key]);
    },
    clearAllFilters: () => {
      activeFilterKeys.value = new Set();
      filterValues.value = new Map();
    },
    clearSelection: () => commitSelection(new Set()),
    currentPageItems,
    filterDefs,
    filteredRows,
    filterValues,
    goToPage: (index) => {
      if (Number.isFinite(index)) pageIndex.value = Math.max(0, index);
    },
    hasNextPage,
    hasPrevPage,
    hiddenColumns,
    isAllSelected: () => {
      const page = currentPageItems.value;

      return page.length > 0 && page.every((item) => selectedKeys.value.has(options.getRowKey(item)));
    },
    nextPage: () => {
      if (hasNextPage.value) pageIndex.value = safePageIndex.value + 1;
    },
    pageCount,
    pageIndex: safePageIndex,
    prevPage: () => {
      if (hasPrevPage.value) pageIndex.value = safePageIndex.value - 1;
    },
    removeFilter: (key) => {
      const nextActiveKeys = new Set(activeFilterKeys.value);

      nextActiveKeys.delete(key);
      activeFilterKeys.value = nextActiveKeys;

      const nextValues = new Map(filterValues.value);

      nextValues.delete(key);
      filterValues.value = nextValues;
    },
    resetFilters: () => {
      activeFilterKeys.value = new Set();
      filterValues.value = new Map();
    },
    resetSearch: () => {
      searchQuery.value = '';
      searchActive.value = false;
    },
    searchActive,
    searchQuery,
    selectAll: () => {
      if (options.selectionMode.value !== 'multi') return;

      const next = new Set(selectedKeys.value);

      if (currentPageItems.value.every((item) => next.has(options.getRowKey(item)))) {
        for (const item of currentPageItems.value) next.delete(options.getRowKey(item));
      } else {
        for (const item of currentPageItems.value) next.add(options.getRowKey(item));
      }

      commitSelection(next);
    },
    selectedKeys: computed(() => new Set(selectedKeys.value)),
    selectedRows,
    setActiveFilterKeys: (keys) => {
      const nextActiveKeys = new Set(keys);

      activeFilterKeys.value = nextActiveKeys;
      filterValues.value = new Map([...filterValues.value].filter(([key]) => nextActiveKeys.has(key)));
    },
    setFilter,
    setFilterOperator,
    setSearchQuery: (query) => {
      searchQuery.value = query;
    },
    setSelection: (keys) => commitSelection(new Set(keys)),
    sortBy: (key) => {
      const nextDirection =
        sortKey.value !== key
          ? 'asc'
          : sortDirection.value === 'asc'
            ? 'desc'
            : sortDirection.value === 'desc'
              ? 'none'
              : 'asc';

      sortTo(nextDirection === 'none' ? '' : key, nextDirection);
    },
    sortState,
    sortTo,
    toggleColumnVisibility: (key) => {
      const next = new Set(hiddenColumns.value);

      if (next.has(key)) next.delete(key);
      else next.add(key);

      hiddenColumns.value = next;
    },
    toggleRow: (key) => {
      if (options.selectionMode.value === 'none') return;

      const next = new Set(selectedKeys.value);

      if (next.has(key)) next.delete(key);
      else {
        if (options.selectionMode.value === 'single') next.clear();

        next.add(key);
      }

      commitSelection(next);
    },
    toggleSearch: () => {
      if (searchActive.value) searchQuery.value = '';

      searchActive.value = !searchActive.value;
    },
    totalItems,
    visibleColumns,
  };
};
