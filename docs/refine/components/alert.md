# Alert

A feedback banner for surface-level status messages: errors, warnings, successes, and informational notices. Supports an optional heading, icon, metadata, action buttons, and a dismiss button.

## Variants

Three visual styles are available via the `variant` attribute. `flat` is the default: the same calm surface `ore-toast` uses — opaque neutral card, ink text, hairline border — with the color carried by the icon and accent instead of the whole box, so a stack of alerts stays readable and errors still stand out. `bordered` puts that color on the surface and border using the theme's tinted backdrop pairing (same as badges) while the text stays neutral ink, and `solid` fills the box with the theme color; slotted ghost/text actions automatically take the alert's contrast ink there (set `--button-color` on a button to opt out per button).

<ComponentPreview center vertical>

```html
<ore-alert color="primary">Flat (default)</ore-alert>
<ore-alert color="primary" variant="solid">Solid</ore-alert>
<ore-alert color="primary" variant="bordered">Bordered</ore-alert>
```

</ComponentPreview>

## Colors

The theme color tints the automatic icon, the `accented` edge, and — for `bordered` — the backdrop surface and border; `solid` fills the whole box. Text stays neutral ink on `flat` and `bordered`, keeping it AA-readable on every color in both schemes.

<ComponentPreview center vertical>

```html
<ore-grid gap="sm" cols="1" style="width: 100%;">
  <ore-alert color="primary">Primary</ore-alert>
  <ore-alert color="secondary">Secondary</ore-alert>
  <ore-alert color="info">Info</ore-alert>
  <ore-alert color="success">Success</ore-alert>
  <ore-alert color="warning">Warning</ore-alert>
  <ore-alert color="error">Error</ore-alert>
</ore-grid>
```

</ComponentPreview>

## Sizes

<ComponentPreview center vertical>

```html
<ore-alert color="info" size="sm">Small alert</ore-alert>
<ore-alert color="info" size="md">Medium alert (default)</ore-alert>
<ore-alert color="info" size="lg">Large alert</ore-alert>
```

</ComponentPreview>

## Heading

Use `heading` to add a bold heading above the message body.

<ComponentPreview center vertical>

```html
<ore-alert color="error" heading="Something went wrong">
  The server returned a 500 error. Please try again later.
</ore-alert>
<ore-alert color="success" heading="Payment confirmed">
  Your subscription has been updated. Changes take effect immediately.
</ore-alert>
```

</ComponentPreview>

## Dismissible

Add `dismissible` to show a close (×) button. When clicked, the component plays a `ore-alert-exit` animation (opacity fade + height collapse) before applying `[dismissed]` which sets `display: none`. An alert entering the page plays the matching enter animation (unfold + fade); both honor Motion Mode. Listen to the `dismiss` event to remove it from the DOM or restore it later. Always supply a `color` to convey semantic intent (`color="error"` for failures, `color="success"` for confirmations, etc.).

<ComponentPreview center vertical>

```html
<ore-alert color="warning" dismissible>Your session expires in 5 minutes.</ore-alert>
<ore-alert color="error" heading="Validation failed" dismissible variant="solid">
  Please fix the highlighted fields before continuing.
</ore-alert>
```

</ComponentPreview>

```javascript
document.querySelector('ore-alert').addEventListener('dismiss', (e) => {
  e.target.remove(); // optionally remove from DOM entirely
});
```

## Icon

Setting `color` renders a matching glyph automatically: `info` for `primary`/`secondary`/`info`, `check` for `success`, `triangle-alert` for `warning`, and `circle-alert` for `error` — the same vocabulary `ore-toast` uses per severity.

<ComponentPreview center vertical>

```html
<ore-alert color="info">A new version is available.</ore-alert>
<ore-alert color="success">Changes saved successfully.</ore-alert>
<ore-alert color="warning" heading="Heads up">
  Some features are currently in maintenance mode.
</ore-alert>
<ore-alert color="error" heading="Access denied" variant="solid">
  You do not have permission to perform this action.
</ore-alert>
```

</ComponentPreview>

Set `icon` to any [icon name](/refine/components/icon) to pick the glyph yourself, or `icon="none"` to render a bare alert. A colorless alert never renders an automatic icon.

<ComponentPreview center vertical>

```html
<ore-alert color="info" icon="zap">Scheduled maintenance tonight.</ore-alert>
<ore-alert color="error" icon="none">Validation failed on 2 fields.</ore-alert>
```

</ComponentPreview>

Content in the `icon` slot always wins over both: use it for custom SVGs, avatars, or a differently sized glyph (`ore-toast` passes its own leading icon this way). The icon wrapper is hidden entirely when nothing fills it: no reserved space.

<ComponentPreview center vertical>

```html
<ore-alert color="success" heading="Payment confirmed">
  <ore-icon slot="icon" name="check" size="18"></ore-icon>
  Your subscription has been updated.
</ore-alert>
```

</ComponentPreview>

## Meta

Use the `meta` slot to add secondary information (e.g. a timestamp) displayed alongside the heading in a lighter, smaller style. Pair it with a `heading` for best results.

<ComponentPreview center vertical>

```html
<ore-alert color="info" heading="New message" dismissible>
  <span slot="meta">2 mins ago</span>
  You have a new message from the support team.
</ore-alert>

<ore-alert color="warning" variant="bordered" heading="Scheduled maintenance">
  <span slot="meta">Tomorrow at 3:00 AM</span>
  The system will be unavailable for approximately 30 minutes.
</ore-alert>
```

</ComponentPreview>

## Actions

Use the `actions` slot to add call-to-action buttons below the message. Avoid nesting complex interactive controls in the default slot; keep alerts primarily informational. Give actions a semantic `emphasis` (see [Button emphasis](./button.md)) and keep one primary per alert: in development, an actions row with more than one `emphasis="primary"` button logs a warning.

<ComponentPreview center vertical>

```html
<ore-alert color="warning" heading="Session expiring">
  Your session will expire in 5 minutes.
  <div slot="actions" style="display: flex; gap: var(--size-2);">
    <ore-button size="sm" variant="ghost">Dismiss</ore-button>
    <ore-button size="sm" color="warning">Stay signed in</ore-button>
  </div>
</ore-alert>

<ore-alert color="primary" variant="bordered" heading="Update available">
  A new version is ready to install.
  <div slot="actions">
    <ore-button size="sm" color="primary">Update now</ore-button>
  </div>
</ore-alert>
```

</ComponentPreview>

### Horizontal Actions

Add `horizontal` to move the actions to the right side of the content instead of below it. Works with a heading (the heading and message stack in the content column) and stays a single row on phones.

<ComponentPreview center vertical>

```html
<ore-alert color="info" horizontal>
  You have 3 unread notifications.
  <div slot="actions">
    <ore-button size="sm" color="info">View all</ore-button>
  </div>
</ore-alert>

<ore-alert color="success" variant="bordered" horizontal>
  Your backup completed successfully.
  <div slot="actions" style="display: flex; gap: var(--size-2);">
    <ore-button size="sm" color="success" variant="ghost">Details</ore-button>
    <ore-button size="sm" color="success">Download</ore-button>
  </div>
</ore-alert>
```

</ComponentPreview>

::: tip
Avoid combining `horizontal` with `heading`: it makes the layout feel cramped.
:::

## Accented

Add `accented` to add a thick left border for extra visual emphasis. Only applies to `flat` and `bordered` variants.

<ComponentPreview center vertical>

```html
<ore-alert color="error" variant="flat" accented>
  Your account has been locked due to too many failed sign-in attempts.
</ore-alert>
<ore-alert color="info" variant="bordered" accented heading="Did you know?">
  You can export your data at any time from the settings page.
</ore-alert>
```

</ComponentPreview>

## Site Banner

An alert pinned to a viewport edge or stretched across the page makes a slim announcement banner: one short message, one or two actions, and a dismiss affordance. Show one banner at a time; the banner owns presentation only, so persist dismissal (`dismiss` event + hide it yourself on next load).

### Slim Row

`slim` tightens the padding and puts icon, text, and actions on one wrapping row — the classic announcement strip.

<ComponentPreview>

```html
<ore-alert slim color="primary" variant="solid" dismissible>
  New: dark mode is live.
  <ore-button slot="actions" size="sm" variant="ghost">Try it</ore-button>
</ore-alert>
```

</ComponentPreview>

### Pinned Banner

`docked="top"` or `docked="bottom"` fixes the banner to that viewport edge, clear of the safe-area insets. It is full-bleed by default; set `--alert-max-width` for a boxed card centered in the dock.

```html
<!-- Pinned to the bottom edge, full-bleed -->
<ore-alert docked="bottom" slim dismissible>
  Scheduled maintenance tonight 02:00–03:00 UTC.
  <ore-button slot="actions" size="sm" variant="ghost" href="/status">Status page</ore-button>
</ore-alert>
```

```html
<!-- Boxed, brand surface, dual actions -->
<ore-alert docked="top" slim color="primary" variant="solid" dismissible style="--alert-max-width: 640px">
  20% off annual plans this week.
  <ore-button slot="actions" size="sm" variant="ghost">Get the deal</ore-button>
  <ore-button slot="actions" size="sm" variant="ghost">Learn more</ore-button>
</ore-alert>
```

### Composed Banners

Anything can ride in the `actions` slot, so marketing banners compose from existing components instead of extra banner API. Newsletter capture:

```html
<ore-alert slim color="secondary" dismissible>
  Weekly changelog, no spam.
  <div slot="actions" style="display:flex; gap: var(--size-2)">
    <ore-input size="sm" type="email" placeholder="you@example.com"></ore-input>
    <ore-button size="sm" color="primary" type="submit">Subscribe</ore-button>
  </div>
</ore-alert>
```

A countdown banner is the same shape: keep the remaining time in the text and update it from your own timer code.

Do **not** map banners to the `role="banner"` landmark — screen readers expect exactly one per page and it means the site header; the alert's own `status` role already announces it politely.

### Full-Width Strip

An edge-to-edge notice strip across the page (in-flow, not pinned): full width, no radius, a tinted `bordered` surface, and `horizontal` actions on wide layouts.

<ComponentPreview>

```html
<ore-alert
  color="warning"
  variant="bordered"
  rounded="none"
  style="width: 100%"
  heading="Scheduled maintenance"
  horizontal>
  The dashboard will be briefly unavailable tonight from 02:00 to 03:00 UTC while we upgrade the
  database.
  <ore-button slot="actions" size="sm" variant="ghost" href="/status">Status page</ore-button>
  <ore-button slot="actions" size="sm" color="warning" href="/settings/alerts">Notify me</ore-button>
</ore-alert>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                                                      | Default  | Description                                                                                                                   |
| ------------- | ------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | N/A      | Theme color                                                                                                                   |
| `variant`     | `'flat' \| 'solid' \| 'bordered'`                                         | `'flat'` | Visual style variant                                                                                                          |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`   | Component size                                                                                                                |
| `rounded`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                | N/A      | Border radius override                                                                                                        |
| `heading`     | `string`                                                                  | `''`     | Bold heading above the message body                                                                                           |
| `icon`        | `string`                                                                  | N/A      | Leading icon name; overrides the glyph derived from `color`, `none` disables it (see [Icon](#icon))                           |
| `dismissible` | `boolean`                                                                 | `false`  | Show a close (×) button                                                                                                       |
| `docked`      | `'top' \| 'bottom'`                                                       | N/A      | Pin to a viewport edge as a site banner; full-bleed unless `--alert-max-width` is set                                         |
| `slim`        | `boolean`                                                                 | `false`  | Single-line density: tighter padding; icon, text, and actions share one wrapping row                                          |
| `accented`    | `boolean`                                                                 | `false`  | Left accent border (flat/bordered variants only)                                                                              |
| `horizontal`  | `boolean`                                                                 | `false`  | Place action buttons beside the content                                                                                       |
| `embedded`    | `boolean`                                                                 | `false`  | Host-managed mode: no live region or `role`, and `dismiss` fires immediately without the exit animation (used by `ore-toast`) |

### Slots

| Slot      | Description                                                             |
| --------- | ----------------------------------------------------------------------- |
| (default) | Alert message content                                                   |
| `icon`    | Icon on the leading edge. Hidden when empty: no reserved space.         |
| `meta`    | Secondary info alongside the heading (lighter, right-aligned, smaller)  |
| `actions` | Action buttons below the message, or beside it when `horizontal` is set |

### Events

| Event     | Detail                          | Description                                                            |
| --------- | ------------------------------- | ---------------------------------------------------------------------- |
| `dismiss` | `{ originalEvent: MouseEvent }` | Fired after the exit animation completes (immediately when `embedded`) |

### Properties

| Property | Type                             | Default          | Description                                                                        |
| -------- | -------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `labels` | `Partial<AlertLabels>` (JS only) | English defaults | Accessible strings: `dismiss` (close button name), `dismissed` (live announcement) |

```js
const alert = document.querySelector('ore-alert');
alert.labels = { dismiss: 'Hinweis schließen', dismissed: 'Hinweis geschlossen' };
```

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

| Property               | Description                                                      | Default                       |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------- |
| `--alert-bg`           | Background color                                                 | Theme-dependent               |
| `--alert-color`        | Text and icon color                                              | Theme-dependent               |
| `--alert-border-color` | Border color                                                     | Theme-dependent               |
| `--alert-shadow`       | Box shadow                                                       | Theme-dependent               |
| `--alert-radius`       | Border radius                                                    | `var(--rounded-lg)`           |
| `--alert-padding`      | Internal padding                                                 | `var(--size-3) var(--size-4)` |
| `--alert-gap`          | Gap between icon, body, and close                                | `var(--size-3)`               |
| `--alert-font-size`    | Font size                                                        | `var(--text-sm)`              |
| `--alert-icon-size`    | Automatic leading icon size                                      | `var(--size-5)`               |
| `--alert-max-width`    | Content width for a boxed look                                   | `100%`                        |
| `--alert-dock-inset`   | Distance from viewport edges when docked (plus safe-area insets) | `var(--size-4)`               |
| `--alert-dock-z-index` | Stacking order when docked                                       | `var(--z-fixed)`              |

## Accessibility

The alert component follows WAI-ARIA best practices. It uses `role="alert"` with `aria-live="polite"` so screen readers announce the alert on insertion. When `color="error"`, `aria-live` is set to `assertive` so urgent errors interrupt immediately; all other severities use `polite`. When dismissed, `[dismissed]` applies `display: none`, removing the element from the accessibility tree entirely.

The close button is keyboard-reachable and labeled through the `dismiss` label (`"Dismiss alert"` by default; announce text uses the `dismissed` label). The `[dismissing]` state disables `pointer-events` during the exit animation to prevent double-activation.

::: tip Dynamic insertion
Alerts injected into the DOM are announced automatically via `role="alert"`. Avoid toggling `color` after insertion as it may trigger an unwanted re-announcement.
:::
