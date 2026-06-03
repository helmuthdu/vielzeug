import { computed, define, html, prop, signal } from '@vielzeug/craft';

import type { ComponentSize, ThemeColor } from '../../shared';

import '../../content/icon/icon';
import { createDataGridControl, type DataGridColumn, type SelectionMode, type SortDirection, type SortState } from '../../headless';
import { disablableBundle, loadableBundle, sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, sizeVariantMixin } from '../../styles';
import componentStyles from './datagrid.css?inline';

// ── Types ──────────────────────────────────────────────────────────────────────

export type BitDataGridEvents<T = Record<string, unknown>> = {
  /** Fired when row selection changes. */
  'selection-change': { keys: string[]; rows: T[] };
  /** Fired when the sort column or direction changes. */
  'sort-change': { direction: SortDirection; key: string };
  /** Fired when the active page changes. */
  'page-change': { pageIndex: number; pageSize: number };
};

export type BitDataGridProps<T = Record<string, unknown>> = {
  /** Theme color applied to selected rows and sort icons. */
  color?: ThemeColor;
  /**
   * Column definitions. Pass as a JS property.
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
  /**
   * Row data. Pass as a JS property.
   * @example
   * ```js
   * grid.rows = [{ id: '1', name: 'Alice', email: 'alice@example.com' }];
   * ```
   */
  rows?: T[];
  /**
   * Function that returns a unique string key per row.
   * Defaults to `(row) => row['id']`.
   */
  getRowKey?: (row: T) => string;
  /** Show a busy/loading state with reduced opacity. */
  loading?: boolean;
  /** Text shown when there are no rows. */
  'empty-text'?: string;
  /** Number of rows per page. Defaults to 10. Disable pagination when set to 0. */
  'page-size'?: number;
  /** Row selection mode. */
  'selection-mode'?: SelectionMode;
  /** Component size. */
  size?: ComponentSize;
  /** Apply alternating row backgrounds. */
  striped?: boolean;
  /** Accessible label for the grid. Recommended for screen readers. */
  label?: string;
};

/**
 * An accessible, keyboard-navigable data grid with sorting, pagination,
 * and single/multi row selection.
 *
 * @element bit-datagrid
 *
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} disabled - Disable all interaction
 * @attr {boolean} loading - Show busy/loading state
 * @attr {boolean} striped - Apply alternating row backgrounds
 * @attr {number} page-size - Rows per page (0 = no pagination, default 10)
 * @attr {string} selection-mode - Row selection: 'none' | 'single' | 'multi'
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
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...loadableBundle,
    columns: prop.json([] as DataGridColumn[]),
    rows: prop.json([] as Record<string, unknown>[]),
    getRowKey: prop.json(undefined as ((row: Record<string, unknown>) => string) | undefined),
    'empty-text': prop.string('No data'),
    'page-size': prop.json(10 as number),
    'selection-mode': prop.string<SelectionMode>('none'),
    striped: prop.bool(false),
    label: prop.string(),
  },

  setup(props, { emit }) {
    const isDisabled = computed(() => props.disabled.value === true);
    const selectionMode = computed(() => props['selection-mode'].value ?? 'none');
    const pageSize = computed(() => {
      const ps = props['page-size'].value;

      return typeof ps === 'number' ? ps : 10;
    });

    // ── Version counter — invalidates ctrl-derived reads on mutation ──────────

    const version = signal(0);

    function bump(): void {
      version.value++;
    }

    // ── Headless control ──────────────────────────────────────────────────────

    const ctrl = createDataGridControl({
      columns: () => (props.columns.value as DataGridColumn[]) ?? [],  
      getItems: () => (props.rows.value as Record<string, unknown>[]) ?? [],
      getRowKey: (item) => {
        const keyFn = props.getRowKey.value as ((row: Record<string, unknown>) => string) | undefined;

        if (keyFn) return keyFn(item);

        return String(item['id'] ?? JSON.stringify(item));
      },
      onSelectionChange: (keys: Set<string>) => {
        bump();
        const allRows = (props.rows.value as Record<string, unknown>[]) ?? [];
        const rows = allRows.filter((r) => {
          const keyFn = props.getRowKey.value as ((row: Record<string, unknown>) => string) | undefined;
          const k = keyFn ? keyFn(r) : String(r['id'] ?? JSON.stringify(r));

          return keys.has(k);
        });

        emit('selection-change', { keys: [...keys], rows: rows as Record<string, unknown>[] });
      },
      onSortChange: (sort: SortState) => {
        bump();
        emit('sort-change', sort);
      },
      get pageSize() {
        return pageSize.value;
      },
      get selectionMode() {
        return selectionMode.value;
      },
    });

    // ── Derived state (version-gated) ─────────────────────────────────────────

    const pageItems = computed(() => {
      void version.value;
      void (props.rows.value);

      return ctrl.currentPageItems;
    });

    const pageCount = computed(() => {
      void version.value;
      void (props.rows.value);

      return ctrl.pageCount;
    });

    const pageIndex = computed(() => {
      void version.value;

      return ctrl.pageIndex;
    });

    const columns = computed(() => (props.columns.value as DataGridColumn[]) ?? []);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const resolveKey = (item: Record<string, unknown>): string => {
      const keyFn = props.getRowKey.value as ((row: Record<string, unknown>) => string) | undefined;

      if (keyFn) return keyFn(item);

      return String(item['id'] ?? JSON.stringify(item));
    };

    const getCellValue = (col: DataGridColumn, item: Record<string, unknown>): string => {
      if (col.cell) return col.cell(item);

      const v = item[col.key];

      return v == null ? '' : String(v);
    };

    // ── Pagination helpers ────────────────────────────────────────────────────

    function handlePrev(): void {
      ctrl.prevPage();
      bump();
      emit('page-change', { pageIndex: ctrl.pageIndex, pageSize: pageSize.value });
    }

    function handleNext(): void {
      ctrl.nextPage();
      bump();
      emit('page-change', { pageIndex: ctrl.pageIndex, pageSize: pageSize.value });
    }

    // ── Sort icon ─────────────────────────────────────────────────────────────

    const sortIconName = (key: string): string => {
      const { direction, key: sortKey } = ctrl.sortState;

      if (sortKey !== key || direction === 'none') return 'chevrons-up-down';
      if (direction === 'asc') return 'chevron-up';

      return 'chevron-down';
    };

    const ariaSortValue = (key: string): 'ascending' | 'descending' | 'none' => {
      const { direction, key: sortKey } = ctrl.sortState;

      if (sortKey !== key || direction === 'none') return 'none';

      return direction === 'asc' ? 'ascending' : 'descending';
    };

    // ── Pagination info text ──────────────────────────────────────────────────

    const paginationEnabled = computed(() => pageSize.value > 0);

    const paginationInfo = computed(() => {
      void version.value;
      void (props.rows.value);

      const total = ctrl.totalItems;

      if (!paginationEnabled.value) return `${total} row${total !== 1 ? 's' : ''}`;

      const start = pageIndex.value * pageSize.value + 1;
      const end = Math.min(start + pageSize.value - 1, total);

      return `${start}–${end} of ${total}`;
    });

    // ── Template ──────────────────────────────────────────────────────────────

    return html`
      <div
        class="dg-scroll"
        role="presentation">
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
                      aria-label="Select all rows">
                      <input
                        type="checkbox"
                        :aria-checked="${() => {
                          void version.value;

                          return ctrl.isAllSelected() ? 'true' : 'false';
                        }}"
                        :checked="${() => {
                          void version.value;

                          return ctrl.isAllSelected();
                        }}"
                        ?disabled="${isDisabled}"
                        aria-label="Select all rows on this page"
                        @change="${() => {
                          if (!isDisabled.value) {
                            ctrl.selectAll();
                            bump();
                          }
                        }}" />
                    </th>`
                  : html``}
              ${() =>
                columns.value.map((col: DataGridColumn) =>
                  col.sortable
                    ? html`<th
                        class="dg-th"
                        role="columnheader"
                        scope="col"
                        tabindex="${() => (isDisabled.value ? '-1' : '0')}"
                        :aria-sort="${() => {
                          void version.value;

                          return ariaSortValue(col.key);
                        }}"
                        :aria-label="${col.headerLabel ?? col.label}"
                        :style="${col.width ? `width:${col.width}` : ''}"
                        @click="${() => {
                          if (!isDisabled.value) {
                            ctrl.sortBy(col.key);
                            bump();
                          }
                        }}"
                        @keydown="${(e: KeyboardEvent) => {
                          if ((e.key === 'Enter' || e.key === ' ') && !isDisabled.value) {
                            e.preventDefault();
                            ctrl.sortBy(col.key);
                            bump();
                          }
                        }}">
                        <span class="dg-th-inner">
                          ${col.label}
                          <span class="dg-sort-icon" aria-hidden="true">
                            <bit-icon
                              :name="${() => {
                                void version.value;

                                return sortIconName(col.key);
                              }}"
                              size="14"
                              stroke-width="2"></bit-icon>
                          </span>
                        </span>
                      </th>`
                    : html`<th
                        class="dg-th"
                        role="columnheader"
                        scope="col"
                        :aria-label="${col.headerLabel ?? col.label}"
                        :style="${col.width ? `width:${col.width}` : ''}">
                        ${col.label}
                      </th>`,
                )}
            </tr>
          </thead>

          <!-- Body -->
          <tbody class="dg-body" part="tbody">
            ${() =>
              pageItems.value.length === 0
                ? html`<tr role="row">
                    <td
                      class="dg-empty"
                      role="gridcell"
                      :colspan="${() => String(columns.value.length + (selectionMode.value === 'multi' ? 1 : 0))}">
                      ${() => props['empty-text'].value ?? 'No data'}
                    </td>
                  </tr>`
                : pageItems.value.map((item: Record<string, unknown>) => {
                    const key = resolveKey(item);
                    const isSelectable = selectionMode.value !== 'none' && !isDisabled.value;

                    return html`<tr
                      class="dg-tr"
                      part="row"
                      role="row"
                      :aria-selected="${() => {
                        void version.value;

                        return selectionMode.value !== 'none' ? String(ctrl.isSelected(key)) : null;
                      }}"
                      ?data-selectable="${isSelectable}"
                      ?data-disabled="${isDisabled}"
                      tabindex="${isSelectable ? '0' : '-1'}"
                      @click="${() => {
                        if (isSelectable) {
                          ctrl.toggleRow(key);
                          bump();
                        }
                      }}"
                      @keydown="${(e: KeyboardEvent) => {
                        if ((e.key === 'Enter' || e.key === ' ') && isSelectable) {
                          e.preventDefault();
                          ctrl.toggleRow(key);
                          bump();
                        }
                      }}">
                      ${() =>
                        selectionMode.value === 'multi'
                          ? html`<td class="dg-td dg-td-check" role="gridcell">
                              <input
                                type="checkbox"
                                :checked="${() => {
                                  void version.value;

                                  return ctrl.isSelected(key);
                                }}"
                                ?disabled="${isDisabled}"
                                aria-label="Select row"
                                tabindex="-1"
                                @click="${(e: MouseEvent) => e.stopPropagation()}"
                                @change="${() => {
                                  if (!isDisabled.value) {
                                    ctrl.toggleRow(key);
                                    bump();
                                  }
                                }}" />
                            </td>`
                          : html``}
                      ${columns.value.map(
                        (col: DataGridColumn) =>
                          html`<td
                            class="dg-td"
                            part="cell"
                            role="gridcell"
                            :title="${getCellValue(col, item as Record<string, unknown>)}">
                            ${getCellValue(col, item as Record<string, unknown>)}
                          </td>`,
                      )}
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
              <div class="dg-pagination" role="group" aria-label="Page navigation">
                <button
                  class="dg-page-btn"
                  type="button"
                  aria-label="Previous page"
                  ?disabled="${() => {
                    void version.value;

                    return !ctrl.hasPrevPage || isDisabled.value;
                  }}"
                  @click="${handlePrev}">
                  <bit-icon name="chevron-left" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
                </button>
                <span class="dg-page-label" aria-current="page">
                  ${() => {
                    void version.value;

                    return `${pageIndex.value + 1} / ${pageCount.value}`;
                  }}
                </span>
                <button
                  class="dg-page-btn"
                  type="button"
                  aria-label="Next page"
                  ?disabled="${() => {
                    void version.value;

                    return !ctrl.hasNextPage || isDisabled.value;
                  }}"
                  @click="${handleNext}">
                  <bit-icon name="chevron-right" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
                </button>
              </div>
            </div>`
          : html``}
    `;
  },

  shadow: { delegatesFocus: true },
  styles: [colorThemeMixin, sizeVariantMixin(), componentStyles],
});
