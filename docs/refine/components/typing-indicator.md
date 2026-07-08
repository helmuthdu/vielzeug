# Typing Indicator

Three bouncing dots signaling that the other side of a conversation is composing a reply — the moment *before* any content exists. For a message whose content is already streaming in, use [`ore-chat-message`](./chat-message.md)'s `streaming` attribute (a blinking cursor) instead.

## Basic Usage

<ComponentPreview center>

```html
<ore-typing-indicator></ore-typing-indicator>
```

</ComponentPreview>

## Custom Label

The dots are decorative; screen readers get the state from a polite announcement instead. Override `label` to name who's typing.

<ComponentPreview center>

```html
<ore-typing-indicator label="Assistant is typing…"></ore-typing-indicator>
```

</ComponentPreview>

## Colors and Sizes

<ComponentPreview center>

```html
<ore-typing-indicator color="primary"></ore-typing-indicator>
<ore-typing-indicator color="secondary" size="lg"></ore-typing-indicator>
<ore-typing-indicator color="success" size="sm"></ore-typing-indicator>
```

</ComponentPreview>

## In a Conversation

Show the indicator in place of the next message bubble while waiting for the first token, then swap it for an `ore-chat-message` with `streaming` once content starts arriving.

```html
<div id="conversation">
  <ore-chat-message sender="user">What's on my calendar tomorrow?</ore-chat-message>
  <ore-typing-indicator id="waiting" label="Assistant is typing…"></ore-typing-indicator>
</div>

<script type="module">
  import '@vielzeug/refine/chat-message';
  import '@vielzeug/refine/typing-indicator';

  // When the first token of the response arrives:
  function onFirstToken(token) {
    const indicator = document.getElementById('waiting');
    const message = document.createElement('ore-chat-message');

    message.setAttribute('sender', 'assistant');
    message.setAttribute('streaming', '');
    message.textContent = token;
    indicator.replaceWith(message);
  }
</script>
```

## API Reference

### Attributes

| Attribute | Type                                                                      | Default    | Description                                        |
| --------- | -------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| `label`   | `string`                                                                  | `'Typing…'` | Announced once (and again on every change) via the shared polite live-region announcer |
| `color`   | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —          | Theme color for the dots                             |
| `size`    | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`     | Dot size preset                                      |

### CSS Custom Properties

| Property                        | Description             | Default             |
| --------------------------------- | -------------------------- | ---------------------- |
| `--typing-indicator-color`      | Dot color                | Theme-dependent       |
| `--typing-indicator-size`       | Dot diameter             | Size-preset-dependent |
| `--typing-indicator-gap`        | Gap between dots         | Size-preset-dependent |

### CSS Parts

| Part    | Description                          |
| ------- | --------------------------------------- |
| `dots`  | Dots container                          |
| `dot`   | Individual dot element                  |

## Accessibility

The three dots are `aria-hidden` — they're a purely visual affordance and convey no information on their own. `label` is announced through Refine's shared singleton live region (the same one used elsewhere in the package for transient status messages) rather than a static `aria-live` element rendered in the component's own template. A live region populated in the same paint as its own insertion is unreliable across browsers and screen readers — many only announce a *subsequent* change, not content present the moment the region connects — so routing through an already-existing region avoids that gap entirely. The animation respects `prefers-reduced-motion`, falling back to static (non-bouncing) dots.

Mount the indicator when typing starts and remove it (rather than toggling `hidden`) when it stops — the announcement fires on mount and on every `label` change, so there's no need to manage re-announcing yourself.
