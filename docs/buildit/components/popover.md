# Popover Component

A floating interactive panel anchored to a trigger element. Unlike a tooltip, a popover can contain any interactive content (forms, menus, rich text) via slots.

## Features

- 📍 **12 Placements** — top/bottom/left/right with start/end/center variants; auto-flips near viewport edges
- ⚡ **3 Trigger modes**: click (default), hover, focus — comma-separated for combinations
- 🎯 **Controlled open state** — use the `open` attribute for programmatic control
- 🔧 **Powered by [floatit](../../floatit/index)** — efficient auto-updating position via `@vielzeug/floatit`
- 🪟 **Native Popover API** — uses `popover` attribute for correct top-layer stacking
- ♿ **Accessible**: `role="dialog"` on panel, configurable `aria-label`

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/overlay/popover/popover.ts
:::

## Basic Usage

Wrap the trigger element in the default slot and place panel content in the `content` slot.

```html
<bit-popover>
  <bit-button>Open popover</bit-button>
  <div slot="content" style="padding: 1rem;">
    <p>This is the popover content.</p>
  </div>
</bit-popover>

<script type="module">
  import '@vielzeug/buildit';
</script>
```

## Placement

<ComponentPreview center>

```html
<bit-popover placement="top">
  <bit-button size="sm">Top</bit-button>
  <div slot="content" style="padding:0.75rem;">Placed on top</div>
</bit-popover>
<bit-popover placement="right">
  <bit-button size="sm">Right</bit-button>
  <div slot="content" style="padding:0.75rem;">Placed on right</div>
</bit-popover>
<bit-popover placement="bottom">
  <bit-button size="sm">Bottom</bit-button>
  <div slot="content" style="padding:0.75rem;">Placed on bottom</div>
</bit-popover>
<bit-popover placement="left">
  <bit-button size="sm">Left</bit-button>
  <div slot="content" style="padding:0.75rem;">Placed on left</div>
</bit-popover>
```

</ComponentPreview>

## Trigger Modes

<ComponentPreview center>

```html
<bit-popover trigger="click">
  <bit-button size="sm" variant="flat">Click</bit-button>
  <div slot="content" style="padding:0.75rem;">Opens on click (default)</div>
</bit-popover>

<bit-popover trigger="hover">
  <bit-button size="sm" variant="flat">Hover</bit-button>
  <div slot="content" style="padding:0.75rem;">Opens on hover</div>
</bit-popover>

<bit-popover trigger="focus">
  <bit-button size="sm" variant="flat">Focus</bit-button>
  <div slot="content" style="padding:0.75rem;">Opens on focus</div>
</bit-popover>

<bit-popover trigger="click,hover">
  <bit-button size="sm" variant="flat">Click or hover</bit-button>
  <div slot="content" style="padding:0.75rem;">Opens on click or hover</div>
</bit-popover>
```

</ComponentPreview>

## Rich Content

The `content` slot accepts any HTML — forms, cards, images, custom layouts.

<ComponentPreview center>

```html
<bit-popover placement="bottom-start">
  <bit-button color="primary">What's new ✦</bit-button>
  <div slot="content" style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; max-width:18rem;">
    <p style="margin:0; font-weight:600; font-size:0.875rem;">Version 2.4 released</p>
    <p style="margin:0; font-size:0.8125rem; color:var(--color-contrast-600); line-height:1.5;">
      New toggle mode for button groups, popover improvements, and a fresh set of color tokens.
    </p>
    <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
      <bit-button size="sm" color="primary" variant="flat">Read changelog</bit-button>
      <bit-button size="sm" variant="ghost">Dismiss</bit-button>
    </div>
  </div>
</bit-popover>
```

</ComponentPreview>

## Controlled Open State

Use the `open` attribute to programmatically show or hide the popover.

```html
<bit-popover id="my-popover" placement="bottom">
  <bit-button id="trigger-btn">Open</bit-button>
  <div slot="content" style="padding:1rem;">
    <p>Controlled popover content.</p>
    <bit-button id="close-btn" size="sm" variant="ghost">Close</bit-button>
  </div>
</bit-popover>

<script type="module">
  import '@vielzeug/buildit';

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
<bit-popover disabled>
  <bit-button size="sm" disabled>Disabled trigger</bit-button>
  <div slot="content" style="padding:0.75rem;">You won't see this.</div>
</bit-popover>
```

</ComponentPreview>

## Listening to Events

```html
<bit-popover id="pop">
  <bit-button>Toggle</bit-button>
  <div slot="content" style="padding:0.75rem;">Panel content</div>
</bit-popover>

<script type="module">
  import '@vielzeug/buildit';

  const pop = document.getElementById('pop');
  pop.addEventListener('open', () => console.log('popover opened'));
  pop.addEventListener('close', () => console.log('popover closed'));
</script>
```

## Guideline Recipe: Adapt Help to the Current Context

**Guideline: adapt** — a popover surfaces detail exactly when and where the user needs it, without navigating away or opening a full modal.

```html
<bit-popover placement="top">
  <bit-button slot="trigger" variant="ghost" size="sm" icon-only aria-label="What is MFA?"> ? </bit-button>
  <div style="max-width:280px">
    <bit-text variant="label" weight="semibold">Multi-factor authentication</bit-text>
    <bit-text variant="body" size="sm" style="margin-top:var(--size-1)">
      MFA adds a second verification step — usually an app or SMS code — to protect your account even if your password
      is compromised.
    </bit-text>
  </div>
</bit-popover>
```

**Tip:** Keep popover content under 60 words. If you need more space, link to a docs page instead of expanding the popover.

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

| Event   | Detail | Description                 |
| ------- | ------ | --------------------------- |
| `open`  | `void` | Fired when the panel opens  |
| `close` | `void` | Fired when the panel closes |

### CSS Custom Properties

| Property              | Description                         |
| --------------------- | ----------------------------------- |
| `--popover-min-width` | Minimum width of the floating panel |
| `--popover-max-width` | Maximum width of the floating panel |

## Accessibility

The popover component follows WAI-ARIA best practices.

### `bit-popover`

✅ **Keyboard Navigation**

- `Escape` closes the popover and returns focus to the trigger.
- `Tab` moves focus through interactive elements inside the panel.

✅ **Screen Readers**

- The panel uses `role="dialog"` when `label` is set, giving screen readers a concise title on open.
- The trigger element receives `aria-expanded` and `aria-controls` reflecting the open state.
- Provide a `label` attribute to give the panel an accessible name.

✅ **Focus Management**

- Focus moves into the panel on open (when `trigger` includes `click` or `focus`).
- Focus returns to the trigger element on close.

## Related Components

- [Tooltip](./tooltip) — lightweight non-interactive floating label
- [Menu](./menu) — dropdown menu with keyboard navigation
