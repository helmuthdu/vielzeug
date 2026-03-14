import { css, define, defineProps, effect, html, observeResize, onMount } from '@vielzeug/craftit';

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

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      --_cols: var(--grid-cols, repeat(auto-fit, minmax(250px, 1fr)));
      --_rows: var(--grid-rows, auto);
      --_gap: var(--grid-gap, var(--size-4));
      --_row-gap: var(--grid-row-gap, var(--_gap));
      --_col-gap: var(--grid-col-gap, var(--_gap));

      display: grid;
      grid-template-columns: var(--_cols);
      grid-template-rows: var(--_rows);
      row-gap: var(--_row-gap);
      column-gap: var(--_col-gap);
      grid-auto-flow: row;
    }

    :host([gap='none']) {
      --_row-gap: 0;
      --_col-gap: 0;
    }
    :host([gap='xs']) {
      --_row-gap: var(--size-1);
      --_col-gap: var(--size-1);
    }
    :host([gap='sm']) {
      --_row-gap: var(--size-2);
      --_col-gap: var(--size-2);
    }
    :host([gap='md']) {
      --_row-gap: var(--size-4);
      --_col-gap: var(--size-4);
    }
    :host([gap='lg']) {
      --_row-gap: var(--size-6);
      --_col-gap: var(--size-6);
    }
    :host([gap='xl']) {
      --_row-gap: var(--size-8);
      --_col-gap: var(--size-8);
    }
    :host([gap='2xl']) {
      --_row-gap: var(--size-12);
      --_col-gap: var(--size-12);
    }

    :host([align='start']) {
      align-items: start;
    }
    :host([align='center']) {
      align-items: center;
    }
    :host([align='end']) {
      align-items: end;
    }
    :host([align='stretch']) {
      align-items: stretch;
    }
    :host([align='baseline']) {
      align-items: baseline;
    }

    :host([justify='start']) {
      justify-items: start;
    }
    :host([justify='center']) {
      justify-items: center;
    }
    :host([justify='end']) {
      justify-items: end;
    }
    :host([justify='stretch']) {
      justify-items: stretch;
    }

    :host([flow='row']) {
      grid-auto-flow: row;
    }
    :host([flow='column']) {
      grid-auto-flow: column;
    }
    :host([flow='row-dense']) {
      grid-auto-flow: row dense;
    }
    :host([flow='column-dense']) {
      grid-auto-flow: column dense;
    }
  }
`;

type ColCount = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'auto';

/** Grid component properties */
export interface GridProps {
  /** Number of columns: '1'-'12' | 'auto' */
  cols?: ColCount;
  /** Columns at sm breakpoint (≥640px) */
  colsSm?: ColCount;
  /** Columns at md breakpoint (≥768px) */
  colsMd?: ColCount;
  /** Columns at lg breakpoint (≥1024px) */
  colsLg?: ColCount;
  /** Columns at xl breakpoint (≥1280px) */
  colsXl?: ColCount;
  /** Columns at 2xl breakpoint (≥1536px) */
  cols2xl?: ColCount;
  /** Number of rows: '1'-'12' | 'auto' */
  rows?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'auto';
  /** Gap between items */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Align items vertically */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Justify items horizontally */
  justify?: 'start' | 'center' | 'end' | 'stretch';
  /** Grid auto flow direction */
  flow?: 'row' | 'column' | 'row-dense' | 'column-dense';
  /** Use auto-fit responsive columns */
  responsive?: boolean;
  /** Minimum column width for responsive mode (default: 250px) */
  minColWidth?: string;
  /** CSS grid-template-areas value */
  areas?: string;
  /** grid-template-areas at sm breakpoint (≥640px) */
  areasSm?: string;
  /** grid-template-areas at md breakpoint (≥768px) */
  areasMd?: string;
  /** grid-template-areas at lg breakpoint (≥1024px) */
  areasLg?: string;
  /** grid-template-areas at xl breakpoint (≥1280px) */
  areasXl?: string;
  /** grid-template-areas at 2xl breakpoint (≥1536px) */
  areas2xl?: string;
}

/**
 * bit-grid — Flexible grid layout with responsive column control.
 *
 * Columns are computed in JS and applied as `--_cols` inline, so they respond
 * to the element's own width via ResizeObserver. CSS custom properties
 * `--grid-cols`, `--grid-rows`, `--grid-gap`, `--grid-row-gap`, `--grid-col-gap`
 * are honoured as fallbacks when no attribute is set.
 *
 * @element bit-grid
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
 * @attr {string} min-col-width - Min column width for responsive mode (default: 250px)
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
 * @cssprop --grid-rows - Fallback row template
 * @cssprop --grid-gap - Fallback gap
 * @cssprop --grid-row-gap - Fallback row gap
 * @cssprop --grid-col-gap - Fallback column gap
 *
 * @example
 * <bit-grid cols="1" cols-sm="2" cols-lg="4" gap="md">
 *   <div>Item</div>
 * </bit-grid>
 *
 * @example
 * <!-- Responsive auto-fit -->
 * <bit-grid responsive min-col-width="200px" gap="sm">
 *   <div>Card</div>
 * </bit-grid>
 *
 * @example
 * <!-- Named grid areas -->
 * <bit-grid cols="2" rows="2" areas="'header header' 'nav main'">
 *   <header style="grid-area: header">Header</header>
 *   <nav style="grid-area: nav">Nav</nav>
 *   <main style="grid-area: main">Main</main>
 * </bit-grid>
 */
export const TAG = define('bit-grid', ({ host }) => {
  const props = defineProps<GridProps>({
    align: { default: undefined },
    areas: { default: '' },
    areas2xl: { default: '' },
    areasLg: { default: '' },
    areasMd: { default: '' },
    areasSm: { default: '' },
    areasXl: { default: '' },
    cols: { default: undefined },
    cols2xl: { default: undefined },
    colsLg: { default: undefined },
    colsMd: { default: undefined },
    colsSm: { default: undefined },
    colsXl: { default: undefined },
    flow: { default: undefined },
    gap: { default: undefined },
    justify: { default: undefined },
    minColWidth: { default: '' },
    responsive: { default: false },
    rows: { default: undefined },
  });

  const computeCols = (activeCols: string | undefined, responsive: boolean, minW: string): string | null => {
    if (activeCols === 'auto' || (!activeCols && responsive)) {
      return `repeat(auto-fit, minmax(${minW || '250px'}, 1fr))`;
    }

    return activeCols ? `repeat(${activeCols}, 1fr)` : null;
  };

  const updateCols = () => {
    const w = host.offsetWidth;
    const responsive = props.responsive.value;
    const minW = props.minColWidth.value;

    let activeCols: string | undefined;

    for (const [key, cssVar] of BREAKPOINTS) {
      if (w >= resolveBp(host, cssVar, BP_FALLBACKS[cssVar]) && props[key].value) {
        activeCols = props[key].value!;
        break;
      }
    }
    activeCols ||= props.cols.value || undefined;

    const colsValue = computeCols(activeCols, responsive, minW);

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    colsValue ? host.style.setProperty('--_cols', colsValue) : host.style.removeProperty('--_cols');
  };

  // Re-run cols whenever any responsive prop changes
  effect(() => {
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
    const w = host.offsetWidth;
    let active = '';

    for (const [key, cssVar] of AREAS_BREAKPOINTS) {
      if (w >= resolveBp(host, cssVar, BP_FALLBACKS[cssVar]) && props[key].value) {
        active = props[key].value!;
        break;
      }
    }
    active ||= props.areas.value || '';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    active ? host.style.setProperty('grid-template-areas', active) : host.style.removeProperty('grid-template-areas');
  };

  // Also, update on element resize (drives breakpoint switching)
  onMount(() => {
    const size = observeResize(host);

    effect(() => {
      void size.value;
      updateCols();
      updateAreas();
    });
  });

  // Rows
  effect(() => {
    const rows = props.rows.value;

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    rows && rows !== 'auto'
      ? host.style.setProperty('--_rows', `repeat(${rows}, 1fr)`)
      : host.style.removeProperty('--_rows');
  });

  // Grid template areas (responsive)
  effect(() => {
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

  return {
    styles: [styles],
    template: html`<slot></slot>`,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-grid': HTMLElement & GridProps;
  }
}
