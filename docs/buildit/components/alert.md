# Alert

A feedback banner for surface-level status messages — errors, warnings, successes, and informational notices. Supports an optional heading, icon, metadata, action buttons, and a dismiss button.

## Features

- 🎨 **3 Variants**: `flat` (default), `solid`, `bordered`
- 🌈 **6 Color Themes**: `primary`, `secondary`, `info`, `success`, `warning`, `error`
- 📏 **3 Sizes**: `sm`, `md`, `lg`
- ✖️ **Dismissible**: animated close button — plays a smooth fade+collapse animation before hiding
- 🖼️ **Icon Slot**: prepend any SVG or icon font glyph
- 🏷️ **Heading**: optional bold heading above the message
- 🕐 **Meta Slot**: timestamp or secondary info alongside the heading
- 🔘 **Actions Slot**: call-to-action buttons below the message (or horizontal)
- 🎯 **Accented**: left accent border for flat and bordered variants
- ♿ **Accessible**: `role="alert"` + smart `aria-live`, labelled close button

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/alert/alert.ts
:::

## Basic Usage

```html
<bit-alert color="success">Your changes have been saved.</bit-alert>

<script type="module">
  import '@vielzeug/buildit/alert';
</script>
```

## Variants

Three visual styles are available via the `variant` attribute. `flat` is the default.

<ComponentPreview center vertical>

```html
<bit-alert color="primary">Flat (default)</bit-alert>
<bit-alert color="primary" variant="solid">Solid</bit-alert>
<bit-alert color="primary" variant="bordered">Bordered</bit-alert>
```

</ComponentPreview>

## Colors

<ComponentPreview center vertical>

```html
<bit-grid gap="sm" cols="1" style="width: 100%;">
  <bit-alert variant="bordered" color="primary">Primary</bit-alert>
  <bit-alert variant="bordered" color="secondary">Secondary</bit-alert>
  <bit-alert variant="bordered" color="info">Info</bit-alert>
  <bit-alert variant="bordered" color="success">Success</bit-alert>
  <bit-alert variant="bordered" color="warning">Warning</bit-alert>
  <bit-alert variant="bordered" color="error">Error</bit-alert>
</bit-grid>
```

</ComponentPreview>

## Sizes

<ComponentPreview center vertical>

```html
<bit-alert color="info" size="sm">Small alert</bit-alert>
<bit-alert color="info" size="md">Medium alert (default)</bit-alert>
<bit-alert color="info" size="lg">Large alert</bit-alert>
```

</ComponentPreview>

## Heading

Use `heading` to add a bold heading above the message body.

<ComponentPreview center vertical>

```html
<bit-alert color="error" heading="Something went wrong">
  The server returned a 500 error. Please try again later.
</bit-alert>
<bit-alert color="success" heading="Payment confirmed">
  Your subscription has been updated. Changes take effect immediately.
</bit-alert>
```

</ComponentPreview>

## Dismissible

Add `dismissible` to show a close (×) button. When clicked, the component plays a `bit-alert-exit` animation (opacity fade + height collapse) before applying `[dismissed]` which sets `display: none`. Listen to the `dismiss` event to remove it from the DOM or restore it later.

<ComponentPreview center vertical>

```html
<bit-alert color="warning" dismissible>Your session expires in 5 minutes.</bit-alert>
<bit-alert color="error" heading="Validation failed" dismissible variant="solid">
  Please fix the highlighted fields before continuing.
</bit-alert>
```

</ComponentPreview>

```javascript
document.querySelector('bit-alert').addEventListener('dismiss', (e) => {
  e.target.remove(); // optionally remove from DOM entirely
});
```

## Icon

Use the `icon` slot to add a leading icon. The icon wrapper is hidden entirely when the slot is empty — no reserved space.

<ComponentPreview center vertical>

```html
<bit-alert color="success">
  <span slot="icon" class="material-symbols-rounded">check_circle</span>
  Changes saved successfully.
</bit-alert>
<bit-alert color="warning" heading="Heads up">
  <span slot="icon" class="material-symbols-rounded">warning</span>
  Some features are currently in maintenance mode.
</bit-alert>
<bit-alert color="error" heading="Access denied" variant="solid" dismissible>
  <span slot="icon" class="material-symbols-rounded">block</span>
  You do not have permission to perform this action.
</bit-alert>
```

</ComponentPreview>

## Meta

Use the `meta` slot to add secondary information (e.g. a timestamp) displayed alongside the heading in a lighter, smaller style. Pair it with a `heading` for best results.

<ComponentPreview center vertical>

```html
<bit-alert color="info" heading="New message" dismissible>
  <span slot="meta">2 mins ago</span>
  You have a new message from the support team.
</bit-alert>

<bit-alert color="warning" variant="bordered" heading="Scheduled maintenance">
  <span slot="meta">Tomorrow at 3:00 AM</span>
  The system will be unavailable for approximately 30 minutes.
</bit-alert>
```

</ComponentPreview>

## Actions

Use the `actions` slot to add call-to-action buttons below the message.

<ComponentPreview center vertical>

```html
<bit-alert color="warning" heading="Session expiring">
  Your session will expire in 5 minutes.
  <div slot="actions" style="display: flex; gap: var(--size-2);">
    <bit-button size="sm" variant="ghost">Dismiss</bit-button>
    <bit-button size="sm" color="warning">Stay signed in</bit-button>
  </div>
</bit-alert>

<bit-alert color="primary" variant="bordered" heading="Update available">
  A new version is ready to install.
  <div slot="actions">
    <bit-button size="sm" color="primary">Update now</bit-button>
  </div>
</bit-alert>
```

</ComponentPreview>

### Horizontal Actions

Add `horizontal` to move the actions to the right side of the content instead of below it. Best suited for short, single-line messages without a heading.

<ComponentPreview center vertical>

```html
<bit-alert color="info" horizontal>
  You have 3 unread notifications.
  <div slot="actions">
    <bit-button size="sm" color="info">View all</bit-button>
  </div>
</bit-alert>

<bit-alert color="success" variant="bordered" horizontal>
  Your backup completed successfully.
  <div slot="actions" style="display: flex; gap: var(--size-2);">
    <bit-button size="sm" color="success" variant="ghost">Details</bit-button>
    <bit-button size="sm" color="success">Download</bit-button>
  </div>
</bit-alert>
```

</ComponentPreview>

::: tip
Avoid combining `horizontal` with `heading` — it makes the layout feel cramped.
:::

## Accented

Add `accented` to add a thick left border for extra visual emphasis. Only applies to `flat` and `bordered` variants.

<ComponentPreview center vertical>

```html
<bit-alert color="error" variant="flat" accented>
  Your account has been locked due to too many failed sign-in attempts.
</bit-alert>
<bit-alert color="info" variant="bordered" accented heading="Did you know?">
  You can export your data at any time from the settings page.
</bit-alert>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                                                      | Default  | Description                                      |
| ------------- | ------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —        | Theme color                                      |
| `variant`     | `'flat' \| 'solid' \| 'bordered'`                                         | `'flat'` | Visual style variant                             |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`   | Component size                                   |
| `rounded`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                | —        | Border radius override                           |
| `heading`     | `string`                                                                  | `''`     | Bold heading above the message body              |
| `dismissible` | `boolean`                                                                 | `false`  | Show a close (×) button                          |
| `accented`    | `boolean`                                                                 | `false`  | Left accent border (flat/bordered variants only) |
| `horizontal`  | `boolean`                                                                 | `false`  | Place action buttons beside the content          |

### Slots

| Slot      | Description                                                             |
| --------- | ----------------------------------------------------------------------- |
| (default) | Alert message content                                                   |
| `icon`    | Icon on the leading edge. Hidden when empty — no reserved space.        |
| `meta`    | Secondary info alongside the heading (lighter, right-aligned, smaller)  |
| `actions` | Action buttons below the message, or beside it when `horizontal` is set |

### Events

| Event     | Detail                          | Description                            |
| --------- | ------------------------------- | -------------------------------------- |
| `dismiss` | `{ originalEvent: MouseEvent }` | Fired when the close button is clicked |

### CSS Parts

| Part      | Description            |
| --------- | ---------------------- |
| `alert`   | Root container element |
| `icon`    | Icon wrapper           |
| `body`    | Body flex container    |
| `header`  | Heading + meta row     |
| `heading` | Heading text span      |
| `meta`    | Meta slot wrapper      |
| `content` | Default slot wrapper   |
| `actions` | Actions slot wrapper   |
| `close`   | Dismiss button         |

### CSS Custom Properties

| Property               | Description                       | Default                       |
| ---------------------- | --------------------------------- | ----------------------------- |
| `--alert-bg`           | Background color                  | Theme-dependent               |
| `--alert-color`        | Text and icon color               | Theme-dependent               |
| `--alert-border-color` | Border color                      | Theme-dependent               |
| `--alert-radius`       | Border radius                     | `var(--rounded-lg)`           |
| `--alert-padding`      | Internal padding                  | `var(--size-3) var(--size-4)` |
| `--alert-gap`          | Gap between icon, body, and close | `var(--size-3)`               |
| `--alert-font-size`    | Font size                         | `var(--text-sm)`              |

## Accessibility

The alert component follows WAI-ARIA best practices.

### `bit-alert`

✅ **Screen Readers**

- Uses `role="alert"` with `aria-live="polite"` — screen readers announce the alert on insertion.
- `aria-live` is `assertive` when `color="error"` so urgent errors interrupt immediately; all other severities use `polite`.
- `[dismissed]` uses `display: none`, removing the element from the accessibility tree entirely.

✅ **Keyboard Navigation**

- The close button is keyboard-reachable and has `aria-label="Dismiss alert"`.
- `[dismissing]` disables `pointer-events` during the exit animation to prevent double-activation.

::: tip Dynamic insertion
Alerts injected into the DOM are announced automatically via `role="alert"`. Avoid toggling `color` after insertion as it may trigger an unwanted re-announcement.
:::

## Best Practices

**Do:**

- Always supply a `color` to convey semantic intent (`color="error"` for failures, `color="success"` for confirmations, etc.).
- Use `heading` when you need to distinguish a short title from a longer explanation.
- Use `accented` to draw extra attention to a critical flat or bordered alert.
- Listen to `dismiss` and call `e.target.remove()` when you want the alert gone from the DOM, not just hidden.

**Don't:**

- Use `bit-alert` for short, transient notifications — use a toast/notification system instead.
- Combine `horizontal` with `heading` — the layout becomes cramped.
- Nest complex interactive controls in the default slot; keep alerts primarily informational.
