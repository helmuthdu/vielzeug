import { computed, define, html, onCleanup, onMounted, prop, signal, watch } from '@vielzeug/craft';

import { warn } from '../../_warn';
import '../../content/icon/icon';
import '../../inputs/checkbox/checkbox';
import '../../inputs/combobox/combobox';
import '../../inputs/input/input';
import '../../inputs/select/select';
import {
  lifecycleSignal,
  createDataGridControl,
  type DataGridColumn,
  type DataGridControl,
  type SelectionMode,
  type SortDirection,
  type SortState,
} from '../../headless';
import { disablableBundle, loadableBundle } from '../../shared';
import { tableBaseMixin } from '../../styles';
import { COLUMN_OBSERVED_ATTRS, parseColumnChildren } from './datagrid-column';
import { type GridNavHandle, createGridNav } from './datagrid-nav';
import componentStyles from './datagrid.css?inline';

type SortMode = 'client' | 'server';

export { COLUMN_TAG } from './datagrid-column';

// ── Pure module-level helpers ─────────────────────────────────────────────────

/**
 * Returns the Lucide icon name for a column's sort state.
 * Pure function — no closure dependency on ctrl.
 */
export function sortIconName(state: SortState, key: string): string {
  if (state.key !== key || state.direction === 'none') return 'chevrons-up-down';

  return state.direction === 'asc' ? 'chevron-up' : 'chevron-down';
}

/**
 * Returns the WAI-ARIA `aria-sort` value for a column.
 * Pure function — independently unit-testable.
 */
export function ariaSortValue(state: SortState, key: string): 'ascending' | 'descending' | 'none' {
  if (state.key !== key || state.direction === 'none') return 'none';

  return state.direction === 'asc' ? 'ascending' : 'descending';
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type FilterDef = { key: string; label: string; options: { label?: string; value: string }[] };

export type SgDataGridEvents<T = Record<string, unknown>> = {
  /** Fired when the active page changes. */
  'page-change': { pageIndex: number; pageSize: number };
  /** Fired when a row is expanded or collapsed. */
  'row-expand': { expanded: boolean; key: string };
  /** Fired when row selection changes. */
  'selection-change': { keys: string[]; rows: T[] };
  /** Fired when the sort column or direction changes. */
  'sort-change': { direction: SortDirection; key: string };
};

export type SgDataGridProps<T = Record<string, unknown>> = {
  /**
   * Column definitions (imperative API). Takes precedence over `<sg-column>` children.
   * Passing `[]` explicitly clears declarative children.
   * Pass `undefined` (or omit) to use `<sg-column>` children instead.
   * @example
   * ```js
   * grid.columns = [
   *   { key: 'name', label: 'Name', sortable: true },
   *   { key: 'email', label: 'Email' },
   * ];
   * ```
   */
  columns?: DataGridColumn<T>[];
  /** Cell density: `'compact'` | `'cozy'` (default) | `'comfortable'` */
  density?: 'compact' | 'cozy' | 'comfortable';
  /** Disable all interaction. */
  disabled?: boolean;
  /** Text shown when there are no rows. */
  'empty-text'?: string;
  /**
   * Enable row expansion. When set, each row gets a toggle button.
   * Requires at least one column to have a `renderExpanded` function.
   */
  expandable?: boolean;
  /**
   * Column filter definitions. Each entry renders a `sg-combobox` (multi-select) in the toolbar.
   * The toolbar renders automatically when filters are set, independent of the `searchable` prop.
   * @example
   * ```js
   * grid.filters = [
   *   { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
   * ];
   * ```
   */
  filters?: FilterDef[];
  /** Stretch the grid to fill its container's width. */
  fullwidth?: boolean;
  /**
   * Function that returns a unique string key per row.
   * Defaults to `(row) => String(row['id'])`.
   */
  getRowKey?: (row: T) => string;
  /** Accessible label for the grid. Recommended for screen readers. */
  label?: string;
  /** Show a busy/loading state with reduced opacity. */
  loading?: boolean;
  /** Number of rows per page. Defaults to `10`. Set to `0` to disable pagination. */
  'page-size'?: number;
  /**
   * Options for the per-page size selector rendered in the footer.
   * When provided, a `sg-select` is shown next to the pagination controls.
   * @example `grid['page-size-options'] = [10, 25, 50, 100]`
   */
  'page-size-options'?: number[];
  /**
   * Row data. Pass as a JS property — not serialisable to an HTML attribute.
   * @example
   * ```js
   * grid.rows = [{ id: '1', name: 'Alice', email: 'alice@example.com' }];
   * ```
   */
  rows?: T[];
  /** Placeholder text for the search input. */
  'search-placeholder'?: string;
  /** Show a search input above the table to filter rows by any column value. */
  searchable?: boolean;
  /**
   * Pre-selected row keys. Setting this from outside will update the internal selection.
   * @example `grid['selected-keys'] = ['1', '3']`
   */
  'selected-keys'?: string[];
  /** Row selection mode. */
  'selection-mode'?: SelectionMode;
  /**
   * Whether sorting is client-side (default) or server-side.
   * When `'server'`, `sort-change` fires but items are not sorted by the control.
   */
  'sort-mode'?: SortMode;
  /** Apply alternating row backgrounds. */
  striped?: boolean;
};

/**
 * An accessible, keyboard-navigable data grid with sorting, pagination,
 * and single/multi row selection.
 *
 * @element sg-datagrid
 * @element sg-column - Optional declarative column definition child
 *
 * @attr {boolean} disabled - Disable all interaction
 * @attr {boolean} loading - Show busy/loading state
 * @attr {boolean} striped - Apply alternating row backgrounds
 * @attr {boolean} fullwidth - Stretch the grid to fill its container's width
 * @attr {boolean} searchable - Show a search input above the table
 * @attr {string} search-placeholder - Placeholder for the search input
 * @attr {number} page-size - Rows per page (0 = no pagination, default 10)
 * @attr {string} selection-mode - Row selection: 'none' | 'single' | 'multi'
 * @attr {string} sort-mode - Sorting: 'client' (default) | 'server'
 * @attr {string} density - Cell density: compact | cozy (default) | comfortable
 * @attr {string} empty-text - Text shown when there are no rows
 * @attr {string} label - Accessible label for the grid
 *
 * @fires selection-change - Fired when row selection changes. detail: { keys: string[], rows: T[] }
 * @fires sort-change - Fired when sort state changes. detail: { key: string, direction: SortDirection }
 * @fires page-change - Fired when page changes. detail: { pageIndex: number, pageSize: number }
 * @fires row-expand - Fired when a row is expanded or collapsed. detail: { expanded: boolean; key: string }
 *
 * @cssprop --datagrid-bg - Grid background color
 * @cssprop --datagrid-border-color - Grid and cell border color
 * @cssprop --datagrid-radius - Grid border radius
 * @cssprop --datagrid-shadow - Grid box shadow
 * @cssprop --datagrid-header-bg - Column header background
 * @cssprop --datagrid-row-hover-bg - Row hover background
 * @cssprop --datagrid-row-selected-bg - Selected row background
 * @cssprop --datagrid-stripe-bg - Even-row stripe background
 * @cssprop --datagrid-cell-padding-x - Cell horizontal padding
 * @cssprop --datagrid-cell-padding-y - Cell vertical padding
 * @cssprop --datagrid-cell-max-width - Maximum cell content width before truncating
 * @cssprop --datagrid-max-height - Max scrollable height of the table area
 * @cssprop --datagrid-font-size - Base font size for cells
 *
 * @part table - The `<table>` element
 * @part thead - The `<thead>` element
 * @part tbody - The `<tbody>` element
 * @part row - A body `<tr>` element
 * @part cell - A body `<td>` element
 * @part footer - The pagination footer bar
 *
 * @example
 * ```html
 * <sg-datagrid id="grid" label="Users" selection-mode="multi"></sg-datagrid>
 * <script>
 *   const grid = document.getElementById('grid');
 *   grid.columns = [
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'role', label: 'Role' },
 *   ];
 *   grid.rows = [
 *     { id: '1', name: 'Alice', role: 'Admin' },
 *     { id: '2', name: 'Bob',   role: 'Viewer' },
 *   ];
 * </script>
 * ```
 */
export const DATAGRID_TAG = 'sg-datagrid' as const;

define<SgDataGridProps, SgDataGridEvents>(DATAGRID_TAG, {
  props: {
    density: prop.string<'compact' | 'cozy' | 'comfortable'>(),
    ...disablableBundle,
    ...loadableBundle,
    columns: prop.ref<DataGridColumn[]>(),
    'empty-text': prop.string('No data'),
    expandable: prop.bool(false),
    filters: prop.ref<FilterDef[]>(),
    fullwidth: prop.bool(false),
    getRowKey: prop.ref<(row: Record<string, unknown>) => string>(),
    label: prop.string(),
    'page-size': prop.number(10),
    'page-size-options': prop.ref<number[]>(),
    rows: prop.ref<Record<string, unknown>[]>(),
    'search-placeholder': prop.string('Search…'),
    searchable: prop.bool(false),
    'selected-keys': prop.ref<string[]>(),
    'selection-mode': prop.string<SelectionMode>('none'),
    'sort-mode': prop.string<SortMode>('client'),
    striped: prop.bool(false),
  },

  setup(props, { el, emit }) {
    const isDisabled = computed(() => props.disabled.value === true);
    const selectionMode = computed(() => props['selection-mode'].value ?? 'none');

    // ── Row expansion (hoisted — needed by checkOffset + effectiveColCount) ──
    const expandedKeys = signal(new Set<string>());

    // resolvedColumns is declared further below; this callback is lazy and only
    // evaluates when .value is first read (after setup completes), so the
    // forward closure reference is safe at runtime.
    const hasExpander = computed(
      () =>
        props.expandable.value === true && resolvedColumns.value.some((c) => typeof c.renderExpanded === 'function'),
    );

    const checkOffset = computed(() => (selectionMode.value === 'multi' ? 1 : 0));

    // ── Page size ────────────────────────────────────────────────────────
    // Signal driven by the `page-size` prop. Stays in sync with prop changes
    // so consumers can set grid['page-size'] = n reactively after mount.
    // The per-page size selector also writes to this signal directly.
    const pageSize = signal<number>(props['page-size'].value ?? 10);

    watch(
      () => props['page-size'].value,
      (n) => {
        if (n != null) pageSize.value = n;
      },
    );

    // ── Declarative sg-column children ─────────────────────────────────────
    // A writable signal holding columns parsed from <sg-column> children.
    // Updated on mount and whenever children change. The JS `columns` prop
    // takes precedence when explicitly set (non-empty).
    const declarativeColumns = signal<DataGridColumn[]>([]);

    onMounted(() => {
      declarativeColumns.value = parseColumnChildren(el);

      const columnObserver = new MutationObserver(() => {
        declarativeColumns.value = parseColumnChildren(el);
      });

      columnObserver.observe(el, {
        attributeFilter: COLUMN_OBSERVED_ATTRS as unknown as string[],
        attributes: true,
        childList: true,
        subtree: true,
      });

      return () => columnObserver.disconnect();
    });

    // Resolved columns: prop wins when explicitly set (even to []); undefined = not set → use declarative children.
    const resolvedColumns = computed<DataGridColumn[]>(() => {
      const propCols = props.columns.value;

      return propCols !== undefined ? propCols : declarativeColumns.value;
    });

    // ── Key resolution ─────────────────────────────────────────────────────────
    // Reads getRowKey prop dynamically so changes after mount are reflected.

    const resolveKey = (item: Record<string, unknown>): string => {
      const fn = props.getRowKey.value;

      if (fn) return fn(item);

      const id = item['id'];

      if (id == null) {
        warn('sg-datagrid: row missing `id` — keys will collide. Provide `getRowKey` or add a unique `id` field.');

        return `__missing_${Math.random().toString(36).slice(2)}`;
      }

      return String(id);
    };

    // ── Search & filters ─────────────────────────────────────────────────────────

    const searchQuery = signal('');
    const filterValues = signal(new Map<string, Set<string>>());
    const filterDefs = computed(() => props.filters.value ?? []);

    // Prune stale filter state when columns are removed so ghost filters don't re-activate.
    watch(
      () => resolvedColumns.value.map((c) => c.key),
      (activeKeys) => {
        const keySet = new Set(activeKeys);
        const current = filterValues.value;
        const pruned = new Map([...current].filter(([k]) => keySet.has(k)));

        if (pruned.size !== current.size) filterValues.value = pruned;
      },
      { immediate: false },
    );

    // encapsulated mutation — one copy-on-write path, no inline Map copies in handlers.
    const setFilter = (key: string, values: string[]): void => {
      const next = new Map(filterValues.value);

      next.set(key, new Set(values));
      filterValues.value = next;
    };

    // B2: search and filter as separate composed computeds for independent testability.
    const searchedRows = computed(() => {
      const rows = props.rows.value ?? [];
      const q = searchQuery.value.trim().toLowerCase();

      if (!q) return rows;

      return rows.filter((row) => Object.values(row).some((v) => v != null && String(v).toLowerCase().includes(q)));
    });

    const filteredRows = computed(() => {
      const rows = searchedRows.value;
      const fv = filterValues.value;

      if (!fv.size) return rows;

      const currentKeys = new Set(resolvedColumns.value.map((c) => c.key));

      return rows.filter((row) => {
        for (const [key, selected] of fv) {
          if (!selected.size || !currentKeys.has(key)) continue;

          const cell = row[key];

          if (!selected.has(cell == null ? '' : String(cell))) return false;
        }

        return true;
      });
    });

    // ── Headless control ──────────────────────────────────────────────────────

    const ctrl: DataGridControl = createDataGridControl({
      columns: () => resolvedColumns.value,
      getRowKey: resolveKey,
      items: filteredRows,
      onSelectionChange: (keys: Set<string>) => {
        emit('selection-change', { keys: [...keys], rows: ctrl.selectedRows.value as Record<string, unknown>[] });
      },
      onSortChange: (sort) => {
        emit('sort-change', sort);
      },
      pageSize: () => pageSize.value,
      selectionMode: () => selectionMode.value,
      signal: lifecycleSignal(onCleanup),
    });

    // ── Sync external selected-keys prop into ctrl ────────────────────────────

    watch(
      () => props['selected-keys'].value,
      (keys) => {
        if (Array.isArray(keys)) ctrl.setSelection(new Set(keys));
      },
      { immediate: true },
    );

    // ── Column resize (F4) ───────────────────────────────────────────────────
    // Stores user-dragged widths as { key → px } so they survive re-renders.
    // Only columns with `resizable: true` get a drag handle.

    const colWidths = signal<Record<string, number>>({});

    const createColResizeHandler =
      (key: string, th: HTMLElement): ((e: PointerEvent) => void) =>
      (e: PointerEvent): void => {
        e.preventDefault();

        const startX = e.clientX;
        const startW = th.getBoundingClientRect().width;
        // AbortController ensures listeners are removed even if the component
        // is destroyed mid-drag (e.g. during SPA navigation).
        const ac = new AbortController();
        const { signal: sig } = ac;

        window.addEventListener(
          'pointermove',
          (mv: PointerEvent) => {
            colWidths.value = { ...colWidths.value, [key]: Math.max(40, startW + mv.clientX - startX) };
          },
          { signal: sig },
        );

        window.addEventListener('pointerup', () => ac.abort(), { signal: sig });
      };

    // ── Cell value helper ────────────────────────────────────────────────────

    const getCellValue = (col: DataGridColumn, item: Record<string, unknown>): string => {
      if (col.cell) return col.cell(item);

      const v = item[col.key];

      return v == null ? '' : String(v);
    };

    // B4: reactive page reset — any change to the filtered result set resets to page 0.
    // Removes the need to call ctrl.goToPage(0) manually in every event handler.
    watch(
      () => filteredRows.value,
      () => ctrl.goToPage(0),
      { immediate: false },
    );

    // ── Pagination handlers ───────────────────────────────────────────────────

    function handlePage(direction: 'next' | 'prev'): void {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      direction === 'prev' ? ctrl.prevPage() : ctrl.nextPage();
      emit('page-change', { pageIndex: ctrl.pageIndex.value, pageSize: pageSize.value });
    }

    // ── Select-all helpers ────────────────────────────────

    const isSomeSelected = computed(() => {
      const page = ctrl.currentPageItems.value;

      if (!page.length || ctrl.isAllSelected()) return false;

      return page.some((item) => ctrl.selectedKeys.value.has(resolveKey(item as Record<string, unknown>)));
    });

    // ── Column count (used in keyboard nav + empty colspan) ───────────────────

    const effectiveColCount = computed(
      () => resolvedColumns.value.length + (selectionMode.value === 'multi' ? 1 : 0) + (hasExpander.value ? 1 : 0),
    );

    // ── Pagination info text ──────────────────────────────────────────────────

    const paginationEnabled = computed(() => pageSize.value > 0);

    const paginationInfo = computed(() => {
      const total = ctrl.totalItems.value;

      if (!paginationEnabled.value) return `${total} row${total !== 1 ? 's' : ''}`;

      const start = ctrl.pageIndex.value * pageSize.value + 1;
      const end = Math.min(start + pageSize.value - 1, total);

      return `${start} to ${end} of ${total}`;
    });

    // ── Row expansion (toggle handler) ───────────────────────────────────────

    const toggleExpand = (key: string): void => {
      const next = new Set(expandedKeys.value);
      const expanded = !next.has(key);

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expanded ? next.add(key) : next.delete(key);
      expandedKeys.value = next;
      emit('row-expand', { expanded, key });
    };

    // ── Keyboard cell navigation (roving tabindex — extracted to datagrid-nav.ts) ──
    // navHandle is initialised with a real sentinel signal so the first render
    // produces correct tabindex values (row=0, col=0 → '0') before onMounted.
    // onMounted replaces it with the live handle from createGridNav.

    let navHandle: GridNavHandle = {
      activeCell: signal({ col: 0, row: 0 }),
      focusCell: () => {},
    };

    onMounted(() => {
      const shadow = el.shadowRoot!;
      const table = shadow.querySelector<HTMLElement>('.dg-table');

      if (!table) return;

      const { cleanup, handle } = createGridNav(table, shadow);

      navHandle = handle;

      return cleanup;
    });

    // Expose programmatic focusCell API on the host element (F6)
    (el as HTMLElement & { focusCell: (pos: { col: number; row: number }) => void }).focusCell = (pos) =>
      navHandle.focusCell(pos);

    // ── Template ──────────────────────────────────────────────────────────────

    return html`
      ${() =>
        props.searchable.value || filterDefs.value.length
          ? html`<div class="dg-toolbar" part="toolbar">
              ${() =>
                props.searchable.value
                  ? html`<div class="dg-toolbar-start">
                      <sg-input
                        class="dg-search"
                        type="search"
                        :placeholder="${() => props['search-placeholder'].value ?? 'Search…'}"
                        :disabled="${() => isDisabled.value || undefined}"
                        clearable
                        @input="${(e: CustomEvent<{ value: string }>) => {
                          searchQuery.value = e.detail.value;
                        }}"></sg-input>
                    </div>`
                  : html``}
              ${() => {
                if (!filterDefs.value.length) return html``;

                return html`<div class="dg-toolbar-filters">
                  ${filterDefs.value.map(
                    (f) =>
                      html`<sg-combobox
                        class="dg-filter"
                        :placeholder="${() => f.label}"
                        :options="${() => f.options}"
                        :disabled="${() => isDisabled.value || undefined}"
                        multiple
                        @change="${(e: CustomEvent<{ values: string[] }>) => {
                          setFilter(f.key, e.detail.values);
                        }}"></sg-combobox>`,
                  )}
                </div>`;
              }}
            </div>`
          : html``}
      <div class="dg-scroll" role="presentation">
        <table
          class="dg-table"
          part="table"
          role="grid"
          :aria-label="${() => props.label.value ?? undefined}"
          :aria-busy="${() => (props.loading.value ? 'true' : null)}"
          :aria-disabled="${() => (isDisabled.value ? 'true' : null)}">
          <!-- Head -->
          <thead class="dg-head" part="thead">
            <tr role="row">
              ${() =>
                selectionMode.value === 'multi'
                  ? html`<th
                      class="dg-th dg-th-check"
                      role="columnheader"
                      scope="col"
                      :tabindex="${() =>
                        navHandle.activeCell.value.row === 0 &&
                        navHandle.activeCell.value.col === 0 &&
                        checkOffset.value >= 1
                          ? '0'
                          : '-1'}">
                      <sg-checkbox
                        class="dg-check"
                        :checked="${() => ctrl.isAllSelected()}"
                        :indeterminate="${isSomeSelected}"
                        ?disabled="${isDisabled}"
                        aria-label="Select all rows on this page"
                        @change="${() => {
                          if (!isDisabled.value) ctrl.selectAll();
                        }}"></sg-checkbox>
                    </th>`
                  : html``}
              ${() =>
                resolvedColumns.value.map((col: DataGridColumn, colIdx: number) => {
                  const isLast = colIdx === resolvedColumns.value.length - 1;

                  return html`<th
                    class="${`dg-th${isLast && hasExpander.value ? ' dg-th-last' : ''}`}"
                    role="columnheader"
                    scope="col"
                    :tabindex="${() => {
                      const ac = navHandle.activeCell.value;

                      return ac.row === 0 && ac.col === colIdx + checkOffset.value ? '0' : '-1';
                    }}"
                    :aria-sort="${() => (col.sortable ? ariaSortValue(ctrl.sortState.value, col.key) : undefined)}"
                    :aria-label="${col.sortable ? undefined : (col.headerLabel ?? col.label)}"
                    :style="${() => {
                      const dragged = colWidths.value[col.key];

                      return dragged ? `width:${dragged}px` : col.width ? `width:${col.width}` : '';
                    }}">
                    <div class="dg-th-inner">
                      ${() =>
                        col.sortable
                          ? html`<button
                              class="dg-sort-btn"
                              type="button"
                              :aria-label="${col.headerLabel ?? col.label}"
                              :disabled="${() => isDisabled.value || undefined}"
                              @click="${() => {
                                if (!isDisabled.value) ctrl.sortBy(col.key);
                              }}">
                              <span class="dg-sort-label">
                                ${col.label}
                                <span class="dg-sort-icon" aria-hidden="true">
                                  <sg-icon
                                    :name="${() => sortIconName(ctrl.sortState.value, col.key)}"
                                    size="14"
                                    stroke-width="2"></sg-icon>
                                </span>
                              </span>
                            </button>`
                          : col.label}
                      ${col.resizable
                        ? html`<span
                            class="dg-col-resize"
                            aria-hidden="true"
                            ref="${(handleEl: HTMLElement | null) => {
                              if (!handleEl) return;

                              const th = handleEl.closest('th') as HTMLElement | null;

                              if (th) handleEl.addEventListener('pointerdown', createColResizeHandler(col.key, th));
                            }}"></span>`
                        : html``}
                    </div>
                  </th>`;
                })}
              ${() =>
                hasExpander.value
                  ? html`<th
                      class="dg-th dg-th-expand"
                      role="columnheader"
                      scope="col"
                      aria-label="Row details"
                      tabindex="-1"></th>`
                  : html``}
            </tr>
          </thead>

          <!-- Body -->
          <tbody class="dg-body" part="tbody">
            ${() =>
              ctrl.currentPageItems.value.length === 0
                ? html`<tr role="row">
                    <td class="dg-empty" role="gridcell" :colspan="${() => String(effectiveColCount.value)}">
                      ${() => props['empty-text'].value ?? 'No data'}
                    </td>
                  </tr>`
                : ctrl.currentPageItems.value.map((item: Record<string, unknown>, itemIdx: number) => {
                    const key = resolveKey(item);
                    const isSelectable = selectionMode.value !== 'none' && !isDisabled.value;
                    const rowIdx = itemIdx + 1;

                    return html`<tr
                        class="dg-tr"
                        part="row"
                        role="row"
                        :aria-selected="${() =>
                          selectionMode.value !== 'none' ? String(ctrl.selectedKeys.value.has(key)) : null}"
                        :aria-expanded="${() => (hasExpander.value ? String(expandedKeys.value.has(key)) : null)}"
                        ?data-selectable="${isSelectable}"
                        ?data-disabled="${isDisabled}"
                        @click="${() => {
                          if (isSelectable) ctrl.toggleRow(key);
                        }}"
                        @keydown="${(e: KeyboardEvent) => {
                          if ((e.key === 'Enter' || e.key === ' ') && isSelectable) {
                            e.preventDefault();
                            ctrl.toggleRow(key);
                          }
                        }}">
                        ${() =>
                          selectionMode.value === 'multi'
                            ? html`<td class="dg-td dg-td-check" role="gridcell">
                                <sg-checkbox
                                  class="dg-check"
                                  :checked="${() => ctrl.selectedKeys.value.has(key)}"
                                  ?disabled="${isDisabled}"
                                  aria-label="Select row"
                                  tabindex="-1"
                                  @click="${(e: MouseEvent) => e.stopPropagation()}"
                                  @change="${() => {
                                    if (!isDisabled.value) ctrl.toggleRow(key);
                                  }}"></sg-checkbox>
                              </td>`
                            : html``}
                        ${resolvedColumns.value.map((col: DataGridColumn, colIdx: number) => {
                          const value = getCellValue(col, item as Record<string, unknown>);

                          const isLastCol = colIdx === resolvedColumns.value.length - 1;

                          return html`<td
                            class="${`dg-td${isLastCol && hasExpander.value ? ' dg-td-last' : ''}`}"
                            part="cell"
                            role="gridcell"
                            :tabindex="${() => {
                              const ac = navHandle.activeCell.value;

                              return ac.row === rowIdx && ac.col === colIdx + checkOffset.value ? '0' : '-1';
                            }}"
                            :title="${value}">
                            ${value}
                          </td>`;
                        })}
                        ${() =>
                          hasExpander.value
                            ? html`<td class="dg-td dg-td-expand" role="gridcell">
                                <button
                                  class="dg-expand-btn"
                                  type="button"
                                  :aria-label="${() => (expandedKeys.value.has(key) ? 'Collapse row' : 'Expand row')}"
                                  :aria-expanded="${() => String(expandedKeys.value.has(key))}"
                                  :disabled="${() => isDisabled.value || undefined}"
                                  @click="${(e: MouseEvent) => {
                                    e.stopPropagation();

                                    if (!isDisabled.value) toggleExpand(key);
                                  }}">
                                  <sg-icon
                                    :name="${() => (expandedKeys.value.has(key) ? 'chevron-up' : 'chevron-down')}"
                                    size="14"
                                    stroke-width="2"
                                    aria-hidden="true"></sg-icon>
                                </button>
                              </td>`
                            : html``}
                      </tr>
                      ${() =>
                        hasExpander.value && expandedKeys.value.has(key)
                          ? html`<tr class="dg-tr-expanded" role="row" aria-hidden="true">
                              <td
                                class="dg-td-expanded"
                                role="gridcell"
                                :colspan="${() => String(effectiveColCount.value)}"
                                ref="${(td: HTMLElement | null) => {
                                  if (!td) return;

                                  const renderer = resolvedColumns.value.find(
                                    (c) => typeof c.renderExpanded === 'function',
                                  );

                                  td.innerHTML = renderer?.renderExpanded?.(item) ?? '';
                                }}"></td>
                            </tr>`
                          : html``} `;
                  })}
          </tbody>
        </table>
      </div>

      <!-- Footer / Pagination -->
      ${() =>
        paginationEnabled.value
          ? html`<div class="dg-footer" part="footer" role="navigation" aria-label="Pagination">
              <span class="dg-footer-info" dir="ltr" aria-live="polite" aria-atomic="true">${paginationInfo}</span>
              <div class="dg-footer-end">
                ${() => {
                  const opts = props['page-size-options'].value ?? [];

                  return opts.length
                    ? html`<sg-select
                        class="dg-page-size-select"
                        fullwidth
                        aria-label="Rows per page"
                        :value="${() => String(pageSize.value)}"
                        :options="${() => opts.map((n) => ({ label: String(n), value: String(n) }))}"
                        :disabled="${() => isDisabled.value || undefined}"
                        @change="${(e: CustomEvent<{ value: string }>) => {
                          const n = parseInt(e.detail.value, 10);

                          if (!isNaN(n)) {
                            pageSize.value = n;
                            emit('page-change', { pageIndex: 0, pageSize: n });
                          }
                        }}"></sg-select>`
                    : html``;
                }}
                <div class="dg-pagination" role="group" aria-label="Page navigation">
                  <button
                    class="dg-page-btn"
                    type="button"
                    aria-label="Previous page"
                    ?disabled="${() => !ctrl.hasPrevPage.value || isDisabled.value}"
                    @click="${() => handlePage('prev')}">
                    <sg-icon name="chevron-left" size="14" stroke-width="2" aria-hidden="true"></sg-icon>
                  </button>
                  <span class="dg-page-label" dir="ltr" aria-current="page">
                    ${() => `${ctrl.pageIndex.value + 1} / ${ctrl.pageCount.value}`}
                  </span>
                  <button
                    class="dg-page-btn"
                    type="button"
                    aria-label="Next page"
                    ?disabled="${() => !ctrl.hasNextPage.value || isDisabled.value}"
                    @click="${() => handlePage('next')}">
                    <sg-icon name="chevron-right" size="14" stroke-width="2" aria-hidden="true"></sg-icon>
                  </button>
                </div>
              </div>
            </div>`
          : html``}
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [tableBaseMixin('datagrid'), componentStyles],
});
