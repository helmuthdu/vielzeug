import { define, html, onMount, signal } from '@vielzeug/craftit';
import { choose, when } from '@vielzeug/craftit/directives';

import '../../content/icon/icon';
import { reducedMotionMixin } from '../../styles';
import '../skeleton/skeleton';
import componentStyles from './async.css?inline';

export type AsyncStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

export type BitAsyncEvents = {
  retry: void;
};

export type BitAsyncProps = {
  /** Description shown below the empty label in the default empty state */
  'empty-description'?: string;
  /** Descriptive label for the empty state, shown when no custom `empty` slot is provided */
  'empty-label'?: string;
  /** Detailed error text shown below the error label in the default error state */
  'error-description'?: string;
  /** Descriptive label for the error state, shown when no custom `error` slot is provided */
  'error-label'?: string;
  /** Whether to show the retry button in the default error state */
  retryable?: boolean;
  /**
   * Current data-fetch status.
   * - `idle`    — not yet started; renders nothing
   * - `loading` — shows the `loading` slot (or a default skeleton stack)
   * - `empty`   — shows the `empty` slot (or a built-in empty-state illustration)
   * - `error`   — shows the `error` slot (or a built-in error state with optional retry)
   * - `success` — shows the default slot (the actual content)
   */
  status: AsyncStatus;
};

/**
 * A composable wrapper that renders the correct UI for each async data-fetch status.
 * Drives `aria-live` and `aria-busy` automatically so screen readers stay informed.
 *
 * @element bit-async
 *
 * @attr {string} status - Data status: 'idle' | 'loading' | 'empty' | 'error' | 'success'
 * @attr {string} empty-label - Heading for the default empty state
 * @attr {string} empty-description - Description for the default empty state
 * @attr {string} error-label - Heading for the default error state
 * @attr {string} error-description - Description for the default error state
 * @attr {boolean} retryable - Show a retry button in the default error state
 *
 * @fires retry - Emitted when the retry button is clicked
 *
 * @slot - Shown when `status="success"` (default)
 * @slot loading - Shown when `status="loading"` (defaults to skeleton stack)
 * @slot empty - Shown when `status="empty"` (defaults to built-in illustration)
 * @slot error - Shown when `status="error"` (defaults to built-in error view)
 *
 * @cssprop --async-color - Icon/text color for default empty/error states
 * @cssprop --async-icon-size - Icon size in default states (default: var(--size-12))
 * @cssprop --async-gap - Gap between elements in default states (default: var(--size-3))
 *
 * @example
 * ```html
 * <!-- Simple usage — let buildit handle empty and error UI -->
 * <bit-async status="loading" empty-label="No results" error-label="Failed to load" retryable>
 *   <my-data-table></my-data-table>
 * </bit-async>
 *
 * <!-- Custom empty slot -->
 * <bit-async status="empty">
 *   <div slot="empty">
 *     <img src="/no-results.svg" alt="" />
 *     <p>Try adjusting your filters.</p>
 *   </div>
 * </bit-async>
 * ```
 */
export const ASYNC_TAG = define<BitAsyncProps, BitAsyncEvents>('bit-async', {
  props: {
    'empty-description': undefined,
    'empty-label': 'No content yet',
    'error-description': undefined,
    'error-label': 'Something went wrong',
    retryable: false,
    // Default to success so slotted content is visible without extra wiring.
    status: 'success',
  },
  setup({ emit, host, props }) {
    const hasLoadingSlot = signal(false);
    const hasEmptySlot = signal(false);
    const hasErrorSlot = signal(false);

    const updateNamedSlotPresence = () => {
      const children = Array.from(host.el.children);

      hasLoadingSlot.value = children.some((child) => child.getAttribute('slot') === 'loading');
      hasEmptySlot.value = children.some((child) => child.getAttribute('slot') === 'empty');
      hasErrorSlot.value = children.some((child) => child.getAttribute('slot') === 'error');
    };

    updateNamedSlotPresence();

    onMount(() => {
      updateNamedSlotPresence();

      const observer = new MutationObserver(() => updateNamedSlotPresence());

      observer.observe(host.el, { attributeFilter: ['slot'], attributes: true, childList: true, subtree: true });

      return () => observer.disconnect();
    });

    // Keep host accessibility state in sync with async status.
    host.bind('attr', {
      ariaBusy: () => (props.status.value === 'loading' ? 'true' : 'false'),
      ariaLabel: () => (props.status.value === 'loading' ? 'Loading…' : null),
      ariaLive: () => (props.status.value === 'error' ? 'assertive' : 'polite'),
    });

    const renderText = (className: 'title' | 'description', text: { value: string | undefined }) =>
      when({
        condition: () => !!text.value,
        then: () => html`<p class="${className}">${() => text.value}</p>`,
      });

    const renderDefaultState = ({
      action,
      description,
      icon,
      label,
      role,
      stateClass,
    }: {
      action?: () => unknown;
      description: { value: string | undefined };
      icon: string;
      label: { value: string | undefined };
      role: 'alert' | 'status';
      stateClass: 'empty-state' | 'error-state';
    }) => html`
      <div class="${stateClass}" role="${role}">
        <div class="icon">
          <bit-icon name="${icon}" size="100%" stroke-width="1.75" aria-hidden="true"></bit-icon>
        </div>
        ${renderText('title', label)} ${renderText('description', description)} ${action?.()}
      </div>
    `;

    const renderLoadingFallback = () => html`
      <div class="loading-default" aria-hidden="true">
        <bit-skeleton variant="text" lines="1" width="40%"></bit-skeleton>
        <bit-skeleton variant="text" lines="3" width="100%"></bit-skeleton>
        <bit-skeleton variant="text" lines="1" width="60%"></bit-skeleton>
      </div>
    `;

    const renderSuccess = () => html`
      <div class="region" role="presentation">
        <slot></slot>
      </div>
    `;

    return html`${choose({
      cases: [
        ['idle', () => html`<div class="region" role="presentation"></div>`],

        [
          'loading',
          () => html`
            <div class="region" role="status">
              ${when({
                condition: () => hasLoadingSlot.value,
                else: renderLoadingFallback,
                then: () => html`<slot name="loading"></slot>`,
              })}
            </div>
          `,
        ],

        [
          'empty',
          () => html`
            <div class="region">
              ${when({
                condition: () => hasEmptySlot.value,
                else: () =>
                  renderDefaultState({
                    description: props['empty-description'],
                    icon: 'inbox',
                    label: props['empty-label'],
                    role: 'status',
                    stateClass: 'empty-state',
                  }),
                then: () => html`<slot name="empty"></slot>`,
              })}
            </div>
          `,
        ],

        [
          'error',
          () => html`
            <div class="region">
              ${when({
                condition: () => hasErrorSlot.value,
                else: () =>
                  renderDefaultState({
                    action: () =>
                      when({
                        condition: () => props.retryable.value,
                        then: () => html`
                          <button class="retry-btn" type="button" @click=${() => emit('retry')}>
                            <bit-icon name="refresh-cw" size="1em" stroke-width="2" aria-hidden="true"></bit-icon>
                            Try again
                          </button>
                        `,
                      }),
                    description: props['error-description'],
                    icon: 'triangle-alert',
                    label: props['error-label'],
                    role: 'alert',
                    stateClass: 'error-state',
                  }),
                then: () => html`<slot name="error"></slot>`,
              })}
            </div>
          `,
        ],

        ['success', renderSuccess],
      ],
      fallback: renderSuccess,
      value: props.status,
    })}`;
  },
  styles: [reducedMotionMixin, componentStyles],
});
