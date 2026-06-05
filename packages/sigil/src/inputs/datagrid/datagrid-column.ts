import type { DataGridColumn } from '../../headless';

// ── Declarative sg-column element ────────────────────────────────────────────

/**
 * Declarative column definition for `<sg-datagrid>`.
 * Use as a child element instead of setting the `columns` prop imperatively.
 *
 * @element sg-column
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
 * <sg-datagrid>
 *   <sg-column key="name" label="Name" sortable></sg-column>
 *   <sg-column key="email" label="Email" width="20rem"></sg-column>
 * </sg-datagrid>
 * ```
 */
if (!customElements.get('sg-column'))
  customElements.define(
    'sg-column',
    class extends HTMLElement {
      connectedCallback(): void {
        if (!this.getAttribute('key')) {
          console.warn('[sg-column] Missing required `key` attribute.', this);
        }

        if (!this.getAttribute('label')) {
          console.warn('[sg-column] Missing required `label` attribute.', this);
        }
      }
    },
  );

export const COLUMN_TAG = 'sg-column' as const;

/** Attributes observed by the column MutationObserver in sg-datagrid. */
export const COLUMN_OBSERVED_ATTRS = ['key', 'label', 'sortable', 'resizable', 'width', 'header-label'] as const;

/** Parse all `<sg-column>` direct children of `host` into DataGridColumn descriptors. */
export function parseColumnChildren(host: HTMLElement): DataGridColumn[] {
  return Array.from(host.querySelectorAll(':scope > sg-column')).map((el) => ({
    headerLabel: el.getAttribute('header-label') ?? undefined,
    key: el.getAttribute('key') ?? '',
    label: el.getAttribute('label') ?? '',
    resizable: el.hasAttribute('resizable'),
    sortable: el.hasAttribute('sortable'),
    width: el.getAttribute('width') ?? undefined,
  }));
}
