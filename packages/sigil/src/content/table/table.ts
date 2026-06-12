import { define, effect, html, onMounted, prop } from '@vielzeug/craft';

import { reducedMotionMixin, tableBaseMixin } from '../../styles';
import componentStyles from './table.css?inline';

/* ── Types ───────────────────────────────────────────────────────────────── */

/** Table component properties */
export type SgTableProps = {
  /** Adds a thicker outer border */
  bordered?: boolean;
  /** Visible caption text — also used as the accessible table label via `aria-label` */
  caption?: string;
  /** Cell density: `'compact'` | `'cozy'` (default) | `'comfortable'` */
  density?: 'compact' | 'cozy' | 'comfortable';
  /** Expands the table to 100% of its container width */
  fullwidth?: boolean;
  /** Applies a busy/disabled state with reduced opacity */
  loading?: boolean;
  /** Enables sticky column headers with a vertical scroll container */
  sticky?: boolean;
  /** Alternating row stripe backgrounds */
  striped?: boolean;
};

/* ── Child element markers ───────────────────────────────────────────────── */
// sg-tr, sg-th, sg-td are lightweight light-DOM markers.
// sg-table reads them and constructs a fully-native shadow <table> so that
// browser features that require real table elements (colspan/rowspan,
// position:sticky on <thead>, table layout algorithm) all work correctly.
// Attributes on sg-th/sg-td are mirrored to the generated native cells.

/**
 * Light-DOM row marker consumed by `<sg-table>`.
 *
 * @element sg-tr
 * @attr {boolean} head - Places the row in the generated `<thead>` section
 * @attr {boolean} foot - Places the row in the generated `<tfoot>` section
 *
 * @example
 * ```html
 * <sg-table>
 *   <sg-tr head><sg-th>Name</sg-th><sg-th>Role</sg-th></sg-tr>
 *   <sg-tr><sg-td>Alice</sg-td><sg-td>Admin</sg-td></sg-tr>
 * </sg-table>
 * ```
 */
if (!customElements.get('sg-tr')) customElements.define('sg-tr', class extends HTMLElement {});

/**
 * Light-DOM header cell marker consumed by `<sg-table>`.
 *
 * @element sg-th
 * @attr {number} colspan  - Mirrors to native `<th colspan>`
 * @attr {number} rowspan  - Mirrors to native `<th rowspan>`
 * @attr {string} scope    - Mirrors to native `<th scope>`: 'col' | 'row' | 'colgroup' | 'rowgroup'
 * @attr {string} headers  - Mirrors to native `<th headers>`
 *
 * @example
 * ```html
 * <sg-tr head>
 *   <sg-th scope="col">Name</sg-th>
 *   <sg-th scope="col" colspan="2">Address</sg-th>
 * </sg-tr>
 * ```
 */
if (!customElements.get('sg-th')) customElements.define('sg-th', class extends HTMLElement {});

/**
 * Light-DOM data cell marker consumed by `<sg-table>`.
 *
 * @element sg-td
 * @attr {number} colspan  - Mirrors to native `<td colspan>`
 * @attr {number} rowspan  - Mirrors to native `<td rowspan>`
 * @attr {string} headers  - Mirrors to native `<td headers>`
 *
 * @example
 * ```html
 * <sg-tr>
 *   <sg-td>Alice</sg-td>
 *   <sg-td colspan="2">123 Main St, Springfield</sg-td>
 * </sg-tr>
 * ```
 */
if (!customElements.get('sg-td')) customElements.define('sg-td', class extends HTMLElement {});

/* ── Proxy/mirror helpers ────────────────────────────────────────────────── */

// Attributes forwarded from sg-th/sg-td to the generated native cell.
// scope is intentionally excluded — it requires fallback logic and is handled separately.
const CELL_ATTRS = ['colspan', 'rowspan', 'headers', 'abbr'];

/**
 * Sync text content and tracked attributes from a light-DOM marker to its
 * native mirror. `fallbackScope` is applied when the source element carries no
 * explicit `scope` attribute, ensuring the auto-inferred value is always
 * present and is restored if an explicit override is later removed.
 */
function syncCell(source: Element, native: HTMLTableCellElement, fallbackScope?: string): void {
  if (source.childElementCount > 0) {
    // Source has element children — deep-clone them into the native cell so
    // components like sg-skeleton render correctly inside the shadow table.
    // Guard: skip re-clone if the serialised content is identical to avoid
    // redundant DOM work on every MutationObserver tick (e.g. 250+ cells
    // of skeleton loaders all cloning on each attribute change).
    const snapshot = source.innerHTML;

    if (native.getAttribute('data-src-html') === snapshot) return;

    native.setAttribute('data-src-html', snapshot);
    native.textContent = '';

    for (const child of source.childNodes) {
      native.appendChild(child.cloneNode(true));
    }
  } else {
    const text = source.textContent ?? '';

    if (native.textContent !== text) native.textContent = text;
  }

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
type CellEntry = { inferredScope: string | undefined; native: HTMLTableCellElement };

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
    if (child.localName !== 'sg-tr') continue;

    const section = child.hasAttribute('head') ? thead : child.hasAttribute('foot') ? tfoot : tbody;
    const tr = document.createElement('tr');

    for (const cell of child.children) {
      if (cell.localName !== 'sg-th' && cell.localName !== 'sg-td') continue;

      const isHeader = cell.localName === 'sg-th';
      const native = document.createElement(isHeader ? 'th' : 'td');
      // Auto-infer scope for <th> elements; undefined for <td>.
      const inferredScope = isHeader ? (section === thead ? 'col' : 'row') : undefined;

      native.setAttribute('part', section === tbody ? 'cell' : 'header-cell');
      native.removeAttribute('data-src-html');
      syncCell(cell, native, inferredScope);
      cellMap.set(cell, { inferredScope, native });
      tr.appendChild(native);
    }

    section.appendChild(tr);
  }

  return cellMap;
}

/**
 * Data table component.
 *
 * Reads light-DOM `<sg-tr>`/`<sg-th>`/`<sg-td>` markers and projects them
 * into a fully-native shadow `<table>`. Cell attributes (`colspan`, `rowspan`,
 * `scope`, etc.) are mirrored. Changes are observed and synced incrementally.
 *
 * Native table features — sticky headers, colspan/rowspan, the table layout
 * algorithm — all work because the shadow tree contains real table elements.
 *
 * @element sg-table
 *
 * @attr {boolean} bordered  - Thicker outer border
 * @attr {string}  caption   - Caption text shown above the table
 * @attr {boolean} fullwidth - Expands to 100% container width
 * @attr {boolean} loading   - Busy state: reduced opacity, no pointer events
 * @attr {string}  density   - Cell density: 'compact' | 'cozy' | 'comfortable' (default: 'cozy')
 * @attr {boolean} sticky    - Sticky `<thead>` with scroll container
 * @attr {boolean} striped   - Alternating row backgrounds
 *
 * @part scroll       - Scroll container that hosts the generated native table
 * @part table        - Generated native `<table>` element
 * @part head         - Generated native `<thead>` section
 * @part body         - Generated native `<tbody>` section
 * @part foot         - Generated native `<tfoot>` section
 * @part cell         - Every native `<td>` in `<tbody>` rows
 * @part header-cell  - Every native `<th>` / `<td>` in `<thead>` and `<tfoot>` rows
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
 * <sg-table caption="Top repositories" striped bordered sticky>
 *   <sg-tr head>
 *     <sg-th>Repository</sg-th>
 *     <sg-th>Stars</sg-th>
 *   </sg-tr>
 *   <sg-tr>
 *     <sg-td>vielzeug/sigil</sg-td>
 *     <sg-td>1 200</sg-td>
 *   </sg-tr>
 * </sg-table>
 * ```
 */
export const TABLE_TAG = 'sg-table' as const;
define<SgTableProps>(TABLE_TAG, {
  props: {
    bordered: prop.bool(false),
    caption: prop.string(),
    density: prop.string<'compact' | 'cozy' | 'comfortable'>(),
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

      // Content observer: syncs text/attribute changes inside sg-th/sg-td.
      // Remains connected throughout the component lifetime — no
      // disconnect/reconnect during structural rebuilds. Records that arrive
      // for cells no longer in cellMap (after a rebuild) are silently ignored
      // by the `if (entry)` guard, so there is no correctness risk.
      const contentObserver = new MutationObserver((records) => {
        for (const rec of records) {
          const sourceCell = (rec.target instanceof Element ? rec.target : rec.target.parentElement)?.closest(
            'sg-th, sg-td',
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

      // Structure observer: triggers a full rebuild when sg-tr elements are
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
