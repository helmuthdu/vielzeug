import { define, computed, html } from '@vielzeug/craftit';
import { each } from '@vielzeug/craftit/directives';

import '../icon/icon';
import '../../inputs/button/button';
import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { type PropBundle, sizableBundle, themableBundle } from '../../inputs/shared/bundles';
import { coarsePointerMixin, colorThemeMixin, sizeVariantMixin } from '../../styles';
import styles from './pagination.css?inline';

export type BitPaginationEvents = {
  change: { page: number };
};

export type BitPaginationProps = {
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
 * @element bit-pagination
 *
 * @attr {number} page - Current page (1-indexed, default: 1)
 * @attr {number} total-pages - Total number of pages (required)
 * @attr {number} siblings - Sibling pages around current (default: 1)
 * @attr {boolean} show-first-last - Show first/last page buttons (default: false)
 * @attr {boolean} show-prev-next - Show prev/next buttons (default: false)
 * @attr {string} color - Theme color
 * @attr {string} variant - Visual variant for nav buttons: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'frost' | 'glass' (default: 'ghost')
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} label - Accessible nav label (default: 'Pagination')
 *
 * @fires change - Emitted when the page changes, with { page: number }
 *
 * @cssprop --pagination-item-size - Width/height of each item
 * @cssprop --pagination-gap - Gap between items
 * @cssprop --pagination-radius - Border radius of items
 *
 * @example
 * ```html
 * <bit-pagination page="3" total-pages="10" color="primary"></bit-pagination>
 * ```
 */
export const PAGINATION_TAG = define<BitPaginationProps, BitPaginationEvents>('bit-pagination', {
  props: {
    ...themableBundle,
    ...sizableBundle,
    label: 'Pagination',
    page: 1,
    'show-first-last': false,
    'show-prev-next': false,
    siblings: 1,
    'total-pages': 1,
    variant: undefined,
  } satisfies PropBundle<BitPaginationProps>,
  setup({ emit, host, props }) {
    function goTo(page: number) {
      const total = Number(props['total-pages'].value) || 1;
      const next = Math.min(Math.max(1, page), total);

      if (next === Number(props.page.value)) return;

      host.el.setAttribute('page', String(next));
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
      buildPageRange(
        Number(props.page.value) || 1,
        Number(props['total-pages'].value) || 1,
        // eslint-disable-next-line no-constant-binary-expression
        Number(props.siblings.value) ?? 1,
      ),
    );
    const isFirst = computed(() => (Number(props.page.value) || 1) <= 1);
    const isLast = computed(() => (Number(props.page.value) || 1) >= (Number(props['total-pages'].value) || 1));

    return html`
      <nav :aria-label="${() => props.label.value}" part="nav" @click=${handlePageClick}>
        <ol class="pagination" part="list">
          ${() =>
            props['show-first-last'].value
              ? html`<li>
                  <button
                    type="button"
                    class="nav-btn"
                    part="first-btn"
                    aria-label="First page"
                    ?disabled=${() => isFirst.value}
                    @click=${() => goTo(1)}>
                    <bit-icon name="chevrons-left" size="16" aria-hidden="true"></bit-icon>
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
                    ?disabled=${() => isFirst.value}
                    @click=${() => goTo((Number(props.page.value) || 1) - 1)}>
                    <bit-icon name="chevron-left" size="16" aria-hidden="true"></bit-icon>
                  </button>
                </li>`
              : ''}
          <li style="display: contents;">
            ${each(pageItems, {
              key: (item) => `${item}`,
              render: (item) => {
                if (item === 'ellipsis-start' || item === 'ellipsis-end') {
                  return html`<span class="ellipsis" aria-hidden="true">&hellip;</span>`;
                }

                const pg = item as number;
                const isCurrent = pg === (Number(props.page.value) || 1);

                return isCurrent
                  ? html`<button type="button" part="page-btn" aria-label="Page ${pg}" aria-current="page">
                      ${pg}
                    </button>`
                  : html`<button type="button" part="page-btn" aria-label="Page ${pg}">${pg}</button>`;
              },
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
                    ?disabled=${() => isLast.value}
                    @click=${() => goTo((Number(props.page.value) || 1) + 1)}>
                    <bit-icon name="chevron-right" size="16" aria-hidden="true"></bit-icon>
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
                    ?disabled=${() => isLast.value}
                    @click=${() => goTo(Number(props['total-pages'].value) || 1)}>
                    <bit-icon name="chevrons-right" size="16" aria-hidden="true"></bit-icon>
                  </button>
                </li>`
              : ''}
        </ol>
      </nav>
    `;
  },
  styles: [colorThemeMixin, sizeVariantMixin({}), coarsePointerMixin, styles],
});
