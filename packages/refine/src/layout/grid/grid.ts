import { define, getHost, html, onCleanup, onMounted, prop, watchEffect } from '@vielzeug/ore';
import { fromSubscribable } from '@vielzeug/ripple';
import { createElementSize } from '@vielzeug/sentinel';

import styles from './grid.css?inline';

const BREAKPOINTS: ['cols2xl' | 'colsXl' | 'colsLg' | 'colsMd' | 'colsSm', string][] = [
  ['cols2xl', '--size-screen-2xl'],
  ['colsXl', '--size-screen-xl'],
  ['colsLg', '--size-screen-lg'],
  ['colsMd', '--size-screen-md'],
  ['colsSm', '--size-screen-sm'],
];

const AREAS_BREAKPOINTS: ['areas2xl' | 'areasXl' | 'areasLg' | 'areasMd' | 'areasSm', string][] = [
  ['areas2xl', '--size-screen-2xl'],
  ['areasXl', '--size-screen-xl'],
  ['areasLg', '--size-screen-lg'],
  ['areasMd', '--size-screen-md'],
  ['areasSm', '--size-screen-sm'],
];

const resolveBp = (host: HTMLElement, varName: string, fallback: number): number => {
  const raw = getComputedStyle(host).getPropertyValue(varName).trim();
  const parsed = Number.parseFloat(raw);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const BP_FALLBACKS: Record<string, number> = {
  '--size-screen-2xl': 1536,
  '--size-screen-lg': 1024,
  '--size-screen-md': 768,
  '--size-screen-sm': 640,
  '--size-screen-xl': 1280,
};

const COL_COUNTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'auto'] as const;
const GRID_ALIGNMENTS = ['start', 'center', 'end', 'stretch', 'baseline'] as const;
const GRID_FLOWS = ['row', 'column', 'row-dense', 'column-dense'] as const;
const GRID_GAPS = ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const GRID_JUSTIFICATIONS = ['start', 'center', 'end', 'stretch'] as const;

type ColCount = (typeof COL_COUNTS)[number];

/** Grid component properties */
export type OreGridProps = {
  /** Align items vertically */
  align?: (typeof GRID_ALIGNMENTS)[number];
  /** CSS grid-template-areas value */
  areas?: string;
  /** grid-template-areas at 2xl breakpoint (≥1536px) */
  areas2xl?: string;
  /** grid-template-areas at lg breakpoint (≥1024px) */
  areasLg?: string;
  /** grid-template-areas at md breakpoint (≥768px) */
  areasMd?: string;
  /** grid-template-areas at sm breakpoint (≥640px) */
  areasSm?: string;
  /** grid-template-areas at xl breakpoint (≥1280px) */
  areasXl?: string;
  /** Number of columns: '1'-'12' | 'auto' */
  cols?: ColCount;
  /** Columns at 2xl breakpoint (≥1536px) */
  cols2xl?: ColCount;
  /** Columns at lg breakpoint (≥1024px) */
  colsLg?: ColCount;
  /** Columns at md breakpoint (≥768px) */
  colsMd?: ColCount;
  /** Columns at sm breakpoint (≥640px) */
  colsSm?: ColCount;
  /** Columns at xl breakpoint (≥1280px) */
  colsXl?: ColCount;
  /** Grid auto flow direction */
  flow?: (typeof GRID_FLOWS)[number];
  /** Stretch the grid to fill its container's full width */
  fullwidth?: boolean;
  /** Gap between items */
  gap?: (typeof GRID_GAPS)[number];
  /** Justify items horizontally */
  justify?: (typeof GRID_JUSTIFICATIONS)[number];
  /** Minimum column width for responsive mode (default: var(--grid-min-item-width)) */
  minColWidth?: string;
  /** Use auto-fit responsive columns */
  responsive?: boolean;
  /** Number of rows: '1'-'12' | 'auto' */
  rows?: ColCount;
};

/**
 * ore-grid: Flexible grid layout with responsive column control.
 *
 * The grid is container-responsive: `cols-*` breakpoints compare against the
 * element's own width (measured with a ResizeObserver), not the viewport, so a
 * narrow grid in a sidebar gets its mobile layout even on a wide screen.
 * Breakpoint thresholds come from the `--size-screen-*` tokens. Fixed counts
 * resolve through the `--grid-1`–`--grid-12` tokens; the responsive floor uses
 * `--grid-min-item-width`. CSS custom properties `--grid-cols`, `--grid-rows`,
 * `--grid-gap`, `--grid-row-gap`, `--grid-col-gap` are honoured as fallbacks
 * when no attribute is set.
 *
 * @element ore-grid
 *
 * @attr {string} cols - Column count: '1'–'12' | 'auto'
 * @attr {string} cols-sm - Columns when width ≥ 640px
 * @attr {string} cols-md - Columns when width ≥ 768px
 * @attr {string} cols-lg - Columns when width ≥ 1024px
 * @attr {string} cols-xl - Columns when width ≥ 1280px
 * @attr {string} cols-2xl - Columns when width ≥ 1536px
 * @attr {string} rows - Row count: '1'–'12' | 'auto'
 * @attr {string} gap - Gap token: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * @attr {string} align - align-items: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
 * @attr {string} justify - justify-items: 'start' | 'center' | 'end' | 'stretch'
 * @attr {string} flow - grid-auto-flow: 'row' | 'column' | 'row-dense' | 'column-dense'
 * @attr {boolean} responsive - Enables auto-fit columns without a fixed count
 * @attr {string} min-col-width - Min column width for responsive mode (default: var(--grid-min-item-width))
 * @attr {boolean} fullwidth - Stretch the grid to fill its container's full width
 * @attr {string} areas - CSS grid-template-areas value (e.g. "'header header' 'nav main'")
 * @attr {string} areas-sm - grid-template-areas when width ≥ 640px
 * @attr {string} areas-md - grid-template-areas when width ≥ 768px
 * @attr {string} areas-lg - grid-template-areas when width ≥ 1024px
 * @attr {string} areas-xl - grid-template-areas when width ≥ 1280px
 * @attr {string} areas-2xl - grid-template-areas when width ≥ 1536px
 *
 * @slot - Grid items
 *
 * @cssprop --grid-cols - Fallback column template (used when no cols attr is set)
 * @cssprop --grid-min-item-width - Floor for auto-fit column width (default: 250px)
 * @cssprop --grid-rows - Fallback row template
 * @cssprop --grid-gap - Fallback gap
 * @cssprop --grid-row-gap - Fallback row gap
 * @cssprop --grid-col-gap - Fallback column gap
 *
 * @example
 * <ore-grid cols="1" cols-sm="2" cols-lg="4" gap="md">
 *   <div>Item</div>
 * </ore-grid>
 *
 * @example
 * <!-- Responsive auto-fit -->
 * <ore-grid responsive min-col-width="200px" gap="sm">
 *   <div>Card</div>
 * </ore-grid>
 *
 * @example
 * <!-- Named grid areas -->
 * <ore-grid cols="2" rows="2" areas="'header header' 'nav main'">
 *   <header style="grid-area: header">Header</header>
 *   <nav style="grid-area: nav">Nav</nav>
 *   <main style="grid-area: main">Main</main>
 * </ore-grid>
 */
export const GRID_TAG = 'ore-grid' as const;
define<OreGridProps>(GRID_TAG, {
  props: {
    align: prop.oneOf(GRID_ALIGNMENTS),
    areas: prop.string(),
    areas2xl: prop.string(),
    areasLg: prop.string(),
    areasMd: prop.string(),
    areasSm: prop.string(),
    areasXl: prop.string(),
    cols: prop.oneOf(COL_COUNTS),
    cols2xl: prop.oneOf(COL_COUNTS),
    colsLg: prop.oneOf(COL_COUNTS),
    colsMd: prop.oneOf(COL_COUNTS),
    colsSm: prop.oneOf(COL_COUNTS),
    colsXl: prop.oneOf(COL_COUNTS),
    flow: prop.oneOf(GRID_FLOWS),
    fullwidth: prop.bool(false),
    gap: prop.oneOf(GRID_GAPS),
    justify: prop.oneOf(GRID_JUSTIFICATIONS),
    minColWidth: prop.string(),
    responsive: prop.bool(false),
    rows: prop.oneOf(COL_COUNTS),
  },

  setup(props) {
    const el = getHost();
    const watch = watchEffect;

    const computeCols = (activeCols: string | undefined, responsive: boolean, minW: string): string | null => {
      if (activeCols === 'auto' || (!activeCols && responsive)) {
        const min = minW || 'var(--grid-min-item-width)';
        return `repeat(auto-fit, minmax(${min}, 1fr))`;
      }

      // Fixed counts resolve through the --grid-N theme tokens so a theme can
      // redefine the track sizing (e.g. bleed-aware fractions) globally.
      return activeCols ? `var(--grid-${activeCols}, repeat(${activeCols}, 1fr))` : null;
    };
    const updateCols = () => {
      const w = el.offsetWidth;
      const responsive = Boolean(props.responsive.value);
      const minW = props.minColWidth.value ?? '';
      let activeCols: string | undefined;

      for (const [key, cssVar] of BREAKPOINTS) {
        if (w >= resolveBp(el, cssVar, BP_FALLBACKS[cssVar]) && props[key].value) {
          activeCols = props[key].value!;
          break;
        }
      }
      activeCols ||= props.cols.value || undefined;

      const colsValue = computeCols(activeCols, responsive, minW);

      if (colsValue) {
        el.style.setProperty('--_cols', colsValue);
      } else {
        el.style.removeProperty('--_cols');
      }
    };

    // Re-run cols whenever any responsive prop changes
    watch(() => {
      void [
        props.cols.value,
        props.colsSm.value,
        props.colsMd.value,
        props.colsLg.value,
        props.colsXl.value,
        props.cols2xl.value,
        props.responsive.value,
        props.minColWidth.value,
      ];
      updateCols();
    });

    const updateAreas = () => {
      const w = el.offsetWidth;
      let active = '';

      for (const [key, cssVar] of AREAS_BREAKPOINTS) {
        if (w >= resolveBp(el, cssVar, BP_FALLBACKS[cssVar]) && props[key].value) {
          active = props[key].value!;
          break;
        }
      }
      active ||= props.areas.value || '';

      if (active) {
        el.style.setProperty('grid-template-areas', active);
      } else {
        el.style.removeProperty('grid-template-areas');
      }
    };

    // Rows
    watch(() => {
      const rows = props.rows.value;

      if (rows && rows !== 'auto') {
        el.style.setProperty('--_rows', `repeat(${rows}, 1fr)`);
      } else {
        el.style.removeProperty('--_rows');
      }
    });
    // Grid template areas (responsive)
    watch(() => {
      void [
        props.areas.value,
        props.areasSm.value,
        props.areasMd.value,
        props.areasLg.value,
        props.areasXl.value,
        props.areas2xl.value,
      ];
      updateAreas();
    });

    // Also, update on element resize (drives breakpoint switching)
    onMounted(() => {
      const size = createElementSize(el);

      onCleanup(() => size.dispose());

      const sizeSignal = fromSubscribable(size, { signal: size.disposalSignal });

      watch(() => {
        const dims = sizeSignal.value;
        if (dims) {
          updateCols();
          updateAreas();
        }
      });
    });

    return html`
      <slot></slot>
    `;
  },

  styles: [styles],
});
