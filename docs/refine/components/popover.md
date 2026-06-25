# Popover

A floating interactive panel anchored to a trigger element. Unlike a tooltip, a popover can contain any interactive content (forms, menus, rich text) via slots.

## Placement

<ComponentPreview center height="400px">

```html
<ore-popover placement="top">
  <ore-button size="sm">Top</ore-button>
  <div slot="content" style="padding:0.75rem;">Placed on top</div>
</ore-popover>
<ore-popover placement="right">
  <ore-button size="sm">Right</ore-button>
  <div slot="content" style="padding:0.75rem;">Placed on right</div>
</ore-popover>
<ore-popover placement="bottom">
  <ore-button size="sm">Bottom</ore-button>
  <div slot="content" style="padding:0.75rem;">Placed on bottom</div>
</ore-popover>
<ore-popover placement="left">
  <ore-button size="sm">Left</ore-button>
  <div slot="content" style="padding:0.75rem;">Placed on left</div>
</ore-popover>
```

</ComponentPreview>

## Trigger Modes

<ComponentPreview center height="400px">

```html
<ore-popover trigger="click">
  <ore-button size="sm" variant="flat">Click</ore-button>
  <div slot="content" style="padding:0.75rem;">Opens on click (default)</div>
</ore-popover>

<ore-popover trigger="hover">
  <ore-button size="sm" variant="flat">Hover</ore-button>
  <div slot="content" style="padding:0.75rem;">Opens on hover</div>
</ore-popover>

<ore-popover trigger="focus">
  <ore-button size="sm" variant="flat">Focus</ore-button>
  <div slot="content" style="padding:0.75rem;">Opens on focus</div>
</ore-popover>

<ore-popover trigger="click,hover">
  <ore-button size="sm" variant="flat">Click or hover</ore-button>
  <div slot="content" style="padding:0.75rem;">Opens on click or hover</div>
</ore-popover>
```

</ComponentPreview>

## Rich Content

The `content` slot accepts any HTML — forms, cards, images, custom layouts.

<ComponentPreview center height="400px">

```html
<ore-popover placement="bottom-start">
  <ore-button color="primary">What's new <ore-icon name="star" size="16"></ore-icon></ore-button>
  <div slot="content" style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; max-width:18rem;">
    <p style="margin:0; font-weight:600; font-size:0.875rem;">Version 2.4 released</p>
    <p style="margin:0; font-size:0.8125rem; color:var(--color-contrast-600); line-height:1.5;">
      New toggle mode for button groups, popover improvements, and a fresh set of color tokens.
    </p>
    <div style="display:flex; gap:0.5rem; margin-top:0.25rem;">
      <ore-button size="sm" color="primary" variant="flat">Read changelog</ore-button>
      <ore-button size="sm" variant="ghost">Dismiss</ore-button>
    </div>
  </div>
</ore-popover>
```

</ComponentPreview>

## Controlled Open State

Use the `open` attribute to programmatically show or hide the popover.

```html
<ore-popover id="my-popover" placement="bottom">
  <ore-button id="trigger-btn">Open</ore-button>
  <div slot="content" style="padding:1rem;">
    <p>Controlled popover content.</p>
    <ore-button id="close-btn" size="sm" variant="ghost">Close</ore-button>
  </div>
</ore-popover>

<script type="module">
  import '@vielzeug/refine';

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

<ComponentPreview center height="400px">

```html
<ore-popover disabled>
  <ore-button size="sm" disabled>Disabled trigger</ore-button>
  <div slot="content" style="padding:0.75rem;">You won't see this.</div>
</ore-popover>
```

</ComponentPreview>

## Listening to Events

```html
<ore-popover id="pop">
  <ore-button>Toggle</ore-button>
  <div slot="content" style="padding:0.75rem;">Panel content</div>
</ore-popover>

<script type="module">
  import '@vielzeug/refine';

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

The popover component follows WAI-ARIA best practices. Pressing `Escape` closes the popover and returns focus to the trigger. `Tab` moves focus through interactive elements inside the panel.

The panel uses `role="dialog"` when the `label` attribute is set, giving screen readers a concise title on open. The trigger element receives `aria-expanded` and `aria-controls` reflecting the current open state. Always provide a `label` attribute to give the panel an accessible name.

When the trigger mode includes `click` or `focus`, focus moves into the panel on open and returns to the trigger element on close.

## Related Components

- [Tooltip](./tooltip) — lightweight non-interactive floating label
- [Menu](./menu) — dropdown menu with keyboard navigation
