import { define, html, prop } from '@vielzeug/craft';
import { computed, signal, watch } from '@vielzeug/ripple';

import { warn } from '../../_warn';
import '../../content/icon/icon';
import '../../inputs/checkbox/checkbox';
import '../../inputs/combobox/combobox';
import '../../inputs/select/select';
import '../../overlay/popover/popover';
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
import { createDataGridControls, type FilterOption, type DataGridView } from './datagrid-controls';
import { type GridNavHandle, createGridNav } from './datagrid-nav';
import componentStyles from './datagrid.css?inline';

type SortMode = 'client' | 'server';

export { COLUMN_TAG } from './datagrid-column';
export type { DataGridView, FilterOption } from './datagrid-controls';

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

export type SgDataGridEvents<T = Record<string, unknown>> = {
  /** Fired when the active page changes. */
  'page-change': { pageIndex: number; pageSize: number };
  /** Fired when a row is expanded or collapsed. */
  'row-expand': { expanded: boolean; key: string };
  /** Fired when row selection changes. */
  'selection-change': { keys: string[]; rows: T[] };
  /** Fired when the sort column or direction changes. */
  'sort-change': { direction: SortDirection; key: string };
  /** Fired when the active view tab changes. detail: { id, label } */
  'view-change': { id: string; label: string };
};

export type SgDataGridProps<T = Record<string, unknown>> = {
  /**
   * The ID of the currently active view. Must match an `id` in `views`.
   * When omitted, no view is active (all data shown).
   * @example `grid['active-view'] = 'open'`
   */
  'active-view'?: string;
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
   *
   * @security The `renderExpanded` callback returns an HTML string inserted via `innerHTML`.
   * If data originates from untrusted user input, sanitize it before returning
   * (e.g. with DOMPurify or your CSP-compliant sanitizer).
   */
  expandable?: boolean;
  /**
   * Pre-defined filter option definitions per column key.
   * When provided, these options replace the auto-derived ones in the Filter popover.
   * @example
   * ```js
   * grid.filterOptions = [
   *   { key: 'role', label: 'Role', options: [{ value: 'Admin' }, { value: 'Editor' }] },
   * ];
   * ```
   */
  filterOptions?: FilterOption[];
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
  /** Placeholder text for the inline search input in the controls bar. */
  'search-placeholder'?: string;
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
  /**
   * Named view definitions for the controls bar tab strip.
   * Each view is a label displayed as a tab; switching tabs fires `view-change`.
   * The consumer is responsible for restoring filter/sort state per view.
   * @example
   * ```js
   * grid.views = [
   *   { id: 'all', label: 'All' },
   *   { id: 'open', label: 'Open' },
   *   { id: 'mine', label: 'Mine' },
   * ];
   * grid['active-view'] = 'all';
   * ```
   */
  views?: DataGridView[];
};

/**
 * An accessible, keyboard-navigable data grid with sorting, pagination,
 * single/multi row selection, inline search, filter, and named views.
 *
 * @element sg-datagrid
 * @element sg-column - Optional declarative column definition child
 *
 * @attr {boolean} disabled - Disable all interaction
 * @attr {boolean} loading - Show busy/loading state
 * @attr {boolean} striped - Apply alternating row backgrounds
 * @attr {boolean} fullwidth - Stretch the grid to fill its container's width
 * @attr {string} search-placeholder - Placeholder for the inline search input
 * @attr {data} filterOptions - Pre-defined filter option definitions per column key
 * @attr {number} page-size - Rows per page (0 = no pagination, default 10)
 * @attr {string} selection-mode - Row selection: 'none' | 'single' | 'multi'
 * @attr {string} sort-mode - Sorting: 'client' (default) | 'server'
 * @attr {string} density - Cell density: compact | cozy (default) | comfortable
 * @attr {string} empty-text - Text shown when there are no rows
 * @attr {string} label - Accessible label for the grid
 * @attr {string} active-view - ID of the currently active view tab
 *
 * @fires selection-change - Fired when row selection changes. detail: { keys: string[], rows: T[] }
 * @fires sort-change - Fired when sort state changes. detail: { key: string, direction: SortDirection }
 * @fires page-change - Fired when page changes. detail: { pageIndex: number, pageSize: number }
 * @fires row-expand - Fired when a row is expanded or collapsed. detail: { expanded: boolean; key: string }
 * @fires view-change - Fired when the active view tab changes. detail: { id: string, label: string }
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
 * @part controls - The controls bar (tabs + action row)
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
 *   grid.views = [{ id: 'all', label: 'All' }, { id: 'open', label: 'Open' }];
 *   grid['active-view'] = 'all';
 * </script>
 * ```
 */
export const DATAGRID_TAG = 'sg-datagrid' as const;

define<SgDataGridProps, SgDataGridEvents>(DATAGRID_TAG, {
  props: {
    'active-view': prop.string(),
    density: prop.string<'compact' | 'cozy' | 'comfortable'>(),
    ...disablableBundle,
    ...loadableBundle,
    columns: prop.data<DataGridColumn[]>(),
    'empty-text': prop.string('No data'),
    expandable: prop.bool(false),
    filterOptions: prop.data<FilterOption[]>(),
    fullwidth: prop.bool(false),
    getRowKey: prop.data<(row: Record<string, unknown>) => string>(),
    label: prop.string(),
    'page-size': prop.number(10),
    'page-size-options': prop.data<number[]>(),
    rows: prop.data<Record<string, unknown>[]>(),
    'search-placeholder': prop.string('Search…'),
    'selected-keys': prop.data<string[]>(),
    'selection-mode': prop.string<SelectionMode>('none'),
    'sort-mode': prop.string<SortMode>('client'),
    striped: prop.bool(false),
    views: prop.data<DataGridView[]>(),
  },

  setup(props, { el, emit, onCleanup, onMounted, slots }) {
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

    watch(props['page-size'], (n) => {
      if (n != null) pageSize.value = n;
    });

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

    // ── Controls (search, filter, column visibility) ──────────────────────────
    // Extracted into a dedicated headless module so this scope stays focused
    // on table rendering machinery.

    const controls = createDataGridControls({
      columns: resolvedColumns,
      filterOptions: props.filterOptions,
      rows: computed(() => props.rows.value ?? []),
    });

    // ── Headless control ──────────────────────────────────────────────────────

    const ctrl: DataGridControl = createDataGridControl({
      columns: () => resolvedColumns.value,
      getRowKey: resolveKey,
      items: controls.filteredRows,
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
      props['selected-keys'],
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

    // ── Visible columns (respects hide/show from column menu) ────────────────

    const visibleColumns = computed<DataGridColumn[]>(() =>
      resolvedColumns.value.filter((c) => !controls.hiddenColumns.value.has(c.key)),
    );

    // ── Cell value helper ────────────────────────────────────────────────────

    const getCellValue = (col: DataGridColumn, item: Record<string, unknown>): string => {
      if (col.cell) return col.cell(item);

      const v = item[col.key];

      return v == null ? '' : String(v);
    };

    // B4: reactive page reset — any change to the filtered result set resets to page 0.
    // Removes the need to call ctrl.goToPage(0) manually in every event handler.
    watch(controls.filteredRows, () => ctrl.goToPage(0), { immediate: false });

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
      () => visibleColumns.value.length + (selectionMode.value === 'multi' ? 1 : 0) + (hasExpander.value ? 1 : 0),
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

    // ── Render helpers ────────────────────────────────────────────────────────
    // Each helper renders one self-contained region, closing only over the
    // signals it actually needs. This keeps the root template readable.

    const renderViewTabs = (): unknown => {
      const views = props.views.value ?? [];
      const activeId = props['active-view'].value;

      return html`<div class="dg-tabs" role="tablist" aria-label="Views">
        ${views.map(
          (view) =>
            html`<button
              class="${() => `dg-tab${activeId === view.id ? ' dg-tab--active' : ''}`}"
              role="tab"
              type="button"
              :aria-selected="${() => String(activeId === view.id)}"
              @click="${() => {
                emit('view-change', { id: view.id, label: view.label });
              }}">
              ${view.label}
            </button>`,
        )}
      </div>`;
    };

    const renderSortPopover = (): unknown =>
      html`<sg-popover class="dg-action-popover" placement="bottom-end" label="Sort" style="--popover-min-width:18rem">
        <button class="dg-icon-btn" type="button" aria-label="Sort">
          <sg-icon name="arrow-up-down" size="15" stroke-width="1.75" aria-hidden="true"></sg-icon>
        </button>
        <div slot="content" class="dg-pop-sort">
          <div class="dg-pop-header">
            <span class="dg-pop-title">Sort by</span>
            <button class="dg-icon-btn" type="button" aria-label="Clear sort" @click="${() => ctrl.sortTo('', 'none')}">
              <sg-icon name="trash-2" size="14" stroke-width="1.75" aria-hidden="true"></sg-icon>
            </button>
          </div>
          <div class="dg-pop-sort-row">
            <sg-select
              class="dg-pop-select"
              variant="flat"
              size="sm"
              rounded="lg"
              placeholder="Property"
              fullwidth
              :value="${() => ctrl.sortState.value.key}"
              :options="${() => resolvedColumns.value.map((c) => ({ label: c.label, value: c.key }))}"
              @change="${(e: CustomEvent<{ values: string[] }>) => {
                const key = e.detail.values[0] ?? '';
                const dir = ctrl.sortState.value.direction === 'none' ? 'asc' : ctrl.sortState.value.direction;

                ctrl.sortTo(key, dir);
              }}"></sg-select>
            <sg-select
              class="dg-pop-dir-select"
              variant="flat"
              size="sm"
              rounded="lg"
              :value="${() => (ctrl.sortState.value.direction === 'none' ? 'asc' : ctrl.sortState.value.direction)}"
              :options="${() => [
                { label: 'A → Z', value: 'asc' },
                { label: 'Z → A', value: 'desc' },
              ]}"
              @change="${(e: CustomEvent<{ values: string[] }>) => {
                if (ctrl.sortState.value.key) {
                  ctrl.sortTo(ctrl.sortState.value.key, (e.detail.values[0] ?? 'asc') as 'asc' | 'desc');
                }
              }}"></sg-select>
          </div>
        </div>
      </sg-popover>`;

    const renderFilterPopover = (): unknown =>
      html`<sg-popover
        class="dg-action-popover"
        placement="bottom-end"
        label="Filter"
        style="--popover-min-width:16rem">
        <button class="dg-icon-btn" type="button" aria-label="Filter">
          <sg-icon name="filter" size="15" stroke-width="1.75" aria-hidden="true"></sg-icon>
        </button>
        <div slot="content" class="dg-pop-filter">
          <div class="dg-pop-header">
            <span class="dg-pop-title">Filter by</span>
            ${() =>
              controls.filterDefs.value.length
                ? html`<button
                    class="dg-icon-btn"
                    type="button"
                    aria-label="Clear all filters"
                    @click="${() => controls.clearAllFilters()}">
                    <sg-icon name="trash-2" size="14" stroke-width="1.75" aria-hidden="true"></sg-icon>
                  </button>`
                : html``}
          </div>

          <!-- Always-visible field picker: click a column name to add a filter rule -->
          <div class="dg-pop-filter-fields">
            ${() =>
              resolvedColumns.value.map(
                (col) =>
                  html`<button
                    class="dg-pop-field-row"
                    type="button"
                    @click="${() => controls.activateFilterKey(col.key)}">
                    <sg-icon
                      name="list-filter"
                      size="14"
                      stroke-width="1.75"
                      class="dg-pop-field-icon"
                      aria-hidden="true"></sg-icon>
                    <span class="dg-pop-field-label">${col.label}</span>
                  </button>`,
              )}
          </div>

          <!-- Active filter rules (appear below the field picker as rules are added) -->
          ${() =>
            controls.filterDefs.value.length
              ? html`<div class="dg-pop-filter-rules">
                  ${controls.filterDefs.value.map(
                    (f) => html`
                      <div class="dg-pop-filter-rule">
                        <div class="dg-pop-filter-rule-header">
                          <span class="dg-pop-filter-field">${f.label}</span>
                          <span class="dg-pop-filter-op">contains</span>
                          <button
                            class="dg-icon-btn"
                            type="button"
                            aria-label="Remove filter"
                            @click="${() => controls.removeFilter(f.key)}">
                            <sg-icon name="trash-2" size="13" stroke-width="1.75" aria-hidden="true"></sg-icon>
                          </button>
                        </div>
                        <sg-combobox
                          class="dg-filter"
                          :placeholder="${() => f.label}"
                          :options="${() => f.options}"
                          :disabled="${() => isDisabled.value || undefined}"
                          multiple
                          fullwidth
                          @change="${(e: CustomEvent<{ values: string[] }>) => {
                            controls.setFilter(f.key, e.detail.values);
                          }}"></sg-combobox>
                      </div>
                    `,
                  )}
                </div>`
              : html``}
        </div>
      </sg-popover>`;

    const renderColumnMenu = (): unknown =>
      html`<sg-popover
        class="dg-action-popover"
        placement="bottom-end"
        label="Column options"
        style="--popover-min-width:13rem">
        <button class="dg-icon-btn" type="button" aria-label="Column options">
          <sg-icon name="columns-3" size="15" stroke-width="1.75" aria-hidden="true"></sg-icon>
        </button>
        <div slot="content" class="dg-pop-col-menu">
          <div class="dg-pop-col-divider" role="separator"></div>
          ${() =>
            resolvedColumns.value.map(
              (col) =>
                html`<button
                  class="dg-pop-col-item"
                  role="menuitemcheckbox"
                  type="button"
                  :aria-checked="${() => String(!controls.hiddenColumns.value.has(col.key))}"
                  @click="${() => controls.toggleColumnVisibility(col.key)}">
                  <sg-icon
                    :name="${() => (controls.hiddenColumns.value.has(col.key) ? 'eye-off' : 'eye')}"
                    size="13"
                    stroke-width="2"
                    aria-hidden="true"></sg-icon>
                  ${col.label}
                </button>`,
            )}
        </div>
      </sg-popover>`;

    // ── Template ──────────────────────────────────────────────────────────────

    return html`
      <!-- ── Controls Bar ────────────────────────────────────────────────── -->
      <div class="dg-controls" part="controls">
        <!-- Left: view tabs -->
        ${() => renderViewTabs()}

        <!-- Right: Action bar -->
        <div class="dg-actions">
          ${() => renderSortPopover()} ${() => renderFilterPopover()} ${() => renderColumnMenu()}

          <span class="dg-action-divider" aria-hidden="true" ?hidden="${() => !slots.has('actions').value}"></span>

          <slot name="actions"></slot>

          <!-- Search toggle: rightmost, expands in-place -->
          <div class="${() => `dg-search${controls.searchActive.value ? ' dg-search--open' : ''}`}">
            ${() =>
              controls.searchActive.value
                ? html`<sg-input
                    class="dg-search-input"
                    type="search"
                    variant="flat"
                    size="sm"
                    rounded="full"
                    :placeholder="${() => props['search-placeholder'].value ?? 'Search…'}"
                    :disabled="${() => isDisabled.value || undefined}"
                    autofocus
                    @input="${(e: CustomEvent<{ value: string }>) => {
                      controls.setSearchQuery(e.detail.value);
                    }}"
                    @keydown="${(e: KeyboardEvent) => {
                      if (e.key === 'Escape') controls.toggleSearch();
                    }}">
                    <sg-icon slot="prefix" name="search" size="13" stroke-width="1.75" aria-hidden="true"></sg-icon>
                  </sg-input>`
                : html``}
            <button
              class="${() => `dg-icon-btn${controls.searchActive.value ? ' dg-icon-btn--active' : ''}`}"
              type="button"
              :aria-label="${() => (controls.searchActive.value ? 'Close search' : 'Search')}"
              @click="${() => controls.toggleSearch()}">
              <sg-icon
                :name="${() => (controls.searchActive.value ? 'x' : 'search')}"
                size="15"
                stroke-width="1.75"
                aria-hidden="true"></sg-icon>
            </button>
          </div>
        </div>
      </div>

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
                visibleColumns.value.map((col: DataGridColumn, colIdx: number) => {
                  const isLast = colIdx === visibleColumns.value.length - 1;

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
                        ${visibleColumns.value.map((col: DataGridColumn, colIdx: number) => {
                          const value = getCellValue(col, item as Record<string, unknown>);

                          const isLastCol = colIdx === visibleColumns.value.length - 1;

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
