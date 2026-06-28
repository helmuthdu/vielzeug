import type { DataGridColumn } from '../../headless';

import { warn } from '../../_warn';

// ── Declarative ore-column element ────────────────────────────────────────────

/**
 * Declarative column definition for `<ore-datagrid>`.
 * Use as a child element instead of setting the `columns` prop imperatively.
 *
 * @element ore-column
 *
 * @attr {string} key - Row property key (required)
 * @attr {string} label - Header display label (required)
 * @attr {boolean} sortable - Makes the column sortable
 * @attr {boolean} resizable - Adds a drag handle to resize the column
 * @attr {string} align - Text alignment: 'left' | 'center' | 'right'
 * @attr {string} width - CSS column width (e.g. '12rem')
 * @attr {string} header-label - Accessible label override for the column header
 *
 * @example
 * ```html
 * <ore-datagrid>
 *   <ore-column key="name" label="Name" sortable></ore-column>
 *   <ore-column key="email" label="Email" width="20rem"></ore-column>
 * </ore-datagrid>
 * ```
 */
if (!customElements.get('ore-column'))
  customElements.define(
    'ore-column',
    class extends HTMLElement {
      connectedCallback(): void {
        if (!this.getAttribute('key')) {
          warn('ore-column: missing required `key` attribute');
        }

        if (!this.getAttribute('label')) {
          warn('ore-column: missing required `label` attribute');
        }
      }
    },
  );

export const COLUMN_TAG = 'ore-column' as const;

/** Attributes observed by the column MutationObserver in ore-datagrid. */
export const COLUMN_OBSERVED_ATTRS = [
  'key',
  'label',
  'sortable',
  'resizable',
  'align',
  'width',
  'header-label',
] as const;

/** Parse all `<ore-column>` direct children of `host` into DataGridColumn descriptors. */
export function parseColumnChildren(host: HTMLElement): DataGridColumn[] {
  return Array.from(host.querySelectorAll(':scope > ore-column')).map((el) => ({
    align: (el.getAttribute('align') as any) ?? undefined,
    headerLabel: el.getAttribute('header-label') ?? undefined,
    key: el.getAttribute('key') ?? '',
    label: el.getAttribute('label') ?? '',
    resizable: el.hasAttribute('resizable'),
    sortable: el.hasAttribute('sortable'),
    width: el.getAttribute('width') ?? undefined,
  }));
}
