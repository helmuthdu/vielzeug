# Dialog

A modal dialog that blocks page interaction, traps focus, and dismisses on `Escape`. Built on the native `<dialog>` element for correct top-layer stacking and browser-managed accessibility semantics — no extra JS focus trapping or `z-index` juggling required.

## Features

- 🔒 **Native `<dialog>`** — correct top-layer stacking, built-in backdrop, browser focus trapping
- ⌨️ **`Escape` to close** — handled by the browser natively
- 🎯 **Controlled open state** — toggle with the `open` attribute or property
- 🔘 **Dismissible** — optional close (×) button in the header
- 🛡️ **Persistent mode** — prevent accidental close via backdrop click
- 🧩 **Flexible slots** — `header`, default body, and `footer`
- 📐 **5 Sizes**: sm, md, lg, xl, full
- 🎨 **3 Variants**: default, plain, bordered
- ♿ **Accessible**: `role="dialog"`, `aria-modal="true"`, `aria-label` from `label` prop, labelled close button

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/overlay/dialog/dialog.ts
:::

## Basic Usage

Use the `open` attribute to show the dialog and remove it (or set it to `false`) to close it.

```html
<bit-button id="open-btn">Open dialog</bit-button>

<bit-dialog label="Confirm action" dismissible id="dialog">
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
  <div slot="footer">
    <bit-button variant="ghost" id="cancel-btn">Cancel</bit-button>
    <bit-button color="error" id="confirm-btn">Delete</bit-button>
  </div>
</bit-dialog>

<script type="module">
  import '@vielzeug/buildit/dialog';
  import '@vielzeug/buildit/button';

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
<bit-button id="open-size-sm">Small</bit-button>
<bit-button id="open-size-md">Medium</bit-button>
<bit-button id="open-size-lg">Large</bit-button>
<bit-button id="open-size-xl">Extra large</bit-button>
<bit-button id="open-size-full">Full</bit-button>

<bit-dialog id="dialog-size-sm" label="Small dialog" size="sm" dismissible>
  <p>A compact dialog for brief confirmations.</p>
</bit-dialog>

<bit-dialog id="dialog-size-md" label="Medium dialog" size="md" dismissible>
  <p>The default size, suitable for most use cases.</p>
</bit-dialog>

<bit-dialog id="dialog-size-lg" label="Large dialog" size="lg" dismissible>
  <p>More room for forms or detailed content.</p>
</bit-dialog>

<bit-dialog id="dialog-size-xl" label="Extra large dialog" size="xl" dismissible>
  <p>Ideal for data-heavy views or complex forms.</p>
</bit-dialog>

<bit-dialog id="dialog-size-full" label="Full dialog" size="full" dismissible>
  <p>Expands to near full-screen width and height.</p>
</bit-dialog>

<script>
  ['sm', 'md', 'lg', 'xl', 'full'].forEach(function (size) {
    document.getElementById('open-size-' + size).addEventListener('click', function () {
      document.getElementById('dialog-size-' + size).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Dismissible

Add `dismissible` to show a close (×) button in the top-right corner of the header.

<ComponentPreview center>

```html
<bit-button id="open-dismissible-btn">Open dialog</bit-button>

<bit-dialog id="dismissible-dialog" label="Update available" dismissible>
  <p>A new version is ready to install. Restart now to apply the update.</p>
  <div slot="footer">
    <bit-button variant="ghost" id="dismissible-later-btn">Later</bit-button>
    <bit-button color="primary">Restart now</bit-button>
  </div>
</bit-dialog>

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
<bit-button id="open-backdrop-opaque">opaque</bit-button>
<bit-button id="open-backdrop-blur">blur</bit-button>
<bit-button id="open-backdrop-transparent">transparent</bit-button>

<bit-dialog id="dialog-backdrop-opaque" label="opaque" backdrop="opaque" dismissible
  ><p>Dark overlay, no blur.</p></bit-dialog
>
<bit-dialog id="dialog-backdrop-blur" label="blur" backdrop="blur" dismissible
  ><p>Dark overlay with 4 px blur — the default.</p></bit-dialog
>
<bit-dialog id="dialog-backdrop-transparent" label="transparent" backdrop="transparent" dismissible
  ><p>No overlay and no blur.</p></bit-dialog
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
<bit-button id="open-elev-none">None</bit-button>
<bit-button id="open-elev-sm">sm</bit-button>
<bit-button id="open-elev-md">md</bit-button>
<bit-button id="open-elev-lg">lg</bit-button>
<bit-button id="open-elev-xl">xl</bit-button>
<bit-button id="open-elev-2xl">2xl</bit-button>

<bit-dialog id="dialog-elev-none" label="No shadow" elevation="none" dismissible
  ><p>Panel has no drop shadow.</p></bit-dialog
>
<bit-dialog id="dialog-elev-sm" label="sm elevation" elevation="sm" dismissible><p>Subtle shadow.</p></bit-dialog>
<bit-dialog id="dialog-elev-md" label="md elevation (default)" elevation="md" dismissible
  ><p>Normal shadow.</p></bit-dialog
>
<bit-dialog id="dialog-elev-lg" label="lg elevation" elevation="lg" dismissible><p>Stronger shadow.</p></bit-dialog>
<bit-dialog id="dialog-elev-xl" label="xl elevation" elevation="xl" dismissible
  ><p>Default shadow level.</p></bit-dialog
>
<bit-dialog id="dialog-elev-2xl" label="2xl elevation" elevation="2xl" dismissible
  ><p>Maximum shadow depth.</p></bit-dialog
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
  <bit-button id="open-pad-none">none</bit-button>
  <bit-button id="open-pad-sm">sm</bit-button>
  <bit-button id="open-pad-md">md</bit-button>
  <bit-button id="open-pad-lg">lg</bit-button>
  <bit-button id="open-pad-xl">xl</bit-button>
</div>

<bit-dialog id="dialog-pad-none" label="Padding: none" padding="none" dismissible
  ><p>No padding around the content.</p></bit-dialog
>
<bit-dialog id="dialog-pad-sm" label="Padding: sm" padding="sm" dismissible><p>Small padding (12 px).</p></bit-dialog>
<bit-dialog id="dialog-pad-md" label="Padding: md" padding="md" dismissible
  ><p>Medium padding — the default (16 px).</p></bit-dialog
>
<bit-dialog id="dialog-pad-lg" label="Padding: lg" padding="lg" dismissible><p>Large padding (24 px).</p></bit-dialog>
<bit-dialog id="dialog-pad-xl" label="Padding: xl" padding="xl" dismissible
  ><p>Extra-large padding (32 px).</p></bit-dialog
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
<bit-button id="open-custom-header-btn">Open dialog</bit-button>

<bit-dialog id="custom-header-dialog" dismissible>
  <div slot="header" style="display:flex;align-items:center;gap:0.5rem;">
    <bit-icon name="info" size="20"></bit-icon>
    <strong>Session timeout</strong>
  </div>
  <p>Your session will expire in 2 minutes. Do you want to stay signed in?</p>
  <div slot="footer">
    <bit-button variant="ghost" id="custom-header-signout-btn">Sign out</bit-button>
    <bit-button color="primary" id="custom-header-stay-btn">Stay signed in</bit-button>
  </div>
</bit-dialog>

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

Set `persistent` to prevent the dialog from closing when the user clicks outside the panel. Useful for forms where accidental dismissal would lose data.

<ComponentPreview center>

```html
<bit-button id="open-persistent-btn">Open dialog</bit-button>

<bit-dialog id="persistent-dialog" label="Required setup" persistent dismissible>
  <p>
    Please complete the onboarding before continuing. Click outside the panel — nothing happens. Use the × button to
    dismiss.
  </p>
</bit-dialog>

<script>
  document.getElementById('open-persistent-btn').addEventListener('click', function () {
    document.getElementById('persistent-dialog').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Listening to Events

```javascript
const dialog = document.querySelector('bit-dialog');

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

| Event   | Detail | Description                                    |
| ------- | ------ | ---------------------------------------------- |
| `open`          | `{ reason: 'programmatic' }`                                                | Fired once when the dialog transitions to open |
| `close`         | `{ reason: 'programmatic' \| 'trigger' \| 'escape' \| 'outside-click' }` | Fired when the dialog closes                   |
| `close-request` | `{ reason: 'trigger' \| 'escape' \| 'outside-click' }`                     | Fired before close and can be prevented        |

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

### `bit-dialog`

✅ **Keyboard Navigation**

| Key           | Action                                                                    |
| ------------- | ------------------------------------------------------------------------- |
| `Tab`         | Move focus to the next focusable element inside the dialog (wraps around) |
| `Shift + Tab` | Move focus to the previous focusable element (wraps around)               |
| `Escape`      | Close the dialog (handled natively by the browser)                        |

✅ **Screen Readers**

- The inner `<dialog>` element carries `role="dialog"` implicitly — no extra ARIA role is needed.
- `aria-modal="true"` signals to assistive technologies that content outside the dialog is inert while it is open.
- When `label` is set, it becomes the `aria-label` of the dialog, giving screen readers a concise title to announce on open.
- When `dismissible` is set, the close button has a descriptive `aria-label="Close dialog"`.

✅ **Focus Management**

- On open, the browser moves focus into the dialog panel automatically — no manual `focus()` call required.
- Focus is trapped inside the dialog while it is open; pressing `Tab` cycles only through interactive elements within the panel.
- On close, focus returns to the element that triggered the dialog — standard browser behavior for the native `<dialog>`.

::: tip Label every dialog
Always set a `label` (or provide a custom `header` slot). Screen readers announce the dialog title immediately when focus moves into the panel, so a missing label creates a disorienting "unlabelled dialog" announcement.
:::

::: warning Persistent dialogs
When using `persistent`, always include an accessible way to dismiss — either `dismissible` or a clearly labelled cancel button in the `footer`. A dialog with no dismissal mechanism traps keyboard users indefinitely.
:::

## Best Practices

**Do:**

- Provide a descriptive `label` — it becomes the accessible dialog title.
- Include a clearly labelled cancel/close action in the `footer` slot so keyboard and pointer users can dismiss without relying solely on `Escape`.
- Use `persistent` only when data would be lost otherwise (e.g. multi-step forms). Always still provide a way to intentionally dismiss (use `dismissible` or a footer cancel button).
- Keep dialog content focused — if a dialog requires scrolling, it's usually a sign the content should live on its own page.

**Don't:**

- Nest dialogs; stack them in a queue instead.
- Use dialogs for non-blocking notifications — use `bit-alert` or a toast component instead.
- Open dialogs without user intent (e.g. on page load) — this is disorienting for screen reader users.
