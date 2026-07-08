import { define, html, onEvent, onMounted, prop, ref, useEmit, useSlots } from '@vielzeug/ore';
import { computed, watch } from '@vielzeug/ripple';

import { announce } from '../../headless';
import { reducedMotionMixin } from '../../styles';
import '../icon/icon';
import componentStyles from './chat-message.css?inline';

export type ChatMessageSender = 'assistant' | 'system' | 'user';
export type ChatMessageStatus = 'error' | 'sending' | 'sent';

const SENDER_LABELS: Record<ChatMessageSender, string> = {
  assistant: 'Assistant',
  system: 'System',
  user: 'You',
};

/** Events emitted by the chat-message component */
export type OreChatMessageEvents = {
  /** Fired when the retry action is activated on a `status="error"` message */
  retry: { originalEvent?: Event };
};

/** Chat message component properties */
export type OreChatMessageProps = {
  /** Error detail shown beneath the bubble; only visible when `status="error"` */
  error?: string;
  /** Display name shown above the bubble (falls back to a generic label per `sender`) */
  name?: string;
  /** Who sent the message — controls alignment and bubble styling */
  sender?: ChatMessageSender;
  /** Delivery status for outgoing messages — shows an inline indicator and, for `"error"`, a retry action */
  status?: ChatMessageStatus;
  /** Append a blinking cursor after the content, for a message still streaming in */
  streaming?: boolean;
  /** ISO 8601 timestamp; rendered as a localized short time in a semantic `<time>` element */
  timestamp?: string;
};

/**
 * A single message bubble for chat/conversation UIs — sender-aware alignment, an optional
 * avatar slot, delivery status (sending/sent/error with retry), and a streaming cursor for
 * assistant messages still generating. Content is provided via the default slot, so any
 * markdown-to-HTML rendering stays the consumer's choice.
 *
 * The default slot's leading/trailing whitespace-only text nodes are trimmed in place once
 * per slot assignment (mount, and again on `slotchange`) — pretty-printed HTML's
 * indentation would otherwise render as blank lines, since the bubble preserves line breaks
 * (`white-space: pre-wrap`) for genuine multi-paragraph replies. This mutates those specific
 * text nodes' `textContent` directly; it never touches nodes appended afterward (e.g. by
 * `el.textContent += token` while streaming), only the ones present at assignment time.
 *
 * @element ore-chat-message
 *
 * @attr {string} sender - Who sent the message: 'user' | 'assistant' | 'system' (default 'assistant')
 * @attr {string} name - Display name shown above the bubble
 * @attr {string} timestamp - ISO 8601 timestamp, rendered as a localized short time
 * @attr {string} status - Delivery status: 'sending' | 'sent' | 'error'
 * @attr {string} error - Error detail shown beneath the bubble when status="error"
 * @attr {boolean} streaming - Append a blinking cursor after the content
 *
 * @fires retry - Fired when the retry action is activated. detail: { originalEvent }
 *
 * @slot - Message content
 * @slot avatar - Avatar element (e.g. `<ore-avatar>`)
 * @slot actions - Action buttons shown beneath the message (copy, regenerate, feedback, …)
 *
 * @cssprop --chat-message-bg - Bubble background color (assistant/system)
 * @cssprop --chat-message-color - Bubble text color (assistant/system)
 * @cssprop --chat-message-user-bg - Bubble background color (user)
 * @cssprop --chat-message-user-color - Bubble text color (user)
 * @cssprop --chat-message-radius - Bubble border radius
 * @cssprop --chat-message-max-width - Maximum bubble width
 *
 * @part row - Root row container (avatar + column)
 * @part avatar - Avatar slot container
 * @part column - Column containing name, bubble, meta, and actions
 * @part name - Sender display name
 * @part bubble - Message bubble container
 * @part content - Content container inside the bubble
 * @part cursor - Blinking streaming cursor
 * @part meta - Row of timestamp, status, and error text below the bubble
 * @part timestamp - Timestamp `<time>` element
 * @part status - Status indicator
 * @part error - Error text
 * @part retry - Retry button (status="error" only)
 * @part actions - Actions slot container
 *
 * @example
 * ```html
 * <ore-chat-message sender="user" timestamp="2024-01-01T12:00:00Z" status="sent">
 *   What's the weather like today?
 * </ore-chat-message>
 *
 * <ore-chat-message sender="assistant" name="Assistant" streaming>
 *   Let me check that for you
 * </ore-chat-message>
 * ```
 */
export const CHAT_MESSAGE_TAG = 'ore-chat-message' as const;
define<OreChatMessageProps>(CHAT_MESSAGE_TAG, {
  props: {
    error: prop.string(),
    name: prop.string(),
    sender: prop.oneOf(['user', 'assistant', 'system'] as const, 'assistant'),
    status: prop.string<ChatMessageStatus>(),
    streaming: prop.bool(false),
    timestamp: prop.string(),
  },
  setup(props) {
    const emit = useEmit<OreChatMessageEvents>();
    const slots = useSlots();

    const senderLabel = () => SENDER_LABELS[props.sender.value ?? 'assistant'];

    const bubbleLabel = computed(() => `Message from ${props.name.value || senderLabel()}`);

    const formattedTime = computed(() => {
      const raw = props.timestamp.value;

      if (!raw) return '';

      const date = new Date(raw);

      if (Number.isNaN(date.getTime())) return '';

      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
    });

    const hasMeta = computed(
      () => Boolean(formattedTime.value) || Boolean(props.status.value) || Boolean(props.error.value),
    );

    // Announce delivery failures — the visible retry button and error text are always present
    // for sighted users, but a failed send is exactly the kind of state change a screen
    // reader user could otherwise miss entirely. Keyed on `error` text too (not just
    // `status`) so a retry that fails again with a *different* reason re-announces even
    // though `status` never left `"error"` in between; a second failure with the identical
    // message doesn't re-fire, since the source value hasn't actually changed.
    watch(
      () => (props.status.value === 'error' ? (props.error.value ?? '') : null),
      (errorText) => {
        if (errorText !== null) {
          announce(`Message failed to send${errorText ? `: ${errorText}` : ''}`, { politeness: 'assertive' });
        }
      },
    );

    function handleRetry(e: Event): void {
      emit('retry', { originalEvent: e });
    }

    // ── Trim author-time indentation whitespace from the default slot ──
    // `.content` uses `white-space: pre-wrap` so genuine multi-paragraph replies keep their
    // line breaks — but that also preserves the leading/trailing newline + indentation from
    // pretty-printed HTML (`<ore-chat-message>\n  Hello\n</ore-chat-message>`), rendering as
    // visible blank lines around the text. Trim only the outermost edges once per slot
    // assignment; appending tokens to an existing text node for streaming doesn't re-fire
    // `slotchange`, so this never interferes with in-progress streaming updates.
    //
    // A named-slotted sibling (e.g. `<ore-avatar slot="avatar">` between the opening tag and
    // the message text) splits the default slot's light-DOM text into *multiple* text nodes
    // — text nodes can't target a named slot, so each run on either side of the element is
    // assigned separately. The "real" content can start on a later node than index 0 (it's
    // still preceded by its own leading indentation), so this walks inward from each end,
    // fully clearing whitespace-only nodes and stopping at the first node with real content
    // on each side — rather than only touching the very first/last assigned node.
    const contentSlotRef = ref<HTMLSlotElement>();

    function trimSlotEdgeWhitespace(): void {
      const nodes = contentSlotRef.value?.assignedNodes({ flatten: true });

      if (!nodes || nodes.length === 0) return;

      for (const node of nodes) {
        if (node.nodeType !== Node.TEXT_NODE) break;

        const trimmed = (node.textContent ?? '').replace(/^\s+/, '');

        node.textContent = trimmed;

        if (trimmed !== '') break;
      }

      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];

        if (node.nodeType !== Node.TEXT_NODE) break;

        const trimmed = (node.textContent ?? '').replace(/\s+$/, '');

        node.textContent = trimmed;

        if (trimmed !== '') break;
      }
    }

    onMounted(() => {
      trimSlotEdgeWhitespace();

      const slotEl = contentSlotRef.value;

      if (slotEl) onEvent(slotEl, 'slotchange', trimSlotEdgeWhitespace);
    });

    return html`
      <div class="row" part="row">
        <span class="avatar" part="avatar" ?hidden="${() => !slots.has('avatar').value}">
          <slot name="avatar"></slot>
        </span>
        <div class="column" part="column">
          <span class="name" part="name" ?hidden="${() => !props.name.value}">${props.name}</span>
          <div class="bubble" part="bubble" role="article" aria-label="${bubbleLabel}">
            <div class="content" part="content">
              <slot class="content-slot" ref="${contentSlotRef}"></slot>
              <span class="cursor" part="cursor" aria-hidden="true" ?hidden="${() => !props.streaming.value}"></span>
            </div>
          </div>
          <div class="meta" part="meta" ?hidden="${() => !hasMeta.value}">
            <time
              class="timestamp"
              part="timestamp"
              datetime="${props.timestamp}"
              ?hidden="${() => !formattedTime.value}"
              >${formattedTime}</time
            >
            <span class="status" part="status" data-status="${props.status}" ?hidden="${() => !props.status.value}">
              ${() => {
                switch (props.status.value) {
                  case 'error':
                    return html`<ore-icon
                      name="alert-circle"
                      size="12"
                      stroke-width="2.5"
                      aria-hidden="true"></ore-icon>`;
                  case 'sending':
                    return html`<span class="spinner" aria-hidden="true"></span>`;
                  case 'sent':
                    return html`<ore-icon name="check" size="12" stroke-width="2.5" aria-hidden="true"></ore-icon>`;
                  default:
                    return '';
                }
              }}
            </span>
            <span class="error-text" part="error" role="alert" ?hidden="${() => !props.error.value}"
              >${props.error}</span
            >
            <button
              class="retry"
              part="retry"
              type="button"
              ?hidden="${() => props.status.value !== 'error'}"
              @click="${handleRetry}">
              Retry
            </button>
          </div>
          <div class="actions" part="actions" ?hidden="${() => !slots.has('actions').value}">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
    `;
  },
  styles: [reducedMotionMixin, componentStyles],
});
