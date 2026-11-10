import { define, getHost, html, prop, useEmit } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

import { sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, sizeVariantMixin, touchTargetMixin } from '../../styles';
import { type ComponentSize, type ThemeColor, VISUAL_VARIANTS, type VisualVariant } from '../../types';
import componentStyles from './pagination.css?inline';

export { ICON_TAG } from '../../content/icon/icon';
export { BUTTON_TAG } from '../../inputs/button/button';
export type OrePaginationEvents = {
  change: { page: number };
};

/**
 * Accessible strings for `ore-pagination`, overridable through the `labels`
 * JS property (a `Partial<PaginationLabels>` merged over the English
 * defaults). Same seam as `ore-datagrid`'s `labels`: omit entries to keep the
 * default, supply translated strings for screen readers in any locale.
 */
export type PaginationLabels = {
  first: string;
  last: string;
  next: string;
  page: (page: number) => string;
  previous: string;
};

export const DEFAULT_PAGINATION_LABELS: PaginationLabels = {
  first: 'First page',
  last: 'Last page',
  next: 'Next page',
  page: (page) => `Page ${page}`,
  previous: 'Previous page',
};

export type OrePaginationProps = {
  color?: ThemeColor;
  label?: string;
  /** Localized button labels (JS property only). */
  labels?: Partial<PaginationLabels>;
  page?: number;
  'show-first-last'?: boolean;
  'show-prev-next'?: boolean;
  siblings?: number;
  size?: ComponentSize;
  'total-pages'?: number;
  variant?: VisualVariant;
};

function buildPageRange(
  currentPage: number,
  totalPages: number,
  siblings: number,
): Array<number | 'ellipsis-start' | 'ellipsis-end'> {
  const BOUNDARY = 1; // always show first and last page
  const total = totalPages;
  const pages: Array<number | 'ellipsis-start' | 'ellipsis-end'> = [];

  // If total is small enough, show all pages
  if (total <= 2 * BOUNDARY + 2 * siblings + 3) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(currentPage - siblings, BOUNDARY + 1);
  const rightSibling = Math.min(currentPage + siblings, total - BOUNDARY);

  pages.push(1);

  if (leftSibling > BOUNDARY + 2) pages.push('ellipsis-start');
  else if (leftSibling === BOUNDARY + 2) pages.push(BOUNDARY + 1);

  for (let i = leftSibling; i <= rightSibling; i++) pages.push(i);

  if (rightSibling < total - BOUNDARY - 1) pages.push('ellipsis-end');
  else if (rightSibling === total - BOUNDARY - 1) pages.push(total - BOUNDARY);

  pages.push(total);

  return pages;
}

/**
 * Page-based navigation control.
 *
 * @element ore-pagination
 *
 * @attr {number} page - Current page (1-indexed, default: 1)
 * @attr {number} total-pages - Total number of pages (required)
 * @attr {number} siblings - Sibling pages around current (default: 1)
 * @attr {boolean} show-first-last - Show first/last page buttons (default: false)
 * @attr {boolean} show-prev-next - Show prev/next buttons (default: true)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant for nav buttons: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'frost' (default: 'ghost')
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} label - Accessible nav label (default: 'Pagination')
 *
 * The `page` attribute updates optimistically on selection and `change` fires in the same
 * step, so plain attribute-driven usage works without extra wiring. Router-driven apps
 * write `page` from the URL as normal: the grid-external state remains the destination of
 * truth and a later attribute write simply re-syncs the control. The JS-only `labels`
 * property localizes the boundary and page-button accessible names.
 *
 * @fires change - Emitted when the page changes, with { page: number }
 *
 * @cssprop --pagination-item-size - Width/height of each item
 * @cssprop --pagination-gap - Gap between items
 * @cssprop --pagination-radius - Border radius of items
 *
 * @part page-btn - Page button.
 * @part nav - Navigation container.
 * @part list - List container.
 * @part first-btn - First page button.
 * @part prev-btn - Previous page button.
 * @part next-btn - Next page button.
 * @part last-btn - Last page button.
 * @example
 * ```html
 * <!-- Basic -->
 * <ore-pagination page="3" total-pages="10" color="primary"></ore-pagination>
 *
 * <!-- With prev/next and first/last buttons -->
 * <ore-pagination page="5" total-pages="20" show-prev-next show-first-last siblings="2"></ore-pagination>
 *
 * <!-- Compact size -->
 * <ore-pagination page="1" total-pages="5" size="sm" variant="ghost"></ore-pagination>
 * ```
 */
export const PAGINATION_TAG = 'ore-pagination' as const;
define<OrePaginationProps>(PAGINATION_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    label: prop.string('Pagination'),
    labels: prop.data<Partial<PaginationLabels>>(),
    page: prop.number(1),
    'show-first-last': prop.bool(false),
    'show-prev-next': prop.bool(true),
    siblings: prop.number(1),
    'total-pages': prop.number(1),
    variant: prop.oneOf(VISUAL_VARIANTS),
  },
  setup(props) {
    const el = getHost();
    const emit = useEmit<OrePaginationEvents>();
    const labels = computed<PaginationLabels>(() => ({ ...DEFAULT_PAGINATION_LABELS, ...props.labels.value }));

    function goTo(page: number) {
      const total = props['total-pages'].value || 1;
      const next = Math.min(Math.max(1, page), total);

      if (next === props.page.value) return;

      el.setAttribute('page', String(next));
      emit('change', { page: next });
    }

    const pageItems = computed(() =>
      buildPageRange(props.page.value || 1, props['total-pages'].value || 1, props.siblings.value ?? 1),
    );

    const isFirst = computed(() => (props.page.value || 1) <= 1);
    const isLast = computed(() => (props.page.value || 1) >= (props['total-pages'].value || 1));

    return html`
      <nav aria-label="${props.label}" part="nav">
        <ol class="pagination" part="list">
          ${() =>
            props['show-first-last'].value
              ? html`
                  <li>
                    <button
                      type="button"
                      class="nav-btn"
                      part="first-btn"
                      aria-label=${() => labels.value.first}
                      ?disabled=${isFirst}
                      @click=${() => goTo(1)}>
                      <ore-icon name="chevrons-left" size="16" aria-hidden="true"></ore-icon>
                    </button>
                  </li>
                `
              : ''}
          ${() =>
            props['show-prev-next'].value
              ? html`
                  <li>
                    <button
                      type="button"
                      class="nav-btn"
                      part="prev-btn"
                      aria-label=${() => labels.value.previous}
                      ?disabled=${isFirst}
                      @click=${() => goTo((props.page.value || 1) - 1)}>
                      <ore-icon name="chevron-left" size="16" aria-hidden="true"></ore-icon>
                    </button>
                  </li>
                `
              : ''}
          <li style="display: contents;">
            ${() =>
              pageItems.value.map((item) => {
                if (item === 'ellipsis-start' || item === 'ellipsis-end') {
                  return html`
                    <span class="ellipsis" aria-hidden="true">&hellip;</span>
                  `;
                }

                const pg = item as number;
                const isCurrent = pg === (props.page.value || 1);
                const pgLabel = () => labels.value.page(pg);

                return isCurrent
                  ? html`
                      <button
                        type="button"
                        part="page-btn"
                        aria-label="${pgLabel}"
                        aria-current="page"
                        @click=${() => goTo(pg)}>
                        ${pg}
                      </button>
                    `
                  : html`
                      <button type="button" part="page-btn" aria-label="${pgLabel}" @click=${() => goTo(pg)}>
                        ${pg}
                      </button>
                    `;
              })}
          </li>
          ${() =>
            props['show-prev-next'].value
              ? html`
                  <li>
                    <button
                      type="button"
                      class="nav-btn"
                      part="next-btn"
                      aria-label=${() => labels.value.next}
                      ?disabled=${isLast}
                      @click=${() => goTo((props.page.value || 1) + 1)}>
                      <ore-icon name="chevron-right" size="16" aria-hidden="true"></ore-icon>
                    </button>
                  </li>
                `
              : ''}
          ${() =>
            props['show-first-last'].value
              ? html`
                  <li>
                    <button
                      type="button"
                      class="nav-btn"
                      part="last-btn"
                      aria-label=${() => labels.value.last}
                      ?disabled=${isLast}
                      @click=${() => goTo(props['total-pages'].value || 1)}>
                      <ore-icon name="chevrons-right" size="16" aria-hidden="true"></ore-icon>
                    </button>
                  </li>
                `
              : ''}
        </ol>
      </nav>
    `;
  },

  styles: [touchTargetMixin, colorThemeMixin, sizeVariantMixin(), componentStyles],
});
