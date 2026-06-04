import { computed, define, html, onMounted, prop, signal, watch } from '@vielzeug/craft';

import type { ComponentSize } from '../../shared';

import '../../content/icon/icon';
import '../../inputs/checkbox/checkbox';
import '../../inputs/combobox/combobox';
import '../../inputs/input/input';
import '../../inputs/select/select';
import {
  createDataGridControl,
  type DataGridColumn,
  type DataGridControl,
  type SelectionMode,
  type SortDirection,
  type SortMode,
  type SortState,
} from '../../headless';
import { disablableBundle, loadableBundle, sizableBundle } from '../../shared';
import { tableBaseMixin } from '../../styles';
import { createGridNav } from './datagrid-nav';
import componentStyles from './datagrid.css?inline';

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

// ── Declarative bit-column element ────────────────────────────────────────────

/**
 * Declarative column definition for `<bit-datagrid>`.
 * Use as a child element instead of setting the `columns` prop imperatively.
 *
 * @element bit-column
 *
 * @attr {string} key - Row property key (required)
 * @attr {string} label - Header display label (required)
 * @attr {boolean} sortable - Makes the column sortable
 * @attr {string} width - CSS column width (e.g. '12rem')
 * @attr {string} header-label - Accessible label override for the column header
 *
 * @example
 * ```html
 * <bit-datagrid>
 *   <bit-column key="name" label="Name" sortable></bit-column>
 *   <bit-column key="email" label="Email" width="20rem"></bit-column>
 * </bit-datagrid>
 * ```
 */
if (!customElements.get('bit-column'))
  customElements.define(
    'bit-column',
    class extends HTMLElement {
      connectedCallback(): void {
        if (!this.getAttribute('key')) {
          console.warn('[bit-column] Missing required `key` attribute.', this);
        }

        if (!this.getAttribute('label')) {
          console.warn('[bit-column] Missing required `label` attribute.', this);
        }
      }
    },
  );

export const COLUMN_TAG = 'bit-column' as const;

/** Parse all `<bit-column>` children of `host` into DataGridColumn descriptors. */
function parseColumnChildren(host: HTMLElement): DataGridColumn[] {
  return Array.from(host.querySelectorAll(':scope > bit-column')).map((el) => ({
    headerLabel: el.getAttribute('header-label') ?? undefined,
    key: el.getAttribute('key') ?? '',
    label: el.getAttribute('label') ?? '',
    resizable: el.hasAttribute('resizable'),
    sortable: el.hasAttribute('sortable'),
    width: el.getAttribute('width') ?? undefined,
  }));
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type FilterDef = { key: string; label: string; options: { label?: string; value: string }[] };

export type BitDataGridEvents<T = Record<string, unknown>> = {
  /** Fired when the active page changes. */
  'page-change': { pageIndex: number; pageSize: number };
  /** Fired when row selection changes. */
  'selection-change': { keys: string[]; rows: T[] };
  /** Fired when the sort column or direction changes. */
  'sort-change': { direction: SortDirection; key: string };
};

export type BitDataGridProps<T = Record<string, unknown>> = {
  /**
   * Column definitions. Pass as a JS property — not serialisable to an HTML attribute.
   * @example
   * ```js
   * grid.columns = [
   *   { key: 'name', label: 'Name', sortable: true },
   *   { key: 'email', label: 'Email' },
   * ];
   * ```
   */
  columns?: DataGridColumn<T>[];
  /** Disable all interaction. */
  disabled?: boolean;
  /** Text shown when there are no rows. */
  'empty-text'?: string;
  /**
   * Column filter definitions. Each entry renders a `bit-combobox` (multi-select) in the toolbar.
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
   * When provided, a `bit-select` is shown next to the pagination controls.
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
  /** Component size. */
  size?: ComponentSize;
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
 * @element bit-datagrid
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
 * @attr {string} size - Component size: sm | md | lg
 * @attr {string} empty-text - Text shown when there are no rows
 * @attr {string} label - Accessible label for the grid
 *
 * @fires selection-change - Fired when row selection changes. detail: { keys: string[], rows: T[] }
 * @fires sort-change - Fired when sort state changes. detail: { key: string, direction: SortDirection }
 * @fires page-change - Fired when page changes. detail: { pageIndex: number, pageSize: number }
 *
 * @cssprop --datagrid-bg - Grid background color
 * @cssprop --datagrid-border-color - Grid and cell border color
 * @cssprop --datagrid-radius - Grid border radius
 * @cssprop --datagrid-shadow - Grid box shadow
 * @cssprop --datagrid-header-bg - Column header background
 * @cssprop --datagrid-row-hover-bg - Row hover background
 * @cssprop --datagrid-row-selected-bg - Selected row background
 * @cssprop --datagrid-row-selected-border - Inline-start accent on selected rows
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
 * <bit-datagrid id="grid" label="Users" selection-mode="multi"></bit-datagrid>
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
export const DATAGRID_TAG = 'bit-datagrid' as const;

define<BitDataGridProps, BitDataGridEvents>(DATAGRID_TAG, {
  props: {
    ...sizableBundle,
    ...disablableBundle,
    ...loadableBundle,
    columns: prop.ref<DataGridColumn[]>(),
    'empty-text': prop.string('No data'),
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

    // ── Page size ────────────────────────────────────────────────────────
    // Single signal seeded from the initial prop value.
    // The prop is treated as an initial-value-only (like `defaultValue` in React).
    // The per-page select and external changes drive `pageSize` directly.
    const pageSize = signal<number>(props['page-size'].value ?? 10);

    // ── Declarative bit-column children ─────────────────────────────────────
    // A writable signal holding columns parsed from <bit-column> children.
    // Updated on mount and whenever children change. The JS `columns` prop
    // takes precedence when explicitly set (non-empty).
    const declarativeColumns = signal<DataGridColumn[]>([]);

    onMounted(() => {
      declarativeColumns.value = parseColumnChildren(el);

      const columnObserver = new MutationObserver(() => {
        declarativeColumns.value = parseColumnChildren(el);
      });

      columnObserver.observe(el, {
        attributeFilter: ['key', 'label', 'sortable', 'resizable', 'width', 'header-label'],
        attributes: true,
        childList: true,
      });

      return () => columnObserver.disconnect();
    });

    // Resolved columns: prop wins when explicitly set (even to []); undefined = not set → use declarative children.
    const resolvedColumns = computed<DataGridColumn[]>(() => {
      const propCols = props.columns.value;

      return propCols !== undefined ? propCols : declarativeColumns.value;
    });

    // ── Key resolution ─────────────────────────────────────────────────────────
    // Inlined — reads the prop directly so it always reflects the current value.

    const resolveKey = (item: Record<string, unknown>): string => {
      const fn = props.getRowKey.value;

      if (fn) return fn(item);

      if (item['id'] == null) {
        console.warn(
          '[bit-datagrid] Row is missing an `id` field. Provide `getRowKey` or ensure each row has a unique `id`.',
          item,
        );
      }

      return String(item['id'] ?? '');
    };

    // ── Search & filters ─────────────────────────────────────────────────────────

    const searchQuery = signal('');
    const filterValues = signal(new Map<string, Set<string>>());
    const filterDefs = computed(() => props.filters.value ?? []);

    // B5: encapsulated mutation — one copy-on-write path, no inline Map copies in handlers.
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
      getItems: () => filteredRows.value,
      getRowKey: resolveKey,
      onSelectionChange: (keys: Set<string>) => {
        emit('selection-change', { keys: [...keys], rows: ctrl.selectedRows as Record<string, unknown>[] });
      },
      onSortChange: (sort) => {
        emit('sort-change', sort);
      },
      pageSize: () => pageSize.value,
      selectionMode: () => selectionMode.value,
      sortMode: () => props['sort-mode'].value ?? 'client',
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

    const colWidths = signal(new Map<string, number>());

    const createColResizeHandler =
      (key: string, th: HTMLElement): ((e: PointerEvent) => void) =>
      (e: PointerEvent): void => {
        e.preventDefault();

        const startX = e.clientX;
        const startW = th.getBoundingClientRect().width;

        const onMove = (mv: PointerEvent): void => {
          const newW = Math.max(40, startW + mv.clientX - startX);
          const next = new Map(colWidths.value);

          next.set(key, newW);
          colWidths.value = next;
        };

        const onUp = (): void => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
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

    function handlePrev(): void {
      ctrl.prevPage();
      emit('page-change', { pageIndex: ctrl.pageIndex.value, pageSize: pageSize.value });
    }

    function handleNext(): void {
      ctrl.nextPage();
      emit('page-change', { pageIndex: ctrl.pageIndex.value, pageSize: pageSize.value });
    }

    // ── Select-all helpers ────────────────────────────────

    const isSomeSelected = computed(() => {
      const page = ctrl.currentPageItems.value;

      if (!page.length || ctrl.isAllSelected()) return false;

      return page.some((item) => ctrl.selectedKeys.value.has(resolveKey(item as Record<string, unknown>)));
    });

    // ── Column count (used in keyboard nav + empty colspan) ───────────────────

    const effectiveColCount = computed(() => resolvedColumns.value.length + (selectionMode.value === 'multi' ? 1 : 0));

    // ── Pagination info text ──────────────────────────────────────────────────

    const paginationEnabled = computed(() => pageSize.value > 0);

    const paginationInfo = computed(() => {
      const total = ctrl.totalItems.value;

      if (!paginationEnabled.value) return `${total} row${total !== 1 ? 's' : ''}`;

      const start = ctrl.pageIndex.value * pageSize.value + 1;
      const end = Math.min(start + pageSize.value - 1, total);

      return `${start} to ${end} of ${total}`;
    });

    // ── Keyboard cell navigation (roving tabindex — C1 extracted to datagrid-nav.ts) ──
    // C2+F6: activeCell signal is the single owner of tabindex state.
    // Template reads activeCell.value to set initial + reactive tabindex,
    // preventing re-renders from overwriting keyboard-navigated state.

    let navHandle: ReturnType<typeof createGridNav>['handle'] | null = null;

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
      navHandle?.focusCell(pos);

    // ── Template ──────────────────────────────────────────────────────────────

    return html`
      ${() =>
        props.searchable.value || filterDefs.value.length
          ? html`<div class="dg-toolbar" part="toolbar">
              ${() =>
                props.searchable.value
                  ? html`<div class="dg-toolbar-start">
                      <bit-input
                        class="dg-search"
                        type="search"
                        :placeholder="${() => props['search-placeholder'].value ?? 'Search…'}"
                        :disabled="${() => isDisabled.value || undefined}"
                        clearable
                        @input="${(e: CustomEvent<{ value: string }>) => {
                          searchQuery.value = e.detail.value;
                        }}"></bit-input>
                    </div>`
                  : html``}
              ${() => {
                if (!filterDefs.value.length) return html``;

                return html`<div class="dg-toolbar-filters">
                  ${filterDefs.value.map(
                    (f) =>
                      html`<bit-combobox
                        class="dg-filter"
                        :placeholder="${() => f.label}"
                        :options="${() => f.options}"
                        :disabled="${() => isDisabled.value || undefined}"
                        multiple
                        @change="${(e: CustomEvent<{ values: string[] }>) => {
                          setFilter(f.key, e.detail.values);
                        }}"></bit-combobox>`,
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
                        navHandle?.activeCell.value.row === 0 && navHandle?.activeCell.value.col === 0 ? '0' : '-1'}">
                      <bit-checkbox
                        class="dg-check"
                        :checked="${() => ctrl.isAllSelected()}"
                        :indeterminate="${isSomeSelected}"
                        ?disabled="${isDisabled}"
                        aria-label="Select all rows on this page"
                        @change="${() => {
                          if (!isDisabled.value) ctrl.selectAll();
                        }}"></bit-checkbox>
                    </th>`
                  : html``}
              ${() =>
                resolvedColumns.value.map((col: DataGridColumn, colIdx: number) => {
                  const checkOffset = selectionMode.value === 'multi' ? 1 : 0;

                  return html`<th
                    class="dg-th"
                    role="columnheader"
                    scope="col"
                    :tabindex="${() => {
                      const ac = navHandle?.activeCell.value;

                      return ac?.row === 0 && ac?.col === colIdx + checkOffset ? '0' : '-1';
                    }}"
                    :aria-sort="${() => (col.sortable ? ariaSortValue(ctrl.sortState.value, col.key) : undefined)}"
                    :aria-label="${col.sortable ? undefined : (col.headerLabel ?? col.label)}"
                    :style="${() => {
                      const dragged = colWidths.value.get(col.key);

                      return dragged ? `width:${dragged}px` : col.width ? `width:${col.width}` : '';
                    }}"
                    ref="${(thEl: HTMLElement) => {
                      if (col.resizable) {
                        thEl.style.position = 'relative';
                      }
                    }}">
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
                            <span class="dg-th-inner">
                              ${col.label}
                              <span class="dg-sort-icon" aria-hidden="true">
                                <bit-icon
                                  :name="${() => sortIconName(ctrl.sortState.value, col.key)}"
                                  size="14"
                                  stroke-width="2"></bit-icon>
                              </span>
                            </span>
                          </button>`
                        : col.label}
                    ${col.resizable
                      ? html`<span
                          class="dg-col-resize"
                          aria-hidden="true"
                          ref="${(handleEl: HTMLElement) => {
                            const th = handleEl.closest('th') as HTMLElement | null;

                            if (th) handleEl.addEventListener('pointerdown', createColResizeHandler(col.key, th));
                          }}"></span>`
                      : html``}
                  </th>`;
                })}
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
                              <bit-checkbox
                                class="dg-check"
                                :checked="${() => ctrl.selectedKeys.value.has(key)}"
                                ?disabled="${isDisabled}"
                                aria-label="Select row"
                                tabindex="-1"
                                @click="${(e: MouseEvent) => e.stopPropagation()}"
                                @change="${() => {
                                  if (!isDisabled.value) ctrl.toggleRow(key);
                                }}"></bit-checkbox>
                            </td>`
                          : html``}
                      ${resolvedColumns.value.map((col: DataGridColumn, colIdx: number) => {
                        const value = getCellValue(col, item as Record<string, unknown>);
                        const checkOffset = selectionMode.value === 'multi' ? 1 : 0;

                        return html`<td
                          class="dg-td"
                          part="cell"
                          role="gridcell"
                          :tabindex="${() => {
                            const ac = navHandle?.activeCell.value;

                            return ac?.row === rowIdx && ac?.col === colIdx + checkOffset ? '0' : '-1';
                          }}"
                          :title="${value}">
                          ${value}
                        </td>`;
                      })}
                    </tr>`;
                  })}
          </tbody>
        </table>
      </div>

      <!-- Footer / Pagination -->
      ${() =>
        paginationEnabled.value
          ? html`<div class="dg-footer" part="footer" role="navigation" aria-label="Pagination">
              <span class="dg-footer-info" aria-live="polite" aria-atomic="true">${paginationInfo}</span>
              <div class="dg-footer-end">
                ${() => {
                  const opts = props['page-size-options'].value ?? [];

                  return opts.length
                    ? html`<bit-select
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
                        }}"></bit-select>`
                    : html``;
                }}
                <div class="dg-pagination" role="group" aria-label="Page navigation">
                  <button
                    class="dg-page-btn"
                    type="button"
                    aria-label="Previous page"
                    ?disabled="${() => !ctrl.hasPrevPage.value || isDisabled.value}"
                    @click="${handlePrev}">
                    <bit-icon name="chevron-left" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
                  </button>
                  <span class="dg-page-label" aria-current="page">
                    ${() => `${ctrl.pageIndex.value + 1} / ${ctrl.pageCount.value}`}
                  </span>
                  <button
                    class="dg-page-btn"
                    type="button"
                    aria-label="Next page"
                    ?disabled="${() => !ctrl.hasNextPage.value || isDisabled.value}"
                    @click="${handleNext}">
                    <bit-icon name="chevron-right" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
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
