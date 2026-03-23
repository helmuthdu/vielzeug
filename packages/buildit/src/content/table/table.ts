import { aria, defineComponent, effect, html, onMount } from '@vielzeug/craftit';

import type { ComponentSize, ThemeColor } from '../../types';

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

if (!customElements.get('bit-tr')) customElements.define('bit-tr', class extends HTMLElement {});

if (!customElements.get('bit-th')) customElements.define('bit-th', class extends HTMLElement {});

if (!customElements.get('bit-td')) customElements.define('bit-td', class extends HTMLElement {});

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
 * Accessible data table. Compose with `<bit-tr>`, `<bit-th>`, and `<bit-td>`.
 * Add `head` to header rows and `foot` to footer rows.
 *
 * @element bit-table
 *
 * @attr {string}  caption  - Visible caption and accessible label
 * @attr {string}  color    - Header theme: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {boolean} bordered - Outer border and radius
 * @attr {boolean} loading  - Busy / loading state
 * @attr {string}  size     - Size variant: 'sm' | 'md' | 'lg'
 * @attr {boolean} sticky   - Stick header cells during vertical scroll
 * @attr {boolean} striped  - Alternating row backgrounds
 *
 * @part scroll - Horizontally-scrollable container
 * @part table  - The native `<table>` element
 * @part head   - The native `<thead>` element
 * @part body   - The native `<tbody>` element
 * @part foot   - The native `<tfoot>` element
 *
 * @cssprop --table-bg                  - Table background
 * @cssprop --table-border              - Full border shorthand for row separators (e.g. `2px solid red`)
 * @cssprop --table-header-bg           - Header row background
 * @cssprop --table-header-color        - Header cell text color
 * @cssprop --table-cell-padding        - Cell padding (e.g. `0.75rem 1rem`)
 * @cssprop --table-cell-font-size      - Cell font size
 * @cssprop --table-cell-color          - Body cell text color
 * @cssprop --table-stripe-bg           - Stripe row background
 * @cssprop --table-row-hover-bg        - Row hover background
 * @cssprop --table-radius              - Outer corner radius
 * @cssprop --table-shadow              - Outer box shadow
 * @cssprop --table-sticky-max-height   - Max height when `sticky` is active (default `24rem`)
 *
 * @example
 * ```html
 * <bit-table caption="Members" striped bordered color="primary">
 *   <bit-tr head>
 *     <bit-th scope="col">Name</bit-th>
 *     <bit-th scope="col">Role</bit-th>
 *   </bit-tr>
 *   <bit-tr><bit-td>Alice</bit-td><bit-td>Admin</bit-td></bit-tr>
 *   <bit-tr><bit-td>Bob</bit-td><bit-td>Editor</bit-td></bit-tr>
 *   <bit-tr foot><bit-td colspan="2">2 members</bit-td></bit-tr>
 * </bit-table>
 * ```
 */
export const TABLE_TAG = defineComponent<BitTableProps>({
  props: {
    bordered: { default: false, type: Boolean },
    caption: { default: undefined },
    color: { default: undefined },
    loading: { default: false, type: Boolean },
    size: { default: undefined },
    sticky: { default: false, type: Boolean },
    striped: { default: false, type: Boolean },
  },
  setup({ host, props }) {
    aria({
      busy: () => props.loading.value,
      label: () => props.caption.value ?? null,
    });
    // Build the fully-native shadow table via DOM APIs (not innerHTML) to avoid
    // HTML-parser foster-parenting which would eject <slot> elements from table
    // contexts.  All three issues — color themes, sticky headers, colspan —
    // require real <thead>/<tbody>/<tfoot>/<tr>/<th>/<td> in the shadow tree.
    onMount(() => {
      const scrollContainer = host.shadowRoot!.querySelector('.scroll-container')!;

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
      let cleanupCellObservers = buildTable(host, thead, tbody, tfoot);
      // Rebuild whenever direct children change (rows added / removed / reordered)
      const structureObserver = new MutationObserver(() => {
        cleanupCellObservers();
        cleanupCellObservers = buildTable(host, thead, tbody, tfoot);
      });

      structureObserver.observe(host, { childList: true });

      return () => {
        structureObserver.disconnect();
        cleanupCellObservers();
      };
    });

    return html`<div class="scroll-container"></div>`;
  },
  styles: [colorThemeMixin, reducedMotionMixin, componentStyles],
  tag: 'bit-table',
});
