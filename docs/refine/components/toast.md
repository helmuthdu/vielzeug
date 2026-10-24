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

## Statuses

Every notification sits on a neutral surface that adapts to light and dark themes. The `status`
option communicates severity: it renders a status icon and tints the accent (the progress bar),
while the surface stays neutral so toasts never fight the page beneath them.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
  <ore-button id="btn-neutral" color="primary">Neutral</ore-button>
  <ore-button id="btn-success" color="success">Success</ore-button>
  <ore-button id="btn-info" color="info">Info</ore-button>
  <ore-button id="btn-warning" color="warning">Warning</ore-button>
  <ore-button id="btn-danger" color="error">Danger</ore-button>
</div>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-neutral').addEventListener('click', () => {
    toast.add({ message: 'A plain message with no status.' });
  });
  document.getElementById('btn-success').addEventListener('click', () => {
    toast.success('Profile updated successfully.');
  });
  document.getElementById('btn-info').addEventListener('click', () => {
    toast.info('A new update is available.');
  });
  document.getElementById('btn-warning').addEventListener('click', () => {
    toast.warning('Your session will expire in 5 minutes.');
  });
  document.getElementById('btn-danger').addEventListener('click', () => {
    toast.error('Failed to save changes. Please try again.');
  });
</script>
```

</ComponentPreview>

| Status    | Icon           | Default urgency |
| --------- | -------------- | --------------- |
| `neutral` | none           | `polite`        |
| `info`    | info           | `polite`        |
| `success` | check          | `polite`        |
| `warning` | triangle alert | `polite`        |
| `danger`  | circle alert   | `assertive`     |


### Avatar

For person-centric notifications, pass an `avatar` object (any `ore-avatar` prop) to fill the
leading slot with an avatar instead of the status glyph. The `status` still tints the accent and
sets the screen-reader urgency; only its icon is replaced.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<ore-button id="btn-avatar" color="primary">Mention</ore-button>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-avatar').addEventListener('click', () => {
    toast.add({
      avatar: { initials: 'JD', color: 'primary', alt: 'Jane Doe' },
      heading: 'Jane mentioned you',
      message: '@you can you review the deployment notes before Friday?',
      meta: 'Just now',
    });
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
      heading: 'Deployment Successful',
      message: 'Production build v2.4.0 is now live.',
      meta: 'Just now',
      status: 'success',
    });
  });
</script>
```

</ComponentPreview>

## Action Buttons

Attach interactive action buttons that execute callbacks before dismissing. A single action
defaults to a light ghost button; give each action an `emphasis` when the choice has hierarchy.

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
      heading: 'Item Deleted',
      message: 'The item has been moved to trash.',
      status: 'info',
    });
  });
</script>
```

</ComponentPreview>

### Confirm and cancel

Actions carry the same `emphasis` roles as [buttons](./button.md): `primary` (accent fill),
`cancel` (neutral ghost), and `destructive` (error ink). Keep exactly one `primary` per toast,
just like a dialog footer. Action emphasis is deliberately independent of the toast `status`:
a `danger` toast's Undo is a recovery action, not a destructive one, so coloring actions from
the status would read backwards.

<ComponentPreview height="320px">

```html
<ore-toast position="bottom-right"></ore-toast>

<ore-button id="btn-confirm" color="error">Delete File</ore-button>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-confirm').addEventListener('click', () => {
    toast.add({
      actions: [
        { emphasis: 'cancel', label: 'Cancel', onClick: () => console.log('kept') },
        { emphasis: 'destructive', label: 'Delete', onClick: () => console.log('deleted') },
      ],
      heading: 'Delete report.pdf?',
      message: 'This cannot be undone.',
      status: 'danger',
    });
  });
</script>
```

</ComponentPreview>

## Snackbar

Set `snackbar: true` for small, transient confirmations: a compact bar on an inverted surface
(dark chip in light themes, light chip in dark themes) that sizes to its content. With an
action it persists until dismissed:

<ComponentPreview height="260px">

```html
<ore-toast position="bottom-center"></ore-toast>

<ore-button id="btn-snackbar" color="primary">Show Snackbar</ore-button>

<script type="module">
  import { toast } from '@vielzeug/refine/toast';

  document.getElementById('btn-snackbar').addEventListener('click', () => {
    toast.add({
      actions: [{ label: 'Undo', onClick: () => console.log('undone') }],
      horizontal: true,
      message: 'Message archived',
      snackbar: true,
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

## Declarative host

Use attributes to set a host's placement and notification limit:

```html
<ore-toast position="top-right" max="3"></ore-toast>
```

| Attribute  | Default          | Description                          |
| ---------- | ---------------- | ------------------------------------ |
| `position` | `bottom-right`   | `top-*` or `bottom-*` list anchor    |
| `max`      | `5`              | Maximum live notifications per scope: attribute changes apply live |

## Toast service

The `toast` singleton owns notification state, timers, lifecycle, and mutations.

```ts
import { toast } from '@vielzeug/refine/toast';

const id = toast.add({
  duration: 0,
  dismissible: false,
  message: 'Uploading file…',
});

toast.update(id, {
  duration: 3000,
  dismissible: true,
  message: 'Upload complete!',
  status: 'success',
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

### Notification options

```ts
toast.add({
  actions: [{ label: 'Undo', onClick: undo }],
  heading: 'Message sent',
  message: 'Your message was delivered.',
  meta: 'Just now',
  status: 'success',
  duration: 5000,
});
```

| Option        | Default     | Description                                                       |
| ------------- | ----------- | ----------------------------------------------------------------- |
| `message`     | N/A | Required notification text                                        |
| `id`          | generated   | Stable notification identifier                                    |
| `status`      | `neutral`   | `neutral`, `info`, `success`, `warning`, or `danger`: renders a status icon, tints the accent, and (for `danger`) raises urgency |
| `avatar`      | N/A | `ore-avatar` props (`initials`, `src`, `alt`, `color`, `status`): fills the leading slot instead of the status icon |
| `heading`     | N/A | Alert heading                                                     |
| `duration`    | `5000`; `0` for action toasts | Auto-dismiss delay in milliseconds; `0` keeps it visible. Entries carrying `actions` persist until dismissed by default: keyboard and screen-reader users reach toasts last in tab order, so a timed expiry would expire the choice unseen |
| `dismissible` | `true`      | Shows the close button                                            |
| `snackbar`    | `false`     | Material-style compact bar: inverted neutral surface, single-row padding, text-style actions |
| `actions`     | N/A | Buttons (ghost text buttons by default) that run `onClick` then dismiss. Each action takes `emphasis` (`primary` / `cancel` / `destructive` / `normal`) plus optional `color`/`variant` overrides |
| `replace`     | `false`     | Replace a live entry with the same message instead of stacking a duplicate |
| `urgency`     | derived     | `polite` or `assertive`; `danger` is assertive by default         |
| `onDismiss`   | N/A | Called after the exit animation completes                         |

`toast.update(id, changes)` patches only the provided fields: omitted ones leave the entry (and its timer) unchanged.

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

`tap()` exposes add, dismiss, and dispose transitions as a side channel: for analytics, logging, or syncing notifications to storage. Handler errors are swallowed; observation never affects toast behavior.

```ts
import { toast } from '@vielzeug/refine/toast';

const stop = toast.tap((event) => {
  if (event.type === 'add') console.log('shown', event.id);
  if (event.type === 'dismiss') console.log('removed', event.id);
});

stop(); // detach
```

## Behavior and accessibility

Notifications render as a vertical list anchored to the host position: newest nearest the anchored edge, so every notification stays readable and reachable with a pointer, touch, or keyboard. Each notification is announced once through the host's polite or assertive live region; the embedded alert itself carries no live-region semantics.

Timed notifications show a thin progress bar along the bottom edge. Hovering or focusing the list pauses auto-dismiss timers and the bar; leaving resumes the remaining duration. Timers also pause while a top-layer surface (an open dialog, fullscreen) covers the toasts: the user cannot interact with them, so choices never expire unseen.

Users can dismiss closable notifications with the close button, a horizontal swipe, or the <kbd>Escape</kbd> key. Escape dismisses the notification holding focus; pressed anywhere else it dismisses the newest dismissible notification, unless an open top-layer surface owns the key. When a removed notification held focus, focus returns to the element focused before it, so keyboard users keep their place instead of restarting from the document top.

Notifications fade and slide in and out. Entry is pure CSS (`@starting-style` supplies the pre-mount frame, so no script drives it); exit runs the `--toast-exit-duration` transition and removes the node the moment that transition ends, so a themed exit duration is honored in full rather than clipped to a fixed timer. A swipe-to-dismiss flight reuses the same exit duration, keeping fade, swipe, and removal in lockstep. When a notification enters or leaves the stack, the neighbours slide to their new slots instead of snapping; the reflow follows the same motion rules. Under [Motion Mode](/refine/theming#motion-mode) reduction (the OS preference or `data-motion='reduced'`) the transitions collapse to instant and the progress bar stays hidden; `data-motion='full'` opts back in despite an OS reduction. On narrow viewports (≤ 480px) notifications span the full width above the safe-area inset, and horizontal snackbars stack their action below a wrapped message.

Every notification renders on the same opaque neutral surface (`--toast-bg`) that adapts to light
and dark themes; only the status icon and progress bar carry the status colour. Multiple
notifications exit independently, and all timers and subscriptions are cleaned up when a scoped
service is disposed.

## CSS custom properties

| Property                                                                          | Description                                          | Default                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `--toast-max-width`                                                               | Notification width cap (full width on phones)        | `400px`                                 |
| `--toast-gap`                                                                     | Gap between notifications                            | `var(--size-2)`                         |
| `--toast-bg`                                                                      | Notification surface (neutral, light-dark adaptive)  | `var(--color-contrast-100)`             |
| `--toast-color`                                                                   | Notification text colour                             | `var(--color-contrast-800)`             |
| `--toast-border-color`                                                            | Notification border                                  | 8% `var(--color-contrast-900)`          |
| `--toast-icon-size`                                                               | Status icon size                                     | `var(--size-5)`                         |
| `--toast-avatar-size`                                                             | Leading avatar diameter                              | `var(--size-8)`                         |
| `--toast-snackbar-bg`                                                             | Snackbar surface                                     | `var(--color-contrast-900)`             |
| `--toast-snackbar-color`                                                          | Snackbar text colour                                 | `var(--color-contrast-100)`             |
| `--toast-snackbar-padding`                                                        | Snackbar padding                                     | `var(--size-2) var(--size-4)`           |
| `--toast-snackbar-height`                                                         | Snackbar message row height, action or not           | `var(--size-8)`                         |
| `--toast-snackbar-shadow`                                                          | Snackbar elevation shadow                            | `var(--shadow-lg)`                      |
| `--toast-shadow`                                                                  | Elevation shadow                                     | `var(--shadow-xl)`                      |
| `--toast-enter-duration` / `--toast-exit-duration`                                | Motion durations                                     | `var(--duration-200)`                   |
| `--toast-progress-height`                                                         | Height of the auto-dismiss progress bar              | `3px`                                   |
| `--toast-progress-color`                                                          | Colour of the auto-dismiss progress bar              | Status accent colour                    |
| `--toast-inset-top` / `--toast-inset-bottom` / `--toast-inset-left` / `--toast-inset-right` | Viewport insets                          | `var(--size-4)`                         |
| `--toast-z-index`                                                                 | Stacking order                                       | `var(--z-toast)`                        |

## CSS parts

| Part            | Description                                   |
| --------------- | --------------------------------------------- |
| `container`     | Notification list                             |
| `toast-wrapper` | Per-notification layout wrapper (swipe target) |
| `toast-inner`   | Per-notification motion target                |
| `progress`      | Auto-dismiss progress bar                     |
