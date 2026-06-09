# Tooltip

A lightweight floating label that appears on hover, focus, or click. Automatically flips placement when near viewport edges and dismisses on `Escape`.

## Features

- <sg-icon name="map-pin" size="16"></sg-icon> **4 Placements**: top (default), bottom, left, right — with viewport-aware auto-flip
- <sg-icon name="zap" size="16"></sg-icon> **3 Trigger Modes**: hover, focus, click — comma-separated for combinations
- <sg-icon name="timer" size="16"></sg-icon> **Show Delay**: configurable delay before appearing
- <sg-icon name="palette" size="16"></sg-icon> **2 Variants**: dark (default), light
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes**: sm, md, lg
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: `role="tooltip"`, `aria-describedby` wiring, keyboard `Escape` dismiss
- <sg-icon name="wrench" size="16"></sg-icon> **Powered by orbit**: uses `@vielzeug/orbit` for viewport-aware auto-positioning (`flip`, `shift`, `autoUpdate`)

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/overlay/tooltip/tooltip.ts
:::

## Basic Usage

Wrap any element with `sg-tooltip` and set the `content` attribute.

```html
<sg-tooltip content="Copy to clipboard">
  <button>Copy</button>
</sg-tooltip>
```

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

Use `delay` (milliseconds) to add a pause before the tooltip shows — useful for dense UIs.

<ComponentPreview center>

```html
<sg-tooltip content="Appears after 600ms" delay="600">
  <sg-button size="sm" variant="outline">Delayed</sg-button>
</sg-tooltip>
```

</ComponentPreview>

## Rich Content via Slot

For complex tooltip content, use the `content` named slot.

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

The tooltip component follows WAI-ARIA best practices.

### `sg-tooltip`

<sg-icon name="circle-check" size="16"></sg-icon> **Keyboard Navigation**

- Pressing `Escape` while a tooltip is visible dismisses it.

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

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
