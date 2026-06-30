# Tooltip

A lightweight floating label that appears on hover, focus, or click. Automatically flips placement when near viewport edges and dismisses on `Escape`.

## Placement

<ComponentPreview>

```html
<ore-tooltip content="Tooltip on top" placement="top">
  <ore-button size="sm">Top</ore-button>
</ore-tooltip>
<ore-tooltip content="Tooltip on right" placement="right">
  <ore-button size="sm">Right</ore-button>
</ore-tooltip>
<ore-tooltip content="Tooltip on bottom" placement="bottom">
  <ore-button size="sm">Bottom</ore-button>
</ore-tooltip>
<ore-tooltip content="Tooltip on left" placement="left">
  <ore-button size="sm">Left</ore-button>
</ore-tooltip>
```

</ComponentPreview>

## Trigger Modes

Use the `trigger` attribute to control when the tooltip appears. Multiple triggers can be combined with commas (e.g. `"hover,focus"`). When `trigger` includes `focus`, the tooltip is automatically wired as a programmatic description (`aria-describedby`) for the focused element, which benefits screen reader users.

<ComponentPreview>

```html
<ore-tooltip content="Hover trigger" trigger="hover">
  <ore-button size="sm" variant="flat">Hover me</ore-button>
</ore-tooltip>
<ore-tooltip content="Focus trigger (Tab to this button)" trigger="focus">
  <ore-button size="sm" variant="flat">Focus me</ore-button>
</ore-tooltip>
<ore-tooltip content="Click trigger" trigger="click">
  <ore-button size="sm" variant="flat">Click me</ore-button>
</ore-tooltip>
<ore-tooltip content="Hover or focus" trigger="hover,focus">
  <ore-button size="sm" variant="flat">Hover / Focus</ore-button>
</ore-tooltip>
```

</ComponentPreview>

## Variants

<ComponentPreview>

```html
<ore-tooltip content="Dark tooltip (default)">
  <ore-button size="sm">Dark</ore-button>
</ore-tooltip>
<ore-tooltip content="Light tooltip" variant="light">
  <ore-button size="sm">Light</ore-button>
</ore-tooltip>
```

</ComponentPreview>

Prefer `variant="light"` on dark backgrounds.

## Sizes

<ComponentPreview height="150px">

```html
<ore-tooltip content="Small tooltip" size="sm">
  <ore-button size="sm">Small</ore-button>
</ore-tooltip>
<ore-tooltip content="Medium tooltip (default)" size="md">
  <ore-button size="sm">Medium</ore-button>
</ore-tooltip>
<ore-tooltip content="Large tooltip" size="lg">
  <ore-button size="sm">Large</ore-button>
</ore-tooltip>
```

</ComponentPreview>

## Show Delay

Use `delay` (milliseconds) to add a pause before the tooltip shows — useful for dense UIs. A value of `400`–`600`ms works well in action-dense toolbars to avoid visual noise on quick cursor sweeps.

<ComponentPreview>

```html
<ore-tooltip content="Appears after 600ms" delay="600">
  <ore-button size="sm" variant="outline">Delayed</ore-button>
</ore-tooltip>
```

</ComponentPreview>

## Rich Content via Slot

For complex tooltip content, use the `content` named slot. Keep tooltip text short — one sentence or a keyboard shortcut label. Do not add interactive elements (buttons, links) inside the tooltip bubble; tooltips are not focusable.

<ComponentPreview>

```html
<ore-tooltip>
  <ore-button size="sm">Keyboard shortcut</ore-button>
  <span slot="content">
    Paste&nbsp;&nbsp;<kbd style="background:rgba(255,255,255,.15);border-radius:3px;padding:1px 4px;">⌘V</kbd>
  </span>
</ore-tooltip>
```

</ComponentPreview>

## Disabled Tooltips

Set `disabled` to suppress the tooltip entirely.

```html
<ore-tooltip content="This won't show" disabled>
  <ore-button>No tooltip</ore-button>
</ore-tooltip>
```

## API Reference

### Attributes

| Attribute     | Type                                     | Default         | Description                                                                                         |
| ------------- | ---------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `content`     | `string`                                 | `''`            | Tooltip text                                                                                        |
| `placement`   | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'`         | Preferred placement (auto-flips near viewport edges)                                                |
| `trigger`     | `string`                                 | `'hover,focus'` | Trigger mode(s), comma-separated                                                                    |
| `delay`       | `number`                                 | `0`             | Show delay in milliseconds                                                                          |
| `close-delay` | `number`                                 | `0`             | Hide delay in milliseconds — useful to keep the tooltip open when moving between trigger and bubble |
| `open`        | `boolean`                                | —               | Controlled open state; when set, trigger events are ignored                                         |
| `variant`     | `'dark' \| 'light'`                      | —               | Visual style (`dark` appearance is the unset default)                                               |
| `size`        | `'sm' \| 'md' \| 'lg'`                   | —               | Tooltip bubble size (medium appearance is the unset default)                                        |
| `disabled`    | `boolean`                                | `false`         | Disable the tooltip entirely                                                                        |

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

The tooltip component follows WAI-ARIA best practices. The tooltip bubble has `role="tooltip"`, and the trigger element is automatically augmented with `aria-describedby` pointing to the tooltip when the `focus` trigger is active. Pressing `Escape` while a tooltip is visible dismisses it.

Avoid using tooltips to hold essential information — if the user must see it to act, put it in helper text or an alert instead. Use `trigger="focus"` (or `"hover,focus"`) for form field hints so keyboard-only users see them.
