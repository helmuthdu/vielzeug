import { define, html, prop } from '@vielzeug/craft';
import { when } from '@vielzeug/craft/directives';
import { type Readable, signal } from '@vielzeug/ripple';

import { reducedMotionMixin } from '../../styles';
import componentStyles from './async.css?inline';

export type AsyncStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

export type SgAsyncEvents = {
  retry: void;
};

export type SgAsyncProps = {
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
 * @element sg-async
 *
 * @attr {string} status - current state: 'idle' | 'loading' | 'empty' | 'error' | 'success' (default: 'success')
 * @attr {boolean} retryable - show retry button in error state (default: false)
 * @attr {string} empty-label - title for empty state (default: 'No content yet')
 * @attr {string} empty-description - optional text for empty state
 * @attr {string} error-label - title for error state (default: 'Something went wrong')
 * @attr {string} error-description - optional text for error state
 *
 * @fires retry - Emitted when the retry button is clicked (no detail payload)
 *
 * @slot - default content shown in 'success' state
 * @slot loading - custom loading UI (overrides default skeletons)
 * @slot empty - custom empty UI (overrides default icon/label)
 * @slot error - custom error UI (overrides default icon/label)
 *
 * @cssprop --async-color - Text/icon color used by default async state content
 * @cssprop --async-gap - Vertical spacing between icon, title, description, and actions
 * @cssprop --async-icon-size - Icon size for built-in loading/empty/error visuals
 * @example
 * ```html
 * <!-- Success state: default slot is shown -->
 * <sg-async status="success">
 *   <ul><li>Item one</li><li>Item two</li></ul>
 * </sg-async>
 *
 * <!-- Loading state: shows skeleton placeholders -->
 * <sg-async status="loading"></sg-async>
 *
 * <!-- Empty state with custom message -->
 * <sg-async status="empty" empty-label="No results" empty-description="Try adjusting your filters."></sg-async>
 *
 * <!-- Error state with retry button -->
 * <sg-async status="error" retryable error-label="Failed to load" error-description="Check your connection."></sg-async>
 * ```
 */
export const ASYNC_TAG = 'sg-async' as const;
define<SgAsyncProps, SgAsyncEvents>(ASYNC_TAG, {
  props: {
    'empty-description': prop.string(),
    'empty-label': prop.string('No content yet'),
    'error-description': prop.string(),
    'error-label': prop.string('Something went wrong'),
    retryable: prop.bool(false),
    status: prop.oneOf(['idle', 'loading', 'empty', 'error', 'success'] as const, 'success'),
  },
  setup(props, { bind, emit }) {
    const hasLoadingSlot = signal(false);
    const hasEmptySlot = signal(false);
    const hasErrorSlot = signal(false);

    // Reflect status onto the host so CSS can show/hide each region.
    // ARIA attributes are driven reactively by bind().
    bind({
      attr: {
        ariaBusy: () => (props.status!.value === 'loading' ? 'true' : 'false'),
        ariaLabel: () => (props.status!.value === 'loading' ? 'Loading…' : null),
        ariaLive: () => (props.status!.value === 'error' ? 'assertive' : 'polite'),
        status: props.status,
      },
    });

    const renderText = (className: 'title' | 'description', text: Readable<string | undefined> | undefined) => () =>
      text?.value ? html`<p class="${className}">${text}</p>` : '';

    // All four regions are always in the shadow DOM — CSS on :host([status="…"])
    // toggles their visibility. This means:
    // - No DOM churn on status transitions (no teardown/rebuild of slot elements).
    // - Live regions are always present, so screen readers announce correctly.
    // - focus is never lost across status changes.
    return html`
      <div class="region region-idle" role="presentation"></div>

      <div class="region region-loading" role="status">
        <slot
          name="loading"
          @slotchange=${(e: Event) => {
            hasLoadingSlot.value = (e.target as HTMLSlotElement).assignedNodes().length > 0;
          }}></slot>
        ${when(
          hasLoadingSlot,
          () => html``,
          () => html`
            <div class="loading-default" aria-hidden="true">
              <sg-skeleton variant="text" lines="1" width="40%"></sg-skeleton>
              <sg-skeleton variant="text" lines="3" width="100%"></sg-skeleton>
              <sg-skeleton variant="text" lines="1" width="60%"></sg-skeleton>
            </div>
          `,
        )}
      </div>

      <div class="region region-empty">
        <slot
          name="empty"
          @slotchange=${(e: Event) => {
            hasEmptySlot.value = (e.target as HTMLSlotElement).assignedNodes().length > 0;
          }}></slot>
        ${when(
          hasEmptySlot,
          () => html``,
          () => html`
            <div class="empty-state" role="status">
              <div class="icon">
                <sg-icon name="inbox" size="100%" stroke-width="1.75" aria-hidden="true"></sg-icon>
              </div>
              ${renderText('title', props['empty-label'])} ${renderText('description', props['empty-description'])}
            </div>
          `,
        )}
      </div>

      <div class="region region-error">
        <slot
          name="error"
          @slotchange=${(e: Event) => {
            hasErrorSlot.value = (e.target as HTMLSlotElement).assignedNodes().length > 0;
          }}></slot>
        ${when(
          hasErrorSlot,
          () => html``,
          () => html`
            <div class="error-state" role="alert">
              <div class="icon">
                <sg-icon name="triangle-alert" size="100%" stroke-width="1.75" aria-hidden="true"></sg-icon>
              </div>
              ${renderText('title', props['error-label'])} ${renderText('description', props['error-description'])}
              ${when(
                () => Boolean(props.retryable!.value),
                () => html`
                  <button class="retry-btn" type="button" @click=${() => emit('retry')}>
                    <sg-icon name="refresh-cw" size="1em" stroke-width="2" aria-hidden="true"></sg-icon>
                    Try again
                  </button>
                `,
              )}
            </div>
          `,
        )}
      </div>

      <div class="region region-success" role="presentation">
        <slot></slot>
      </div>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
