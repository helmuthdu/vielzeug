# Drawer

A slide-in panel that overlays page content from any edge of the screen. Built on the native `<dialog>` element for correct top-layer stacking, focus trapping, and `Escape`-to-close behavior.

## Features

- 🔒 **Native `<dialog>`** — top-layer stacking, built-in focus trap, browser `Escape` handling
- ↔️ **4 Placements**: left, right (default), top, bottom
- 📐 **4 Sizes**: sm, md (default), lg, full
- 🔘 **Dismissable** — optional close (×) button in the header
- 🧩 **Flexible slots** — `header`, default body, and `footer`
- 🎞️ **Smooth animations** — slide-in/out transitions with backdrop fade
- ♿ **Accessible**: `role="dialog"`, `aria-modal`, `aria-labelledby` from `label` prop

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/overlay/drawer/drawer.ts
:::

## Basic Usage

Toggle the `open` attribute to show and hide the drawer.

```html
<bit-button id="open-drawer-btn">Open drawer</bit-button>

<bit-drawer id="drawer" label="Settings" dismissable>
  <p>Drawer body content goes here.</p>
  <div slot="footer">
    <bit-button variant="ghost" id="cancel-btn">Cancel</bit-button>
    <bit-button color="primary" id="save-btn">Save changes</bit-button>
  </div>
</bit-drawer>

<script type="module">
  import '@vielzeug/buildit';

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
<bit-button id="open-left">Left</bit-button>
<bit-button id="open-right">Right</bit-button>
<bit-button id="open-top">Top</bit-button>
<bit-button id="open-bottom">Bottom</bit-button>

<bit-drawer id="drawer-left" placement="left" label="Left drawer" dismissable>
  <p>Slides in from the left edge.</p>
</bit-drawer>
<bit-drawer id="drawer-right" placement="right" label="Right drawer" dismissable>
  <p>Slides in from the right edge (default).</p>
</bit-drawer>
<bit-drawer id="drawer-top" placement="top" label="Top drawer" dismissable>
  <p>Slides down from the top edge.</p>
</bit-drawer>
<bit-drawer id="drawer-bottom" placement="bottom" label="Bottom drawer" dismissable>
  <p>Slides up from the bottom edge.</p>
</bit-drawer>

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
<bit-button id="open-sm">sm</bit-button>
<bit-button id="open-md">md</bit-button>
<bit-button id="open-lg">lg</bit-button>
<bit-button id="open-full">full</bit-button>

<bit-drawer id="drawer-sm" size="sm" label="Small drawer" dismissable>
  <p>Compact drawer — ideal for quick-action panels.</p>
</bit-drawer>
<bit-drawer id="drawer-md" size="md" label="Medium drawer" dismissable>
  <p>The default size. Suitable for most use cases.</p>
</bit-drawer>
<bit-drawer id="drawer-lg" size="lg" label="Large drawer" dismissable>
  <p>More room for forms or detailed content.</p>
</bit-drawer>
<bit-drawer id="drawer-full" size="full" label="Full drawer" dismissable>
  <p>Takes up the full width or height of the viewport.</p>
</bit-drawer>

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
<bit-button id="open-slots-btn">Open with slots</bit-button>

<bit-drawer id="drawer-slots" label="Edit profile" dismissable>
  <div slot="header" style="display:flex; align-items:center; gap:0.5rem; padding: 1rem 1.25rem;">
    <strong>Edit profile</strong>
    <bit-badge color="primary" size="sm">Beta</bit-badge>
  </div>
  <div style="display:flex; flex-direction:column; gap:1rem;">
    <bit-input label="Display name" placeholder="Your name"></bit-input>
    <bit-input label="Email" placeholder="you@example.com"></bit-input>
  </div>
  <div slot="footer">
    <bit-button variant="ghost" id="cancel-slots-btn">Cancel</bit-button>
    <bit-button color="primary">Save</bit-button>
  </div>
</bit-drawer>

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

## Listening to Events

```html
<bit-drawer id="my-drawer" label="Notifications" dismissable>
  <p>You have no new notifications.</p>
</bit-drawer>

<script type="module">
  import '@vielzeug/buildit';

  const drawer = document.getElementById('my-drawer');
  drawer.addEventListener('open', () => console.log('drawer opened'));
  drawer.addEventListener('close', () => console.log('drawer closed'));
  drawer.addEventListener('close-request', (e) => {
    if (e.detail.trigger === 'backdrop') {
      console.log('close requested from backdrop click');
    }
  });
</script>
```

## Guideline Recipe: Onboarding Checklist Drawer

Use a drawer for progressive setup tasks without navigating away from the current page.

<ComponentPreview center>

```html
<bit-button id="open-onboard-drawer" color="primary">Open onboarding</bit-button>

<bit-drawer id="onboard-drawer" label="Project onboarding" placement="right" size="lg" dismissable>
  <div slot="header" style="display: flex; align-items: center; gap: 0.5rem;">
    <strong>Project onboarding</strong>
    <bit-badge color="info" variant="flat">3 steps</bit-badge>
  </div>

  <div style="display: grid; gap: 0.875rem;">
    <bit-checkbox checked>Choose template</bit-checkbox>
    <bit-checkbox>Set brand colors</bit-checkbox>
    <bit-checkbox>Invite first teammate</bit-checkbox>
    <bit-input label="Owner email" placeholder="you@company.com" helper="Invite will be sent instantly."></bit-input>
  </div>

  <div slot="footer" style="display: flex; gap: 0.5rem;">
    <bit-button variant="ghost" id="skip-onboard">Skip</bit-button>
    <bit-button color="primary" id="finish-onboard">Finish setup</bit-button>
  </div>
</bit-drawer>

<script>
  const onboard = document.getElementById('onboard-drawer');
  document.getElementById('open-onboard-drawer').addEventListener('click', () => onboard.setAttribute('open', ''));
  ['skip-onboard', 'finish-onboard'].forEach((id) => {
    document.getElementById(id).addEventListener('click', () => onboard.removeAttribute('open'));
  });
</script>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                     | Default   | Description                                       |
| ------------- | ---------------------------------------- | --------- | ------------------------------------------------- |
| `open`        | `boolean`                                | `false`   | Controls visibility                               |
| `placement`   | `'left' \| 'right' \| 'top' \| 'bottom'` | `'right'` | Edge the drawer slides in from                    |
| `size`        | `'sm' \| 'md' \| 'lg' \| 'full'`         | `'md'`    | Panel width (or height for top/bottom placements) |
| `label`       | `string`                                 | —         | Accessible title shown in the header bar          |
| `dismissable` | `boolean`                                | `false`   | Shows a close (×) button in the header            |

### Slots

| Slot      | Description                                                  |
| --------- | ------------------------------------------------------------ |
| (default) | Drawer body content                                          |
| `header`  | Replace the default header bar (overrides the `label` title) |
| `footer`  | Footer area, typically used for action buttons               |

### Events

| Event           | Detail                                                                                               | Description                             |
| --------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `open`          | `void`                                                                                               | Fired when the drawer opens             |
| `close`         | `void`                                                                                               | Fired when the drawer closes            |
| `close-request` | `{ trigger: 'backdrop' \| 'button' \| 'escape', placement: 'left' \| 'right' \| 'top' \| 'bottom' }` | Fired before close and can be prevented |

### CSS Custom Properties

| Property            | Description                                |
| ------------------- | ------------------------------------------ |
| `--drawer-backdrop` | Backdrop color (default: `rgba(0,0,0,.5)`) |
| `--drawer-bg`       | Panel background color                     |
| `--drawer-size`     | Override the panel width or height         |
| `--drawer-shadow`   | Panel box shadow                           |

## Accessibility

The drawer component follows the WAI-ARIA Dialog Pattern best practices.

### `bit-drawer`

✅ **Keyboard Navigation**

- `Tab` / `Shift+Tab` move focus between focusable elements inside the panel.
- `Escape` closes the drawer (when `dismissable` is set).

✅ **Screen Readers**

- The panel uses `role="dialog"` with `aria-modal="true"` to signal that content outside is inert.
- Provide a `label` attribute to give screen readers a descriptive panel title.
- The close button has `aria-label="Close drawer"` when `dismissable` is set.

✅ **Focus Management**

- Focus moves into the panel on open and returns to the trigger element on close.

## Related Components

- [Dialog](./dialog) — modal dialog for confirmations and focused tasks
