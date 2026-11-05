import { bind, define, html, prop, useEmit, when } from '@vielzeug/ore';
import { computed, type Readable, signal } from '@vielzeug/ripple';

import componentStyles from './state.css?inline';

export type StateStatus = 'empty' | 'error' | 'idle' | 'loading' | 'success';

export type OreStateEvents = {
  retry: undefined;
};

export type OreStateProps = {
  'empty-description'?: string;
  'empty-label'?: string;
  'error-description'?: string;
  'error-label'?: string;
  retryable?: boolean;
  status?: StateStatus;
};

/**
 * A state container for asynchronous content: one element covers the whole
 * lifecycle (idle, loading, empty, error, success) so a data view never
 * hand-rolls four separate fallbacks. The default slot shows on `success`;
 * every other state has a built-in visual that a named slot can replace.
 *
 * Empty and error render as full placeholders rather than bare labels: an
 * illustration, a title, a description, and an action row. Both are
 * customizable without replacing the whole placeholder: the `illustration`
 * slot swaps the icon and the `actions` slot supplies recovery controls
 * (retry, browse, create). `retryable` fills the action row with a built-in
 * retry button when no actions are slotted.
 *
 * @element ore-state
 *
 * @attr {string} status - current state: 'idle' | 'loading' | 'empty' | 'error' | 'success' (default: 'success')
 * @attr {boolean} retryable - show a retry button when the error state has no slotted actions (default: false)
 * @attr {string} empty-label - title for empty state (default: 'No content yet')
 * @attr {string} empty-description - optional text for empty state
 * @attr {string} error-label - title for error state (default: 'Something went wrong')
 * @attr {string} error-description - optional text for error state
 *
 * @fires retry - Emitted when the retry button is clicked (no detail payload)
 *
 * @slot - default content shown in 'success' state
 * @slot loading - custom loading UI (overrides default skeletons)
 * @slot empty - custom empty UI (overrides the built-in empty placeholder)
 * @slot error - custom error UI (overrides the built-in error placeholder)
 * @slot illustration - artwork for the built-in empty/error placeholder (replaces its default icon)
 * @slot actions - recovery controls for the built-in empty/error placeholder (rendered below its text)
 *
 * @cssprop --state-color - Text/icon color used by default state content
 * @cssprop --state-gap - Vertical spacing between icon, title, description, and actions
 * @cssprop --state-icon-size - Icon size for built-in loading/empty/error visuals
 * @example
 * ```html
 * <!-- Success state: default slot is shown -->
 * <ore-state status="success">
 *   <ul><li>Item one</li><li>Item two</li></ul>
 * </ore-state>
 *
 * <!-- Loading state: shows skeleton placeholders -->
 * <ore-state status="loading"></ore-state>
 *
 * <!-- Empty state with a recovery action -->
 * <ore-state status="empty" empty-label="No results" empty-description="Try adjusting your filters.">
 *   <ore-button slot="actions" variant="secondary">Clear filters</ore-button>
 * </ore-state>
 *
 * <!-- Error state with the built-in retry button -->
 * <ore-state status="error" retryable error-label="Failed to load" error-description="Check your connection."></ore-state>
 * ```
 */
export const STATE_TAG = 'ore-state' as const;
define<OreStateProps>(STATE_TAG, {
  props: {
    'empty-description': prop.string(),
    'empty-label': prop.string('No content yet'),
    'error-description': prop.string(),
    'error-label': prop.string('Something went wrong'),
    retryable: prop.bool(false),
    status: prop.oneOf(['idle', 'loading', 'empty', 'error', 'success'] as const, 'success'),
  },
  setup(props) {
    const emit = useEmit<OreStateEvents>();

    const hasLoadingSlot = signal(false);
    const hasEmptySlot = signal(false);
    const hasErrorSlot = signal(false);
    const hasIllustrationSlot = signal(false);
    const hasActionsSlot = signal(false);

    const isEmpty = computed(() => props.status.value === 'empty');
    const isError = computed(() => props.status.value === 'error');

    // The built-in placeholder yields to a full replacement slot: an assigned
    // `empty`/`error` node owns the whole region.
    const hasOverride = computed(() => (isEmpty.value && hasEmptySlot.value) || (isError.value && hasErrorSlot.value));

    // Reflect status onto the host so CSS can show/hide each region.
    // ARIA attributes are driven reactively by bind().
    //
    // Only `aria-busy` belongs on the host. Without a role the host is a `generic`, where
    // `aria-label` is prohibited (and ignored), and an `aria-live` there would wrap the default
    // slot: every mutation inside user content in the success state would be announced, on top of
    // the inner regions that already carry live semantics. Naming and announcements therefore live
    // on the `role="status"` / `role="alert"` regions, which do support both.
    bind({
      attr: {
        'aria-busy': () => (props.status.value === 'loading' ? 'true' : 'false'),
        status: props.status,
      },
    });

    const renderText = (className: 'title' | 'description', text: Readable<string | undefined> | undefined) => () =>
      text?.value
        ? html`
            <p class="${className}">${text}</p>
          `
        : '';

    const onSlotFilled = (filled: (value: boolean) => void) => (event: Event) => {
      filled((event.target as HTMLSlotElement).assignedNodes().length > 0);
    };

    // Empty and error share one placeholder: identical structure, different
    // artwork, copy, and role. One region means the illustration and actions
    // slots have exactly one host each, so a slotted node can't be swallowed
    // by a sibling region's slot of the same name. CSS hides the whole region
    // outside the empty/error states, so this stays mounted unconditionally.
    //
    // The announced copy and the actions row are siblings rather than nested:
    // focusable content inside a live region is a known assistive-technology
    // defect (iOS VoiceOver drops focus on it), so only the message carries the
    // role and the buttons stay outside it. Both rows share --_gap, so the
    // visual stack is the same either way.
    const placeholder = when(
      hasOverride,
      () => html``,
      () => html`
        <div class="placeholder">
          <div class="message" role=${() => (isError.value ? 'alert' : 'status')}>
            <div class="artwork artwork-default" ?hidden=${() => hasIllustrationSlot.value}>
              <ore-icon
                name=${() => (isError.value ? 'triangle-alert' : 'package')}
                size="100%"
                stroke-width="1.75"
                aria-hidden="true"></ore-icon>
            </div>
            <slot
              name="illustration"
              class="artwork"
              ?hidden=${() => !hasIllustrationSlot.value}
              @slotchange=${onSlotFilled((value) => (hasIllustrationSlot.value = value))}></slot>
            ${when(
              isEmpty,
              () => html`
                ${renderText('title', props['empty-label'])} ${renderText('description', props['empty-description'])}
              `,
              () => html`
                ${renderText('title', props['error-label'])} ${renderText('description', props['error-description'])}
              `,
            )}
          </div>
          <div class="actions" ?hidden=${() => !hasActionsSlot.value && !(isError.value && props.retryable.value)}>
            <slot
              name="actions"
              @slotchange=${onSlotFilled((value) => (hasActionsSlot.value = value))}></slot>
            ${when(
              () => Boolean(isError.value && props.retryable.value && !hasActionsSlot.value),
              () => html`
                <button class="retry-btn" type="button" @click=${() => emit('retry')}>
                  <ore-icon name="refresh-cw" size="1em" stroke-width="2" aria-hidden="true"></ore-icon>
                  Try again
                </button>
              `,
            )}
          </div>
        </div>
      `,
    );

    // Every region stays in the shadow DOM: CSS on :host([status="…"]) toggles visibility, so there
    // is no DOM churn on status transitions and each live region is mounted before it is ever
    // announced. Hiding a region does blur focus inside it, which is why the built-in retry button
    // is only reachable in the error state: leaving focus behind on a hidden button would strand
    // keyboard users.
    return html`
      <div class="region region-idle" role="presentation"></div>

      <div class="region region-loading" role="status" aria-label="Loading\u2026">
        <slot name="loading" @slotchange=${onSlotFilled((value) => (hasLoadingSlot.value = value))}></slot>
        ${when(
          hasLoadingSlot,
          () => html``,
          () => html`
            <div class="loading-default" aria-hidden="true">
              <ore-skeleton variant="text" lines="1" width="40%"></ore-skeleton>
              <ore-skeleton variant="text" lines="3" width="100%"></ore-skeleton>
              <ore-skeleton variant="text" lines="1" width="60%"></ore-skeleton>
            </div>
          `,
        )}
      </div>

      <div class="region region-placeholder">
        <div class="override override-empty">
          <slot name="empty" @slotchange=${onSlotFilled((value) => (hasEmptySlot.value = value))}></slot>
        </div>
        <div class="override override-error">
          <slot name="error" @slotchange=${onSlotFilled((value) => (hasErrorSlot.value = value))}></slot>
        </div>
        ${placeholder}
      </div>

      <div class="region region-success" role="presentation">
        <slot></slot>
      </div>
    `;
  },
  styles: [componentStyles],
});
