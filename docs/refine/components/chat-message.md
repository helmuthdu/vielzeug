# Chat Message

A single message bubble for chat and conversation UIs — sender-aware alignment, an optional avatar slot, delivery status (sending/sent/error with retry), and a streaming cursor for assistant replies still generating. Content is provided via the default slot, so any markdown-to-HTML rendering stays your choice — `ore-chat-message` doesn't parse or sanitize content itself.

## Basic Usage

`sender` controls alignment and bubble color: `user` messages align to the end of the row with a primary-tinted bubble; `assistant` (the default) and `system` align to the start with a neutral bubble.

<ComponentPreview vertical>

```html
<ore-chat-message sender="user">What's the weather like in Lisbon today?</ore-chat-message>
<ore-chat-message sender="assistant" name="Assistant">
  It's sunny and 22°C in Lisbon right now, with a light breeze from the Atlantic.
</ore-chat-message>
```

</ComponentPreview>

## Avatar and Name

Pass an `ore-avatar` (or any element) into the `avatar` slot, and a display `name` shown above the bubble.

<ComponentPreview vertical>

```html
<ore-chat-message sender="assistant" name="Assistant">
  <ore-avatar slot="avatar" initials="AI" color="primary" size="sm"></ore-avatar>
  Here's a summary of the changes in your pull request.
</ore-chat-message>
```

</ComponentPreview>

## Timestamp

Pass an ISO 8601 `timestamp` — it renders as a localized short time inside a semantic `<time>` element.

<ComponentPreview vertical>

```html
<ore-chat-message sender="user" timestamp="2024-06-01T14:32:00Z">Can you review this for me?</ore-chat-message>
```

</ComponentPreview>

## Delivery Status

Set `status` on outgoing messages to show an inline indicator: a spinner while `sending`, a checkmark once `sent`, or an error icon with an automatic **Retry** action and error text for `error`. A failed send is also announced to screen readers — including a retry that fails again with a *different* `error` message, even without leaving `status="error"` in between.

<ComponentPreview vertical>

```html
<ore-chat-message sender="user" status="sending" timestamp="2024-06-01T14:32:00Z">Uploading the file…</ore-chat-message>
<ore-chat-message sender="user" status="sent" timestamp="2024-06-01T14:32:00Z">Here's the file you asked for.</ore-chat-message>
<ore-chat-message id="failed-message" sender="user" status="error" error="Network error" timestamp="2024-06-01T14:32:00Z"
  >Can you check this again?</ore-chat-message
>

<script type="module">
  import '@vielzeug/refine/chat-message';

  document.getElementById('failed-message').addEventListener('retry', () => {
    // Re-send the message and update `status` once you know the outcome.
  });
</script>
```

</ComponentPreview>

## Streaming Responses

Set `streaming` while an assistant reply is still generating — it appends a blinking cursor after the current content. Update the slotted content as new tokens arrive; remove `streaming` once the response completes.

<ComponentPreview vertical>

```html
<ore-chat-message id="streaming-message" sender="assistant" name="Assistant" streaming>
  Let me look that up for you
</ore-chat-message>

<script type="module">
  import '@vielzeug/refine/chat-message';

  const message = document.getElementById('streaming-message');

  // As tokens arrive from your stream:
  // message.textContent += token;
  // When the stream ends:
  // message.removeAttribute('streaming');
</script>
```

</ComponentPreview>

Pair this with [`ore-typing-indicator`](./typing-indicator.md) for the moment *before* the first token arrives — the indicator represents "composing a reply," while `streaming` represents "reply is arriving."

## Actions

Use the `actions` slot for per-message controls such as copy, regenerate, or feedback buttons. These typically appear on hover/focus in your own CSS.

<ComponentPreview vertical>

```html
<ore-chat-message sender="assistant" name="Assistant">
  The capital of Portugal is Lisbon.
  <div slot="actions">
    <ore-button variant="ghost" size="sm" aria-label="Copy message">
      <ore-icon name="copy" size="14"></ore-icon>
    </ore-button>
    <ore-button variant="ghost" size="sm" aria-label="Regenerate response">
      <ore-icon name="refresh-cw" size="14"></ore-icon>
    </ore-button>
  </div>
</ore-chat-message>
```

</ComponentPreview>

## Building a Conversation List

`ore-chat-message` renders a single message — pair it with [`@vielzeug/scroll`](/scroll/)'s `stickToBottom` option to auto-follow new messages while the user is at the bottom of the conversation:

```ts
import { createDomVirtualList } from '@vielzeug/scroll';
import '@vielzeug/refine/chat-message';

const chat = createDomVirtualList({
  estimateSize: 72,
  getItemKey: (_, m) => m.id,
  listElement: listEl,
  scrollElement: scrollEl,
  stickToBottom: true,
  render({ items, listEl, recycle }) {
    for (const item of items) {
      const el = recycle(item.data.id, () => document.createElement('ore-chat-message'));

      el.setAttribute('sender', item.data.sender);
      el.textContent = item.data.text;
      el.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.start}px);`;
      listEl.appendChild(el);
    }
  },
});

chat.setItems(messages);
```

## API Reference

### Attributes

| Attribute   | Type                                    | Default    | Description                                                                 |
| ----------- | ---------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `sender`    | `'user' \| 'assistant' \| 'system'`      | `'assistant'` | Who sent the message — controls alignment and bubble styling               |
| `name`      | `string`                                 | —          | Display name shown above the bubble (falls back to "You"/"Assistant"/"System" in the accessible label) |
| `timestamp` | `string`                                 | —          | ISO 8601 timestamp, rendered as a localized short time                     |
| `status`    | `'sending' \| 'sent' \| 'error'`         | —          | Delivery status indicator; `'error'` also shows a retry action and error text |
| `error`     | `string`                                 | —          | Error detail shown beneath the bubble when `status="error"`                |
| `streaming` | `boolean`                                | `false`    | Append a blinking cursor after the content                                 |

### Events

| Event   | Detail                        | Description                                             |
| ------- | ------------------------------ | -------------------------------------------------------- |
| `retry` | `{ originalEvent?: Event }`   | Fired when the retry action is activated (`status="error"` only) |

### Slots

| Slot      | Description                                             |
| --------- | -------------------------------------------------------- |
| (default) | Message content                                          |
| `avatar`  | Avatar element (e.g. `<ore-avatar>`)                     |
| `actions` | Action buttons shown beneath the message                 |

### CSS Custom Properties

| Property                       | Description                          | Default                 |
| ------------------------------- | -------------------------------------- | -------------------------- |
| `--chat-message-bg`            | Bubble background color (assistant/system) | `var(--color-contrast-100)` |
| `--chat-message-color`         | Bubble text color (assistant/system)   | `var(--color-contrast-900)` |
| `--chat-message-user-bg`       | Bubble background color (user)         | `var(--color-primary)`     |
| `--chat-message-user-color`    | Bubble text color (user)               | `var(--color-primary-content)` |
| `--chat-message-radius`        | Bubble border radius                   | `var(--rounded-lg)`        |
| `--chat-message-max-width`     | Maximum bubble width                   | `36rem`                    |

## Accessibility

Each message bubble carries `role="article"` with an `aria-label` describing who sent it (e.g. "Message from You", or "Message from Alex" when `name` is set) — screen reader users navigating by landmark or region get a clear boundary between messages without depending on visual alignment.

A failed send (`status="error"`) is announced once via an assertive live region in addition to the always-visible error text and retry button, so the failure isn't silently missed by screen reader users who aren't focused on the message at the moment it fails. The streaming cursor is `aria-hidden`, since it's a purely visual "still typing" cue — screen readers announce new content as it's added to the slot, independent of the cursor.

Place `ore-chat-message` elements inside a container with `role="log"` (or `aria-live="polite"`) to have new messages announced automatically as a conversation progresses; the message component itself only handles the per-message semantics.

### A note on the default slot

`ore-chat-message` trims the default slot's leading/trailing whitespace-only text nodes in place, once per slot assignment (on connect, and again on `slotchange`) — pretty-printed HTML's indentation would otherwise render as blank lines, since the bubble preserves line breaks for genuine multi-paragraph replies. This mutates those specific text nodes directly; it never touches text appended afterward (e.g. `el.textContent += token` while streaming), only the nodes present when the slot was assigned.
