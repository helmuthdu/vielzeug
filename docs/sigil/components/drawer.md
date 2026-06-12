# Drawer

A slide-in panel that overlays page content from any edge of the screen. Built on the native `<dialog>` element for correct top-layer stacking, focus trapping, and `Escape`-to-close behavior.

## Features

- <sg-icon name="lock" size="16"></sg-icon> **Native `<dialog>`** — top-layer stacking, built-in focus trap, browser `Escape` handling
- <sg-icon name="arrow-left-right" size="16"></sg-icon> **4 Placements**: left, right (default), top, bottom
- <sg-icon name="triangle-right" size="16"></sg-icon> **4 Sizes**: sm, md, lg, full
- <sg-icon name="circle-dot" size="16"></sg-icon> **Dismissible** — optional close (×) button in the header
- <sg-icon name="cloud-fog" size="16"></sg-icon>️ **Backdrop Styles** — `opaque` (default), `blur`, or `transparent`
- <sg-icon name="puzzle" size="16"></sg-icon> **Flexible slots** — `header`, default body, and `footer`
- <sg-icon name="film" size="16"></sg-icon>️ **Smooth animations** — slide-in/out transitions with backdrop fade
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: `role="dialog"`, `aria-modal`, `aria-labelledby` from `label` prop

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/overlay/drawer/drawer.ts
:::

## Basic Usage

Toggle the `open` attribute to show and hide the drawer.

```html
<sg-button id="open-drawer-btn">Open drawer</sg-button>

<sg-drawer id="drawer" label="Settings" dismissible>
  <p>Drawer body content goes here.</p>
  <div slot="footer">
    <sg-button variant="ghost" id="cancel-btn">Cancel</sg-button>
    <sg-button color="primary" id="save-btn">Save changes</sg-button>
  </div>
</sg-drawer>

<script type="module">
  import '@vielzeug/sigil';

  const drawer = document.getElementById('drawer');

  document.getElementById('open-drawer-btn').addEventListener('click', () => {
    drawer.setAttribute('open', '');
  });
  document.getElementById('cancel-btn').addEventListener('click', () => {
    drawer.removeAttribute('open');
  });
</script>
```

## Placements

<ComponentPreview center>

```html
<sg-button id="open-left">Left</sg-button>
<sg-button id="open-right">Right</sg-button>
<sg-button id="open-top">Top</sg-button>
<sg-button id="open-bottom">Bottom</sg-button>

<sg-drawer id="drawer-left" placement="left" label="Left drawer" dismissible>
  <p>Slides in from the left edge.</p>
</sg-drawer>
<sg-drawer id="drawer-right" placement="right" label="Right drawer" dismissible>
  <p>Slides in from the right edge (default).</p>
</sg-drawer>
<sg-drawer id="drawer-top" placement="top" label="Top drawer" dismissible>
  <p>Slides down from the top edge.</p>
</sg-drawer>
<sg-drawer id="drawer-bottom" placement="bottom" label="Bottom drawer" dismissible>
  <p>Slides up from the bottom edge.</p>
</sg-drawer>

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
<sg-button id="open-sm">sm</sg-button>
<sg-button id="open-md">md</sg-button>
<sg-button id="open-lg">lg</sg-button>
<sg-button id="open-full">full</sg-button>

<sg-drawer id="drawer-sm" size="sm" label="Small drawer" dismissible>
  <p>Compact drawer — ideal for quick-action panels.</p>
</sg-drawer>
<sg-drawer id="drawer-md" size="md" label="Medium drawer" dismissible>
  <p>The default size. Suitable for most use cases.</p>
</sg-drawer>
<sg-drawer id="drawer-lg" size="lg" label="Large drawer" dismissible>
  <p>More room for forms or detailed content.</p>
</sg-drawer>
<sg-drawer id="drawer-full" size="full" label="Full drawer" dismissible>
  <p>Takes up the full width or height of the viewport.</p>
</sg-drawer>

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
<sg-button id="open-slots-btn">Open with slots</sg-button>

<sg-drawer id="drawer-slots" label="Edit profile" dismissible>
  <div slot="header">
    <strong>Edit profile</strong>
    <sg-badge color="primary" size="sm">Beta</sg-badge>
  </div>
  <div style="display:flex; flex-direction:column; gap:1rem;">
    <sg-input label="Display name" placeholder="Your name"></sg-input>
    <sg-input label="Email" placeholder="you@example.com"></sg-input>
  </div>
  <div slot="footer">
    <sg-button variant="ghost" id="cancel-slots-btn">Cancel</sg-button>
    <sg-button color="primary">Save</sg-button>
  </div>
</sg-drawer>

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
<sg-button id="open-handle-outside">Outside handle</sg-button>
<sg-button id="open-handle-inset">Inset handle</sg-button>

<sg-drawer
  id="drawer-handle-outside"
  label="Outside drag handle"
  placement="right"
  drag-handle-placement="outside"
  dismissible>
  <p>Default behavior. The drag handle sits outside the drawer edge.</p>
</sg-drawer>

<sg-drawer
  id="drawer-handle-inset"
  label="Inset drag handle"
  placement="right"
  drag-handle-placement="inset"
  dismissible>
  <p>Inset behavior. The drag handle stays inside the drawer edge.</p>
</sg-drawer>

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
<sg-button id="open-backdrop-opaque">Opaque</sg-button>
<sg-button id="open-backdrop-blur">Blur</sg-button>
<sg-button id="open-backdrop-transparent">Transparent</sg-button>

<sg-drawer id="drawer-backdrop-opaque" label="Opaque backdrop" placement="right" backdrop="opaque" dismissible>
  <p>Default dimmed backdrop.</p>
</sg-drawer>

<sg-drawer id="drawer-backdrop-blur" label="Blur backdrop" placement="right" backdrop="blur" dismissible>
  <p>Backdrop uses blur + dim overlay.</p>
</sg-drawer>

<sg-drawer
  id="drawer-backdrop-transparent"
  label="Transparent backdrop"
  placement="right"
  backdrop="transparent"
  dismissible>
  <p>No dimmed backdrop, drawer still behaves like a dialog.</p>
</sg-drawer>

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
<sg-drawer id="my-drawer" label="Notifications" dismissible>
  <p>You have no new notifications.</p>
</sg-drawer>

<script type="module">
  import '@vielzeug/sigil';

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
| `backdrop`              | `'opaque' \| 'blur' \| 'transparent'`    | `'opaque'`  | Backdrop style, matching `sg-dialog`              |
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

| Property            | Description                                |
| ------------------- | ------------------------------------------ |
| `--drawer-backdrop-bg`  | Backdrop background color          |
| `--drawer-bg`           | Panel background color             |
| `--drawer-size`         | Panel width (horizontal) or height (vertical) |
| `--drawer-shadow`       | Panel box shadow                   |
| `--drawer-panel-blur`   | Panel backdrop blur amount         |

## Accessibility

The drawer component follows the WAI-ARIA Dialog Pattern best practices.

### `sg-drawer`

<sg-icon name="check" size="16"></sg-icon> **Keyboard Navigation**

- `Tab` / `Shift+Tab` move focus between focusable elements inside the panel.
- `Escape` closes the drawer (when `dismissible` is set).

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

- The panel uses `role="dialog"` with `aria-modal="true"` to signal that content outside is inert.
- Provide a `label` attribute to give screen readers a descriptive panel title.
- The close button has `aria-label="Close"` when `dismissible` is set.

<sg-icon name="check" size="16"></sg-icon> **Focus Management**

- Focus moves into the panel on open and returns to the trigger element on close.

## Related Components

- [Dialog](./dialog) — modal dialog for confirmations and focused tasks
