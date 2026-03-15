import { computed, define, defineEmits, defineProps, html } from '@vielzeug/craftit';
import { each, when } from '@vielzeug/craftit/directives';

import '../../actions/button/button';
import type { ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { coarsePointerMixin, colorThemeMixin, sizeVariantMixin } from '../../styles';
import styles from './pagination.css?inline';

export type BitPaginationEvents = {
  change: { page: number };
};

/** Pagination props */
export type BitPaginationProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Accessible label for the nav landmark */
  label?: string;
  /** Current page (1-indexed) */
  page?: number;
  /** Show first/last page navigation buttons */
  'show-first-last'?: boolean;
  /** Show prev/next navigation buttons */
  'show-prev-next'?: boolean;
  /** Number of sibling pages shown around the current page */
  siblings?: number;
  /** Size */
  size?: ComponentSize;
  /** Total number of pages */
  'total-pages'?: number;
  /** Visual variant for nav buttons */
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
export const PAGINATION_TAG = define('bit-pagination', ({ host }) => {
  const props = defineProps<BitPaginationProps>({
    color: { default: undefined },
    label: { default: 'Pagination' },
    page: { default: 1 },
    'show-first-last': { default: false, type: Boolean },
    'show-prev-next': { default: false, type: Boolean },
    siblings: { default: 1 },
    size: { default: undefined },
    'total-pages': { default: 1 },
    variant: { default: undefined },
  });

  const emit = defineEmits<BitPaginationEvents>();

  function goTo(page: number) {
    const total = Number(props['total-pages'].value) || 1;
    const next = Math.min(Math.max(1, page), total);

    if (next === Number(props.page.value)) return;

    host.setAttribute('page', String(next));
    emit('change', { page: next });
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

  return {
    styles: [colorThemeMixin, sizeVariantMixin({}), coarsePointerMixin, styles],
    template: html`
      <nav :aria-label="${() => props.label.value}" part="nav">
        <ol class="pagination" part="list">
          ${when(
            props['show-first-last'],
            () =>
              html`<li>
                <bit-button
                  icon-only
                  :variant="${() => props.variant.value || 'ghost'}"
                  part="first-btn"
                  aria-label="First page"
                  :size="${() => props.size.value || null}"
                  :color="${() => props.color.value || null}"
                  ?disabled="${() => isFirst.value}"
                  @click="${() => goTo(1)}"
                  ><svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <polyline points="11 17 6 12 11 7" />
                    <polyline points="18 17 13 12 18 7" /></svg
                ></bit-button>
              </li>`,
          )}
          ${when(
            props['show-prev-next'],
            () =>
              html`<li>
                <bit-button
                  icon-only
                  :variant="${() => props.variant.value || 'ghost'}"
                  part="prev-btn"
                  aria-label="Previous page"
                  :size="${() => props.size.value || null}"
                  :color="${() => props.color.value || null}"
                  ?disabled="${() => isFirst.value}"
                  @click="${() => goTo((Number(props.page.value) || 1) - 1)}"
                  ><svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" /></svg
                ></bit-button>
              </li>`,
          )}
          ${each(pageItems, (item) => {
            if (item === 'ellipsis-start' || item === 'ellipsis-end') {
              return html`<li><span class="ellipsis" aria-hidden="true">&hellip;</span></li>`;
            }

            const pg = item as number;
            const isCurrent = pg === (Number(props.page.value) || 1);

            return html`<li>
              <button
                part="page-btn"
                :aria-label="${() => `Page ${pg}`}"
                :aria-current="${() => (isCurrent ? 'page' : null)}"
                @click="${() => goTo(pg)}">
                ${pg}
              </button>
            </li>`;
          })}
          ${when(
            props['show-prev-next'],
            () =>
              html`<li>
                <bit-button
                  icon-only
                  :variant="${() => props.variant.value || 'ghost'}"
                  part="next-btn"
                  aria-label="Next page"
                  :size="${() => props.size.value || null}"
                  :color="${() => props.color.value || null}"
                  ?disabled="${() => isLast.value}"
                  @click="${() => goTo((Number(props.page.value) || 1) + 1)}"
                  ><svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" /></svg
                ></bit-button>
              </li>`,
          )}
          ${when(
            props['show-first-last'],
            () =>
              html`<li>
                <bit-button
                  icon-only
                  :variant="${() => props.variant.value || 'ghost'}"
                  part="last-btn"
                  aria-label="Last page"
                  :size="${() => props.size.value || null}"
                  :color="${() => props.color.value || null}"
                  ?disabled="${() => isLast.value}"
                  @click="${() => goTo(Number(props['total-pages'].value) || 1)}"
                  ><svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true">
                    <polyline points="13 17 18 12 13 7" />
                    <polyline points="6 17 11 12 6 7" /></svg
                ></bit-button>
              </li>`,
          )}
        </ol>
      </nav>
    `,
  };
});
