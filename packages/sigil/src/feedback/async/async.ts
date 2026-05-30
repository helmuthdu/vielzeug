import { define, prop, html, type ReadonlySignal, onMounted, signal, when } from '@vielzeug/craft';

import '../../content/icon/icon';
import { reducedMotionMixin } from '../../styles';
import '../skeleton/skeleton';
import componentStyles from './async.css?inline';

export type AsyncStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

export type BitAsyncEvents = {
  retry: void;
};

export type BitAsyncProps = {
  'empty-description'?: string;
  'empty-label'?: string;
  'error-description'?: string;
  'error-label'?: string;
  retryable?: boolean;
  status?: AsyncStatus;
};

/**
 * A container for handling asynchronous states (loading, empty, error, success).
 * Simplifies data fetching UI by providing consistent fallbacks.
 *
 * @element bit-async
 *
 * @attr {string} status - current state: 'idle' | 'loading' | 'empty' | 'error' | 'success' (default: 'success')
 * @attr {boolean} retryable - show retry button in error state (default: false)
 * @attr {string} empty-label - title for empty state (default: 'No content yet')
 * @attr {string} empty-description - optional text for empty state
 * @attr {string} error-label - title for error state (default: 'Something went wrong')
 * @attr {string} error-description - optional text for error state
 *
 * @fires retry - when the retry button is clicked
 *
 * @slot - default content shown in 'success' state
 * @slot loading - custom loading UI (overrides default skeletons)
 * @slot empty - custom empty UI (overrides default icon/label)
 * @slot error - custom error UI (overrides default icon/label)
 *
 * @cssprop --async-color - Text/icon color used by default async state content
 * @cssprop --async-gap - Vertical spacing between icon, title, description, and actions
 * @cssprop --async-icon-size - Icon size for built-in loading/empty/error visuals
 * @cssprop --color-contrast-500 - Secondary description text color
 * @cssprop --color-contrast-700 - Primary heading text color for neutral states
 * @cssprop --color-error-500 - Base error color for the default error icon
 * @cssprop --color-error-600 - Strong error color for titles and emphasis
 * @cssprop --color-error-700 - Deep error color for high-contrast error text
 * @cssprop --font-medium - Font weight used by default state descriptions
 * @cssprop --font-semibold - Font weight used by default state titles
 * @cssprop --leading-relaxed - Line-height for default state descriptions
 * @cssprop --rounded-md - Corner radius for default state surfaces and placeholders
 * @example
 * ```html
 * <bit-async status=${status} @retry=${fetchData}>
 *   <ul>...list items...</ul>
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
export const ASYNC_TAG = 'bit-async' as const;
define<BitAsyncProps, BitAsyncEvents>(ASYNC_TAG, {
  props: {
    'empty-description': prop.string(),
    'empty-label': prop.string('No content yet'),
    'error-description': prop.string(),
    'error-label': prop.string('Something went wrong'),
    retryable: prop.bool(false),
    status: prop.oneOf(['idle', 'loading', 'empty', 'error', 'success'] as const, 'success'),
  },
  setup(props, { bind, el, emit, slots: _slots }) {
    const hasLoadingSlot = signal(false);
    const hasEmptySlot = signal(false);
    const hasErrorSlot = signal(false);

    /** Checks direct light-DOM children for named slot assignments. */
    const checkSlots = () => {
      hasLoadingSlot.value = el.querySelector('[slot="loading"]') !== null;
      hasEmptySlot.value = el.querySelector('[slot="empty"]') !== null;
      hasErrorSlot.value = el.querySelector('[slot="error"]') !== null;
    };

    checkSlots();

    onMounted(() => {
      checkSlots();

      // Watch for child additions/removals and slot attribute changes on any descendant.
      // subtree is needed because a direct child's slot attribute may be reassigned after mount.
      const observer = new MutationObserver(checkSlots);

      observer.observe(el, { attributeFilter: ['slot'], attributes: true, childList: true, subtree: true });

      return () => observer.disconnect();
    });

    // Keep host accessibility state in sync with async status.
    bind({
      attr: {
        ariaBusy: () => (props.status!.value === 'loading' ? 'true' : 'false'),
        ariaLabel: () => (props.status!.value === 'loading' ? 'Loading…' : null),
        ariaLive: () => (props.status!.value === 'error' ? 'assertive' : 'polite'),
      },
    });

    const renderText =
      (className: 'title' | 'description', text: ReadonlySignal<string | undefined> | undefined) => () =>
        text?.value ? html`<p class="${className}">${text}</p>` : '';

    const renderDefaultState = ({
      action,
      description,
      icon,
      label,
      role,
      stateClass,
    }: {
      action?: () => unknown;
      description: ReadonlySignal<string | undefined> | undefined;
      icon: string;
      label: ReadonlySignal<string | undefined> | undefined;
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

    const renderByStatus = () => {
      const status = props.status!.value;

      if (status === 'idle') {
        return html`<div class="region" role="presentation"></div>`;
      }

      if (status === 'loading') {
        return html`
          <div class="region" role="status">
            ${when(hasLoadingSlot, () => html`<slot name="loading"></slot>`, renderLoadingFallback)}
          </div>
        `;
      }

      if (status === 'empty') {
        return html`
          <div class="region">
            ${when(
              hasEmptySlot,
              () => html`<slot name="empty"></slot>`,
              () =>
                renderDefaultState({
                  description: props['empty-description'],
                  icon: 'inbox',
                  label: props['empty-label'],
                  role: 'status',
                  stateClass: 'empty-state',
                }),
            )}
          </div>
        `;
      }

      if (status === 'error') {
        return html`
          <div class="region">
            ${when(
              hasErrorSlot,
              () => html`<slot name="error"></slot>`,
              () =>
                renderDefaultState({
                  action: () =>
                    when(
                      () => Boolean(props.retryable!.value),
                      () => html`
                        <button class="retry-btn" type="button" @click=${() => emit('retry')}>
                          <bit-icon name="refresh-cw" size="1em" stroke-width="2" aria-hidden="true"></bit-icon>
                          Try again
                        </button>
                      `,
                    ),
                  description: props['error-description'],
                  icon: 'triangle-alert',
                  label: props['error-label'],
                  role: 'alert',
                  stateClass: 'error-state',
                }),
            )}
          </div>
        `;
      }

      return renderSuccess();
    };

    return html`${() => renderByStatus()}`;
  },
  styles: [reducedMotionMixin, componentStyles],
});
