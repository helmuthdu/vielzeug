import { define, each, getHost, html, onCleanup, onMounted, prop, ref, useEmit, when } from '@vielzeug/ore';
import { watch } from '@vielzeug/ripple';

import type { DialogCloseReason, OverlayOpenChangeDetail, OverlayOpenReason } from '../../core';
import { reducedMotionMixin } from '../../styles';

import componentStyles from './chat-panel.css?inline';

export { CHIP_TAG } from '../../feedback/chip/chip';
export { BUTTON_TAG } from '../../inputs/button/button';
export { MESSAGE_COMPOSER_TAG } from '../../inputs/message-composer/message-composer';
export { AVATAR_TAG } from '../avatar/avatar';
export { CHAT_MESSAGE_TAG } from '../chat-message/chat-message';
export { ICON_TAG } from '../icon/icon';
/** Who authored a panel message. */
export type OreChatPanelSender = 'assistant' | 'user';

/** A message in the panel's transcript. `action` renders a follow-up button under assistant replies. */
export type OreChatPanelMessage = {
  /** Optional follow-up action shown as a button beneath the message. */
  action?: { label: string; payload?: unknown };
  sender: OreChatPanelSender;
  text: string;
};

/** A suggested question shown while the transcript holds only the greeting. */
export type OreChatPanelSuggestion = { label: string; value: string };

/** Labels the panel renders; every one has an English default for consumers without i18n. */
export type OreChatPanelLabels = Partial<{
  assistantName: string;
  close: string;
  composerLabel: string;
  composerPlaceholder: string;
  conversation: string;
  startOver: string;
  status: string;
  suggestions: string;
}>;

/** Element interface exposing the imperative API for `ore-chat-panel`. */
export interface ChatPanelElement extends HTMLElement, OreChatPanelProps {
  /** Closes the panel and restores focus to the element passed to `show()`. */
  hide(): void;
  /** Opens the panel, remembering `trigger` to restore focus to when it closes. */
  show(trigger?: HTMLElement): void;
}

export type OreChatPanelEvents = {
  /** A composer send or suggestion click was submitted; append the assistant reply to `messages`. */
  send: { text: string };
  /** The action button on a message was activated; `payload` is whatever the message carried. */
  action: { payload: unknown };
  /** The transcript was cleared back to `messages` via the Start over button. */
  reset: Record<string, never>;
  /** Open state changed, with the reason it changed. */
  'open-change': OverlayOpenChangeDetail;
};

export type OreChatPanelProps = {
  /** Accessible name for the panel region. */
  label?: string;
  /** Suggested questions shown while the transcript holds only the greeting. */
  suggestions?: OreChatPanelSuggestion[];
  /** Transcript. Mutate the array and reassign to update the panel. */
  messages?: OreChatPanelMessage[];
  /** Initials for the assistant avatar (default `'V'`). */
  initials?: string;
  /** Maximum composer length (default `240`). */
  maxlength?: number;
  /** All rendered labels, each with an English default. */
  labels?: OreChatPanelLabels;
  /** Open the panel. */
  open?: boolean;
};

const DEFAULT_LABELS = {
  assistantName: 'Assistant',
  close: 'Close',
  composerLabel: 'Message',
  composerPlaceholder: 'Ask a question…',
  conversation: 'Conversation',
  startOver: 'Start over',
  status: 'Demo assistant · replies instantly',
  suggestions: 'Suggested questions',
} as const;

const DEFAULT_INITIALS = 'V';
const DEFAULT_MAXLENGTH = 240;

/**
 * A self-contained assistant chat surface: the fixed corner window a demo or support
 * flow needs: header with title, status, Start over and close; a live-region message
 * transcript built from `ore-chat-message`; suggested questions while the transcript
 * holds only the greeting; and an `ore-message-composer` footer.
 *
 * The panel owns presentation and interaction only. Reply generation, persistence, and
 * action semantics stay with the consumer: listen for `send`, append the assistant reply
 * to `messages`, and reassign the array; handle `action` for whatever a message's action
 * payload means in your app.
 *
 * @element ore-chat-panel
 *
 * @attr {string} label - Accessible name for the panel region
 * @attr {boolean} open - Open state
 * @attr {string} initials - Assistant avatar initials (default 'V')
 * @attr {number} maxlength - Composer character limit (default 240)
 *
 * @fires send - A send or suggestion was submitted. detail: { text }
 * @fires action - A message action button was activated. detail: { payload }
 * @fires reset - The transcript was cleared via Start over.
 * @fires open-change - Open state changed. detail: { open, reason }
 *
 * @slot header - Replaces the default title/status header content
 *
 * @cssprop --chat-panel-width - Panel width (default min(420px, viewport-fit))
 * @cssprop --chat-panel-height - Panel height (default min(640px, viewport-fit))
 * @cssprop --chat-panel-inset - Distance from the viewport corner (default --size-6)
 * @cssprop --chat-panel-z-index - Stacking order (default --z-fixed)
 *
 * @part window - The fixed panel window
 * @part header - Header row
 * @part body - Scrollable transcript area
 * @part messages - Message list (role=log)
 * @part suggestions - Suggestion chips row
 * @part composer - Composer footer
 *
 * @example
 * ```html
 * <ore-chat-panel id="advisor" label="Model advisor"></ore-chat-panel>
 * <script type="module">
 *   import '@vielzeug/refine/chat-panel';
 *
 *   const panel = document.getElementById('advisor');
 *   panel.messages = [{ sender: 'assistant', text: 'Hi! What can I help with?' }];
 *   panel.addEventListener('send', (event) => {
 *     panel.messages = [
 *       ...panel.messages,
 *       { sender: 'user', text: event.detail.text },
 *       { sender: 'assistant', text: 'Let me look into that.' },
 *     ];
 *   });
 *   panel.show();
 * </script>
 * ```
 */
export const CHAT_PANEL_TAG = 'ore-chat-panel' as const;
define<OreChatPanelProps>(CHAT_PANEL_TAG, {
  props: {
    initials: prop.string(DEFAULT_INITIALS),
    label: prop.string(),
    labels: prop.data<Partial<OreChatPanelLabels>>({}),
    maxlength: prop.number(DEFAULT_MAXLENGTH),
    messages: prop.data<OreChatPanelMessage[]>([]),
    open: prop.bool(false),
    suggestions: prop.data<OreChatPanelSuggestion[]>([]),
  },
  setup(props) {
    const host = getHost() as ChatPanelElement;
    const emit = useEmit<OreChatPanelEvents>();
    const messageList = ref<HTMLElement>();
    const panel = ref<HTMLElement>();
    let returnFocus: HTMLElement | undefined;
    // Why the panel last changed open state, so the `open-change` emitted by the
    // reactive `open` watch can report the reason even when the change came from a
    // button, Escape, or `show()`/`hide()` rather than a direct `open` assignment.
    let pendingReason: OverlayOpenReason | DialogCloseReason = 'programmatic';

    const label = (key: keyof typeof DEFAULT_LABELS): string => props.labels.value?.[key] ?? DEFAULT_LABELS[key];
    // `prop.data` props are typed optional (the props interface is the public
    // shape), so reads fall back to the same defaults the prop definitions set.
    const messages = (): OreChatPanelMessage[] => props.messages.value ?? [];
    const suggestions = (): OreChatPanelSuggestion[] => props.suggestions.value ?? [];

    // `props.open` is a read-only Readable in setup; the element's own `open`
    // accessor (installed by `define`) is the writable side of the same signal and
    // reflects the attribute, so every close path routes through it.
    const requestClose = (reason: DialogCloseReason): void => {
      pendingReason = reason;
      host.open = false;
    };

    const requestOpen = (reason: OverlayOpenReason, trigger?: HTMLElement): void => {
      returnFocus = trigger;
      pendingReason = reason;
      host.open = true;
    };

    host.show = (trigger) => requestOpen('programmatic', trigger);
    host.hide = () => requestClose('programmatic');

    // Single source of truth: `open` is the only reactive open state, so attribute
    // changes, property writes, and show()/hide() all flow through here.
    watch(
      () => props.open.value,
      (open) => {
        emit('open-change', { open: open ?? false, reason: pendingReason });

        if (open) {
          requestAnimationFrame(() => panel.value?.focus());
        } else {
          requestAnimationFrame(() => returnFocus?.focus());
        }
      },
    );

    const scrollToLatest = (): void => {
      requestAnimationFrame(() =>
        messageList.value?.scrollTo({ behavior: 'auto', top: messageList.value.scrollHeight }),
      );
    };

    const send = (text: string): void => {
      const trimmed = text.trim();
      if (!trimmed) return;
      emit('send', { text: trimmed });
      requestAnimationFrame(scrollToLatest);
    };

    const reset = (): void => {
      emit('reset', {});
      requestAnimationFrame(scrollToLatest);
    };

    // The composer's own `send` is composed and would otherwise bubble past the
    // panel; the panel re-emits its own `send` with a stable `{ text }` detail, so
    // the raw event is swallowed at the panel boundary.
    const handleComposerSend = (event: CustomEvent<{ value: string }>): void => {
      event.stopPropagation();
      send(event.detail.value);
    };

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && props.open.value) requestClose('escape');
    };
    onMounted(() => {
      document.addEventListener('keydown', closeOnEscape);
    });
    onCleanup(() => document.removeEventListener('keydown', closeOnEscape));

    return html`
      <aside
        class="window"
        part="window"
        role="region"
        aria-label="${() => props.label.value ?? ''}"
        tabindex="-1"
        ?hidden="${() => !props.open.value}"
        ref="${panel}"
        @keydown="${(event: KeyboardEvent) => {
          if (event.key === 'Escape') requestClose('escape');
        }}">
        <header class="header" part="header">
          <slot name="header">
            <div class="identity">
              <strong>${() => props.label.value ?? ''}</strong>
              <span class="status"><i class="status-dot" aria-hidden="true"></i>${() => label('status')}</span>
            </div>
          </slot>
          <div class="tools">
            ${when(
              () => messages().length > 1,
              () =>
                html`<ore-button size="sm" variant="text" @click="${reset}">${() => label('startOver')}</ore-button>`,
            )}
            <ore-button
              icon-only
              label="${() => `${label('close')} ${props.label.value ?? ''}`.trim()}"
              size="sm"
              variant="ghost"
              @click="${() => requestClose('trigger')}">
              <ore-icon name="x" size="17" aria-hidden="true"></ore-icon>
            </ore-button>
          </div>
        </header>
        <div class="body" part="body">
          <div
            class="messages"
            part="messages"
            role="log"
            aria-live="polite"
            aria-label="${() => label('conversation')}"
            tabindex="0"
            ref="${messageList}">
            ${each(
              messages,
              (message, index) => `${index}:${message.sender}:${message.text.slice(0, 24)}`,
              (message) => html`
                <ore-chat-message
                  sender="${() => (message.value.sender === 'user' ? 'user' : 'assistant')}"
                  name="${() => (message.value.sender === 'user' ? null : label('assistantName'))}">
                  ${() =>
                    message.value.sender === 'assistant'
                      ? html`<ore-avatar
                          slot="avatar"
                          initials="${() => props.initials.value}"
                          size="sm"
                          color="primary"></ore-avatar>`
                      : ''}
                  ${() => message.value.text}
                  ${() =>
                    message.value.action
                      ? html`<ore-button
                          slot="actions"
                          size="sm"
                          variant="text"
                          @click="${() => emit('action', { payload: message.value.action?.payload })}">
                          ${() => message.value.action?.label}
                          <ore-icon slot="suffix" name="arrow-right" size="14" aria-hidden="true"></ore-icon>
                        </ore-button>`
                      : ''}
                </ore-chat-message>
              `,
            )}
          </div>
          ${when(
            () => messages().length === 1 && suggestions().length > 0,
            () => html`
              <div class="suggestions" part="suggestions" role="group" aria-label="${() => label('suggestions')}">
                ${each(
                  suggestions,
                  (suggestion) => suggestion.label,
                  (suggestion) => html`
                    <ore-chip mode="action" variant="outline" @click="${() => send(suggestion.value.value)}">
                      ${() => suggestion.value.label}
                    </ore-chip>
                  `,
                )}
              </div>
            `,
          )}
        </div>
        <div class="composer" part="composer">
          <ore-message-composer
            color="primary"
            fullwidth
            label="${() => label('composerLabel')}"
            maxlength="${() => props.maxlength.value}"
            placeholder="${() => label('composerPlaceholder')}"
            variant="flat"
            @send="${handleComposerSend}"></ore-message-composer>
        </div>
      </aside>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
