# Toast

A fixed toast notification container with Time Machine-style stacking animation. Stacks toasts with a 3D effect when collapsed; expands the full list on hover or focus. Built on top of `ore-alert`.

## Basic Usage

The recommended approach is the `toast` singleton service — no element reference needed.

```html
<ore-toast position="bottom-right"></ore-toast>

<script type="module">
  import '@vielzeug/refine/toast';
  import '@vielzeug/refine/alert';
  import { toast } from '@vielzeug/refine/toast';

  toast.add({ message: 'Changes saved!', color: 'success' });
</script>
```

If no `<ore-toast>` element exists in the page, the service creates and appends one automatically.

## Position Options

<ComponentPreview>

```html
<ore-toast id="toast-tl" position="top-left"></ore-toast>
<ore-toast id="toast-tc" position="top-center"></ore-toast>
<ore-toast id="toast-tr" position="top-right"></ore-toast>
<ore-toast id="toast-bl" position="bottom-left"></ore-toast>
<ore-toast id="toast-bc" position="bottom-center"></ore-toast>
<ore-toast id="toast-br" position="bottom-right"></ore-toast>

<ore-grid cols="3" gap="md" style="padding: var(--size-4);">
  <ore-button
    color="primary"
    onclick="document.getElementById('toast-tl').add({ message: 'Top Left',      color: 'primary',   duration: 3000 })"
    >Top Left</ore-button
  >
  <ore-button
    color="secondary"
    onclick="document.getElementById('toast-tc').add({ message: 'Top Center',    color: 'secondary', duration: 3000 })"
    >Top Center</ore-button
  >
  <ore-button
    color="info"
    onclick="document.getElementById('toast-tr').add({ message: 'Top Right',     color: 'info',      duration: 3000 })"
    >Top Right</ore-button
  >
  <ore-button
    color="success"
    onclick="document.getElementById('toast-bl').add({ message: 'Bottom Left',   color: 'success',   duration: 3000 })"
    >Bottom Left</ore-button
  >
  <ore-button
    color="warning"
    onclick="document.getElementById('toast-bc').add({ message: 'Bottom Center', color: 'warning',   duration: 3000 })"
    >Bottom Center</ore-button
  >
  <ore-button
    color="error"
    onclick="document.getElementById('toast-br').add({ message: 'Bottom Right',  color: 'error',     duration: 3000 })"
    >Bottom Right</ore-button
  >
</ore-grid>
```

</ComponentPreview>

## Variants & Colors

Toasts inherit all `ore-alert` variants and colors.

<ComponentPreview>

```html
<ore-toast id="demo-variants" position="bottom-center"></ore-toast>

<ore-grid cols="3" gap="md" style="padding: 2rem; max-width: 600px; margin: 0 auto;">
  <ore-button
    color="primary"
    variant="flat"
    onclick="document.getElementById('demo-variants').add({ message: 'Flat variant',     color: 'primary', variant: 'flat',     duration: 3000 })"
    >Flat</ore-button
  >
  <ore-button
    color="success"
    onclick="document.getElementById('demo-variants').add({ message: 'Solid variant',    color: 'success', variant: 'solid',    duration: 3000 })"
    >Solid</ore-button
  >
  <ore-button
    color="warning"
    variant="bordered"
    onclick="document.getElementById('demo-variants').add({ message: 'Bordered variant', color: 'warning', variant: 'bordered', duration: 3000 })"
    >Bordered</ore-button
  >
</ore-grid>
```

</ComponentPreview>

## Heading & Meta

Use `heading` to add a bold title above the message, and `meta` for secondary info (e.g. a timestamp).

<ComponentPreview>

```html
<ore-toast id="demo-heading" position="bottom-right"></ore-toast>

<ore-button
  color="info"
  onclick="document.getElementById('demo-heading').add({
  color: 'info',
  heading: 'New Message',
  message: 'You have 3 unread messages from your team.',
  meta: '2 min ago',
  duration: 5000,
})"
  >Show toast with heading</ore-button
>
```

</ComponentPreview>

## Action Buttons

Toasts can carry action buttons. Each button auto-dismisses the toast when clicked (after running `onClick`).

<ComponentPreview>

```html
<ore-toast id="demo-actions" position="bottom-right"></ore-toast>

<ore-grid cols="2" gap="md" style="padding: 2rem;">
  <ore-button color="warning" onclick="window.showConfirm()">Confirm actions</ore-button>
  <ore-button color="info" onclick="window.showHorizontal()">Horizontal action</ore-button>
</ore-grid>

<script>
  window.showConfirm = () =>
    document.getElementById('demo-actions').add({
      color: 'warning',
      heading: 'Unsaved Changes',
      message: 'You have unsaved changes. What would you like to do?',
      duration: 0,
      actions: [
        { label: 'Save', variant: 'flat', color: 'warning', onClick: () => console.log('saved') },
        { label: 'Discard', variant: 'solid', color: 'warning', onClick: () => console.log('discarded') },
      ],
    });

  window.showHorizontal = () =>
    document.getElementById('demo-actions').add({
      color: 'info',
      message: 'A new update is available.',
      horizontal: true,
      actions: [{ label: 'Refresh', variant: 'flat', onClick: () => location.reload() }],
    });
</script>
```

</ComponentPreview>

## Auto-dismiss & Pause on Hover

Set `duration` (ms) to auto-dismiss. The timer pauses on both hover and keyboard focus, and resumes when focus or hover leaves.

```javascript
toast.add({
  color: 'info',
  message: 'Read me carefully!',
  duration: 8000, // 8 second window
});
// Hovering or focusing the container pauses the countdown.
// Moving away resumes from exactly where it left off.
```

Set `duration: 0` for persistent toasts that require manual dismissal. Use `duration: 0` for errors and confirmations that require user action.

## Updating Toasts In-Place

`toast.update()` lets you mutate any field of a live toast — useful for progress updates or resolving an async state.

```javascript
const id = toast.add({
  message: 'Uploading file…',
  color: 'primary',
  duration: 0,
  dismissible: false,
});

// Later…
toast.update(id, {
  message: 'Upload complete!',
  color: 'success',
  duration: 4000,
  dismissible: true,
});
```

Passing a new `duration` also reschedules (or cancels) the auto-dismiss timer.

## Promise Helper

`toast.promise()` manages the full lifecycle of an async operation — loading, success, and error — from a single call. Prefer `toast.promise()` over manually managing loading/success/error toasts.

```javascript
import { toast } from '@vielzeug/refine/toast';

await toast.promise(uploadFile(), {
  loading: 'Uploading…',
  success: (url) => `Uploaded to ${url}`,
  error: (err) => `Upload failed: ${err.message}`,
});
```

The loading toast is persistent and non-dismissible. On settle it transitions to the success or error state with a 5 s auto-dismiss.

## `onDismiss` Callback

Execute code after a toast is fully removed (after the exit animation completes).

```javascript
toast.add({
  color: 'success',
  message: 'Profile saved.',
  duration: 3000,
  onDismiss: () => router.push('/dashboard'),
});
```

## Urgency (Screen Reader Interruption)

Toasts are routed to one of two ARIA live regions:

- **`polite`** (default): announced after the user finishes their current action — appropriate for success, info, and warning.
- **`assertive`**: interrupts the user immediately — reserved for critical failures.

Urgency is **auto-derived from `color`**: `error` uses `assertive`; everything else uses `polite`. Override only when needed:

```typescript
// A non-error toast that still needs to interrupt (e.g. session expiry)
toast.add({ message: 'Session expires in 2 minutes', color: 'warning', urgency: 'assertive' });
```

## Stacking Effect

When more than one toast is present, they stack with a 3D perspective. Only the front toast is interactive; the others are dimmed and scaled back.

- Hover or focus the container to expand the full list
- Toasts beyond the 3rd are hidden until the stack is expanded
- Entry animation uses a reactive `.entering` class — no JS timing hacks
- Exit animation uses a CSS opacity fade on `.toast-inner` — the wrapper stays in-flow until the fade completes
- Multiple toasts can exit in parallel (no serial dismiss queue)

Use `max` to prevent overwhelming users during high-frequency events.

## `toast` Singleton Service

The `toast` export is the recommended imperative API. It finds the first `<ore-toast>` element in the document, or creates one if none exists.

```typescript
import { toast } from '@vielzeug/refine/toast';

// Add — returns the auto-generated id
const id = toast.add({ message: 'Hello!', color: 'primary' });

// Update in-place
toast.update(id, { message: 'Updated!', color: 'success', duration: 3000 });

// Dismiss by id (animated)
toast.dismiss(id);

// Dismiss all (animated)
toast.clear();

// Tie a toast to a promise
await toast.promise(fetchData(), {
  loading: 'Loading…',
  success: 'Data loaded',
  error: 'Failed to load',
});
```

### `toast.configure()`

Set container options before the first `add()` call — useful when using the singleton service but needing non-default placement or limits:

```typescript
import { toast } from '@vielzeug/refine/toast';

toast.configure({ position: 'top-center', max: 3 });
toast.add({ message: 'Ready!', color: 'success' });
```

Options mirror the element attributes. Has no effect if a `<ore-toast>` already exists in the DOM.

## Element API

The `<ore-toast>` element itself exposes the same operations for cases where you hold a direct reference.

```javascript
const toaster = document.querySelector('ore-toast');

const id = toaster.add({ message: 'Hello!', color: 'success' }); // returns id
toaster.update(id, { message: 'Updated!' });
toaster.dismiss(id); // animated exit
toaster.clear(); // dismiss all (animated)
```

## API Reference

**`ToastItem` Properties**

| Property      | Type                              | Default     | Description                                                                         |
| ------------- | --------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `message`     | `string`                          | —           | **Required.** The notification text                                                 |
| `id`          | `string`                          | auto UUID   | Unique id. Auto-generated via `crypto.randomUUID()`                                 |
| `color`       | `ThemeColor`                      | `'primary'` | Alert color theme                                                                   |
| `heading`     | `string`                          | —           | Bold heading above the message                                                      |
| `variant`     | `'solid' \| 'flat' \| 'bordered'` | `'solid'`   | Visual style                                                                        |
| `size`        | `'sm' \| 'md' \| 'lg'`            | `'md'`      | Alert size                                                                          |
| `rounded`     | `RoundedSize \| ''`               | `'md'`      | Border radius                                                                       |
| `duration`    | `number`                          | `5000`      | Auto-dismiss delay in ms. `0` = persistent                                          |
| `dismissible` | `boolean`                         | `true`      | Show close (×) button                                                               |
| `meta`        | `string`                          | —           | Secondary text alongside the heading (e.g. timestamp)                               |
| `horizontal`  | `boolean`                         | `false`     | Render action buttons inline (to the right) instead of below                        |
| `urgency`     | `'polite' \| 'assertive'`         | auto        | Screen reader urgency. Auto-derived: `error` color → `assertive`, others → `polite` |
| `actions`     | `ActionItem[]`                    | —           | Array of action buttons (each auto-dismisses the toast on click)                    |
| `onDismiss`   | `() => void`                      | —           | Callback fired after the exit animation completes                                   |

**`ActionItem` Properties**

| Property  | Type         | Default              | Description                               |
| --------- | ------------ | -------------------- | ----------------------------------------- |
| `label`   | `string`     | —                    | Button text                               |
| `color`   | `ThemeColor` | inherits toast color | Button color                              |
| `onClick` | `() => void` | —                    | Click handler; toast auto-dismissed after |

**Attributes**

| Attribute  | Type     | Default          | Description                   |
| ---------- | -------- | ---------------- | ----------------------------- |
| `position` | `string` | `'bottom-right'` | Screen position               |
| `max`      | `number` | `5`              | Max toasts in the DOM at once |

**Events**

| Event     | Detail   | Description                   |
| --------- | -------- | ----------------------------- |
| `add`     | `{ id }` | Fired when a toast is added   |
| `dismiss` | `{ id }` | Fired when a toast is removed |

```javascript
document.querySelector('ore-toast').addEventListener('dismiss', (e) => {
  console.log('dismissed:', e.detail.id);
});
```

**CSS Custom Properties**

| Property               | Default  | Description                      |
| ---------------------- | -------- | -------------------------------- |
| `--toast-position`     | `fixed`  | CSS `position` value             |
| `--toast-inset-top`    | `auto`   | Top inset                        |
| `--toast-inset-bottom` | `1rem`   | Bottom inset                     |
| `--toast-inset-left`   | `auto`   | Left inset                       |
| `--toast-inset-right`  | `1rem`   | Right inset                      |
| `--toast-z-index`      | `9999`   | Z-index                          |
| `--toast-max-width`    | `400px`  | Max width                        |
| `--toast-gap`          | `0.5rem` | Gap between toasts when expanded |

## Accessibility

The toast component follows WAI-ARIA best practices. Each `ore-alert` carries `role="alert"` with `aria-live="polite"`, or `aria-live="assertive"` for `error`-colored toasts, so screen readers announce new toasts automatically without requiring any additional markup.

Auto-dismiss timers pause on both `mouseenter` and `focusin`, satisfying WCAG 2.1 SC 2.2.3. This means keyboard and pointer users alike have full control over how long a toast remains visible. The `dismissible` prop is forwarded to `ore-alert`'s built-in close button, which is correctly positioned within the alert grid, themed to match the alert color, and labelled `"Dismiss alert"`.
