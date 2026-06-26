import { define, html, prop } from '@vielzeug/ore';
import { computed, signal, watch } from '@vielzeug/ripple';

import { warn } from '../../_warn';
import '../../content/icon/icon';
import '../../inputs/button/button';
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

export type OreDataGridEvents<T = Record<string, unknown>> = {
  /** Fired when the user cycles the density via the toolbar button. */
  'density-change': { density: 'compact' | 'cozy' | 'comfortable' };
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

export type OreDataGridProps<T = Record<string, unknown>> = {
  /**
   * The ID of the currently active view. Must match an `id` in `views`.
   * When omitted, no view is active (all data shown).
   * @example `grid['active-view'] = 'open'`
   */
  'active-view'?: string;
  /**
   * Column definitions (imperative API). Takes precedence over `<ore-column>` children.
   * Passing `[]` explicitly clears declarative children.
   * Pass `undefined` (or omit) to use `<ore-column>` children instead.
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
   * When provided, a `ore-select` is shown next to the pagination controls.
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
  /**
   * Accessible label for the search toggle button. Supports localization.
   * Defaults to `'Search'` (open) and `'Close search'` (close).
   * Pass a tuple `[openLabel, closeLabel]` to override both.
   * @example `grid['search-label'] = ['Suchen', 'Suche schließen']`
   */
  'search-label'?: [open: string, close: string];
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
  /**
   * A reactive data source from `@vielzeug/sourcerer` (or any compatible object).
   * When set, the source drives row data, pagination, and search — the `rows` prop is ignored.
   * Client-side sort and filter are bypassed; wire `sort-change` to `source.patch()` externally.
   * @example
   * ```js
   * import { createRemoteSource } from '@vielzeug/sourcerer';
   * const source = createRemoteSource({ fetch: (q, sig) => api.users(q, sig), limit: 20 });
   * grid.source = source;
   * ```
   */
  source?: DataGridSource<T>;
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
 * @element ore-datagrid
 * @element ore-column - Optional declarative column definition child
 *
 * @attr {boolean} disabled - Disable all interaction
 * @attr {boolean} loading - Show busy/loading state
 * @attr {boolean} striped - Apply alternating row backgrounds
 * @attr {boolean} fullwidth - Stretch the grid to fill its container's width
 * @attr {data} search-label - Tuple [openLabel, closeLabel] for the search toggle button
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
 * <ore-datagrid id="grid" label="Users" selection-mode="multi"></ore-datagrid>
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
/**
 * Minimal structural interface for a reactive data source accepted by `ore-datagrid`.
 *
 * Any `@vielzeug/sourcerer` source (`LocalSource<T>`, `RemoteSource<T>`, `PageNavigator<T>`)
 * satisfies this interface automatically — no direct sourcerer import is required in refine.
 *
 * When `source` is set on the grid:
 * - `rows` prop is ignored; `source.current` drives the displayed items.
 * - Pagination is driven by `source.meta` (pageCount, pageNumber, totalItems).
 * - Prev/next buttons call `source.prev()` / `source.next()`.
 * - The search input calls `source.search(query)` when available.
 * - `source.meta.isLoading` contributes to the grid's `aria-busy` state.
 * - Client-side sort and filter are bypassed; wire `sort-change` to `source.patch()` externally.
 *
 * @example
 * ```ts
 * import { createRemoteSource } from '@vielzeug/sourcerer';
 *
 * const source = createRemoteSource({
 *   fetch: (q, signal) =>
 *     fetch(`/api/users?page=${q.page}&limit=${q.limit}&search=${q.search ?? ''}`, { signal })
 *       .then(r => r.json()),
 *   limit: 20,
 * });
 *
 * const grid = document.querySelector('ore-datagrid');
 * grid.source = source;
 * ```
 */
export type DataGridSource<T = Record<string, unknown>> = {
  /** Current page of items. Updated reactively after each fetch or patch. */
  readonly current: readonly T[];
  /** Navigate to a specific 1-indexed page number. */
  goTo?(page: number): Promise<void>;
  /** Pagination and loading metadata. */
  readonly meta: {
    readonly error: { message: string } | null;
    readonly isLoading: boolean;
    readonly pageCount: number;
    readonly pageNumber: number;
    readonly pageSize: number;
    readonly totalItems: number;
  };
  /** Navigate to the next page. No-op when on the last page. */
  next?(): Promise<void>;
  /** Navigate to the previous page. No-op when on the first page. */
  prev?(): Promise<void>;
  /** Debounced text search. No-op when not implemented by the source. */
  search?(query: string, opts?: { immediate?: boolean }): Promise<void>;
  /** Subscribe to source updates. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
};

export const DATAGRID_TAG = 'ore-datagrid' as const;

define<OreDataGridProps, OreDataGridEvents>(DATAGRID_TAG, {
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
    'search-label': prop.data<[string, string]>(),
    'search-placeholder': prop.string('Search…'),
    'selected-keys': prop.data<string[]>(),
    'selection-mode': prop.string<SelectionMode>('none'),
    'sort-mode': prop.string<SortMode>('client'),
    source: prop.data<DataGridSource>(),
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

    // ── Declarative ore-column children ─────────────────────────────────────
    // A writable signal holding columns parsed from <ore-column> children.
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
        warn('ore-datagrid: row missing `id` — keys will collide. Provide `getRowKey` or add a unique `id` field.');

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

    // ── Reactive source bridge ────────────────────────────────────────────────
    // When `source` is provided it drives rows, pagination, and search.
    // The `rows` prop and client-side filter pipeline are bypassed.

    type SourceMetaState = {
      error: { message: string } | null;
      isLoading: boolean;
      pageCount: number;
      pageNumber: number;
      pageSize: number;
      totalItems: number;
    };

    const hasSource = computed(() => props.source.value != null);
    const sourceItems = signal<Record<string, unknown>[]>([]);
    const sourceMeta = signal<SourceMetaState>({
      error: null,
      isLoading: false,
      pageCount: 1,
      pageNumber: 1,
      pageSize: pageSize.value,
      totalItems: 0,
    });

    let _sourceUnsub: (() => void) | null = null;

    onCleanup(() => {
      _sourceUnsub?.();
      _sourceUnsub = null;
    });

    watch(
      props.source,
      (src) => {
        _sourceUnsub?.();
        _sourceUnsub = null;

        if (!src) {
          sourceItems.value = [];
          sourceMeta.value = {
            error: null,
            isLoading: false,
            pageCount: 1,
            pageNumber: 1,
            pageSize: pageSize.value,
            totalItems: 0,
          };

          return;
        }

        const update = (): void => {
          sourceItems.value = src.current as Record<string, unknown>[];
          sourceMeta.value = src.meta as SourceMetaState;
        };

        update();
        _sourceUnsub = src.subscribe(update);
      },
      { immediate: true },
    );

    // Items fed to ctrl: source.current when source is active, filtered rows otherwise.
    const itemsForCtrl = computed<Record<string, unknown>[]>(() =>
      hasSource.value ? sourceItems.value : controls.filteredRows.value,
    );

    // ── Headless control ──────────────────────────────────────────────────────

    const ctrl: DataGridControl = createDataGridControl({
      columns: () => resolvedColumns.value,
      getRowKey: resolveKey,
      items: itemsForCtrl,
      onSelectionChange: (keys: Set<string>) => {
        emit('selection-change', { keys: [...keys], rows: ctrl.selectedRows.value as Record<string, unknown>[] });
      },
      onSortChange: (sort) => {
        emit('sort-change', sort);
      },
      pageSize: () => (hasSource.value ? 0 : pageSize.value),
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
      const src = props.source.value;

      if (src) {
        if (direction === 'prev') void src.prev?.();
        else void src.next?.();

        return;
      }

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

    const paginationEnabled = computed(() => {
      if (hasSource.value) return sourceMeta.value.pageCount > 1;

      return pageSize.value > 0;
    });

    const paginationInfo = computed(() => {
      if (hasSource.value) {
        const { pageNumber, pageSize: pSize, totalItems } = sourceMeta.value;
        const safePSize = Math.max(1, pSize);

        if (!paginationEnabled.value) return `${totalItems} row${totalItems !== 1 ? 's' : ''}`;

        const start = (pageNumber - 1) * safePSize + 1;
        const end = Math.min(start + safePSize - 1, totalItems);

        return `${start} to ${end} of ${totalItems}`;
      }

      const total = ctrl.totalItems.value;

      if (!paginationEnabled.value) return `${total} row${total !== 1 ? 's' : ''}`;

      const start = ctrl.pageIndex.value * pageSize.value + 1;
      const end = Math.min(start + pageSize.value - 1, total);

      return `${start} to ${end} of ${total}`;
    });

    // ── Source-aware loading and pagination helpers ───────────────────────────

    const isLoading = computed(() => props.loading.value === true || (hasSource.value && sourceMeta.value.isLoading));

    const effectiveHasPrev = computed(() =>
      hasSource.value ? sourceMeta.value.pageNumber > 1 : ctrl.hasPrevPage.value,
    );

    const effectiveHasNext = computed(() =>
      hasSource.value ? sourceMeta.value.pageNumber < sourceMeta.value.pageCount : ctrl.hasNextPage.value,
    );

    const effectivePageLabel = computed(() =>
      hasSource.value
        ? `${sourceMeta.value.pageNumber} / ${sourceMeta.value.pageCount}`
        : `${ctrl.pageIndex.value + 1} / ${ctrl.pageCount.value}`,
    );

    // ── Density toggle (E5) ──────────────────────────────────────────────────
    // Local signal so the toolbar button can cycle density without requiring
    // the consumer to wire up an external prop. Stays in sync with the `density`
    // prop: prop changes win; button clicks write back to the host attribute so
    // the CSS layer picks them up immediately.

    type Density = 'compact' | 'cozy' | 'comfortable';

    const DENSITY_CYCLE: Density[] = ['compact', 'cozy', 'comfortable'];
    const DENSITY_ICONS: Record<Density, string> = {
      comfortable: 'rows-2',
      compact: 'rows-4',
      cozy: 'rows-3',
    };
    const DENSITY_LABELS: Record<Density, string> = {
      comfortable: 'Density: Comfortable',
      compact: 'Density: Compact',
      cozy: 'Density: Cozy',
    };

    const densitySignal = signal<Density>(props.density.value ?? 'cozy');

    watch(props.density, (d) => {
      if (d) densitySignal.value = d;
    });

    const cycleDensity = (): void => {
      const idx = DENSITY_CYCLE.indexOf(densitySignal.value);
      const next = DENSITY_CYCLE[(idx + 1) % DENSITY_CYCLE.length]!;

      densitySignal.value = next;
      el.setAttribute('density', next);
      emit('density-change', { density: next });
    };

    // ── Filter badge hover state ────────────────────────────────────────────
    // Drives the dot↔count toggle on the filter toolbar badge: dot at rest,
    // count on hover/focus so the number is revealed on interaction only.
    const filterBadgeActive = signal(false);

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

      return html`<div class="dg-tabs" role="tablist" aria-label="Views" aria-controls="dg-tabpanel">
        ${views.map(
          (view) =>
            html`<ore-button
              class="${() => `dg-tab${activeId === view.id ? ' dg-tab--active' : ''}`}"
              role="tab"
              variant="ghost"
              rounded="full"
              size="sm"
              :aria-selected="${() => String(activeId === view.id)}"
              aria-controls="dg-tabpanel"
              @click="${() => {
                emit('view-change', { id: view.id, label: view.label });
              }}">
              ${view.label}
            </ore-button>`,
        )}
      </div>`;
    };

    const renderSortPopover = (): unknown =>
      html`<ore-popover class="dg-action-popover" placement="bottom-end" label="Sort" style="--popover-min-width:18rem">
        <ore-button
          class="${() => `dg-icon-btn${ctrl.sortState.value.direction !== 'none' ? ' dg-icon-btn--active' : ''}`}"
          variant="ghost"
          size="sm"
          icon-only
          label="Sort">
          <ore-icon name="arrow-up-down" size="15" stroke-width="1.75" aria-hidden="true"></ore-icon>
        </ore-button>
        <div slot="content" class="dg-pop-sort">
          <div class="dg-pop-header">
            <span class="dg-pop-title">Sort by</span>
            <ore-button
              class="dg-icon-btn"
              variant="ghost"
              size="sm"
              icon-only
              label="Clear sort"
              :disabled="${() => ctrl.sortState.value.direction === 'none' || undefined}"
              @click="${() => ctrl.sortTo('', 'none')}">
              <ore-icon name="trash-2" size="14" stroke-width="1.75" aria-hidden="true"></ore-icon>
            </ore-button>
          </div>
          <div class="dg-pop-sort-row">
            <ore-select
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
              }}"></ore-select>
            <ore-select
              class="dg-pop-dir-select"
              variant="flat"
              size="sm"
              rounded="lg"
              fullwidth
              :disabled="${() => !ctrl.sortState.value.key || undefined}"
              :value="${() => (ctrl.sortState.value.direction === 'none' ? 'asc' : ctrl.sortState.value.direction)}"
              :options="${() => [
                { label: 'A → Z', value: 'asc' },
                { label: 'Z → A', value: 'desc' },
              ]}"
              @change="${(e: CustomEvent<{ values: string[] }>) => {
                if (ctrl.sortState.value.key) {
                  ctrl.sortTo(ctrl.sortState.value.key, (e.detail.values[0] ?? 'asc') as 'asc' | 'desc');
                }
              }}"></ore-select>
          </div>
        </div>
      </ore-popover>`;

    const renderFilterPopover = (): unknown =>
      html`<ore-popover
        class="dg-action-popover"
        placement="bottom-end"
        label="Filter"
        style="--popover-min-width:16rem;--popover-max-height:min(90vh,48rem)">
        ${() =>
          controls.filterDefs.value.length
            ? html`<ore-badge
                anchor="top-end"
                color="primary"
                size="xs"
                :count="${() => (filterBadgeActive.value ? controls.filterDefs.value.length : undefined)}"
                :dot="${() => !filterBadgeActive.value || undefined}"
                :label="${() =>
                  `${controls.filterDefs.value.length} active filter${controls.filterDefs.value.length > 1 ? 's' : ''}`}"
                aria-hidden="true"
                @mouseenter="${() => (filterBadgeActive.value = true)}"
                @mouseleave="${() => (filterBadgeActive.value = false)}"
                @focusin="${() => (filterBadgeActive.value = true)}"
                @focusout="${() => (filterBadgeActive.value = false)}">
                <ore-button
                  slot="target"
                  class="dg-icon-btn dg-icon-btn--active"
                  variant="ghost"
                  size="sm"
                  icon-only
                  label="Filter">
                  <ore-icon name="filter" size="15" stroke-width="1.75" aria-hidden="true"></ore-icon>
                </ore-button>
              </ore-badge>`
            : html`<ore-button class="dg-icon-btn" variant="ghost" size="sm" icon-only label="Filter">
                <ore-icon name="filter" size="15" stroke-width="1.75" aria-hidden="true"></ore-icon>
              </ore-button>`}
        <div slot="content" class="dg-pop-filter">
          <div class="dg-pop-header">
            <span class="dg-pop-title">Filter by</span>
            ${() =>
              controls.filterDefs.value.length
                ? html`<ore-button
                    class="dg-icon-btn"
                    variant="ghost"
                    size="sm"
                    icon-only
                    label="Clear all filters"
                    @click="${() => controls.clearAllFilters()}">
                    <ore-icon name="trash-2" size="14" stroke-width="1.75" aria-hidden="true"></ore-icon>
                  </ore-button>`
                : html``}
          </div>

          <!-- Always-visible field picker: click a column name to add a filter rule -->
          <div class="dg-pop-filter-fields">
            ${() =>
              resolvedColumns.value.map(
                (col) =>
                  html`<ore-button
                    variant="ghost"
                    :aria-pressed="${() => String(controls.filterDefs.value.some((f) => f.key === col.key))}"
                    @click="${() => controls.activateFilterKey(col.key)}">
                    <ore-icon
                      slot="prefix"
                      name="list-filter"
                      size="14"
                      stroke-width="1.75"
                      aria-hidden="true"></ore-icon>
                    ${col.label}
                  </ore-button>`,
              )}
          </div>

          <!-- Active filter rules (appear below the field picker as rules are added) -->
          <div class="dg-pop-filter-rules" ?hidden="${() => !controls.filterDefs.value.length}">
            ${() =>
              controls.filterDefs.value.map(
                (f) => html`
                  <div class="dg-pop-filter-rule">
                    <div class="dg-pop-filter-rule-header">
                      <span class="dg-pop-filter-field">${f.label}</span>
                      <span class="dg-pop-filter-op" aria-hidden="true">contains</span>
                      <ore-button
                        class="dg-icon-btn"
                        variant="ghost"
                        size="sm"
                        icon-only
                        label="Remove filter"
                        @click="${() => controls.removeFilter(f.key)}">
                        <ore-icon name="trash-2" size="13" stroke-width="1.75" aria-hidden="true"></ore-icon>
                      </ore-button>
                    </div>
                    <ore-combobox
                      class="dg-filter"
                      :placeholder="${() => f.label}"
                      :options="${() => f.options}"
                      :value="${() => [...(controls.filterValues.value.get(f.key) ?? [])]}"
                      :disabled="${() => isDisabled.value || undefined}"
                      multiple
                      fullwidth
                      @change="${(e: CustomEvent<{ values: string[] }>) => {
                        controls.setFilter(f.key, e.detail.values);
                      }}"></ore-combobox>
                  </div>
                `,
              )}
          </div>
        </div>
      </ore-popover>`;

    const renderColumnMenu = (): unknown =>
      html`<ore-popover
        class="dg-action-popover"
        placement="bottom-end"
        label="Column options"
        style="--popover-min-width:13rem">
        <ore-button class="dg-icon-btn" variant="ghost" size="sm" icon-only label="Column options">
          <ore-icon name="columns-2" size="15" stroke-width="1.75" aria-hidden="true"></ore-icon>
        </ore-button>
        <div slot="content" role="menu" aria-label="Column visibility">
          ${() =>
            resolvedColumns.value.map(
              (col) =>
                html`<ore-button
                  class="dg-pop-col-item"
                  role="menuitemcheckbox"
                  variant="ghost"
                  :aria-checked="${() => String(!controls.hiddenColumns.value.has(col.key))}"
                  @click="${() => controls.toggleColumnVisibility(col.key)}">
                  <ore-icon
                    slot="prefix"
                    :name="${() => (controls.hiddenColumns.value.has(col.key) ? 'eye-off' : 'eye')}"
                    size="13"
                    stroke-width="2"
                    aria-hidden="true"></ore-icon>
                  ${col.label}
                </ore-button>`,
            )}
        </div>
      </ore-popover>`;

    // ── Template ──────────────────────────────────────────────────────────────

    return html`
      <!-- ── Controls Bar ────────────────────────────────────────────────── -->
      <div class="dg-controls" part="controls">
        <!-- Left: view tabs -->
        ${() => renderViewTabs()}

        <!-- Right: Action bar -->
        <div class="dg-actions">
          ${() => renderSortPopover()} ${() => renderFilterPopover()} ${() => renderColumnMenu()}

          <!-- Density toggle -->
          <ore-button
            class="dg-icon-btn"
            variant="ghost"
            size="sm"
            icon-only
            :label="${() => DENSITY_LABELS[densitySignal.value]}"
            @click="${cycleDensity}">
            <ore-icon
              :name="${() => DENSITY_ICONS[densitySignal.value]}"
              size="15"
              stroke-width="1.75"
              aria-hidden="true"></ore-icon>
          </ore-button>

          <span class="dg-action-divider" aria-hidden="true" ?hidden="${() => !slots.has('actions').value}"></span>

          <slot name="actions"></slot>

          <!-- Search toggle: rightmost, expands in-place -->
          <div class="${() => `dg-search${controls.searchActive.value ? ' dg-search--open' : ''}`}">
            ${() =>
              controls.searchActive.value
                ? html`<ore-input
                    class="dg-search-input"
                    type="search"
                    variant="flat"
                    size="sm"
                    rounded="full"
                    :placeholder="${() => props['search-placeholder'].value ?? 'Search…'}"
                    :disabled="${() => isDisabled.value || undefined}"
                    ref="${(inputEl: HTMLElement | null) => {
                      if (inputEl) requestAnimationFrame(() => (inputEl as HTMLElement).focus());
                    }}"
                    @input="${(e: CustomEvent<{ value: string }>) => {
                      const q = e.detail.value;
                      const src = props.source.value;

                      if (src?.search) void src.search(q);
                      else controls.setSearchQuery(q);
                    }}"
                    @keydown="${(e: KeyboardEvent) => {
                      if (e.key === 'Escape') {
                        const src = props.source.value;

                        if (src?.search) void src.search('');

                        controls.toggleSearch();
                      }
                    }}">
                    <ore-icon slot="prefix" name="search" size="13" stroke-width="1.75" aria-hidden="true"></ore-icon>
                  </ore-input>`
                : html``}
            <ore-button
              class="${() => `dg-icon-btn${controls.searchActive.value ? ' dg-icon-btn--active' : ''}`}"
              variant="ghost"
              size="sm"
              icon-only
              :label="${() => {
                const [open, close] = props['search-label'].value ?? ['Search', 'Close search'];

                return controls.searchActive.value ? close : open;
              }}"
              @click="${() => {
                const src = props.source.value;

                if (src?.search && controls.searchActive.value) void src.search('');

                controls.toggleSearch();
              }}">
              <ore-icon
                :name="${() => (controls.searchActive.value ? 'x' : 'search')}"
                size="15"
                stroke-width="1.75"
                aria-hidden="true"></ore-icon>
            </ore-button>
          </div>
        </div>
      </div>

      <div id="dg-tabpanel" class="dg-scroll" role="tabpanel" aria-label="Data">
        <table
          class="dg-table"
          part="table"
          role="grid"
          :aria-label="${() => props.label.value ?? undefined}"
          :aria-busy="${() => (isLoading.value ? 'true' : null)}"
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
                      <ore-checkbox
                        class="dg-check"
                        :checked="${() => ctrl.isAllSelected()}"
                        :indeterminate="${isSomeSelected}"
                        ?disabled="${isDisabled}"
                        aria-label="Select all rows on this page"
                        @change="${() => {
                          if (!isDisabled.value) ctrl.selectAll();
                        }}"></ore-checkbox>
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
                          ? html`<ore-button
                              class="dg-sort-btn"
                              variant="text"
                              size="sm"
                              fullwidth
                              :label="${col.headerLabel ?? col.label}"
                              :disabled="${() => isDisabled.value || undefined}"
                              @click="${() => {
                                if (!isDisabled.value) ctrl.sortBy(col.key);
                              }}">
                              ${col.label}
                              <ore-icon
                                slot="suffix"
                                :name="${() => sortIconName(ctrl.sortState.value, col.key)}"
                                size="14"
                                stroke-width="2"></ore-icon>
                            </ore-button>`
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
                                <ore-checkbox
                                  class="dg-check"
                                  :checked="${() => ctrl.selectedKeys.value.has(key)}"
                                  ?disabled="${isDisabled}"
                                  aria-label="Select row"
                                  tabindex="-1"
                                  @click="${(e: MouseEvent) => e.stopPropagation()}"
                                  @change="${() => {
                                    if (!isDisabled.value) ctrl.toggleRow(key);
                                  }}"></ore-checkbox>
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
                                <ore-button
                                  class="dg-expand-btn"
                                  variant="ghost"
                                  size="sm"
                                  icon-only
                                  :label="${() => (expandedKeys.value.has(key) ? 'Collapse row' : 'Expand row')}"
                                  :aria-expanded="${() => String(expandedKeys.value.has(key))}"
                                  :disabled="${() => isDisabled.value || undefined}"
                                  @click="${(e: MouseEvent) => {
                                    e.stopPropagation();

                                    if (!isDisabled.value) toggleExpand(key);
                                  }}">
                                  <ore-icon
                                    :name="${() => (expandedKeys.value.has(key) ? 'chevron-up' : 'chevron-down')}"
                                    size="14"
                                    stroke-width="2"
                                    aria-hidden="true"></ore-icon>
                                </ore-button>
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
              ${() =>
                !(props['page-size-options'].value ?? []).length
                  ? html`<span class="dg-footer-info" dir="ltr" aria-live="polite" aria-atomic="true"
                      >${paginationInfo}</span
                    >`
                  : html``}
              <div class="dg-footer-end">
                ${() => {
                  const opts = props['page-size-options'].value ?? [];

                  return opts.length
                    ? html`<div class="dg-page-size-wrap">
                        <ore-select
                          class="dg-page-size-select"
                          fullwidth
                          aria-label="Rows per page"
                          :value="${() => String(pageSize.value)}"
                          :options="${() => opts.map((n) => ({ label: String(n), value: String(n) }))}"
                          :disabled="${() => isDisabled.value || undefined}"
                          @change="${(e: CustomEvent<{ values: string[] }>) => {
                            const n = parseInt(e.detail.values[0], 10);

                            if (!isNaN(n)) {
                              pageSize.value = n;
                              ctrl.goToPage(0);
                              emit('page-change', { pageIndex: 0, pageSize: n });
                            }
                          }}"></ore-select>
                      </div>`
                    : html``;
                }}
                <div class="dg-pagination" role="group" aria-label="Page navigation">
                  <ore-button
                    class="dg-page-btn"
                    variant="ghost"
                    size="sm"
                    icon-only
                    label="Previous page"
                    :disabled="${() => !effectiveHasPrev.value || isDisabled.value}"
                    @click="${() => handlePage('prev')}">
                    <ore-icon name="chevron-left" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
                  </ore-button>
                  <span
                    class="dg-page-label"
                    dir="ltr"
                    aria-current="page"
                    role="status"
                    aria-live="polite"
                    aria-atomic="true">
                    ${() => effectivePageLabel.value}
                  </span>
                  <ore-button
                    class="dg-page-btn"
                    variant="ghost"
                    size="sm"
                    icon-only
                    label="Next page"
                    :disabled="${() => !effectiveHasNext.value || isDisabled.value}"
                    @click="${() => handlePage('next')}">
                    <ore-icon name="chevron-right" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
                  </ore-button>
                </div>
              </div>
            </div>`
          : html``}
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [tableBaseMixin('datagrid'), componentStyles],
});
