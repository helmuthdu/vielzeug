# Dialog

A modal dialog that blocks page interaction, traps focus, and dismisses on `Escape`. Built on the native `<dialog>` element for correct top-layer stacking and browser-managed accessibility semantics — no extra JS focus trapping or `z-index` juggling required.

## Opening and Closing

Use the `open` attribute to show the dialog and remove it (or set it to `false`) to close it. Always include a clearly labelled cancel or close action in the `footer` slot so keyboard and pointer users can dismiss without relying solely on `Escape`.

```html
<ore-button id="open-btn">Open dialog</ore-button>

<ore-dialog label="Confirm action" dismissible id="dialog">
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
  <div slot="footer">
    <ore-button variant="ghost" id="cancel-btn">Cancel</ore-button>
    <ore-button color="error" id="confirm-btn">Delete</ore-button>
  </div>
</ore-dialog>

<script type="module">
  import '@vielzeug/refine/dialog';
  import '@vielzeug/refine/button';

  const dialog = document.getElementById('dialog');

  document.getElementById('open-btn').addEventListener('click', () => {
    dialog.setAttribute('open', '');
  });
  document.getElementById('cancel-btn').addEventListener('click', () => {
    dialog.removeAttribute('open');
  });
  document.getElementById('confirm-btn').addEventListener('click', () => {
    dialog.removeAttribute('open');
    // handle confirm...
  });
</script>
```

## Sizes

<ComponentPreview center>

```html
<ore-button id="open-size-sm">Small</ore-button>
<ore-button id="open-size-md">Medium</ore-button>
<ore-button id="open-size-lg">Large</ore-button>
<ore-button id="open-size-xl">Extra large</ore-button>
<ore-button id="open-size-full">Full</ore-button>

<ore-dialog id="dialog-size-sm" label="Small dialog" size="sm" dismissible>
  <p>A compact dialog for brief confirmations.</p>
</ore-dialog>

<ore-dialog id="dialog-size-md" label="Medium dialog" size="md" dismissible>
  <p>The default size, suitable for most use cases.</p>
</ore-dialog>

<ore-dialog id="dialog-size-lg" label="Large dialog" size="lg" dismissible>
  <p>More room for forms or detailed content.</p>
</ore-dialog>

<ore-dialog id="dialog-size-xl" label="Extra large dialog" size="xl" dismissible>
  <p>Ideal for data-heavy views or complex forms.</p>
</ore-dialog>

<ore-dialog id="dialog-size-full" label="Full dialog" size="full" dismissible>
  <p>Expands to near full-screen width and height.</p>
</ore-dialog>

<script>
  ['sm', 'md', 'lg', 'xl', 'full'].forEach(function (size) {
    document.getElementById('open-size-' + size).addEventListener('click', function () {
      document.getElementById('dialog-size-' + size).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

Keep dialog content focused — if a dialog requires scrolling, it is usually a sign the content should live on its own page.

## Dismissible

Add `dismissible` to show a close (×) button in the top-right corner of the header. The close button carries `aria-label="Close dialog"` so screen readers announce it correctly.

<ComponentPreview center>

```html
<ore-button id="open-dismissible-btn">Open dialog</ore-button>

<ore-dialog id="dismissible-dialog" label="Update available" dismissible>
  <p>A new version is ready to install. Restart now to apply the update.</p>
  <div slot="footer">
    <ore-button variant="ghost" id="dismissible-later-btn">Later</ore-button>
    <ore-button color="primary">Restart now</ore-button>
  </div>
</ore-dialog>

<script>
  document.getElementById('open-dismissible-btn').addEventListener('click', function () {
    document.getElementById('dismissible-dialog').setAttribute('open', '');
  });
  document.getElementById('dismissible-later-btn').addEventListener('click', function () {
    document.getElementById('dismissible-dialog').removeAttribute('open');
  });
</script>
```

</ComponentPreview>

## Backdrop

Control the backdrop appearance with the `backdrop` attribute.

<ComponentPreview center>

```html
<ore-button id="open-backdrop-opaque">opaque</ore-button>
<ore-button id="open-backdrop-blur">blur</ore-button>
<ore-button id="open-backdrop-transparent">transparent</ore-button>

<ore-dialog id="dialog-backdrop-opaque" label="opaque" backdrop="opaque" dismissible
  ><p>Dark overlay, no blur.</p></ore-dialog
>
<ore-dialog id="dialog-backdrop-blur" label="blur" backdrop="blur" dismissible
  ><p>Dark overlay with 4 px blur — the default.</p></ore-dialog
>
<ore-dialog id="dialog-backdrop-transparent" label="transparent" backdrop="transparent" dismissible
  ><p>No overlay and no blur.</p></ore-dialog
>

<script>
  ['blur', 'opaque', 'transparent'].forEach(function (v) {
    document.getElementById('open-backdrop-' + v).addEventListener('click', function () {
      document.getElementById('dialog-backdrop-' + v).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Elevation

Control the panel drop shadow with the `elevation` attribute. Defaults to `xl`.

<ComponentPreview center>

```html
<ore-button id="open-elev-none">None</ore-button>
<ore-button id="open-elev-sm">sm</ore-button>
<ore-button id="open-elev-md">md</ore-button>
<ore-button id="open-elev-lg">lg</ore-button>
<ore-button id="open-elev-xl">xl</ore-button>
<ore-button id="open-elev-2xl">2xl</ore-button>

<ore-dialog id="dialog-elev-none" label="No shadow" elevation="none" dismissible
  ><p>Panel has no drop shadow.</p></ore-dialog
>
<ore-dialog id="dialog-elev-sm" label="sm elevation" elevation="sm" dismissible><p>Subtle shadow.</p></ore-dialog>
<ore-dialog id="dialog-elev-md" label="md elevation (default)" elevation="md" dismissible
  ><p>Normal shadow.</p></ore-dialog
>
<ore-dialog id="dialog-elev-lg" label="lg elevation" elevation="lg" dismissible><p>Stronger shadow.</p></ore-dialog>
<ore-dialog id="dialog-elev-xl" label="xl elevation" elevation="xl" dismissible><p>Default shadow level.</p></ore-dialog>
<ore-dialog id="dialog-elev-2xl" label="2xl elevation" elevation="2xl" dismissible
  ><p>Maximum shadow depth.</p></ore-dialog
>

<script>
  ['none', 'sm', 'md', 'lg', 'xl', '2xl'].forEach(function (e) {
    document.getElementById('open-elev-' + e).addEventListener('click', function () {
      document.getElementById('dialog-elev-' + e).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Padding

Control the internal padding of the header, body, and footer with the `padding` attribute. Defaults to `lg` (24 px).

<ComponentPreview center>

```html
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
  <ore-button id="open-pad-none">none</ore-button>
  <ore-button id="open-pad-sm">sm</ore-button>
  <ore-button id="open-pad-md">md</ore-button>
  <ore-button id="open-pad-lg">lg</ore-button>
  <ore-button id="open-pad-xl">xl</ore-button>
</div>

<ore-dialog id="dialog-pad-none" label="Padding: none" padding="none" dismissible
  ><p>No padding around the content.</p></ore-dialog
>
<ore-dialog id="dialog-pad-sm" label="Padding: sm" padding="sm" dismissible><p>Small padding (12 px).</p></ore-dialog>
<ore-dialog id="dialog-pad-md" label="Padding: md" padding="md" dismissible
  ><p>Medium padding — the default (16 px).</p></ore-dialog
>
<ore-dialog id="dialog-pad-lg" label="Padding: lg" padding="lg" dismissible><p>Large padding (24 px).</p></ore-dialog>
<ore-dialog id="dialog-pad-xl" label="Padding: xl" padding="xl" dismissible
  ><p>Extra-large padding (32 px).</p></ore-dialog
>

<script>
  ['none', 'sm', 'md', 'lg', 'xl'].forEach(function (p) {
    document.getElementById('open-pad-' + p).addEventListener('click', function () {
      document.getElementById('dialog-pad-' + p).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Custom Header

Use the `header` slot to replace the default title + close-button layout entirely.

<ComponentPreview center>

```html
<ore-button id="open-custom-header-btn">Open dialog</ore-button>

<ore-dialog id="custom-header-dialog" dismissible>
  <div slot="header" style="display:flex;align-items:center;gap:0.5rem;">
    <ore-icon name="info" size="20"></ore-icon>
    <strong>Session timeout</strong>
  </div>
  <p>Your session will expire in 2 minutes. Do you want to stay signed in?</p>
  <div slot="footer">
    <ore-button variant="ghost" id="custom-header-signout-btn">Sign out</ore-button>
    <ore-button color="primary" id="custom-header-stay-btn">Stay signed in</ore-button>
  </div>
</ore-dialog>

<script type="module">
  document.getElementById('open-custom-header-btn').addEventListener('click', function () {
    document.getElementById('custom-header-dialog').setAttribute('open', '');
  });
  document.getElementById('custom-header-signout-btn').addEventListener('click', function () {
    document.getElementById('custom-header-dialog').removeAttribute('open');
  });
  document.getElementById('custom-header-stay-btn').addEventListener('click', function () {
    document.getElementById('custom-header-dialog').removeAttribute('open');
  });
</script>
```

</ComponentPreview>

## Persistent (No Backdrop Close)

Set `persistent` to prevent the dialog from closing when the user clicks outside the panel. Useful for forms where accidental dismissal would lose data. When using `persistent`, always include an accessible way to dismiss — either `dismissible` or a clearly labelled cancel button in the `footer`. A dialog with no dismissal mechanism traps keyboard users indefinitely. Do not nest dialogs; stack them in a queue instead.

<ComponentPreview center>

```html
<ore-button id="open-persistent-btn">Open dialog</ore-button>

<ore-dialog id="persistent-dialog" label="Required setup" persistent dismissible>
  <p>
    Please complete the onboarding before continuing. Click outside the panel — nothing happens. Use the × button to
    dismiss.
  </p>
</ore-dialog>

<script>
  document.getElementById('open-persistent-btn').addEventListener('click', function () {
    document.getElementById('persistent-dialog').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Listening to Events

Do not open dialogs without user intent (e.g. on page load) — this is disorienting for screen reader users. Do not use dialogs for non-blocking notifications; use `ore-alert` or a toast component instead.

```javascript
const dialog = document.querySelector('ore-dialog');

dialog.addEventListener('open', (e) => {
  console.log('Dialog opened because:', e.detail.reason);
});

dialog.addEventListener('close', (e) => {
  console.log('Dialog closed because:', e.detail.reason);
  // Re-enable the trigger button, reset form state, etc.
});

dialog.addEventListener('close-request', (e) => {
  if (e.detail.reason === 'outside-click') {
    // Optional: block accidental outside dismiss in a critical flow.
    e.preventDefault();
  }
});
```

## API Reference

### Attributes

| Attribute     | Type                                              | Default    | Description                                                      |
| ------------- | ------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `open`        | `boolean`                                         | `false`    | Controls whether the dialog is visible                           |
| `label`       | `string`                                          | `''`       | Dialog title shown in the header; used as `aria-label`           |
| `size`        | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'`          | `'md'`     | Panel width preset                                               |
| `dismissible` | `boolean`                                         | `false`    | Show a close (×) button in the header                            |
| `persistent`  | `boolean`                                         | `false`    | Prevent backdrop-click from closing the dialog                   |
| `rounded`     | `'none' \| 'sm' \| 'md' \| 'lg' \| ... \| 'full'` | —          | Override the panel border radius                                 |
| `backdrop`    | `'blur' \| 'opaque' \| 'transparent'`             | `'opaque'` | Backdrop style — blur overlay, opaque (default) overlay, or none |
| `elevation`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'md'`     | Panel drop shadow depth                                          |
| `padding`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`          | `'md'`     | Padding for header, body, and footer                             |

### Events

| Event           | Detail                                                                   | Description                                    |
| --------------- | ------------------------------------------------------------------------ | ---------------------------------------------- |
| `open`          | `{ reason: 'programmatic' }`                                             | Fired once when the dialog transitions to open |
| `close`         | `{ reason: 'programmatic' \| 'trigger' \| 'escape' \| 'outside-click' }` | Fired when the dialog closes                   |
| `close-request` | `{ reason: 'trigger' \| 'escape' \| 'outside-click' }`                   | Fired before close and can be prevented        |

### Slots

| Slot      | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| (default) | Dialog body content                                                      |
| `header`  | Custom header content — replaces the default title + close-button layout |
| `footer`  | Action buttons or supplemental content pinned to the bottom of the panel |

### CSS Custom Properties

| Property                | Description                                   | Default                     |
| ----------------------- | --------------------------------------------- | --------------------------- |
| `--dialog-bg`           | Panel background color                        | `var(--color-canvas)`       |
| `--dialog-border-color` | Panel border color                            | `var(--color-contrast-300)` |
| `--dialog-radius`       | Panel border radius                           | `var(--rounded-lg)`         |
| `--dialog-shadow`       | Panel drop shadow                             | `var(--shadow-xl)`          |
| `--dialog-padding`      | Padding for header, body, and footer sections | `var(--size-6)`             |
| `--dialog-gap`          | Gap between footer action buttons             | `var(--size-4)`             |
| `--dialog-backdrop`     | Backdrop overlay colour                       | `rgba(0, 0, 0, 0.5)`        |
| `--dialog-max-width`    | Maximum panel width (overridden by `size`)    | `32rem`                     |

## Accessibility

The dialog component follows the [WAI-ARIA Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and is built on the native `<dialog>` element for WCAG 2.1 Level AA compliance.

The inner `<dialog>` element carries `role="dialog"` implicitly, so no extra ARIA role is needed. `aria-modal="true"` signals to assistive technologies that content outside the dialog is inert while it is open. When `label` is set, it becomes the `aria-label` of the dialog, giving screen readers a concise title to announce on open — always set a `label` (or provide a custom `header` slot), because a missing label creates a disorienting "unlabelled dialog" announcement when focus moves into the panel.

Keyboard navigation is handled natively by the browser. `Tab` moves focus to the next focusable element inside the dialog and wraps around; `Shift + Tab` moves to the previous focusable element; `Escape` closes the dialog. On open, the browser moves focus into the dialog panel automatically — no manual `focus()` call is required. Focus is trapped inside the dialog while it is open, and on close the browser returns focus to the element that triggered the dialog.
