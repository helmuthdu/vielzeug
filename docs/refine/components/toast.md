# Toast

`<ore-toast>` is a declarative notification host. It renders the notification store for its scope; application code always creates, updates, and dismisses notifications through a toast service.

## Basic Usage

Place a host once, then use the singleton service:

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
  <ore-button id="btn-basic" color="primary">Show Toast</ore-button>
</div>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-basic').addEventListener('click', () => {
    toast.success('Changes saved successfully!');
  });
</script>
```

</ComponentPreview>

If no host exists, the service creates one in `document.body` on first use. The host is intentionally render-only: it has no `add`, `update`, `dismiss`, or `clear` methods.

## Colors & Types

Use semantic color shortcuts to communicate outcome and intent.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
  <ore-button id="btn-success" color="success">Success</ore-button>
  <ore-button id="btn-info" color="info">Info</ore-button>
  <ore-button id="btn-warning" color="warning">Warning</ore-button>
  <ore-button id="btn-error" color="error">Error</ore-button>
</div>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-success').addEventListener('click', () => {
    toast.success('Profile updated successfully.');
  });
  document.getElementById('btn-info').addEventListener('click', () => {
    toast.info('A new update is available.');
  });
  document.getElementById('btn-warning').addEventListener('click', () => {
    toast.warning('Your session will expire in 5 minutes.');
  });
  document.getElementById('btn-error').addEventListener('click', () => {
    toast.error('Failed to save changes. Please try again.');
  });
</script>
```

</ComponentPreview>

## Heading & Metadata

Add a `heading` and `meta` (such as a timestamp) to provide structured context.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<ore-button id="btn-heading" color="primary">Show Detailed Toast</ore-button>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-heading').addEventListener('click', () => {
    toast.add({
      color: 'success',
      heading: 'Deployment Successful',
      message: 'Production build v2.4.0 is now live.',
      meta: 'Just now',
    });
  });
</script>
```

</ComponentPreview>

## Action Buttons

Attach interactive action buttons that execute callbacks before dismissing.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<ore-button id="btn-action" color="primary">Delete Item</ore-button>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-action').addEventListener('click', () => {
    toast.add({
      actions: [
        {
          label: 'Undo',
          onClick: () => console.log('Action undone'),
        },
      ],
      color: 'info',
      heading: 'Item Deleted',
      message: 'The item has been moved to trash.',
    });
  });
</script>
```

</ComponentPreview>

## Positions

Set `position` on `<ore-toast>` to control list placement (`top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`).

<ComponentPreview height="320px">

```html
<ore-toast position="top-right"></ore-toast>

<ore-button id="btn-top-right" color="primary">Top Right Toast</ore-button>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-top-right').addEventListener('click', () => {
    toast.info('Notification anchored at top-right.');
  });
</script>
```

</ComponentPreview>

## Variants

Toasts support `solid` (default), `flat`, and `bordered` visual variants.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
  <ore-button id="btn-solid" variant="solid" color="primary">Solid</ore-button>
  <ore-button id="btn-flat" variant="flat" color="primary">Flat</ore-button>
  <ore-button id="btn-bordered" variant="bordered" color="primary">Bordered</ore-button>
</div>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-solid').addEventListener('click', () => {
    toast.add({ color: 'primary', message: 'Solid variant notification', variant: 'solid' });
  });
  document.getElementById('btn-flat').addEventListener('click', () => {
    toast.add({ color: 'primary', message: 'Flat variant notification', variant: 'flat' });
  });
  document.getElementById('btn-bordered').addEventListener('click', () => {
    toast.add({ color: 'primary', message: 'Bordered variant notification', variant: 'bordered' });
  });
</script>
```

</ComponentPreview>

## Toast service

The `toast` singleton owns notification state, timers, lifecycle, and mutations.

```ts
import { toast } from '@vielzeug/refine/toast';

const id = toast.add({
  color: 'primary',
  duration: 0,
  dismissible: false,
  message: 'Uploading file…',
});

toast.update(id, {
  color: 'success',
  duration: 3000,
  dismissible: true,
  message: 'Upload complete!',
});

toast.dismiss(id);
toast.clear();
```

Use the colour shortcuts for common notifications:

```ts
toast.success('Profile saved');
toast.info('A new version is available');
toast.warning('Your session expires soon');
toast.error('Upload failed', { duration: 0 });
```

### Promise helper

`toast.promise()` keeps a persistent loading notification and updates it when the promise settles.

```ts
await toast.promise(uploadFile(), {
  loading: 'Uploading…',
  success: (url) => `Uploaded to ${url}`,
  error: (error) => `Upload failed: ${String(error)}`,
});
```

## Scoped services

Create a scoped service for notifications inside a drawer, dialog, or application region. The service binds to the declarative host in that root, or lazily creates one there.

```ts
import { createToastService } from '@vielzeug/refine/toast';

const drawerToast = createToastService(drawerElement);

drawerToast.configure({ max: 3, position: 'top-center' });
drawerToast.success('Saved inside the drawer');

// Dispose a scoped service when its owning region is permanently removed.
drawerToast.dispose();
```

Services created with the same root share one store. Different roots are isolated.

`configure()` applies immediately: position writes the host attribute, and max reaches the store through the host's own `max` watch. Calling it before the first notification simply configures the host that gets created lazily.

## Observing transitions

`tap()` exposes add, dismiss, and dispose transitions as a side channel — for analytics, logging, or syncing notifications to storage. Handler errors are swallowed; observation never affects toast behavior.

```ts
import { toast } from '@vielzeug/refine/toast';

const stop = toast.tap((event) => {
  if (event.type === 'add') console.log('shown', event.id);
  if (event.type === 'dismiss') console.log('removed', event.id);
});

stop(); // detach
```

## Declarative host

Use attributes to set a host's placement and notification limit:

```html
<ore-toast position="top-right" max="3"></ore-toast>
```

| Attribute  | Default          | Description                          |
| ---------- | ---------------- | ------------------------------------ |
| `position` | `bottom-right`   | `top-*` or `bottom-*` list anchor    |
| `max`      | `5`              | Maximum live notifications per scope — attribute changes apply live |

## Notification options

```ts
toast.add({
  actions: [{ label: 'Undo', onClick: undo }],
  color: 'success',
  heading: 'Message sent',
  message: 'Your message was delivered.',
  meta: 'Just now',
  duration: 5000,
});
```

| Option        | Default     | Description                                                       |
| ------------- | ----------- | ----------------------------------------------------------------- |
| `message`     | —           | Required notification text                                        |
| `id`          | generated   | Stable notification identifier                                    |
| `color`       | `primary`   | Alert colour theme                                                |
| `heading`     | —           | Alert heading                                                     |
| `variant`     | `solid`     | `solid`, `flat`, or `bordered`                                   |
| `duration`    | `5000`; `0` for action toasts | Auto-dismiss delay in milliseconds; `0` keeps it visible. Entries carrying `actions` persist until dismissed by default — keyboard and screen-reader users reach toasts last in tab order, so a timed expiry would expire the choice unseen |
| `dismissible` | `true`      | Shows the close button                                            |
| `snackbar`    | `false`     | Material-style compact bar: inverted neutral surface, single-row padding, text-style actions; overrides `variant` |
| `actions`     | —           | Buttons (flat by default, ghost when `snackbar`) that run `onClick` then dismiss |
| `replace`     | `false`     | Replace a live entry with the same message instead of stacking a duplicate |
| `urgency`     | derived     | `polite` or `assertive`; errors are assertive by default          |
| `onDismiss`   | —           | Called after the exit animation completes                         |

`toast.update(id, changes)` patches only the provided fields — omitted ones leave the entry (and its timer) unchanged.

### Snackbar

Set `snackbar: true` for small, transient confirmations — a Material-style bar on an inverted
surface (dark chip in light themes, light chip in dark themes) with single-row padding and a
flat text action. The bar sizes to its content up to the host's width cap, staying flush with
the position's anchored edge. With an action it persists until dismissed (the default for
action toasts), and on phones the action stacks below a wrapped message:

```ts
toast.add({
  actions: [{ label: 'Undo', onClick: undo }],
  horizontal: true,
  message: 'Damage +1',
  snackbar: true,
});
```

## Behavior and accessibility

Notifications render as a vertical list anchored to the host position — newest nearest the anchored edge — so every notification stays readable and reachable with a pointer, touch, or keyboard. Each notification is announced once through the host's polite or assertive live region; the embedded alert itself carries no live-region semantics.

Timed notifications show a thin progress bar along the bottom edge. Hovering or focusing the list pauses auto-dismiss timers and the bar; leaving resumes the remaining duration. Timers also pause while a top-layer surface (an open dialog, fullscreen) covers the toasts — the user cannot interact with them, so choices never expire unseen.

Users can dismiss closable notifications with the close button, a horizontal swipe, or the <kbd>Escape</kbd> key. Escape dismisses the notification holding focus; pressed anywhere else it dismisses the newest dismissible notification, unless an open top-layer surface owns the key. When a removed notification held focus, focus returns to the element focused before it, so keyboard users keep their place instead of restarting from the document top.

Notifications fade and slide in and out; both transitions honour `prefers-reduced-motion`, which also hides the progress bar. Removal happens on a fixed store-owned timeout (~250ms after dismissal), so a themed `--toast-exit-duration` beyond the default 200ms is clipped. On narrow viewports (≤ 480px) notifications span the full width above the safe-area inset, and horizontal snackbars stack their action below a wrapped message.

Flat and bordered notifications use an opaque surface (`--toast-bg`) tinted with the notification colour so they never blend into the page beneath them. Multiple notifications exit independently, and all timers and subscriptions are cleaned up when a scoped service is disposed.

## CSS custom properties

| Property                                                                          | Description                                          | Default                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `--toast-max-width`                                                               | Notification width cap (full width on phones)        | `400px`                                 |
| `--toast-gap`                                                                     | Gap between notifications                            | `var(--size-2)`                         |
| `--toast-bg`                                                                      | Opaque surface for flat and bordered notifications   | Tinted `var(--color-contrast-50)`       |
| `--toast-snackbar-bg`                                                             | Snackbar surface                                     | `var(--color-contrast-900)`             |
| `--toast-snackbar-color`                                                          | Snackbar text colour                                 | `var(--color-contrast-100)`             |
| `--toast-snackbar-padding`                                                        | Snackbar padding                                     | `var(--size-2) var(--size-4)`           |
| `--toast-snackbar-shadow`                                                          | Snackbar elevation shadow                            | `var(--shadow-lg)`                      |
| `--toast-shadow`                                                                  | Elevation shadow                                     | `var(--shadow-xl)`                      |
| `--toast-enter-duration` / `--toast-exit-duration`                                | Motion durations                                     | `var(--duration-200)`                   |
| `--toast-progress-height`                                                         | Height of the auto-dismiss progress bar              | `3px`                                   |
| `--toast-progress-color`                                                          | Colour of the auto-dismiss progress bar              | Notification colour                     |
| `--toast-inset-top` / `--toast-inset-bottom` / `--toast-inset-left` / `--toast-inset-right` | Viewport insets                          | `var(--size-4)`                         |
| `--toast-z-index`                                                                 | Stacking order                                       | `var(--z-toast)`                        |

## CSS parts

| Part            | Description                                   |
| --------------- | --------------------------------------------- |
| `container`     | Notification list                             |
| `toast-wrapper` | Per-notification layout wrapper (swipe target) |
| `toast-inner`   | Per-notification motion target                |
| `progress`      | Auto-dismiss progress bar                     |
