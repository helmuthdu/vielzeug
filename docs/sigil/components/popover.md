# Popover

A floating interactive panel anchored to a trigger element. Unlike a tooltip, a popover can contain any interactive content (forms, menus, rich text) via slots.

## Features

- <sg-icon name="map-pin" size="16"></sg-icon> **12 Placements** — top/bottom/left/right with start/end/center variants; auto-flips near viewport edges
- <sg-icon name="zap" size="16"></sg-icon> **3 Trigger modes**: click (default), hover, focus — comma-separated for combinations
- <sg-icon name="crosshair" size="16"></sg-icon> **Controlled open state** — use the `open` attribute for programmatic control
- <sg-icon name="wrench" size="16"></sg-icon> **Powered by [orbit](../../orbit/index)** — efficient auto-updating position via `@vielzeug/orbit`
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: `role="dialog"` on panel, configurable `aria-label`

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/overlay/popover/popover.ts
:::

## Basic Usage

Wrap the trigger element in the default slot and place panel content in the `content` slot.

```html
<sg-popover>
  <sg-button>Open popover</sg-button>
  <div slot="content" style="padding: 1rem;">
    <p>This is the popover content.</p>
  </div>
</sg-popover>
```

## Placement

<ComponentPreview center>

```html
<sg-popover placement="top">
  <sg-button size="sm">Top</sg-button>
  <div slot="content" style="padding:0.75rem;">Placed on top</div>
</sg-popover>
<sg-popover placement="right">
  <sg-button size="sm">Right</sg-button>
  <div slot="content" style="padding:0.75rem;">Placed on right</div>
</sg-popover>
<sg-popover placement="bottom">
  <sg-button size="sm">Bottom</sg-button>
  <div slot="content" style="padding:0.75rem;">Placed on bottom</div>
</sg-popover>
<sg-popover placement="left">
  <sg-button size="sm">Left</sg-button>
  <div slot="content" style="padding:0.75rem;">Placed on left</div>
</sg-popover>
```

</ComponentPreview>

## Trigger Modes

<ComponentPreview center>

```html
<sg-popover trigger="click">
  <sg-button size="sm" variant="flat">Click</sg-button>
  <div slot="content" style="padding:0.75rem;">Opens on click (default)</div>
</sg-popover>

<sg-popover trigger="hover">
  <sg-button size="sm" variant="flat">Hover</sg-button>
  <div slot="content" style="padding:0.75rem;">Opens on hover</div>
</sg-popover>

<sg-popover trigger="focus">
  <sg-button size="sm" variant="flat">Focus</sg-button>
  <div slot="content" style="padding:0.75rem;">Opens on focus</div>
</sg-popover>

<sg-popover trigger="click,hover">
  <sg-button size="sm" variant="flat">Click or hover</sg-button>
  <div slot="content" style="padding:0.75rem;">Opens on click or hover</div>
</sg-popover>
```

</ComponentPreview>

## Rich Content

The `content` slot accepts any HTML — forms, cards, images, custom layouts.

<ComponentPreview center>

```html
<sg-popover placement="bottom-start">
  <sg-button color="primary">What's new <sg-icon name="star" size="16"></sg-icon></sg-button>
  <div slot="content" style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; max-width:18rem;">
    <p style="margin:0; font-weight:600; font-size:0.875rem;">Version 2.4 released</p>
    <p style="margin:0; font-size:0.8125rem; color:var(--color-contrast-600); line-height:1.5;">
      New toggle mode for button groups, popover improvements, and a fresh set of color tokens.
    </p>
    <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
      <sg-button size="sm" color="primary" variant="flat">Read changelog</sg-button>
      <sg-button size="sm" variant="ghost">Dismiss</sg-button>
    </div>
  </div>
</sg-popover>
```

</ComponentPreview>

## Controlled Open State

Use the `open` attribute to programmatically show or hide the popover.

```html
<sg-popover id="my-popover" placement="bottom">
  <sg-button id="trigger-btn">Open</sg-button>
  <div slot="content" style="padding:1rem;">
    <p>Controlled popover content.</p>
    <sg-button id="close-btn" size="sm" variant="ghost">Close</sg-button>
  </div>
</sg-popover>

<script type="module">
  import '@vielzeug/sigil';

  const popover = document.getElementById('my-popover');
  document.getElementById('trigger-btn').addEventListener('click', () => {
    popover.setAttribute('open', '');
  });
  document.getElementById('close-btn').addEventListener('click', () => {
    popover.removeAttribute('open');
  });
</script>
```

## Disabled

<ComponentPreview center>

```html
<sg-popover disabled>
  <sg-button size="sm" disabled>Disabled trigger</sg-button>
  <div slot="content" style="padding:0.75rem;">You won't see this.</div>
</sg-popover>
```

</ComponentPreview>

## Listening to Events

```html
<sg-popover id="pop">
  <sg-button>Toggle</sg-button>
  <div slot="content" style="padding:0.75rem;">Panel content</div>
</sg-popover>

<script type="module">
  import '@vielzeug/sigil';

  const pop = document.getElementById('pop');
  pop.addEventListener('open', (e) => console.log('popover opened because:', e.detail.reason));
  pop.addEventListener('close', (e) => console.log('popover closed because:', e.detail.reason));
</script>
```

## API Reference

### Attributes

| Attribute   | Type                                                                                                                                                                 | Default    | Description                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| `placement` | `'top' \| 'top-start' \| 'top-end' \| 'bottom' \| 'bottom-start' \| 'bottom-end' \| 'left' \| 'left-start' \| 'left-end' \| 'right' \| 'right-start' \| 'right-end'` | `'bottom'` | Preferred placement                                          |
| `trigger`   | `string`                                                                                                                                                             | `'click'`  | Trigger mode(s) — `click`, `hover`, `focus`, comma-separated |
| `open`      | `boolean`                                                                                                                                                            | `false`    | Controlled open state                                        |
| `offset`    | `number`                                                                                                                                                             | `8`        | Gap in pixels between trigger and panel                      |
| `disabled`  | `boolean`                                                                                                                                                            | `false`    | Prevent the popover from opening                             |
| `label`     | `string`                                                                                                                                                             | —          | `aria-label` for the panel                                   |

### Slots

| Slot      | Description                                  |
| --------- | -------------------------------------------- |
| (default) | The trigger element the panel is anchored to |
| `content` | Content rendered inside the floating panel   |

### Events

| Event   | Detail                                                                   | Description                 |
| ------- | ------------------------------------------------------------------------ | --------------------------- |
| `open`  | `{ reason: 'programmatic' \| 'trigger' }`                                | Fired when the panel opens  |
| `close` | `{ reason: 'programmatic' \| 'trigger' \| 'escape' \| 'outside-click' }` | Fired when the panel closes |

### CSS Custom Properties

| Property              | Description                         |
| --------------------- | ----------------------------------- |
| `--popover-min-width` | Minimum width of the floating panel |
| `--popover-max-width` | Maximum width of the floating panel |

## Accessibility

The popover component follows WAI-ARIA best practices.

### `sg-popover`

<sg-icon name="check" size="16"></sg-icon> **Keyboard Navigation**

- `Escape` closes the popover and returns focus to the trigger.
- `Tab` moves focus through interactive elements inside the panel.

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

- The panel uses `role="dialog"` when `label` is set, giving screen readers a concise title on open.
- The trigger element receives `aria-expanded` and `aria-controls` reflecting the open state.
- Provide a `label` attribute to give the panel an accessible name.

<sg-icon name="check" size="16"></sg-icon> **Focus Management**

- Focus moves into the panel on open (when `trigger` includes `click` or `focus`).
- Focus returns to the trigger element on close.

## Related Components

- [Tooltip](./tooltip) — lightweight non-interactive floating label
- [Menu](./menu) — dropdown menu with keyboard navigation
