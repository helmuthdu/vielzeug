# Drawer

A slide-in panel that overlays page content from any edge of the screen. Built on the native `<dialog>` element for correct top-layer stacking, focus trapping, and `Escape`-to-close behavior.

## Placements

Toggle the `open` attribute to show and hide the drawer. Use the `placement` attribute to control which edge the drawer slides in from: `left`, `right` (default), `top`, or `bottom`.

<ComponentPreview center>

```html
<ore-button id="open-left">Left</ore-button>
<ore-button id="open-right">Right</ore-button>
<ore-button id="open-top">Top</ore-button>
<ore-button id="open-bottom">Bottom</ore-button>

<ore-drawer id="drawer-left" placement="left" label="Left drawer" dismissible>
  <p>Slides in from the left edge.</p>
</ore-drawer>
<ore-drawer id="drawer-right" placement="right" label="Right drawer" dismissible>
  <p>Slides in from the right edge (default).</p>
</ore-drawer>
<ore-drawer id="drawer-top" placement="top" label="Top drawer" dismissible>
  <p>Slides down from the top edge.</p>
</ore-drawer>
<ore-drawer id="drawer-bottom" placement="bottom" label="Bottom drawer" dismissible>
  <p>Slides up from the bottom edge.</p>
</ore-drawer>

<script>
  ['left', 'right', 'top', 'bottom'].forEach(function (p) {
    document.getElementById('open-' + p).addEventListener('click', function () {
      document.getElementById('drawer-' + p).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-button id="open-sm">sm</ore-button>
<ore-button id="open-md">md</ore-button>
<ore-button id="open-lg">lg</ore-button>
<ore-button id="open-full">full</ore-button>

<ore-drawer id="drawer-sm" size="sm" label="Small drawer" dismissible>
  <p>Compact drawer — ideal for quick-action panels.</p>
</ore-drawer>
<ore-drawer id="drawer-md" size="md" label="Medium drawer" dismissible>
  <p>The default size. Suitable for most use cases.</p>
</ore-drawer>
<ore-drawer id="drawer-lg" size="lg" label="Large drawer" dismissible>
  <p>More room for forms or detailed content.</p>
</ore-drawer>
<ore-drawer id="drawer-full" size="full" label="Full drawer" dismissible>
  <p>Takes up the full width or height of the viewport.</p>
</ore-drawer>

<script>
  ['sm', 'md', 'lg', 'full'].forEach(function (s) {
    document.getElementById('open-' + s).addEventListener('click', function () {
      document.getElementById('drawer-' + s).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## With Header and Footer Slots

Use the `header` slot to replace the default title bar and the `footer` slot for action buttons.

<ComponentPreview center>

```html
<ore-button id="open-slots-btn">Open with slots</ore-button>

<ore-drawer id="drawer-slots" label="Edit profile" dismissible>
  <div slot="header">
    <strong>Edit profile</strong>
    <ore-badge color="primary" size="sm">Beta</ore-badge>
  </div>
  <div style="display:flex; flex-direction:column; gap:1rem;">
    <ore-input label="Display name" placeholder="Your name"></ore-input>
    <ore-input label="Email" placeholder="you@example.com"></ore-input>
  </div>
  <div slot="footer">
    <ore-button variant="ghost" id="cancel-slots-btn">Cancel</ore-button>
    <ore-button color="primary">Save</ore-button>
  </div>
</ore-drawer>

<script>
  document.getElementById('open-slots-btn').addEventListener('click', function () {
    document.getElementById('drawer-slots').setAttribute('open', '');
  });
  document.getElementById('cancel-slots-btn').addEventListener('click', function () {
    document.getElementById('drawer-slots').removeAttribute('open');
  });
</script>
```

</ComponentPreview>

## Drag Handle Placement

Use `drag-handle-placement` to control whether the swipe handle sits outside the panel edge or inset inside it.

<ComponentPreview center>

```html
<ore-button id="open-handle-outside">Outside handle</ore-button>
<ore-button id="open-handle-inset">Inset handle</ore-button>

<ore-drawer
  id="drawer-handle-outside"
  label="Outside drag handle"
  placement="right"
  drag-handle-placement="outside"
  dismissible>
  <p>Default behavior. The drag handle sits outside the drawer edge.</p>
</ore-drawer>

<ore-drawer
  id="drawer-handle-inset"
  label="Inset drag handle"
  placement="right"
  drag-handle-placement="inset"
  dismissible>
  <p>Inset behavior. The drag handle stays inside the drawer edge.</p>
</ore-drawer>

<script>
  document.getElementById('open-handle-outside').addEventListener('click', function () {
    document.getElementById('drawer-handle-outside').setAttribute('open', '');
  });

  document.getElementById('open-handle-inset').addEventListener('click', function () {
    document.getElementById('drawer-handle-inset').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Backdrop Styles (`backdrop`)

Use `backdrop` to match dialog behavior:

- `opaque` (default): dim overlay
- `blur`: dim + blur
- `transparent`: no overlay

<ComponentPreview center>

```html
<ore-button id="open-backdrop-opaque">Opaque</ore-button>
<ore-button id="open-backdrop-blur">Blur</ore-button>
<ore-button id="open-backdrop-transparent">Transparent</ore-button>

<ore-drawer id="drawer-backdrop-opaque" label="Opaque backdrop" placement="right" backdrop="opaque" dismissible>
  <p>Default dimmed backdrop.</p>
</ore-drawer>

<ore-drawer id="drawer-backdrop-blur" label="Blur backdrop" placement="right" backdrop="blur" dismissible>
  <p>Backdrop uses blur + dim overlay.</p>
</ore-drawer>

<ore-drawer
  id="drawer-backdrop-transparent"
  label="Transparent backdrop"
  placement="right"
  backdrop="transparent"
  dismissible>
  <p>No dimmed backdrop, drawer still behaves like a dialog.</p>
</ore-drawer>

<script>
  ['opaque', 'blur', 'transparent'].forEach((kind) => {
    document.getElementById('open-backdrop-' + kind).addEventListener('click', () => {
      document.getElementById('drawer-backdrop-' + kind).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Listening to Events

```html
<ore-drawer id="my-drawer" label="Notifications" dismissible>
  <p>You have no new notifications.</p>
</ore-drawer>

<script type="module">
  import '@vielzeug/refine';

  const drawer = document.getElementById('my-drawer');
  drawer.addEventListener('open', (e) => console.log('drawer opened because:', e.detail.reason));
  drawer.addEventListener('close', (e) => console.log('drawer closed because:', e.detail.reason));
  drawer.addEventListener('close-request', (e) => {
    if (e.detail.reason === 'outside-click') {
      console.log('close requested from backdrop click');
    }
  });
</script>
```

## API Reference

### Attributes

| Attribute               | Type                                     | Default     | Description                                       |
| ----------------------- | ---------------------------------------- | ----------- | ------------------------------------------------- |
| `open`                  | `boolean`                                | `false`     | Controls visibility                               |
| `placement`             | `'left' \| 'right' \| 'top' \| 'bottom'` | `'right'`   | Edge the drawer slides in from                    |
| `size`                  | `'sm' \| 'md' \| 'lg' \| 'full'`         | `'md'`      | Panel width (or height for top/bottom placements) |
| `label`                 | `string`                                 | —           | Accessible title shown in the header bar          |
| `drag-handle-placement` | `'outside' \| 'inset'`                   | `'outside'` | Position of the swipe drag handle                 |
| `dismissible`           | `boolean`                                | `true`      | Shows a close (×) button in the header            |
| `backdrop`              | `'opaque' \| 'blur' \| 'transparent'`    | `'opaque'`  | Backdrop style, matching `ore-dialog`              |
| `persistent`            | `boolean`                                | `false`     | Prevents backdrop click from requesting close     |

### Slots

| Slot      | Description                                                  |
| --------- | ------------------------------------------------------------ |
| (default) | Drawer body content                                          |
| `header`  | Replace the default header bar (overrides the `label` title) |
| `footer`  | Footer area, typically used for action buttons               |

### Events

| Event           | Detail                                                                                                                      | Description                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `open`          | `{ placement: 'left' \| 'right' \| 'top' \| 'bottom', reason: 'programmatic' }`                                             | Fired when the drawer opens             |
| `close`         | `{ placement: 'left' \| 'right' \| 'top' \| 'bottom', reason: 'programmatic' \| 'trigger' \| 'escape' \| 'outside-click' }` | Fired when the drawer closes            |
| `close-request` | `{ placement: 'left' \| 'right' \| 'top' \| 'bottom', reason: 'trigger' \| 'escape' \| 'outside-click' }`                   | Fired before close and can be prevented |

### CSS Custom Properties

| Property               | Description                                   |
| ---------------------- | --------------------------------------------- |
| `--drawer-backdrop-bg` | Backdrop background color                     |
| `--drawer-bg`          | Panel background color                        |
| `--drawer-size`        | Panel width (horizontal) or height (vertical) |
| `--drawer-shadow`      | Panel box shadow                              |
| `--drawer-panel-blur`  | Panel backdrop blur amount                    |

## Accessibility

The drawer component follows the WAI-ARIA Dialog Pattern best practices.

The panel uses `role="dialog"` with `aria-modal="true"` to signal that content outside is inert. Always provide a `label` attribute to give screen readers a descriptive panel title. When `dismissible` is set, the close button carries `aria-label="Close"` automatically.

`Tab` and `Shift+Tab` move focus between focusable elements inside the panel. `Escape` closes the drawer when `dismissible` is set. Focus moves into the panel on open and returns to the trigger element on close.

## Related Components

- [Dialog](./dialog) — modal dialog for confirmations and focused tasks
