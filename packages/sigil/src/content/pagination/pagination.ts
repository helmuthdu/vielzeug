import { define, html, prop } from '@vielzeug/craft';
import { computed } from '@vielzeug/ripple';

import '../icon/icon';
import '../../inputs/button/button';
import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { sizableBundle, themableBundle } from '../../shared';
import { coarsePointerMixin, colorThemeMixin, sizeVariantMixin } from '../../styles';
import componentStyles from './pagination.css?inline';

export type SgPaginationEvents = {
  change: { page: number };
};

export type SgPaginationProps = {
  color?: ThemeColor;
  label?: string;
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
 * @element sg-pagination
 *
 * @attr {number} page - Current page (1-indexed, default: 1)
 * @attr {number} total-pages - Total number of pages (required)
 * @attr {number} siblings - Sibling pages around current (default: 1)
 * @attr {boolean} show-first-last - Show first/last page buttons (default: false)
 * @attr {boolean} show-prev-next - Show prev/next buttons (default: false)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant for nav buttons: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'frost' (default: 'ghost')
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} label - Accessible nav label (default: 'Pagination')
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
 * <sg-pagination page="3" total-pages="10" color="primary"></sg-pagination>
 *
 * <!-- With prev/next and first/last buttons -->
 * <sg-pagination page="5" total-pages="20" show-prev-next show-first-last siblings="2"></sg-pagination>
 *
 * <!-- Compact size -->
 * <sg-pagination page="1" total-pages="5" size="sm" variant="ghost"></sg-pagination>
 * ```
 */
export const PAGINATION_TAG = 'sg-pagination' as const;
define<SgPaginationProps, SgPaginationEvents>(PAGINATION_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    label: prop.string('Pagination'),
    page: prop.number(1),
    'show-first-last': prop.bool(false),
    'show-prev-next': prop.bool(false),
    siblings: prop.number(1),
    'total-pages': prop.number(1),
    variant: prop.string<VisualVariant>(),
  },
  setup(props, { bind: _bind, el, emit }) {
    function goTo(page: number) {
      const total = props['total-pages'].value || 1;
      const next = Math.min(Math.max(1, page), total);

      if (next === props.page.value) return;

      el.setAttribute('page', String(next));
      emit('change', { page: next });
    }

    function handlePageClick(event: Event) {
      const btn = (event.target as HTMLElement)?.closest('[part="page-btn"]') as HTMLButtonElement | null;

      if (!btn) return;

      const ariaLabel = btn.getAttribute('aria-label');

      if (!ariaLabel) return;

      const pageMatch = ariaLabel.match(/\d+/);

      if (!pageMatch) return;

      const page = Number(pageMatch[0]);

      goTo(page);
    }

    const pageItems = computed(() =>
      buildPageRange(props.page.value || 1, props['total-pages'].value || 1, props.siblings.value ?? 1),
    );

    const isFirst = computed(() => (props.page.value || 1) <= 1);
    const isLast = computed(() => (props.page.value || 1) >= (props['total-pages'].value || 1));

    return html`
      <nav :aria-label="${props.label}" part="nav" @click=${handlePageClick}>
        <ol class="pagination" part="list">
          ${() =>
            props['show-first-last'].value
              ? html`<li>
                  <button
                    type="button"
                    class="nav-btn"
                    part="first-btn"
                    aria-label="First page"
                    ?disabled=${isFirst}
                    @click=${() => goTo(1)}>
                    <sg-icon name="chevrons-left" size="16" aria-hidden="true"></sg-icon>
                  </button>
                </li>`
              : ''}
          ${() =>
            props['show-prev-next'].value
              ? html`<li>
                  <button
                    type="button"
                    class="nav-btn"
                    part="prev-btn"
                    aria-label="Previous page"
                    ?disabled=${isFirst}
                    @click=${() => goTo((props.page.value || 1) - 1)}>
                    <sg-icon name="chevron-left" size="16" aria-hidden="true"></sg-icon>
                  </button>
                </li>`
              : ''}
          <li style="display: contents;">
            ${() =>
              pageItems.value.map((item) => {
                if (item === 'ellipsis-start' || item === 'ellipsis-end') {
                  return html`<span class="ellipsis" aria-hidden="true">&hellip;</span>`;
                }

                const pg = item as number;
                const isCurrent = pg === (props.page.value || 1);
                const pgLabel = `Page ${pg}`;

                return isCurrent
                  ? html`<button type="button" part="page-btn" aria-label="${pgLabel}" aria-current="page">
                      ${pg}
                    </button>`
                  : html`<button type="button" part="page-btn" aria-label="${pgLabel}">${pg}</button>`;
              })}
          </li>
          ${() =>
            props['show-prev-next'].value
              ? html`<li>
                  <button
                    type="button"
                    class="nav-btn"
                    part="next-btn"
                    aria-label="Next page"
                    ?disabled=${isLast}
                    @click=${() => goTo((props.page.value || 1) + 1)}>
                    <sg-icon name="chevron-right" size="16" aria-hidden="true"></sg-icon>
                  </button>
                </li>`
              : ''}
          ${() =>
            props['show-first-last'].value
              ? html`<li>
                  <button
                    type="button"
                    class="nav-btn"
                    part="last-btn"
                    aria-label="Last page"
                    ?disabled=${isLast}
                    @click=${() => goTo(props['total-pages'].value || 1)}>
                    <sg-icon name="chevrons-right" size="16" aria-hidden="true"></sg-icon>
                  </button>
                </li>`
              : ''}
        </ol>
      </nav>
    `;
  },

  styles: [coarsePointerMixin, colorThemeMixin, sizeVariantMixin(), componentStyles],
});
