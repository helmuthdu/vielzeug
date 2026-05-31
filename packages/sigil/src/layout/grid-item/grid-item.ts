import { computed, define, html, prop } from '@vielzeug/craft';

import styles from './grid-item.css?inline';

/** Grid item component properties */
export type BitGridItemProps = {
  /** Align self vertically within the grid cell */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Named grid area to place the item into. */
  area?: string;
  /** Explicit grid-column value — overrides col-span (e.g. '2 / 5', 'span 3', '1 / -1'). */
  col?: string;
  /** Span N columns. Use 'full' to span all columns (1 / -1). */
  colSpan?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'full';
  /** Justify self horizontally within the grid cell */
  justify?: 'start' | 'center' | 'end' | 'stretch';
  /** Explicit grid-row value — overrides row-span (e.g. '1 / 3', 'span 2'). */
  row?: string;
  /** Span N rows. Use 'full' to span all rows (1 / -1). */
  rowSpan?: '1' | '2' | '3' | '4' | '5' | '6' | 'full';
};

/**
 * bit-grid-item — A grid cell with declarative placement and span control.
 *
 * Use `col-span` / `row-span` for the common case of spanning columns/rows.
 * Use `col` / `row` for full CSS grid-column / grid-row shorthand power
 * (e.g. explicit placement, mixed span + start, negative lines).
 *
 * @element bit-grid-item
 *
 * @attr {string} area - CSS grid-area value for named-area placement
 * @attr {string} col-span - Columns to span: '1'–'12' | 'full'
 * @attr {string} row-span - Rows to span: '1'–'6' | 'full'
 * @attr {string} col - CSS grid-column value (overrides col-span)
 * @attr {string} row - CSS grid-row value (overrides row-span)
 * @attr {string} align - align-self: 'start' | 'center' | 'end' | 'stretch'
 * @attr {string} justify - justify-self: 'start' | 'center' | 'end' | 'stretch'
 *
 * @slot - Grid item content
 *
 * @example
 * <!-- Span 2 columns -->
 * <bit-grid-item col-span="2">Wide</bit-grid-item>
 *
 * @example
 * <!-- Full-width row -->
 * <bit-grid-item col-span="full">Banner</bit-grid-item>
 *
 * @example
 * <!-- Named area placement -->
 * <bit-grid-item area="sidebar">Nav</bit-grid-item>
 *
 * @example
 * <!-- Explicit placement -->
 * <bit-grid-item col="2 / 5" row="1 / 3">Placed</bit-grid-item>
 */
export const GRID_ITEM_TAG = 'bit-grid-item' as const;
define<BitGridItemProps>(GRID_ITEM_TAG, {
  props: {
    align: prop.string<'start' | 'center' | 'end' | 'stretch'>(),
    area: prop.string(),
    col: prop.string(),
    colSpan: prop.string<'1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'full'>(),
    justify: prop.string<'start' | 'center' | 'end' | 'stretch'>(),
    row: prop.string(),
    rowSpan: prop.string<'1' | '2' | '3' | '4' | '5' | '6' | 'full'>(),
  },
  setup(props, { bind, el: _el }) {
    const gridColumn = computed(() => {
      const col = props.col.value;
      const span = props.colSpan.value;

      if (col) return col;

      if (span === 'full') return '1 / -1';

      if (span) return `span ${span}`;

      return '';
    });

    const gridRow = computed(() => {
      const row = props.row.value;
      const span = props.rowSpan.value;

      if (row) return row;

      if (span === 'full') return '1 / -1';

      if (span) return `span ${span}`;

      return '';
    });

    bind({
      style: {
        gridArea: props.area,
        gridColumn,
        gridRow,
      },
    });

    return html`<slot></slot>`;
  },
  styles: [styles],
});
