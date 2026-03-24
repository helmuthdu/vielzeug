# Tooltip

A lightweight floating label that appears on hover, focus, or click. Automatically flips placement when near viewport edges and dismisses on `Escape`.

## Features

- 📍 **4 Placements**: top (default), bottom, left, right — with viewport-aware auto-flip
- ⚡ **3 Trigger Modes**: hover, focus, click — comma-separated for combinations
- ⏱️ **Show Delay**: configurable delay before appearing
- 🎨 **2 Variants**: dark (default), light
- 📏 **3 Sizes**: sm, md, lg
- ♿ **Accessible**: `role="tooltip"`, `aria-describedby` wiring, keyboard `Escape` dismiss
- 🔧 **Powered by floatit**: uses `@vielzeug/floatit` for viewport-aware auto-positioning (`flip`, `shift`, `autoUpdate`)

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/overlay/tooltip/tooltip.ts
:::

## Basic Usage

Wrap any element with `bit-tooltip` and set the `content` attribute.

```html
<bit-tooltip content="Copy to clipboard">
  <button>Copy</button>
</bit-tooltip>

<script type="module">
  import '@vielzeug/buildit/tooltip';
</script>
```

## Placement

<ComponentPreview center>

```html
<bit-tooltip content="Tooltip on top" placement="top">
  <bit-button size="sm">Top</bit-button>
</bit-tooltip>
<bit-tooltip content="Tooltip on right" placement="right">
  <bit-button size="sm">Right</bit-button>
</bit-tooltip>
<bit-tooltip content="Tooltip on bottom" placement="bottom">
  <bit-button size="sm">Bottom</bit-button>
</bit-tooltip>
<bit-tooltip content="Tooltip on left" placement="left">
  <bit-button size="sm">Left</bit-button>
</bit-tooltip>
```

</ComponentPreview>

## Trigger Modes

<ComponentPreview center>

```html
<bit-tooltip content="Hover trigger" trigger="hover">
  <bit-button size="sm" variant="flat">Hover me</bit-button>
</bit-tooltip>
<bit-tooltip content="Focus trigger (Tab to this button)" trigger="focus">
  <bit-button size="sm" variant="flat">Focus me</bit-button>
</bit-tooltip>
<bit-tooltip content="Click trigger" trigger="click">
  <bit-button size="sm" variant="flat">Click me</bit-button>
</bit-tooltip>
<bit-tooltip content="Hover or focus" trigger="hover,focus">
  <bit-button size="sm" variant="flat">Hover / Focus</bit-button>
</bit-tooltip>
```

</ComponentPreview>

## Variants

<ComponentPreview center>

```html
<bit-tooltip content="Dark tooltip (default)">
  <bit-button size="sm">Dark</bit-button>
</bit-tooltip>
<bit-tooltip content="Light tooltip" variant="light">
  <bit-button size="sm">Light</bit-button>
</bit-tooltip>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<bit-tooltip content="Small tooltip" size="sm">
  <bit-button size="sm">Small</bit-button>
</bit-tooltip>
<bit-tooltip content="Medium tooltip (default)" size="md">
  <bit-button size="sm">Medium</bit-button>
</bit-tooltip>
<bit-tooltip content="Large tooltip" size="lg">
  <bit-button size="sm">Large</bit-button>
</bit-tooltip>
```

</ComponentPreview>

## Show Delay

Use `delay` (milliseconds) to add a pause before the tooltip shows — useful for dense UIs.

<ComponentPreview center>

```html
<bit-tooltip content="Appears after 600ms" delay="600">
  <bit-button size="sm" variant="outline">Delayed</bit-button>
</bit-tooltip>
```

</ComponentPreview>

## Rich Content via Slot

For complex tooltip content, use the `content` named slot.

<ComponentPreview center>

```html
<bit-tooltip>
  <bit-button size="sm">Keyboard shortcut</bit-button>
  <span slot="content">
    Paste&nbsp;&nbsp;<kbd style="background:rgba(255,255,255,.15);border-radius:3px;padding:1px 4px;">⌘V</kbd>
  </span>
</bit-tooltip>
```

</ComponentPreview>

## Disabled Tooltips

Set `disabled` to suppress the tooltip entirely.

```html
<bit-tooltip content="This won't show" disabled>
  <bit-button>No tooltip</bit-button>
</bit-tooltip>
```

## API Reference

### Attributes

| Attribute     | Type                                     | Default         | Description                                                                           |
| ------------- | ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------- |
| `content`     | `string`                                 | `''`            | Tooltip text                                                                          |
| `placement`   | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`         | Preferred placement (auto-flips near viewport edges)                                  |
| `trigger`     | `string`                                 | `'hover,focus'` | Trigger mode(s), comma-separated                                                      |
| `delay`       | `number`                                 | `0`             | Show delay in milliseconds                                                            |
| `close-delay` | `number`                                 | `0`             | Hide delay in milliseconds — useful to keep the tooltip open when moving between trigger and bubble |
| `open`        | `boolean`                                | —               | Controlled open state; when set, trigger events are ignored                           |
| `variant`     | `'dark' \| 'light'`                      | —               | Visual style (`dark` appearance is the unset default)                                 |
| `size`        | `'sm' \| 'md' \| 'lg'`                   | —               | Tooltip bubble size (medium appearance is the unset default)                          |
| `disabled`    | `boolean`                                | `false`         | Disable the tooltip entirely                                                          |

### Slots

| Slot      | Description                                              |
| --------- | -------------------------------------------------------- |
| (default) | The trigger element the tooltip is anchored to           |
| `content` | Rich tooltip content (overrides the `content` attribute) |

### CSS Custom Properties

| Property              | Description             | Default |
| --------------------- | ----------------------- | ------- |
| `--tooltip-max-width` | Max width of the bubble | `18rem` |

## Accessibility

The tooltip component follows WAI-ARIA best practices.

### `bit-tooltip`

✅ **Keyboard Navigation**

- Pressing `Escape` while a tooltip is visible dismisses it.

✅ **Screen Readers**

- The tooltip bubble has `role="tooltip"`.
- The trigger element is augmented with `aria-describedby` pointing to the tooltip — this happens automatically when using the `focus` trigger.

::: tip
When `trigger` includes `focus`, the tooltip is automatically wired as a programmatic description for the focused element, which benefits screen reader users.
:::

## Best Practices

**Do:**

- Keep tooltip text short — one sentence or a keyboard shortcut label.
- Use `trigger="focus"` (or `"hover,focus"`) for form field hints so keyboard-only users see them.
- Use `delay` (e.g. `400`–`600`ms) in action-dense toolbars to avoid visual noise on quick cursor sweeps.
- Prefer `variant="light"` on dark backgrounds.

**Don't:**

- Use tooltips to hold essential information — if the user must see it to act, put it in helper text or an alert instead.
- Add interactive elements (buttons, links) inside the tooltip bubble; tooltips are not focusable.
