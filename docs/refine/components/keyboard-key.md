# Keyboard Key

`ore-keyboard-key` renders a keyboard key hint in compact command UI or as a large key-state display. It is presentational: place it beside text or inside an interactive control rather than treating the key itself as a button.

## Compact Keys

The default `sm` size matches shortcut hints in `ore-command-palette`.

<ComponentPreview height="120px" vertical>

```html
<div style="display: flex; gap: 0.25rem; align-items: center;">
  <ore-keyboard-key>⌘</ore-keyboard-key>
  <ore-keyboard-key>K</ore-keyboard-key>
</div>

<script type="module">
  import '@vielzeug/refine/keyboard-key';
</script>
```

</ComponentPreview>

## Large Keys and Pressed Shortcuts

Use `size="lg"` for shortcut settings, input visualizers, and other places where key state is the primary content. `symbol` adds decorative modifier notation above the label. Wrap combinations in `ore-keyboard-shortcut`; its `pressed` state draws one continuous surround around every key.

<ComponentPreview height="200px" vertical>

```html
<ore-keyboard-shortcut pressed>
  <ore-keyboard-key size="lg" symbol="⌘">Command</ore-keyboard-key>
  <ore-keyboard-key size="lg" symbol="⇧">Shift</ore-keyboard-key>
  <ore-keyboard-key size="lg">K</ore-keyboard-key>
</ore-keyboard-shortcut>

<script type="module">
  import '@vielzeug/refine/keyboard-key';
</script>
```

</ComponentPreview>

Toggle the wrapper as the complete shortcut is pressed:

```js
const shortcut = document.querySelector('ore-keyboard-shortcut');

window.addEventListener('keydown', event => {
  shortcut.toggleAttribute('pressed', event.metaKey && event.shiftKey && event.key.toLowerCase() === 'k');
});

window.addEventListener('keyup', () => {
  shortcut.removeAttribute('pressed');
});
```

Set `pressed` directly on `ore-keyboard-key` only when displaying one independently pressed key.

## API Reference

**`ore-keyboard-key` Attributes**

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `size` | `'sm' \| 'lg'` | `'sm'` | Compact hint or large key-state display |
| `symbol` | `string` | — | Decorative notation shown in the large key's upper corner |
| `pressed` | `boolean` | `false` | Shows the key in its pressed visual state |

**`ore-keyboard-key` Slots and Parts**

| Surface | Name | Description |
| --- | --- | --- |
| Slot | (default) | Visible key label |
| Part | `key` | Internal `<kbd>` element |

**`ore-keyboard-shortcut` API**

| Surface | Name | Type | Default | Description |
| --- | --- | --- | --- | --- |
| Attribute | `pressed` | `boolean` | `false` | Draws one pressed surround around every grouped key |
| Slot | (default) | — | — | Keyboard keys in shortcut order |
| Part | `shortcut` | — | — | Grouping surface around the slotted keys |

**CSS Custom Properties**

| Property | Default | Description |
| --- | --- | --- |
| `--keyboard-key-bg` | Theme-dependent | Key surface color |
| `--keyboard-key-color` | Theme-dependent | Key label color |
| `--keyboard-key-border-color` | Theme-dependent | Key border color |
| `--keyboard-key-radius` | Size-dependent | Key corner radius |
| `--keyboard-key-font-family` | Size-dependent | Key label typeface |
| `--keyboard-key-font-size` | Size-dependent | Key label size |
| `--keyboard-key-font-weight` | Size-dependent | Key label weight |
| `--keyboard-key-padding-block` | Size-dependent | Vertical padding |
| `--keyboard-key-padding-inline` | Size-dependent | Horizontal padding |
| `--keyboard-key-min-width` | `var(--size-16)` for `lg` | Large key minimum width |
| `--keyboard-key-min-height` | `var(--size-16)` for `lg` | Large key minimum height |
| `--keyboard-key-shadow` | Size-dependent | Key shadow |
| `--keyboard-key-symbol-color` | Theme-dependent | Large modifier symbol color |
| `--keyboard-key-pressed-ring-color` | Theme-dependent | Individual pressed-key surround color |
| `--keyboard-shortcut-gap` | `var(--size-2)` | Space between grouped keys |
| `--keyboard-shortcut-padding` | `var(--size-2)` | Space between keys and the group surround |
| `--keyboard-shortcut-radius` | `var(--rounded-lg)` | Group surround corner radius |
| `--keyboard-shortcut-pressed-bg` | Theme-dependent | Pressed group surround color |
| `--keyboard-shortcut-pressed-border-color` | Theme-dependent | Pressed group border color |

## Accessibility

Each key renders a native `<kbd>` element. The shortcut wrapper groups its keys visually without adding an interactive role or focus behavior. Keep a visible text label in every key's default slot; `symbol` is decorative and hidden from assistive technology. When a live key visualizer communicates input state, announce the current shortcut separately if screen-reader users need that feedback.
