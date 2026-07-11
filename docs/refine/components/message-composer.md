# Message Composer

An auto-resizing composer for chat, comment, and reply boxes — a card with an auto-resizing field on top and a toolbar row below it for actions and the send button, the familiar "AI chat input" layout. It handles the send gesture (Enter to send, Shift+Enter for a newline, or a Ctrl/Cmd+Enter alternative), IME-safe composition, and clear-and-refocus after sending.

## Basic Usage

<ComponentPreview>

```html
<ore-message-composer id="composer" placeholder="Message…"></ore-message-composer>

<script type="module">
  import '@vielzeug/refine/message-composer';

  document.getElementById('composer').addEventListener('send', (e) => {
    console.log('sent:', e.detail.value);
  });
</script>
```

</ComponentPreview>

Press **Enter** to send, **Shift+Enter** for a newline, or click the send button. The field grows with the content and the send button stays disabled until there's non-blank text to send.

## Variants

The same five-value `variant` set as [`ore-textarea`](./textarea.md#variants), with the identical hover/focus recipe per variant, applied to the card instead of a bare field — so the composer doesn't read as a special case next to the rest of the field family. `solid` (the default) is a bordered, shadowed card. `flat` is filled and inset-shadowed rather than bordered — reach for it when embedding inside a container that already provides its own border (a dialog, a sidebar panel, an already-bordered chat pane), so the two borders don't double up. `ghost` is fully transparent until hovered or focused — reach for it when the composer should read as part of the surrounding surface rather than its own card. Side by side, `flat`'s filled background is what tells the two apart at rest; `ghost` only gains any background on interaction.

<ComponentPreview center>

```html
<ore-message-composer variant="solid" placeholder="Solid (default)…"></ore-message-composer>
<ore-message-composer variant="flat" placeholder="Flat, filled card…"></ore-message-composer>
<ore-message-composer variant="bordered" placeholder="Bordered…" color="primary"></ore-message-composer>
<ore-message-composer variant="outline" placeholder="Outline…"></ore-message-composer>
<ore-message-composer variant="ghost" placeholder="Ghost, transparent until focused…"></ore-message-composer>
```

</ComponentPreview>

## Sizes

Scales the card's padding along with the field's font size and toolbar gap, the same three tiers as the rest of the field family.

<ComponentPreview center>

```html
<ore-message-composer size="sm" placeholder="Small…"></ore-message-composer>
<ore-message-composer size="md" placeholder="Medium (default)…"></ore-message-composer>
<ore-message-composer size="lg" placeholder="Large…"></ore-message-composer>
```

</ComponentPreview>

## Send Shortcut

By default Enter sends and Shift+Enter inserts a newline — the same convention as Slack, Discord, and most AI chat UIs. Set `send-shortcut="mod+enter"` to flip that: Enter always inserts a newline, and only Ctrl+Enter (Cmd+Enter on macOS) sends. Use this for longer-form composers (e.g. a multi-paragraph comment box) where accidental sends are more costly than an extra keystroke.

<ComponentPreview>

```html
<ore-message-composer placeholder="Enter for a newline, ⌘+Enter to send…" send-shortcut="mod+enter">
</ore-message-composer>
```

</ComponentPreview>

`aria-keyshortcuts` on the field always reflects whichever mode is active, so assistive tech has a non-visual way to discover the shortcut even without a visible hint.

## Attachments and Extra Actions

The field sits on its own row at the top of the card; `prefix` and `suffix` are the two ends of the toolbar row underneath it — `prefix` for actions that come before the send button on the left (e.g. an attach button), `suffix` for actions right before the send button (e.g. an emoji picker trigger). Style slotted content yourself, same as [`ore-input`](./input.md)'s `prefix`/`suffix` slots. See [Rich Toolbar](#rich-toolbar-attachments-mode-model-pickers) below for composing dropdown pickers into the same slots.

<ComponentPreview>

```html
<ore-message-composer placeholder="Message…">
  <ore-button slot="prefix" variant="ghost" icon-only label="Attach file">
    <ore-icon name="paperclip"></ore-icon>
  </ore-button>
  <ore-button slot="suffix" variant="ghost" icon-only label="Add emoji">
    <ore-icon name="smile"></ore-icon>
  </ore-button>
</ore-message-composer>

<script type="module">
  import '@vielzeug/refine/message-composer';
  import '@vielzeug/refine/button';
  import '@vielzeug/refine/icon';
</script>
```

</ComponentPreview>

## Rich Toolbar: Attachments, Mode & Model Pickers

Both slots accept more than a single icon button — compose in [`ore-menu`](./menu.md) for dropdown pickers (an attach menu, a mode/model selector) alongside plain icon buttons, to build a fuller AI-chat-style toolbar. `ore-menu` accepts any element as its `trigger` slot, so a button showing an icon + label + chevron works the same as an icon-only one.

<ComponentPreview height="380px">

```html
<ore-message-composer placeholder="Describe your 3D object or scene…">
  <ore-menu slot="prefix" placement="top-start">
    <ore-button slot="trigger" variant="ghost" icon-only rounded="full" label="Add attachment">
      <ore-icon name="plus"></ore-icon>
    </ore-button>
    <ore-menu-item value="photos">
      <ore-icon slot="icon" name="image-plus" size="18"></ore-icon>
      Add photos or videos
    </ore-menu-item>
    <ore-menu-item value="3d-object">
      <ore-icon slot="icon" name="box" size="18"></ore-icon>
      Add 3D objects
    </ore-menu-item>
    <ore-menu-item value="files">
      <ore-icon slot="icon" name="file-plus" size="18"></ore-icon>
      Add files (docs, PDF…)
    </ore-menu-item>
  </ore-menu>

  <ore-menu slot="prefix" placement="top-start">
    <ore-button slot="trigger" variant="ghost" size="sm">
      <ore-icon slot="prefix" name="zap" size="16" color="success"></ore-icon>
      Fast
      <ore-icon slot="suffix" name="chevron-down" size="14"></ore-icon>
    </ore-button>
    <ore-menu-item value="fast" type="radio" checked>Fast</ore-menu-item>
    <ore-menu-item value="saving" type="radio">Saving</ore-menu-item>
    <ore-menu-item value="thinking" type="radio">Thinking</ore-menu-item>
  </ore-menu>

  <ore-menu slot="suffix" placement="top-end">
    <ore-button slot="trigger" variant="ghost" size="sm">
      Open Model 1.5
      <ore-icon slot="suffix" name="chevron-down" size="14"></ore-icon>
    </ore-button>
    <ore-menu-item value="open-model-1.5" type="radio" checked>Open Model 1.5</ore-menu-item>
    <ore-menu-item value="open-model-1.0" type="radio">Open Model 1.0</ore-menu-item>
  </ore-menu>

  <ore-button slot="suffix" variant="ghost" icon-only label="Voice input">
    <ore-icon name="mic"></ore-icon>
  </ore-button>
</ore-message-composer>

<script type="module">
  import '@vielzeug/refine/message-composer';
  import '@vielzeug/refine/menu';
  import '@vielzeug/refine/button';
  import '@vielzeug/refine/icon';
</script>
```

</ComponentPreview>

`placement="top-start"`/`"top-end"` opens each menu upward, which reads better for a composer pinned near the bottom of the viewport (the default `"bottom-start"` would open underneath it). [`ore-menu-item`'s `type="radio"`](./menu.md#radio-items) keeps only one mode/model option checked at a time — listen for `select` on the menu and update the trigger button's own text to reflect the current choice.

## Loading State

Set `loading` while a send is in flight — it shows a spinner on the send button and blocks further sends, without disabling the field (the user can keep typing the next message). Clear `loading` once the request settles.

```html
<ore-message-composer id="composer" placeholder="Message…"></ore-message-composer>

<script type="module">
  import '@vielzeug/refine/message-composer';

  const composer = document.getElementById('composer');

  composer.addEventListener('send', async (e) => {
    composer.setAttribute('loading', '');

    try {
      await sendMessage(e.detail.value);
    } finally {
      composer.removeAttribute('loading');
    }
  });
</script>
```

## Keeping the Draft on a Rejected Send

`send` is cancelable — call `preventDefault()` to keep the current text in the field instead of the default clear-and-refocus, e.g. to reject an empty-after-server-side-trim message or surface a validation error without losing what the user typed.

```html
<ore-message-composer id="composer"></ore-message-composer>

<script type="module">
  import '@vielzeug/refine/message-composer';

  document.getElementById('composer').addEventListener('send', (e) => {
    if (e.detail.value.length > 2000) {
      e.preventDefault();
      alert('Message is too long.');
    }
  });
</script>
```

Set `clear-on-send="false"` instead if you always want to keep the draft until you clear it yourself (e.g. `composer.value = ''`) once a send succeeds.

## Character Limit

Set `maxlength` to show a character counter, with the same near-limit/at-limit styling as [`ore-textarea`'s counter](./textarea.md#character-counter).

<ComponentPreview>

```html
<ore-message-composer placeholder="Keep it short…" maxlength="140"></ore-message-composer>
```

</ComponentPreview>

## Custom Send Button

For a different icon or accessible label on the default button, set `send-icon`/`send-label` instead of replacing it:

```html
<ore-message-composer placeholder="Message…" send-icon="send" send-label="Submit"></ore-message-composer>
```

For anything beyond that — a different variant, an extra icon, custom styling — provide a `send` slot to replace the default send button entirely; the composer stops rendering its own button (and `send-icon`/`send-label` stop applying) once anything is slotted there.

```html
<ore-message-composer placeholder="Message…">
  <ore-button slot="send" variant="solid">Send</ore-button>
</ore-message-composer>
```

## Building a Chat Interface

Pair `ore-message-composer` with [`ore-chat-message`](./chat-message.md) and [`ore-typing-indicator`](./typing-indicator.md) for the message list, and `@vielzeug/scroll`'s `stickToBottom` option to keep the conversation scrolled to the latest message:

```html
<div id="conversation"></div>
<ore-message-composer id="composer" placeholder="Message…"></ore-message-composer>

<script type="module">
  import { createDomVirtualList } from '@vielzeug/scroll';
  import '@vielzeug/refine/chat-message';
  import '@vielzeug/refine/message-composer';

  const chat = createDomVirtualList({
    estimateSize: 72,
    getItemKey: (_, m) => m.id,
    listElement: document.getElementById('conversation'),
    scrollElement: document.getElementById('conversation'),
    stickToBottom: true,
    render({ items, listEl, recycle }) {
      for (const item of items) {
        const el = recycle(item.data.id, () => document.createElement('ore-chat-message'));

        el.setAttribute('sender', item.data.sender);
        el.textContent = item.data.text;
        listEl.appendChild(el);
      }
    },
  });

  document.getElementById('composer').addEventListener('send', (e) => {
    chat.setItems([...messages, { id: crypto.randomUUID(), sender: 'user', text: e.detail.value }]);
  });
</script>
```

If you're building a Slack/Notion-style inline `/`-command menu anchored under the caret, reach for [`ore-combobox`](./combobox.md) or [`ore-menu`](./menu.md) rather than `ore-command-palette` — the palette is a centered, global `⌘K`-style modal, not an anchored dropdown.

## API Reference

### Attributes

| Attribute         | Type                          | Default             | Description                                                                                          |
| ----------------- | ------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `value`           | `string`                       | —                    | Current text value                                                                                     |
| `placeholder`     | `string`                       | —                    | Placeholder text                                                                                       |
| `label`           | `string`                       | `'Message'`          | Accessible name for the field — never rendered visually, only as `aria-label`                          |
| `name`            | `string`                       | —                    | Form field name                                                                                        |
| `helper`          | `string`                       | —                    | Helper text shown below the field                                                                      |
| `error`           | `string`                       | —                    | Error message shown below the field                                                                    |
| `disabled`        | `boolean`                      | `false`              | Disable the whole composer (field, slots, and send action)                                             |
| `readonly`        | `boolean`                      | `false`              | Read-only mode                                                                                          |
| `required`        | `boolean`                      | `false`              | Fails constraint validation while blank — `<ore-form>` blocks submit and `checkValidity()`/`reportValidity()` return `false` |
| `loading`         | `boolean`                      | `false`              | Blocks further sends (e.g. a send is already in flight) without disabling editing                       |
| `maxlength`       | `number`                       | —                    | Max character count; shows a counter                                                                   |
| `rows`            | `number`                       | `1`                  | Visible rows before auto-resize grows the field                                                        |
| `color`           | `ThemeColor`                   | —                    | Theme color (card focus ring + default send button color)                                              |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost'` | `'solid'` | Visual variant of the card — same set as `ore-textarea`, see [Variants](#variants)         |
| `size`            | `'sm' \| 'md' \| 'lg'`         | —                    | Component size                                                                                          |
| `fullwidth`       | `boolean`                      | `false`              | Stretch the composer to the full width of its container                                                |
| `send-icon`       | `string`                       | `'arrow-up'`         | Lucide icon name for the default send button                                                            |
| `send-label`      | `string`                       | `'Send message'`     | Accessible label for the default send button                                                            |
| `send-shortcut`   | `'enter' \| 'mod+enter'`       | `'enter'`            | Keyboard shortcut that sends                                                                            |
| `clear-on-send`   | `boolean`                      | `true`               | Clear the value and refocus after a non-cancelled `send`                                                |

### Events

| Event   | Detail                                          | Description                                                                                 |
| ------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `input` | `{ value: string; originalEvent: Event }`        | Fired on every keystroke                                                                     |
| `send`  | `{ value: string; originalEvent: KeyboardEvent \| MouseEvent }` | Fired on a send attempt. Cancelable — `preventDefault()` keeps the current text instead of clearing |

### Slots

| Slot      | Description                                                          |
| --------- | ---------------------------------------------------------------------- |
| `prefix`  | Toolbar-row content at the start, before the send button (e.g. an attach button) |
| `suffix`  | Toolbar-row content at the end, right before the send button (e.g. an emoji trigger) |
| `send`    | Replaces the default send button entirely                             |

### CSS Custom Properties

| Property                            | Description                                              | Default                    |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| `--message-composer-bg`             | Card background color                                    | `var(--color-contrast-50)`  |
| `--message-composer-border-color`   | Card border color                                         | `var(--color-contrast-300)` |
| `--message-composer-radius`         | Card border radius                                        | `var(--rounded-2xl)`        |
| `--message-composer-padding`        | Card inner padding                                        | `var(--size-3)`             |
| `--message-composer-gap`            | Gap between the field/toolbar rows and between toolbar items | size-based, per `size`   |
| `--message-composer-placeholder-color` | Field placeholder text color                           | `var(--color-contrast-500)` |
| `--message-composer-min-height`      | Minimum field height                                       | `1lh` (one line)             |
| `--message-composer-hover-bg`        | Card background on hover (`flat`/`ghost` variants)        | Variant-dependent            |
| `--message-composer-hover-border-color` | Card border on hover (`flat`/`bordered` variants)      | Variant-dependent            |
| `--message-composer-focus-bg`        | Card background when focused (`flat` variant)              | Variant-dependent            |
| `--message-composer-focus-border-color` | Card border when focused (`flat` variant)              | Variant-dependent            |

The card owns all of the composer's visual chrome — there's no nested `ore-textarea` whose own background/border/box-shadow needs suppressing, since the `<textarea>` is rendered directly by this component and styled flush inside the card.

### Parts

| Part            | Description                                                     |
| --------------- | ---------------------------------------------------------------- |
| `composer`      | Root card container                                             |
| `field`         | The native `<textarea>` element                                 |
| `helper`        | Helper text element                                              |
| `error`         | Error text element (`role="alert"`)                              |
| `toolbar`       | Toolbar row below the field                                     |
| `toolbar-start` | Toolbar group holding the `prefix` slot                         |
| `toolbar-end`   | Toolbar group holding the `suffix` slot and the send button      |
| `send-button`   | The default send button (absent when the `send` slot is used)   |

## Accessibility

The field has no visible `<label>` — chat and comment composers conventionally rely on a placeholder plus surrounding context rather than a labeled form field — so its accessible name comes entirely from `aria-label`, defaulting to `'Message'` and overridable via `label`. `aria-keyshortcuts` on the field always reflects the resolved `send-shortcut`, giving assistive technology a non-visual way to discover Enter-to-send behavior.

Enter is only ever intercepted for the exact modifier combination that matches the active `send-shortcut` mode — every other keystroke, including Tab and Shift+Enter's newline, passes straight through to the native `<textarea>` untouched. A composing IME candidate selection (e.g. while typing Japanese, Korean, or Chinese) also fires an `Enter` keydown; the composer checks `event.isComposing` so that never triggers an accidental send.

The send button is a real `ore-button` — proper disabled semantics, `aria-busy` while `loading`, and a visible focus ring — labeled `'Send message'` and disabled whenever the value is blank or the composer is disabled/loading, so assistive technology users get an actually-disabled control rather than a click that silently no-ops. `required`, `error`, `helper`, and the `maxlength` counter (including its live-region announcement) are implemented directly on the field, on the same headless primitives and ARIA wiring as [`ore-textarea`](./textarea.md#accessibility).

`send` is cancelable, so an app can reject a draft (e.g. a profanity filter or rate limit) without the field clearing out from under the user, and without needing any extra composer-specific API to "put the text back."
