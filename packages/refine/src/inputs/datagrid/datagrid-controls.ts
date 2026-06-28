import { computed, signal, type Readable, watch } from '@vielzeug/ripple';

import type { DataGridColumn } from '../../headless';

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * A single filter option definition — the available choices shown in the filter picker
 * for one column. When `filterOptions` is not provided on the grid, options are
 * auto-derived from the current row data.
 */
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
  /** Unique identifier for this view. */
  id: string;
  /** Display label shown in the tab. */
  label: string;
};

export type DataGridControlsOptions = {
  /** Reactive column definitions — used to auto-derive filter options and prune stale state. */
  columns: Readable<DataGridColumn[]>;
  /**
   * Pre-defined filter option definitions per column key.
   * When set, these replace auto-derived options for matching keys.
   */
  filterOptions: Readable<FilterOption[] | undefined>;
  /** Reactive row data — searched and filtered to produce `filteredRows`. */
  rows: Readable<Record<string, unknown>[]>;
};

export type DataGridControlsHandle = {
  /** Add a column key to the active filter set (makes its rule appear in the UI). */
  activateFilterKey(key: string): void;
  /** Clear all active filter rules and values. */
  clearAllFilters(): void;
  /**
   * Merged filter option definitions (provided + user-activated auto-derived).
   * A key's presence means its filter rule is visible in the UI.
   */
  readonly filterDefs: Readable<FilterOption[]>;
  /**
   * Rows after applying search and filter. Pass this as the `items` source
   * to the table control so the headless module owns the full data pipeline.
   */
  readonly filteredRows: Readable<Record<string, unknown>[]>;
  /** Unified filter state: column key → filter rule (operator + values). */
  readonly filterValues: Readable<Map<string, FilterRule>>;
  /** Set of column keys hidden by the user. */
  readonly hiddenColumns: Readable<Set<string>>;
  /** Remove a column's filter rule and clear its selected values. */
  removeFilter(key: string): void;
  /** Clear all active filter rules and values. Alias for clearAllFilters, provided for symmetry with resetSearch. */
  resetFilters(): void;
  /** Clear search state (query + active flag). Column visibility is a persistent preference and is never reset. */
  resetSearch(): void;
  /** Whether the inline search input is currently open. */
  readonly searchActive: Readable<boolean>;
  /** Current text search query. */
  readonly searchQuery: Readable<string>;
  /** Set the active filter keys at once, pruning stale values. */
  setActiveFilterKeys(keys: string[]): void;
  /** Apply or update a multi-select filter for a column. Pass [] to clear that column's values. */
  setFilter(key: string, values: string[]): void;
  /** Update the operator for a specific filter rule. */
  setFilterOperator(key: string, operator: FilterOperator): void;
  /** Set the raw search query text directly. */
  setSearchQuery(q: string): void;
  /** Toggle a column's visibility. */
  toggleColumnVisibility(key: string): void;
  /** Toggle search open/closed. Clears the query on close. */
  toggleSearch(): void;
};

// ── Implementation ─────────────────────────────────────────────────────────────

const DEFAULT_OPERATORS: { label: string; value: FilterOperator }[] = [
  { label: 'Contains', value: 'contains' },
  { label: 'Equals', value: 'equals' },
  { label: 'Greater than', value: 'gt' },
  { label: 'Less than', value: 'lt' },
];

/**
 * Headless controls for ore-datagrid: search, filter, column visibility, and derived rows.
 *
 * Design notes:
 * - Filter state uses two signals: activeFilterKeys (Set) drives filterDefs and
 *   the filter rule DOM; filterValues (Map) tracks selected values per key.
 *   Separating them prevents filterDefs from recomputing on value changes, which
 *   would otherwise destroy and recreate the combobox mid-interaction.
 * - colOptions is computed lazily — only for columns with active filter rules,
 *   so the common case (no active filters) costs O(0) row iterations.
 * - filteredRows is derived here (not in the component) so the full data pipeline
 *   lives in one place and can be unit-tested end-to-end.
 */
export const createDataGridControls = (options: DataGridControlsOptions): DataGridControlsHandle => {
  const searchQuery = signal('');
  const searchActive = signal(false);
  const hiddenColumns = signal(new Set<string>());

  // Two-signal filter state: activeFilterKeys tracks which rules exist (drives
  // filterDefs / DOM structure); filterValues tracks selected values per key.
  // Separating them prevents filterDefs from recomputing — and the filter rule
  // DOM from being torn down — every time a value is selected.
  const activeFilterKeys = signal(new Set<string>());
  const filterValues = signal(new Map<string, FilterRule>());

  // Derive options only for columns that have an active filter rule and are not
  // covered by externally-provided filterOptions. Lazy: O(activeRules × rows).
  const colOptions = computed(() => {
    const externalKeys = new Set((options.filterOptions.value ?? []).map((f) => f.key));
    const activeKeys = [...activeFilterKeys.value].filter((k) => !externalKeys.has(k));

    if (!activeKeys.length) return new Map<string, { label: string; value: string }[]>();

    const rows = options.rows.value;
    const map = new Map<string, { label: string; value: string }[]>();

    for (const key of activeKeys) {
      const seen = new Set<string>();
      const opts: { label: string; value: string }[] = [];

      for (const row of rows) {
        const v = row[key];
        const s = v == null ? '' : String(v);

        if (!seen.has(s)) {
          seen.add(s);
          opts.push({ label: s || '(empty)', value: s });
        }
      }

      map.set(key, opts);
    }

    return map;
  });

  // Merge provided filter options with auto-derived ones for active keys.
  // Depends only on activeFilterKeys (not filterValues) so adding/removing a
  // value does not tear down the filter rule DOM.
  const filterDefs = computed<FilterOption[]>(() => {
    const provided = options.filterOptions.value ?? [];
    const providedKeys = new Set(provided.map((f) => f.key));
    const derived = [...activeFilterKeys.value]
      .filter((k) => !providedKeys.has(k))
      .map((k) => {
        const col = options.columns.value.find((c) => c.key === k);

        return {
          key: k,
          label: col?.label ?? k,
          operators: DEFAULT_OPERATORS,
          options: colOptions.value.get(k) ?? [],
        };
      });

    return [...provided.map((f) => ({ ...f, operators: f.operators ?? DEFAULT_OPERATORS })), ...derived];
  });

  // Prune stale filter rules when columns are removed.
  watch(
    computed(() => new Set(options.columns.value.map((c) => c.key))),
    (keySet) => {
      const prunedKeys = new Set([...activeFilterKeys.value].filter((k) => keySet.has(k)));

      if (prunedKeys.size !== activeFilterKeys.value.size) activeFilterKeys.value = prunedKeys;

      const prunedValues = new Map([...filterValues.value].filter(([k]) => keySet.has(k)));

      if (prunedValues.size !== filterValues.value.size) filterValues.value = prunedValues;
    },
    { immediate: false },
  );

  // Full data pipeline: search then filter. Lives here so the headless module
  // owns the complete input→output contract and can be tested end-to-end.
  const searchedRows = computed(() => {
    const rows = options.rows.value;
    const q = searchQuery.value.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((row) => Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q)));
  });

  const filteredRows = computed(() => {
    const rows = searchedRows.value;
    const fv = filterValues.value;

    if (!fv.size) return rows;

    const currentKeys = new Set(options.columns.value.map((c) => c.key));

    return rows.filter((row) => {
      for (const [key, rule] of fv) {
        if (!rule.values.size || !currentKeys.has(key)) continue;

        const cell = row[key];
        const cellValue = cell == null ? '' : String(cell);

        if (rule.operator === 'equals') {
          if (!rule.values.has(cellValue)) return false;
        } else if (rule.operator === 'contains') {
          if (![...rule.values].some((v) => cellValue.toLowerCase().includes(v.toLowerCase()))) return false;
        } else if (rule.operator === 'gt' || rule.operator === 'lt') {
          const num = parseFloat(cellValue);
          const targets = [...rule.values].map(parseFloat).filter((n) => !isNaN(n));

          if (!targets.length) continue;

          if (rule.operator === 'gt') {
            if (!targets.some((t) => num > t)) return false;
          } else {
            if (!targets.some((t) => num < t)) return false;
          }
        }
      }

      return true;
    });
  });

  const setFilter = (key: string, values: string[]): void => {
    const next = new Map(filterValues.value);

    if (values.length === 0) {
      next.delete(key);
    } else {
      const existing = next.get(key);

      next.set(key, { operator: existing?.operator ?? 'contains', values: new Set(values) });
    }

    filterValues.value = next;
  };

  const setFilterOperator = (key: string, operator: FilterOperator): void => {
    const next = new Map(filterValues.value);
    const existing = next.get(key);

    if (existing) {
      next.set(key, { ...existing, operator });

      filterValues.value = next;
    }
  };

  const activateFilterKey = (key: string): void => {
    if (activeFilterKeys.value.has(key)) return;

    activeFilterKeys.value = new Set([...activeFilterKeys.value, key]);
  };

  const removeFilter = (key: string): void => {
    const nextKeys = new Set(activeFilterKeys.value);

    nextKeys.delete(key);
    activeFilterKeys.value = nextKeys;

    const nextValues = new Map(filterValues.value);

    nextValues.delete(key);
    filterValues.value = nextValues;
  };

  const clearAllFilters = (): void => {
    activeFilterKeys.value = new Set();
    filterValues.value = new Map();
  };

  const setSearchQuery = (q: string): void => {
    searchQuery.value = q;
  };

  const setActiveFilterKeys = (keys: string[]): void => {
    const nextKeys = new Set(keys);

    activeFilterKeys.value = nextKeys;

    // Prune values for keys that are no longer active.
    const nextValues = new Map(filterValues.value);
    let changed = false;

    for (const k of nextValues.keys()) {
      if (!nextKeys.has(k)) {
        nextValues.delete(k);
        changed = true;
      }
    }

    if (changed) filterValues.value = nextValues;
  };

  const toggleColumnVisibility = (key: string): void => {
    const next = new Set(hiddenColumns.value);

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    hiddenColumns.value = next;
  };

  const toggleSearch = (): void => {
    if (searchActive.value) searchQuery.value = '';

    searchActive.value = !searchActive.value;
  };

  const resetSearch = (): void => {
    searchQuery.value = '';
    searchActive.value = false;
  };

  const resetFilters = (): void => {
    activeFilterKeys.value = new Set();
    filterValues.value = new Map();
  };

  return {
    activateFilterKey,
    clearAllFilters,
    filterDefs,
    filteredRows,
    filterValues,
    hiddenColumns,
    removeFilter,
    resetFilters,
    resetSearch,
    searchActive,
    searchQuery,
    setActiveFilterKeys,
    setFilter,
    setFilterOperator,
    setSearchQuery,
    toggleColumnVisibility,
    toggleSearch,
  };
};
