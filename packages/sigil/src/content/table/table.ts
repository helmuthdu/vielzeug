import { define, effect, html, onMounted, prop } from '@vielzeug/craft';

import type { ComponentSize } from '../../types';

import { sizableBundle } from '../../shared';
import { reducedMotionMixin, tableBaseMixin } from '../../styles';
import componentStyles from './table.css?inline';

/* ── Types ───────────────────────────────────────────────────────────────── */

/** Table component properties */
export type BitTableProps = {
  /** Adds a thicker outer border */
  bordered?: boolean;
  /** Visible caption text — also used as the accessible table label via `aria-label` */
  caption?: string;
  /** Expands the table to 100% of its container width */
  fullwidth?: boolean;
  /** Applies a busy/disabled state with reduced opacity */
  loading?: boolean;
  /** Cell density: `sm` | `md` | `lg` */
  size?: ComponentSize;
  /** Enables sticky column headers with a vertical scroll container */
  sticky?: boolean;
  /** Alternating row stripe backgrounds */
  striped?: boolean;
};

/* ── Child element markers ───────────────────────────────────────────────── */
// bit-tr, bit-th, bit-td are lightweight light-DOM markers.
// bit-table reads them and constructs a fully-native shadow <table> so that
// browser features that require real table elements (colspan/rowspan,
// position:sticky on <thead>, table layout algorithm) all work correctly.
// Attributes on bit-th/bit-td are mirrored to the generated native cells.

/**
 * Light-DOM row marker consumed by `<bit-table>`.
 *
 * @element bit-tr
 * @attr {boolean} head - Places the row in the generated `<thead>` section
 * @attr {boolean} foot - Places the row in the generated `<tfoot>` section
 */
if (!customElements.get('bit-tr')) customElements.define('bit-tr', class extends HTMLElement {});

/**
 * Light-DOM header cell marker consumed by `<bit-table>`.
 *
 * @element bit-th
 * @attr {number} colspan  - Mirrors to native `<th colspan>`
 * @attr {number} rowspan  - Mirrors to native `<th rowspan>`
 * @attr {string} scope    - Mirrors to native `<th scope>`
 * @attr {string} headers  - Mirrors to native `<th headers>`
 */
if (!customElements.get('bit-th')) customElements.define('bit-th', class extends HTMLElement {});

/**
 * Light-DOM data cell marker consumed by `<bit-table>`.
 *
 * @element bit-td
 * @attr {number} colspan  - Mirrors to native `<td colspan>`
 * @attr {number} rowspan  - Mirrors to native `<td rowspan>`
 * @attr {string} headers  - Mirrors to native `<td headers>`
 */
if (!customElements.get('bit-td')) customElements.define('bit-td', class extends HTMLElement {});

/* ── Proxy/mirror helpers ────────────────────────────────────────────────── */

// Attributes forwarded from bit-th/bit-td to the generated native cell.
// scope is intentionally excluded — it requires fallback logic and is handled separately.
const CELL_ATTRS = ['colspan', 'rowspan', 'headers', 'abbr'];

/**
 * Sync text content and tracked attributes from a light-DOM marker to its
 * native mirror. `fallbackScope` is applied when the source element carries no
 * explicit `scope` attribute, ensuring the auto-inferred value is always
 * present and is restored if an explicit override is later removed.
 */
function syncCell(source: Element, native: HTMLTableCellElement, fallbackScope?: string): void {
  const text = source.textContent ?? '';

  if (native.textContent !== text) native.textContent = text;

  for (const attr of CELL_ATTRS) {
    const val = source.getAttribute(attr);

    if (val !== null) native.setAttribute(attr, val);
    else native.removeAttribute(attr);
  }

  // scope: explicit attribute wins; otherwise restore the inferred fallback.
  const explicitScope = source.getAttribute('scope');

  if (explicitScope !== null) native.setAttribute('scope', explicitScope);
  else if (fallbackScope) native.scope = fallbackScope;
  else native.removeAttribute('scope');
}

/** Entry stored in the cell map: native mirror element + its inferred scope fallback. */
type CellEntry = { native: HTMLTableCellElement; inferredScope: string | undefined };

/**
 * (Re)build the entire native shadow table from the current light-DOM markers.
 * Returns a WeakMap of source marker → CellEntry for targeted sync by the
 * content observer. Storing `inferredScope` per cell ensures that removing an
 * explicit `scope` attribute reverts to the auto-inferred value rather than
 * dropping it entirely.
 */
function buildTable(
  host: HTMLElement,
  thead: HTMLTableSectionElement,
  tbody: HTMLTableSectionElement,
  tfoot: HTMLTableSectionElement,
): WeakMap<Element, CellEntry> {
  const cellMap = new WeakMap<Element, CellEntry>();

  thead.textContent = '';
  tbody.textContent = '';
  tfoot.textContent = '';

  for (const child of host.children) {
    if (child.localName !== 'bit-tr') continue;

    const section = child.hasAttribute('head') ? thead : child.hasAttribute('foot') ? tfoot : tbody;
    const tr = document.createElement('tr');

    for (const cell of child.children) {
      if (cell.localName !== 'bit-th' && cell.localName !== 'bit-td') continue;

      const isHeader = cell.localName === 'bit-th';
      const native = document.createElement(isHeader ? 'th' : 'td');
      // Auto-infer scope for <th> elements; undefined for <td>.
      const inferredScope = isHeader ? (section === thead ? 'col' : 'row') : undefined;

      syncCell(cell, native, inferredScope);
      cellMap.set(cell, { native, inferredScope });
      tr.appendChild(native);
    }

    section.appendChild(tr);
  }

  return cellMap;
}

/**
 * Data table component.
 *
 * Reads light-DOM `<bit-tr>`/`<bit-th>`/`<bit-td>` markers and projects them
 * into a fully-native shadow `<table>`. Cell attributes (`colspan`, `rowspan`,
 * `scope`, etc.) are mirrored. Changes are observed and synced incrementally.
 *
 * Native table features — sticky headers, colspan/rowspan, the table layout
 * algorithm — all work because the shadow tree contains real table elements.
 *
 * @element bit-table
 *
 * @attr {boolean} bordered  - Thicker outer border
 * @attr {string}  caption   - Caption text shown above the table
 * @attr {boolean} fullwidth - Expands to 100% container width
 * @attr {boolean} loading   - Busy state: reduced opacity, no pointer events
 * @attr {string}  size      - Cell density: `sm` | `md` | `lg`
 * @attr {boolean} sticky    - Sticky `<thead>` with scroll container
 * @attr {boolean} striped   - Alternating row backgrounds
 *
 * @part scroll - Scroll container that hosts the generated native table
 * @part table  - Generated native `<table>` element
 * @part head   - Generated native `<thead>` section
 * @part body   - Generated native `<tbody>` section
 * @part foot   - Generated native `<tfoot>` section
 *
 * @cssprop --table-bg                - Table background color
 * @cssprop --table-border-color      - Cell separator and outer border color
 * @cssprop --table-radius            - Corner radius of the table container
 * @cssprop --table-shadow            - Box shadow of the table container
 * @cssprop --table-header-bg         - Background of header and footer rows
 * @cssprop --table-accent            - Accent color for interactive states
 * @cssprop --table-row-hover-bg      - Row hover background
 * @cssprop --table-stripe-bg         - Even-row stripe background
 * @cssprop --table-cell-padding-x    - Cell horizontal padding
 * @cssprop --table-cell-padding-y    - Cell vertical padding
 * @cssprop --table-font-size         - Base font size for cells
 * @cssprop --table-sticky-max-height - Max height of the sticky scroll container
 * @cssprop --table-sticky-header-bg  - Background of sticky header cells
 * @cssprop --table-sticky-blur       - Backdrop blur applied to sticky headers
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
 *     <bit-td>1 200</bit-td>
 *   </bit-tr>
 * </bit-table>
 * ```
 */
export const TABLE_TAG = 'bit-table' as const;
define<BitTableProps>(TABLE_TAG, {
  props: {
    ...sizableBundle,
    bordered: prop.bool(false),
    caption: prop.string(),
    fullwidth: prop.bool(false),
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

    // Build the native shadow table via DOM APIs (not innerHTML) to avoid
    // HTML-parser foster-parenting, which ejects table section elements from
    // their intended positions in the tree.
    onMounted(() => {
      const scrollContainer = el.shadowRoot!.querySelector('.scroll-container')!;

      const table = document.createElement('table');
      const captionEl = document.createElement('caption');
      const thead = document.createElement('thead');
      const tbody = document.createElement('tbody');
      const tfoot = document.createElement('tfoot');

      scrollContainer.setAttribute('part', 'scroll');
      table.setAttribute('part', 'table');
      thead.setAttribute('part', 'head');
      tbody.setAttribute('part', 'body');
      tfoot.setAttribute('part', 'foot');
      table.append(captionEl, thead, tbody, tfoot);
      scrollContainer.appendChild(table);

      // Reactively sync caption text and visibility from prop.
      effect(() => {
        const text = props.caption.value ?? '';

        captionEl.textContent = text;
        captionEl.hidden = text === '';
      });

      // Initial full build.
      let cellMap = buildTable(el, thead, tbody, tfoot);

      // Content observer: syncs text/attribute changes inside bit-th/bit-td.
      // Remains connected throughout the component lifetime — no
      // disconnect/reconnect during structural rebuilds. Records that arrive
      // for cells no longer in cellMap (after a rebuild) are silently ignored
      // by the `if (entry)` guard, so there is no correctness risk.
      const contentObserver = new MutationObserver((records) => {
        for (const rec of records) {
          const sourceCell = (rec.target instanceof Element ? rec.target : rec.target.parentElement)?.closest(
            'bit-th, bit-td',
          );

          if (sourceCell) {
            const entry = cellMap.get(sourceCell);

            if (entry) syncCell(sourceCell, entry.native, entry.inferredScope);
          }
        }
      });

      contentObserver.observe(el, {
        // Include 'scope' in attributeFilter so explicit scope changes are picked
        // up and the fallback-restore logic in syncCell runs correctly.
        attributeFilter: [...CELL_ATTRS, 'scope'],
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });

      // Structure observer: triggers a full rebuild when bit-tr elements are
      // added, removed, or reordered. Scoped to direct children only so it
      // never fires for cell-level mutations.
      const structureObserver = new MutationObserver(() => {
        cellMap = buildTable(el, thead, tbody, tfoot);
      });

      structureObserver.observe(el, { childList: true });

      return () => {
        structureObserver.disconnect();
        contentObserver.disconnect();
      };
    });

    return html`<div class="scroll-container"></div>`;
  },

  styles: [reducedMotionMixin, tableBaseMixin('table'), componentStyles],
});
