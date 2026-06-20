# Tooltip

A lightweight floating label that appears on hover, focus, or click. Automatically flips placement when near viewport edges and dismisses on `Escape`.

## Placement

<ComponentPreview center>

```html
<sg-tooltip content="Tooltip on top" placement="top">
  <sg-button size="sm">Top</sg-button>
</sg-tooltip>
<sg-tooltip content="Tooltip on right" placement="right">
  <sg-button size="sm">Right</sg-button>
</sg-tooltip>
<sg-tooltip content="Tooltip on bottom" placement="bottom">
  <sg-button size="sm">Bottom</sg-button>
</sg-tooltip>
<sg-tooltip content="Tooltip on left" placement="left">
  <sg-button size="sm">Left</sg-button>
</sg-tooltip>
```

</ComponentPreview>

## Trigger Modes

Use the `trigger` attribute to control when the tooltip appears. Multiple triggers can be combined with commas (e.g. `"hover,focus"`). When `trigger` includes `focus`, the tooltip is automatically wired as a programmatic description (`aria-describedby`) for the focused element, which benefits screen reader users.

<ComponentPreview center>

```html
<sg-tooltip content="Hover trigger" trigger="hover">
  <sg-button size="sm" variant="flat">Hover me</sg-button>
</sg-tooltip>
<sg-tooltip content="Focus trigger (Tab to this button)" trigger="focus">
  <sg-button size="sm" variant="flat">Focus me</sg-button>
</sg-tooltip>
<sg-tooltip content="Click trigger" trigger="click">
  <sg-button size="sm" variant="flat">Click me</sg-button>
</sg-tooltip>
<sg-tooltip content="Hover or focus" trigger="hover,focus">
  <sg-button size="sm" variant="flat">Hover / Focus</sg-button>
</sg-tooltip>
```

</ComponentPreview>

## Variants

<ComponentPreview center>

```html
<sg-tooltip content="Dark tooltip (default)">
  <sg-button size="sm">Dark</sg-button>
</sg-tooltip>
<sg-tooltip content="Light tooltip" variant="light">
  <sg-button size="sm">Light</sg-button>
</sg-tooltip>
```

</ComponentPreview>

Prefer `variant="light"` on dark backgrounds.

## Sizes

<ComponentPreview center>

```html
<sg-tooltip content="Small tooltip" size="sm">
  <sg-button size="sm">Small</sg-button>
</sg-tooltip>
<sg-tooltip content="Medium tooltip (default)" size="md">
  <sg-button size="sm">Medium</sg-button>
</sg-tooltip>
<sg-tooltip content="Large tooltip" size="lg">
  <sg-button size="sm">Large</sg-button>
</sg-tooltip>
```

</ComponentPreview>

## Show Delay

Use `delay` (milliseconds) to add a pause before the tooltip shows — useful for dense UIs. A value of `400`–`600`ms works well in action-dense toolbars to avoid visual noise on quick cursor sweeps.

<ComponentPreview center>

```html
<sg-tooltip content="Appears after 600ms" delay="600">
  <sg-button size="sm" variant="outline">Delayed</sg-button>
</sg-tooltip>
```

</ComponentPreview>

## Rich Content via Slot

For complex tooltip content, use the `content` named slot. Keep tooltip text short — one sentence or a keyboard shortcut label. Do not add interactive elements (buttons, links) inside the tooltip bubble; tooltips are not focusable.

<ComponentPreview center>

```html
<sg-tooltip>
  <sg-button size="sm">Keyboard shortcut</sg-button>
  <span slot="content">
    Paste&nbsp;&nbsp;<kbd style="background:rgba(255,255,255,.15);border-radius:3px;padding:1px 4px;">⌘V</kbd>
  </span>
</sg-tooltip>
```

</ComponentPreview>

## Disabled Tooltips

Set `disabled` to suppress the tooltip entirely.

```html
<sg-tooltip content="This won't show" disabled>
  <sg-button>No tooltip</sg-button>
</sg-tooltip>
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
