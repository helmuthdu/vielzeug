# Toast

`<ore-toast>` is a declarative notification host. It renders the notification store for its scope; application code always creates, updates, and dismisses notifications through a toast service.

## Basic usage

Place a host once, then use the singleton service:

```html
<ore-toast position="bottom-right"></ore-toast>

<script type="module">
  import '@vielzeug/refine/toast';
  import { toast } from '@vielzeug/refine/toast';

  toast.success('Changes saved!');
</script>
```

If no host exists, the service creates one in `document.body` on first use. The host is intentionally render-only: it has no `add`, `update`, `dismiss`, or `clear` methods.

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

Services created with the same root share one store. Different roots are isolated. `configure()` must be called before the first notification, and controls the lazily-created host only.

## Declarative host

Use attributes to set a host's placement and notification limit:

```html
<ore-toast position="top-right" max="3"></ore-toast>
```

| Attribute  | Default          | Description                          |
| ---------- | ---------------- | ------------------------------------ |
| `position` | `bottom-right`   | `top-*` or `bottom-*` list anchor    |
| `max`      | `5`              | Maximum live notifications per scope  |

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
| `duration`    | `5000`      | Auto-dismiss delay in milliseconds; `0` keeps it visible         |
| `dismissible` | `true`      | Shows the close button                                            |
| `actions`     | —           | Buttons (flat by default) that run `onClick` then dismiss         |
| `urgency`     | derived     | `polite` or `assertive`; errors are assertive by default          |
| `onDismiss`   | —           | Called after the exit animation completes                         |

## Behavior and accessibility

Notifications render as a vertical list anchored to the host position — newest nearest the anchored edge — so every notification stays readable and reachable with a pointer, touch, or keyboard. Each notification is announced once through the host's polite or assertive live region; the embedded alert itself carries no live-region semantics.

Timed notifications show a thin progress bar along the bottom edge. Hovering or focusing the list pauses auto-dismiss timers and the bar; leaving resumes the remaining duration. Users can dismiss closable notifications with the close button, the <kbd>Escape</kbd> key while the notification has focus, or a horizontal swipe. Notifications fade and slide in and out; both transitions honour `prefers-reduced-motion`, which also hides the progress bar. On narrow viewports (≤ 480px) notifications span the full width above the safe-area inset.

Flat and bordered notifications use an opaque surface (`--toast-bg`) tinted with the notification colour so they never blend into the page beneath them. Multiple notifications exit independently, and all timers and subscriptions are cleaned up when a scoped service is disposed.

## CSS custom properties

| Property                                                                          | Description                                          | Default                                 |
| --------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `--toast-max-width`                                                               | Notification width cap (full width on phones)        | `400px`                                 |
| `--toast-gap`                                                                     | Gap between notifications                            | `var(--size-2)`                         |
| `--toast-bg`                                                                      | Opaque surface for flat and bordered notifications   | Tinted `var(--color-contrast-50)`       |
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
