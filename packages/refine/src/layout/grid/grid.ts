import { define, getHost, html, onCleanup, onMounted, prop, watchEffect } from '@vielzeug/ore';
import { fromSubscribable } from '@vielzeug/ripple';
import { createElementSize } from '@vielzeug/sentinel';

import styles from './grid.css?inline';

const BREAKPOINTS = [
  { area: 'areas2xl', cols: 'cols2xl', fallback: 1536, token: '--size-screen-2xl' },
  { area: 'areasXl', cols: 'colsXl', fallback: 1280, token: '--size-screen-xl' },
  { area: 'areasLg', cols: 'colsLg', fallback: 1024, token: '--size-screen-lg' },
  { area: 'areasMd', cols: 'colsMd', fallback: 768, token: '--size-screen-md' },
  { area: 'areasSm', cols: 'colsSm', fallback: 640, token: '--size-screen-sm' },
] as const;

type ResolvedBreakpoint = (typeof BREAKPOINTS)[number] & { minWidth: number };

const resolveCssLength = (host: HTMLElement, value: string, fallback: number): number => {
  const probe = host.ownerDocument.createElement('span');

  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;height:0';
  probe.style.width = value;

  if (!probe.style.width) return fallback;

  host.append(probe);

  try {
    const resolved = Number.parseFloat(host.ownerDocument.defaultView?.getComputedStyle(probe).width ?? '');

    return Number.isFinite(resolved) ? resolved : fallback;
  } finally {
    probe.remove();
  }
};

const resolveBreakpointValue = <T extends string>(
  width: number,
  breakpoints: ResolvedBreakpoint[],
  readValue: (breakpoint: ResolvedBreakpoint) => T | undefined,
): T | undefined => {
  for (const breakpoint of breakpoints) {
    if (width >= breakpoint.minWidth) {
      const value = readValue(breakpoint);
      if (value) return value;
    }
  }

  return undefined;
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
  /** Minimum width of auto-fit columns (default: var(--grid-min-item-width)) */
  minColWidth?: string;
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
 * resolve through the `--grid-1`–`--grid-12` tokens; auto-fit columns use
 * `--grid-min-item-width` as their default floor. CSS custom properties `--grid-cols`, `--grid-rows`,
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
 * @attr {string} min-col-width - Min column width when cols="auto" (default: var(--grid-min-item-width))
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
 * @cssprop --grid-min-item-width - Floor for auto-fit columns (default: 250px)
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
 * <ore-grid cols="auto" min-col-width="200px" gap="sm">
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
    rows: prop.oneOf(COL_COUNTS),
  },

  setup(props) {
    const el = getHost();
    const updateResponsiveStyles = () => {
      const width = el.offsetWidth;
      const styles = getComputedStyle(el);
      const breakpoints: ResolvedBreakpoint[] = BREAKPOINTS.map((breakpoint) => ({
        ...breakpoint,
        minWidth: resolveCssLength(el, styles.getPropertyValue(breakpoint.token).trim(), breakpoint.fallback),
      }));
      const columns =
        resolveBreakpointValue(width, breakpoints, (breakpoint) => props[breakpoint.cols].value) ?? props.cols.value;
      if (columns === 'auto') {
        const minWidth = props.minColWidth.value || 'var(--grid-min-item-width)';
        el.style.setProperty('--_cols', `repeat(auto-fit, minmax(${minWidth}, 1fr))`);
      } else if (columns) {
        // Fixed counts resolve through theme tokens so themes can redefine track sizing.
        el.style.setProperty('--_cols', `var(--grid-${columns}, repeat(${columns}, 1fr))`);
      } else {
        el.style.removeProperty('--_cols');
      }

      const areas =
        resolveBreakpointValue(width, breakpoints, (breakpoint) => props[breakpoint.area].value) ?? props.areas.value;

      if (areas) {
        el.style.setProperty('--_areas', areas);
      } else {
        el.style.removeProperty('--_areas');
      }
    };

    watchEffect(() => {
      updateResponsiveStyles();

      const rows = props.rows.value;

      if (rows && rows !== 'auto') {
        el.style.setProperty('--_rows', `repeat(${rows}, 1fr)`);
      } else {
        el.style.removeProperty('--_rows');
      }
    });

    // Also, update on element resize (drives breakpoint switching)
    onMounted(() => {
      const size = createElementSize(el);

      onCleanup(() => size.dispose());

      const sizeSignal = fromSubscribable(size, { signal: size.disposalSignal });

      watchEffect(() => {
        const dims = sizeSignal.value;
        if (dims) {
          updateResponsiveStyles();
        }
      });
    });

    return html`
      <slot></slot>
    `;
  },

  styles: [styles],
});
