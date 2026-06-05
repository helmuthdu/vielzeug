import type { DataGridColumn } from '../../headless';

// ── Declarative bit-column element ────────────────────────────────────────────

/**
 * Declarative column definition for `<bit-datagrid>`.
 * Use as a child element instead of setting the `columns` prop imperatively.
 *
 * @element bit-column
 *
 * @attr {string} key - Row property key (required)
 * @attr {string} label - Header display label (required)
 * @attr {boolean} sortable - Makes the column sortable
 * @attr {boolean} resizable - Adds a drag handle to resize the column
 * @attr {string} width - CSS column width (e.g. '12rem')
 * @attr {string} header-label - Accessible label override for the column header
 *
 * @example
 * ```html
 * <bit-datagrid>
 *   <bit-column key="name" label="Name" sortable></bit-column>
 *   <bit-column key="email" label="Email" width="20rem"></bit-column>
 * </bit-datagrid>
 * ```
 */
if (!customElements.get('bit-column'))
  customElements.define(
    'bit-column',
    class extends HTMLElement {
      connectedCallback(): void {
        if (!this.getAttribute('key')) {
          console.warn('[bit-column] Missing required `key` attribute.', this);
        }

        if (!this.getAttribute('label')) {
          console.warn('[bit-column] Missing required `label` attribute.', this);
        }
      }
    },
  );

export const COLUMN_TAG = 'bit-column' as const;

/** Attributes observed by the column MutationObserver in bit-datagrid. */
export const COLUMN_OBSERVED_ATTRS = ['key', 'label', 'sortable', 'resizable', 'width', 'header-label'] as const;

/** Parse all `<bit-column>` direct children of `host` into DataGridColumn descriptors. */
export function parseColumnChildren(host: HTMLElement): DataGridColumn[] {
  return Array.from(host.querySelectorAll(':scope > bit-column')).map((el) => ({
    headerLabel: el.getAttribute('header-label') ?? undefined,
    key: el.getAttribute('key') ?? '',
    label: el.getAttribute('label') ?? '',
    resizable: el.hasAttribute('resizable'),
    sortable: el.hasAttribute('sortable'),
    width: el.getAttribute('width') ?? undefined,
  }));
}
