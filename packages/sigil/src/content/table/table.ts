import { define, effect, html, onMounted, prop } from '@vielzeug/craft';

import type { ComponentSize, ThemeColor } from '../../types';

import { sizableBundle, themableBundle } from '../../shared/config';
import { colorThemeMixin, reducedMotionMixin } from '../../styles';
import componentStyles from './table.css?inline';

/* ── Types ───────────────────────────────────────────────────────────────── */

/** Table component properties */
export type BitTableProps = {
  /** Show borders between rows and around the table */
  bordered?: boolean;
  /** Visible caption text — also used as accessible label for the table group */
  caption?: string;
  /** Theme color applied to the header row background */
  color?: ThemeColor;
  /** Show a loading / busy state */
  loading?: boolean;
  /** Component size: 'sm' | 'md' | 'lg' */
  size?: ComponentSize;
  /** Stick the header row to the top while the body scrolls */
  sticky?: boolean;
  /** Alternating row stripe background */
  striped?: boolean;
};

/* ── Sub-components (no shadow DOM) ─────────────────────────────────────── */

// bit-tr, bit-th, bit-td are lightweight markers in the light DOM.
// bit-table reads them and builds a fully-native shadow <table> so that
// browser features that only work on real table elements (colspan/rowspan,
// position:sticky on <th>, table layout algorithm) all work correctly.

/**
 * Light-DOM row marker consumed by `<bit-table>`.
 *
 * @element bit-tr
 *
 * @attr {boolean} head - Places the row in the generated `<thead>` section
 * @attr {boolean} foot - Places the row in the generated `<tfoot>` section
 */
class BitTableRowElement extends HTMLElement {}

if (!customElements.get('bit-tr')) customElements.define('bit-tr', BitTableRowElement);

/**
 * Light-DOM header cell marker consumed by `<bit-table>`.
 *
 * @element bit-th
 *
 * @attr {number} colspan - Mirrors to native `<th colspan>`
 * @attr {number} rowspan - Mirrors to native `<th rowspan>`
 * @attr {string} scope - Mirrors to native `<th scope>`
 * @attr {string} headers - Mirrors to native `<th headers>`
 */
class BitTableHeaderCellElement extends HTMLElement {}

if (!customElements.get('bit-th')) customElements.define('bit-th', BitTableHeaderCellElement);

/**
 * Light-DOM data cell marker consumed by `<bit-table>`.
 *
 * @element bit-td
 *
 * @attr {number} colspan - Mirrors to native `<td colspan>`
 * @attr {number} rowspan - Mirrors to native `<td rowspan>`
 * @attr {string} headers - Mirrors to native `<td headers>`
 */
class BitTableDataCellElement extends HTMLElement {}

if (!customElements.get('bit-td')) customElements.define('bit-td', BitTableDataCellElement);

export const TR_TAG = 'bit-tr';
export const TH_TAG = 'bit-th';
export const TD_TAG = 'bit-td';

/* ── Table proxy helpers ─────────────────────────────────────────────────── */

// Attributes on bit-th / bit-td that should be forwarded to the native cell.
const CELL_ATTRS = ['colspan', 'rowspan', 'scope', 'headers', 'abbr', 'axis', 'align', 'valign', 'width'];

/**
 * Build (or rebuild) the entire native shadow table from the current light-DOM
 * bit-tr / bit-th / bit-td structure.  Returns a cleanup function that
 * disconnects all MutationObservers created during the build.
 */
function buildTable(
  host: HTMLElement,
  thead: HTMLTableSectionElement,
  tbody: HTMLTableSectionElement,
  tfoot: HTMLTableSectionElement,
): () => void {
  const observers: MutationObserver[] = [];

  // Clear all sections first
  thead.textContent = '';
  tbody.textContent = '';
  tfoot.textContent = '';

  /**
   * Mirror one bit-td / bit-th → native td / th, keeping text content and
   * relevant attributes in sync via a MutationObserver.
   */
  function mirrorCell(source: Element, into: HTMLTableSectionElement | HTMLTableRowElement): HTMLTableCellElement {
    const isHeader = source.localName === 'bit-th';
    const cell = document.createElement(isHeader ? 'th' : 'td');

    // Forward allowed attributes
    for (const attr of CELL_ATTRS) {
      const val = source.getAttribute(attr);

      if (val !== null) cell.setAttribute(attr, val);
    }

    cell.textContent = source.textContent ?? '';

    // Keep text + attrs in sync
    const obs = new MutationObserver(() => {
      cell.textContent = source.textContent ?? '';
      for (const attr of CELL_ATTRS) {
        const val = source.getAttribute(attr);

        if (val !== null) cell.setAttribute(attr, val);
        else cell.removeAttribute(attr);
      }
    });

    obs.observe(source, { attributes: true, characterData: true, childList: true, subtree: true });
    observers.push(obs);

    into.appendChild(cell);

    return cell;
  }

  /**
   * Mirror one bit-tr → native tr with all its cells.
   */
  function mirrorRow(source: Element, section: HTMLTableSectionElement): void {
    const tr = document.createElement('tr');

    for (const child of source.children) {
      if (child.localName === 'bit-th' || child.localName === 'bit-td') {
        mirrorCell(child, tr);
      }
    }
    section.appendChild(tr);
  }

  // Walk all direct children of bit-table
  for (const child of host.children) {
    if (child.localName !== 'bit-tr') continue;

    if (child.hasAttribute('head')) {
      mirrorRow(child, thead);
    } else if (child.hasAttribute('foot')) {
      mirrorRow(child, tfoot);
    } else {
      mirrorRow(child, tbody);
    }
  }

  return () => {
    for (const obs of observers) obs.disconnect();
  };
}

/**
 * Data table component that projects light-DOM row/cell markers into a native shadow table.
 *
 * @element bit-table
 *
 * @attr {boolean} bordered - Enables table border and clipped rounded corners
 * @attr {string} caption - Caption text rendered above the table
 * @attr {string} color - Theme color used by header tokens
 * @attr {boolean} loading - Applies busy state and disables pointer interaction
 * @attr {string} size - Cell density variant: `sm` | `md` | `lg`
 * @attr {boolean} sticky - Enables sticky table header with vertical scrolling
 * @attr {boolean} striped - Enables alternating row stripe backgrounds
 *
 * @slot - One or more `<bit-tr>` rows containing `<bit-th>`/`<bit-td>` markers
 *
 * @part scroll - Scroll container that hosts the generated native table
 * @part table - Generated native `<table>` element
 * @part head - Generated native `<thead>` section
 * @part body - Generated native `<tbody>` section
 * @part foot - Generated native `<tfoot>` section
 *
 * @cssprop --table-radius - Border radius of the table container
 * @cssprop --table-shadow - Shadow applied to the table container
 * @cssprop --table-border - Border used by bordered mode and cell separators
 * @cssprop --table-bg - Background color of the generated native table
 * @cssprop --table-cell-padding - Cell padding for body/header cells
 * @cssprop --table-cell-font-size - Cell font size
 * @cssprop --table-cell-color - Text color for body cells
 * @cssprop --table-header-bg - Background for header and footer rows
 * @cssprop --table-header-color - Text color for header and footer rows
 * @cssprop --table-row-hover-bg - Hover background for body rows
 * @cssprop --table-stripe-bg - Stripe background for alternating rows
 * @cssprop --table-sticky-max-height - Max height used when `sticky` is enabled
 * @cssprop --table-sticky-header-bg - Background of sticky header cells
 * @cssprop --table-sticky-blur - Backdrop blur applied to sticky headers
 *
 * @example
 * ```html
 * <bit-table caption="Top repositories" striped bordered sticky>
 *   <bit-tr head>
 *     <bit-th>Repository</bit-th>
 *     <bit-th>Stars</bit-th>
 *   </bit-tr>
 *   <bit-tr>
 *     <bit-td>vielzeug/sigil</bit-td>
 *     <bit-td>1200</bit-td>
 *   </bit-tr>
 * </bit-table>
 * ```
 */
export const TABLE_TAG = 'bit-table' as const;
define<BitTableProps>(TABLE_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    bordered: prop.bool(false),
    caption: prop.string(),
    loading: prop.bool(false),
    sticky: prop.bool(false),
    striped: prop.bool(false),
  },

  setup(props, { bind, el }) {
    bind({
      attr: {
        'aria-busy': props.loading,
        'aria-label': props.caption,
      },
    });

    // Build the fully-native shadow table via DOM APIs (not innerHTML) to avoid
    // HTML-parser foster-parenting which would eject <slot> elements from table
    // contexts.  All three issues — color themes, sticky headers, colspan —
    // require real <thead>/<tbody>/<tfoot>/<tr>/<th>/<td> in the shadow tree.
    onMounted(() => {
      const scrollContainer = el.shadowRoot!.querySelector('.scroll-container')!;

      const table = document.createElement('table');
      const captionEl = document.createElement('caption');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const tfoot = document.createElement('tfoot');

      // Keep part assignment imperative so template typing stays strict.
      scrollContainer.setAttribute('part', 'scroll');

      table.setAttribute('part', 'table');
      thead.setAttribute('part', 'head');
      tbody.setAttribute('part', 'body');
      tfoot.setAttribute('part', 'foot');
      table.append(captionEl, thead, tbody, tfoot);
      scrollContainer.appendChild(table);

      // Sync caption text from prop
      effect(() => {
        captionEl.hidden = !(captionEl.textContent = props.caption.value ?? '');
      });

      // Initial build
      let cleanupCellObservers = buildTable(el, thead, tbody, tfoot);

      // Rebuild whenever direct children change (rows added / removed / reordered)
      const structureObserver = new MutationObserver(() => {
        cleanupCellObservers();
        cleanupCellObservers = buildTable(el, thead, tbody, tfoot);
      });

      structureObserver.observe(el, { childList: true });

      return () => {
        structureObserver.disconnect();
        cleanupCellObservers();
      };
    });

    return html`<div class="scroll-container"></div>`;
  },
  styles: [colorThemeMixin, reducedMotionMixin, componentStyles],
});
