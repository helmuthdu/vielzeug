# Chat Panel

A self-contained assistant chat surface: the fixed corner window a demo or support flow needs: a header with title, status, **Start over** and close; a live-region transcript built from [`ore-chat-message`](./chat-message.md); suggested questions while the transcript holds only the greeting; and an [`ore-message-composer`](./message-composer.md) footer.

The panel owns presentation and interaction only. **Reply generation, persistence, and action semantics stay with you**: listen for `send`, append the assistant reply to `messages`, and reassign the array; handle `action` for whatever a message's action payload means in your app.

## Basic Usage

Set `label` for the region's accessible name, seed `messages` with a greeting, and open the panel. On `send`, append the user's text and your reply, then reassign `messages`: the panel re-renders and scrolls to the newest message.

<ComponentPreview vertical>

```html
<ore-chat-panel id="advisor" label="Model advisor" open></ore-chat-panel>

<script type="module">
  import '@vielzeug/refine/chat-panel';

  const panel = document.getElementById('advisor');

  panel.messages = [{ sender: 'assistant', text: 'Hi! What can I help you find?' }];

  panel.addEventListener('send', (event) => {
    panel.messages = [
      ...panel.messages,
      { sender: 'user', text: event.detail.text },
      { sender: 'assistant', text: 'Let me look into that for you.' },
    ];
  });
</script>
```

</ComponentPreview>

## Suggestions

While the transcript holds only the greeting (a single message), `suggestions` render as clickable chips. Clicking one emits `send` with the suggestion's `value`, exactly as if it had been typed, so your `send` handler is the only place replies are produced. The chips disappear once the conversation has started.

<ComponentPreview vertical>

```html
<ore-chat-panel id="advisor2" label="Model advisor" open></ore-chat-panel>

<script type="module">
  import '@vielzeug/refine/chat-panel';

  const panel = document.getElementById('advisor2');

  panel.messages = [{ sender: 'assistant', text: 'Hi! What matters most to you?' }];
  panel.suggestions = [
    { label: 'Range', value: 'How far can it go on a charge?' },
    { label: 'Space', value: 'How much room is there in the back?' },
    { label: 'Power', value: 'How much power does it make?' },
  ];

  panel.addEventListener('send', (event) => {
    panel.messages = [
      ...panel.messages,
      { sender: 'user', text: event.detail.text },
      { sender: 'assistant', text: 'Great question: here are the details.' },
    ];
  });
</script>
```

</ComponentPreview>

## Message Actions

An assistant message can carry an `action`: a follow-up button rendered beneath the bubble. Clicking it emits `action` with whatever `payload` the message carried, so you decide what it means (scroll to a spec section, open a booking form, navigate). The panel never interprets the payload itself.

<ComponentPreview vertical>

```html
<ore-chat-panel id="advisor3" label="Model advisor" open></ore-chat-panel>

<script type="module">
  import '@vielzeug/refine/chat-panel';

  const panel = document.getElementById('advisor3');

  panel.messages = [
    {
      sender: 'assistant',
      text: 'It has a 420 km range. Want the full specifications?',
      action: { label: 'See specifications', payload: 'specifications' },
    },
  ];

  panel.addEventListener('action', (event) => {
    console.log('Follow-up requested:', event.detail.payload);
  });
</script>
```

</ComponentPreview>

## Opening and Closing

The panel is a fixed, non-modal window. Toggle it with the `open` attribute/property, or call `show()`/`hide()`: `show()` remembers the triggering element and restores focus to it on close. Escape closes it, and every change emits `open-change` with the reason.

<ComponentPreview vertical>

```html
<ore-button id="open-advisor">Ask the advisor</ore-button>
<ore-chat-panel id="advisor4" label="Model advisor"></ore-chat-panel>

<script type="module">
  import '@vielzeug/refine/chat-panel';

  const panel = document.getElementById('advisor4');

  panel.messages = [{ sender: 'assistant', text: 'Hi! How can I help?' }];

  document.getElementById('open-advisor').addEventListener('click', (event) => {
    panel.show(event.currentTarget);
  });

  panel.addEventListener('open-change', (event) => {
    console.log('open:', event.detail.open, 'reason:', event.detail.reason);
  });
</script>
```

</ComponentPreview>

## Localising Labels

Every string the panel renders has an English default. Pass a `labels` object to override any subset: handy when your app is not in English. The composer placeholder, close button, Start over, and section headings all come from here.

```ts
panel.labels = {
  assistantName: 'Berater',
  close: 'Schließen',
  composerPlaceholder: 'Stellen Sie eine Frage…',
  startOver: 'Neu beginnen',
  status: 'Demo-Assistent · antwortet sofort',
};
```

## API Reference

### Attributes

| Attribute     | Type      | Default | Description                                                    |
| ------------- | --------- | ------- | -------------------------------------------------------------- |
| `label`       | `string`  | N/A | Accessible name for the panel region                            |
| `open`        | `boolean` | `false` | Open state. Reflects as an attribute, so it can be toggled declaratively |
| `initials`    | `string`  | `'V'`   | Assistant avatar initials                                       |
| `maxlength`   | `number`  | `240`   | Composer character limit                                        |

`messages`, `suggestions`, and `labels` are JavaScript properties (not attributes): assign arrays/objects directly. Mutate by reassigning the property; the panel re-renders on each new array.

### Properties

| Property      | Type                          | Default | Description                                                    |
| ------------- | ----------------------------- | ------- | -------------------------------------------------------------- |
| `messages`    | `OreChatPanelMessage[]`       | `[]`    | Transcript. Reassign to update.                                |
| `suggestions` | `OreChatPanelSuggestion[]`    | `[]`    | Suggested questions shown while only the greeting is present.  |
| `labels`      | `Partial<OreChatPanelLabels>` | `{}`    | Overrides for the rendered labels.                             |

An `OreChatPanelMessage` is `{ sender: 'user' \| 'assistant'; text: string; action?: { label: string; payload?: unknown } }`. A suggestion is `{ label: string; value: string }`.

### Methods

| Method             | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| `show(trigger?)`   | Opens the panel, remembering `trigger` to restore focus to when it closes. |
| `hide()`           | Closes the panel and restores focus to the element passed to `show()`.    |

### Events

| Event         | Detail                              | Description                                                            |
| ------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `send`        | `{ text: string }`                  | A composer send or suggestion click was submitted. Append the reply to `messages`. |
| `action`      | `{ payload: unknown }`              | A message's action button was activated. `payload` is whatever the message carried. |
| `reset`       | `{}`                                | The **Start over** button was clicked. Reset `messages` to the greeting. |
| `open-change` | `{ open: boolean; reason: string }` | Open state changed, with the reason it changed.                        |

### Slots

| Slot     | Description                                       |
| -------- | ------------------------------------------------- |
| `header` | Replaces the default title/status header content. |

### CSS Custom Properties

| Property                 | Description                          | Default                              |
| ------------------------ | ------------------------------------ | ------------------------------------ |
| `--chat-panel-width`     | Panel width                          | `min(420px, calc(100vw - var(--size-12)))` |
| `--chat-panel-height`    | Panel height                         | `min(640px, calc(100dvh - var(--size-12)))` |
| `--chat-panel-inset`     | Distance from the viewport corner    | `var(--size-6)`                      |
| `--chat-panel-z-index`   | Stacking order                       | `var(--z-fixed)`                     |

### Parts

`window`, `header`, `body`, `messages`, `suggestions`, `composer`.

## Accessibility

The window is a labelled `role="region"`. The transcript is a `role="log"` polite live region, so new messages are announced as the conversation progresses; it is also keyboard-focusable (`tabindex="0"`) so the scrollable list can be reached and scrolled without a mouse. The composer is a labelled [`ore-message-composer`](./message-composer.md), and the close button carries a composed accessible name (`"Close {label}"`).

Escape closes the panel and returns focus to the element passed to `show()` (when focus restoration is enabled). Because the panel is non-modal, focus is never trapped: background content stays reachable at any time.
