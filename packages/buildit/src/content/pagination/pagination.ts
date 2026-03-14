import { computed, css, define, defineEmits, defineProps, html } from '@vielzeug/craftit';

import '../../actions/button/button';
import type { AddEventListeners, ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { coarsePointerMixin, colorThemeMixin, sizeVariantMixin } from '../../styles';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      display: flex;
      align-items: center;
      gap: var(--size-1);
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: var(--pagination-gap, var(--size-1));
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: contents;
    }

    button {
      all: unset;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--pagination-item-size, var(--size-9));
      height: var(--pagination-item-size, var(--size-9));
      min-height: var(--_touch-target);
      padding: 0 var(--size-2);
      border-radius: var(--pagination-radius, var(--rounded-md));
      font-size: var(--_font-size, var(--text-sm));
      font-weight: var(--font-medium);
      cursor: pointer;
      user-select: none;
      color: var(--color-contrast-700);
      border: var(--border) solid transparent;
      transition:
        background var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast);
    }

    button:hover:not(:disabled):not([aria-current='page']) {
      background: var(--color-contrast-100);
    }

    button:focus-visible {
      outline: var(--border-2) solid var(--_theme-base, var(--color-contrast-500));
      outline-offset: var(--border-2);
    }

    button[aria-current='page'] {
      background: var(--_theme-base, var(--color-contrast-800));
      color: var(--_theme-contrast, var(--color-canvas));
      border-color: var(--_theme-base, var(--color-contrast-800));
      cursor: default;
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--pagination-item-size, var(--size-9));
      height: var(--pagination-item-size, var(--size-9));
      color: var(--color-contrast-400);
      font-size: var(--_font-size, var(--text-sm));
      cursor: default;
    }
  }

  @layer buildit.utilities {
    :host([size='sm']) {
      --pagination-item-size: var(--size-7);
      --pagination-gap: var(--size-0_5);
      --_font-size: var(--text-xs);
    }

    :host([size='lg']) {
      --pagination-item-size: var(--size-11);
      --_font-size: var(--text-base);
    }
  }
`;

/** Pagination events */
export interface BitPaginationEvents {
  change: CustomEvent<{ page: number }>;
}

/** Pagination props */
export interface PaginationProps {
  /** Current page (1-indexed) */
  page?: number;
  /** Total number of pages */
  'total-pages'?: number;
  /** Number of sibling pages shown around the current page */
  siblings?: number;
  /** Show first/last page navigation buttons */
  'show-first-last'?: boolean;
  /** Show prev/next navigation buttons */
  'show-prev-next'?: boolean;
  /** Theme color */
  color?: ThemeColor;
  /** Visual variant for nav buttons */
  variant?: VisualVariant;
  /** Size */
  size?: ComponentSize;
  /** Accessible label for the nav landmark */
  label?: string;
}

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
export const TAG = define('bit-pagination', ({ host }) => {
  const props = defineProps<PaginationProps>({
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

  const emit = defineEmits<{ change: { page: number } }>();

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
          ${() =>
            props['show-first-last'].value
              ? html`<li>
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
                </li>`
              : ''}
          ${() =>
            props['show-prev-next'].value
              ? html`<li>
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
                </li>`
              : ''}
          ${() =>
            pageItems.value.map((item) => {
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
          ${() =>
            props['show-prev-next'].value
              ? html`<li>
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
                </li>`
              : ''}
          ${() =>
            props['show-first-last'].value
              ? html`<li>
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
                </li>`
              : ''}
        </ol>
      </nav>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-pagination': HTMLElement & PaginationProps & AddEventListeners<BitPaginationEvents>;
  }
}
