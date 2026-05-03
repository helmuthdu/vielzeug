import { define, prop, html, signal, type Signal, onMounted } from '@vielzeug/craftit';

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
 * @slot - default content shown in 'success' state
 * @slot loading - custom loading UI (overrides default skeletons)
 * @slot empty - custom empty UI (overrides default icon/label)
 * @slot error - custom error UI (overrides default icon/label)
 *
 * @fires retry - when the retry button is clicked
 *
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
export const ASYNC_TAG = define<BitAsyncProps, BitAsyncEvents>('bit-async', {
  props: {
    'empty-description': undefined,
    'empty-label': 'No content yet',
    'error-description': undefined,
    'error-label': 'Something went wrong',
    retryable: false,
    status: prop.oneOf(['idle', 'loading', 'empty', 'error', 'success'] as const, 'success'),
  },
  setup(props, { emit, host }) {
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

    const mount = () => {
      updateNamedSlotPresence();

      const observer = new MutationObserver(() => updateNamedSlotPresence());

      observer.observe(host.el, { attributeFilter: ['slot'], attributes: true, childList: true, subtree: true });

      return () => observer.disconnect();
    };

    // Keep host accessibility state in sync with async status.
    host.bind({
      attr: {
        ariaBusy: () => (props.status!.value === 'loading' ? 'true' : 'false'),
        ariaLabel: () => (props.status!.value === 'loading' ? 'Loading…' : null),
        ariaLive: () => (props.status!.value === 'error' ? 'assertive' : 'polite'),
      },
    });

    const renderText = (className: 'title' | 'description', text: Signal<string | undefined> | undefined) => () =>
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
      description: Signal<string | undefined> | undefined;
      icon: string;
      label: Signal<string | undefined> | undefined;
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
            ${() => (hasLoadingSlot.value ? html`<slot name="loading"></slot>` : renderLoadingFallback())}
          </div>
        `;
      }

      if (status === 'empty') {
        return html`
          <div class="region">
            ${() =>
              hasEmptySlot.value
                ? html`<slot name="empty"></slot>`
                : renderDefaultState({
                    description: props['empty-description'],
                    icon: 'inbox',
                    label: props['empty-label'],
                    role: 'status',
                    stateClass: 'empty-state',
                  })}
          </div>
        `;
      }

      if (status === 'error') {
        return html`
          <div class="region">
            ${() =>
              hasErrorSlot.value
                ? html`<slot name="error"></slot>`
                : renderDefaultState({
                    action: () =>
                      props.retryable!.value
                        ? html`
                            <button class="retry-btn" type="button" @click=${() => emit('retry')}>
                              <bit-icon name="refresh-cw" size="1em" stroke-width="2" aria-hidden="true"></bit-icon>
                              Try again
                            </button>
                          `
                        : '',
                    description: props['error-description'],
                    icon: 'triangle-alert',
                    label: props['error-label'],
                    role: 'alert',
                    stateClass: 'error-state',
                  })}
          </div>
        `;
      }

      return renderSuccess();
    };

    onMounted(mount);

    return () => html`${() => renderByStatus()}`;
  },
  styles: [reducedMotionMixin, componentStyles],
});
