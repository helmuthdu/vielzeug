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
  options: { label?: string; value: string }[];
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
  /**
   * Unified filter state: column key → selected option values.
   * A key's presence in the map means the filter rule is active.
   * An empty Set means the rule is open but no value is selected yet.
   */
  readonly filterValues: Readable<Map<string, Set<string>>>;
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
  /** Apply or update a multi-select filter for a column. Pass [] to clear that column's values. */
  setFilter(key: string, values: string[]): void;
  /** Set the raw search query text directly. */
  setSearchQuery(q: string): void;
  /** Toggle a column's visibility. */
  toggleColumnVisibility(key: string): void;
  /** Toggle search open/closed. Clears the query on close. */
  toggleSearch(): void;
};

// ── Implementation ─────────────────────────────────────────────────────────────

/**
 * Headless controls for sg-datagrid: search, filter, column visibility, and derived rows.
 *
 * Design notes:
 * - Filter state uses a single Map (filterState) where key presence = active rule.
 *   This eliminates the previous two-signal sync (activeFilterKeys + filterValues)
 *   and makes the invariant structurally enforced.
 * - colOptions is computed lazily — only for columns with active filter rules,
 *   so the common case (no active filters) costs O(0) row iterations.
 * - filteredRows is derived here (not in the component) so the full data pipeline
 *   lives in one place and can be unit-tested end-to-end.
 */
export const createDataGridControls = (options: DataGridControlsOptions): DataGridControlsHandle => {
  const searchQuery = signal('');
  const searchActive = signal(false);
  const hiddenColumns = signal(new Set<string>());

  // Single source of truth for filter state.
  // Key presence = active rule; Set value = selected option values (may be empty).
  const filterState = signal(new Map<string, Set<string>>());

  // Derive options only for columns that have an active filter rule and are not
  // covered by externally-provided filterOptions. Lazy: O(activeRules × rows).
  const colOptions = computed(() => {
    const externalKeys = new Set((options.filterOptions.value ?? []).map((f) => f.key));
    const activeKeys = [...filterState.value.keys()].filter((k) => !externalKeys.has(k));

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
  const filterDefs = computed<FilterOption[]>(() => {
    const provided = options.filterOptions.value ?? [];
    const providedKeys = new Set(provided.map((f) => f.key));
    const derived = [...filterState.value.keys()]
      .filter((k) => !providedKeys.has(k))
      .map((k) => {
        const col = options.columns.value.find((c) => c.key === k);

        return { key: k, label: col?.label ?? k, options: colOptions.value.get(k) ?? [] };
      });

    return [...provided, ...derived];
  });

  // filterValues mirrors filterState for the public read API.
  // (Consumers read filterValues; the implementation mutates filterState.)
  const filterValues: Readable<Map<string, Set<string>>> = filterState;

  // Prune stale filter rules when columns are removed.
  watch(
    computed(() => new Set(options.columns.value.map((c) => c.key))),
    (keySet) => {
      const pruned = new Map([...filterState.value].filter(([k]) => keySet.has(k)));

      if (pruned.size !== filterState.value.size) filterState.value = pruned;
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
    const fv = filterState.value;

    if (!fv.size) return rows;

    const currentKeys = new Set(options.columns.value.map((c) => c.key));

    return rows.filter((row) => {
      for (const [key, selected] of fv) {
        if (!selected.size || !currentKeys.has(key)) continue;

        const cell = row[key];

        if (!selected.has(cell == null ? '' : String(cell))) return false;
      }

      return true;
    });
  });

  const setFilter = (key: string, values: string[]): void => {
    const next = new Map(filterState.value);

    if (values.length === 0) {
      next.delete(key);
    } else {
      next.set(key, new Set(values));
    }

    filterState.value = next;
  };

  const activateFilterKey = (key: string): void => {
    if (filterState.value.has(key)) return;

    filterState.value = new Map(filterState.value).set(key, new Set());
  };

  const removeFilter = (key: string): void => {
    const next = new Map(filterState.value);

    next.delete(key);
    filterState.value = next;
  };

  const clearAllFilters = (): void => {
    filterState.value = new Map();
  };

  const setSearchQuery = (q: string): void => {
    searchQuery.value = q;
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
    filterState.value = new Map();
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
    setFilter,
    setSearchQuery,
    toggleColumnVisibility,
    toggleSearch,
  };
};
