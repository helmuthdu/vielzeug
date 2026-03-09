# Badge Component

A compact label for counts, statuses, and short metadata. Supports numeric overflow capping, a dot-only indicator, an optional icon slot, and all color themes.

## Features

- 🎨 **5 Variants**: solid, flat, bordered, outline, frost
- 🌈 **6 Semantic Colors**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- 🔢 **Count Mode**: display numeric counts with an optional max cap (e.g. `99+`)
- 🔴 **Dot Mode**: minimal dot indicator when no label needed- 📌 **Overlay Mode**: `anchor` prop pins the badge to a corner of any slotted content- 🔧 **Icon Slot**: prepend an icon inside the badge

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/badge/badge.ts
:::

## Basic Usage

```html
<bit-badge color="primary">New</bit-badge>

<script type="module">
  import '@vielzeug/buildit/badge';
</script>
```

## Visual Options

### Variants

The badge comes with five visual variants to match different levels of emphasis.

<ComponentPreview center>

```html
<bit-badge variant="solid">Solid</bit-badge>
<bit-badge variant="flat">Flat</bit-badge>
<bit-badge variant="bordered">Bordered</bit-badge>
<bit-badge variant="outline">Outline</bit-badge>
```

</ComponentPreview>

### Frost Variant

Modern frost effect with backdrop blur that adapts based on color:

- **Without color**: Subtle canvas-based frost overlay
- **With color**: Frosted glass effect with colored tint

::: tip Best Used With
Frost variant works best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center>

```html
<bit-badge variant="frost">Default</bit-badge>
<bit-badge variant="frost" color="primary">Primary</bit-badge>
<bit-badge variant="frost" color="secondary">Secondary</bit-badge>
<bit-badge variant="frost" color="info">Info</bit-badge>
<bit-badge variant="frost" color="success">Success</bit-badge>
<bit-badge variant="frost" color="warning">Warning</bit-badge>
<bit-badge variant="frost" color="error">Error</bit-badge>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts.

<ComponentPreview center>

```html
<bit-badge variant="solid">Default</bit-badge>
<bit-badge variant="solid" color="primary">Primary</bit-badge>
<bit-badge variant="solid" color="secondary">Secondary</bit-badge>
<bit-badge variant="solid" color="info">Info</bit-badge>
<bit-badge variant="solid" color="success">Success</bit-badge>
<bit-badge variant="solid" color="warning">Warning</bit-badge>
<bit-badge variant="solid" color="error">Error</bit-badge>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<bit-badge color="primary" size="sm">Small</bit-badge>
<bit-badge color="primary" size="md">Medium</bit-badge>
<bit-badge color="primary" size="lg">Large</bit-badge>
```

</ComponentPreview>

## Count Badge

Use `count` and `max` for numeric notification badges. When `count` exceeds `max` the label renders as `{max}+`.

<ComponentPreview center>

```html
<bit-badge color="error" count="3"></bit-badge>
<bit-badge color="error" count="42"></bit-badge>
<bit-badge color="error" count="150" max="99"></bit-badge>
<bit-badge color="warning" count="7" max="9"></bit-badge>
```

</ComponentPreview>

## Dot Indicator

Use `dot` for a minimal presence indicator with no label.

<ComponentPreview center>

```html
<bit-badge color="success" dot></bit-badge>
<bit-badge color="error" dot></bit-badge>
<bit-badge color="warning" dot></bit-badge>
```

</ComponentPreview>

## With Icon

Use the `icon` slot to prepend an SVG or icon font glyph.

<ComponentPreview center>

```html
<bit-badge color="success">
  <svg
    slot="icon"
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
  Verified
</bit-badge>
<bit-badge color="warning">
  <svg
    slot="icon"
    xmlns="http://www.w3.org/2000/svg"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0" />
  </svg>
  Pending
</bit-badge>
```

</ComponentPreview>

## Rounded Variants

<ComponentPreview center>

```html
<bit-badge color="primary" rounded="sm">sm</bit-badge>
<bit-badge color="primary" rounded="md">md</bit-badge>
<bit-badge color="primary" rounded="full">Full</bit-badge>
```

</ComponentPreview>

## Using Badges with Other Components

Badges work great when combined with other components to show counts, status, or notifications.

### Overlay / Notification Badge

Use the `anchor` prop with the `anchor` slot to pin a badge to the corner of any element. The host becomes `position: relative` and the badge is positioned absolutely at the specified corner.

<ComponentPreview center>

```html
<bit-badge color="error" count="5" anchor="top-end">
  <bit-button slot="anchor" variant="ghost" aria-label="Inbox">&#128706;</bit-button>
</bit-badge>

<bit-badge color="success" dot anchor="bottom-end">
  <img slot="anchor" src="/avatar.png" width="40" height="40" alt="User avatar" style="border-radius: 50%;" />
</bit-badge>

<bit-badge color="warning" count="12" anchor="top-start">
  <bit-button slot="anchor" variant="outline" size="sm">Messages</bit-button>
</bit-badge>
```

</ComponentPreview>

Four corner positions are available:

| `anchor` value      | Corner       |
| ------------------- | ------------ |
| `top-end` (default) | Top-right    |
| `top-start`         | Top-left     |
| `bottom-end`        | Bottom-right |
| `bottom-start`      | Bottom-left  |

<ComponentPreview center>

```html
<bit-button>
  Messages
  <bit-badge slot="suffix" color="error" count="5"></bit-badge>
</bit-button>

<bit-button color="primary">
  Inbox
  <bit-badge slot="suffix" color="error" count="23"></bit-badge>
</bit-button>

<bit-button variant="outline">
  Notifications
  <bit-badge slot="suffix" color="warning" count="150" max="99"></bit-badge>
</bit-button>

<bit-button variant="ghost">
  Updates
  <bit-badge slot="suffix" color="success" dot></bit-badge>
</bit-button>
```

</ComponentPreview>

### With Icons

Combine badges with icon buttons for compact notification indicators.

<ComponentPreview center>

```html
<bit-button variant="ghost" style="position: relative;">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
  <bit-badge
    slot="suffix"
    color="error"
    count="7"
    size="sm"
    style="position: absolute; top: 0; right: 0; transform: translate(25%, -25%);"></bit-badge>
</bit-button>

<bit-button variant="ghost" style="position: relative;">
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
  <bit-badge slot="suffix" color="success" dot size="sm" style="position: absolute; top: 4px; right: 4px;"></bit-badge>
</bit-button>
```

</ComponentPreview>

### Multiple Badges

Stack multiple badges to show different types of information.

<ComponentPreview center>

```html
<bit-button color="primary">
  Deploy to Production
  <bit-badge slot="suffix" color="warning" variant="outline" size="sm">v2.1.0</bit-badge>
  <bit-badge slot="suffix" color="success" variant="flat" size="sm">Ready</bit-badge>
</bit-button>

<bit-button variant="outline">
  Database Server
  <bit-badge slot="suffix" color="success" dot></bit-badge>
  <bit-badge slot="suffix" variant="flat" size="sm">US-East</bit-badge>
</bit-button>
```

</ComponentPreview>

## Guideline Recipe: Clarify System State at a Glance

**Guideline: clarify** — badges communicate discrete, categorical state without requiring the user to read prose.

```html
<!-- Status trifecta: make every row's health readable in a scan -->
<div style="display:flex;flex-direction:column;gap:var(--size-2)">
  <div style="display:flex;align-items:center;gap:var(--size-2)">
    <bit-text>API Gateway</bit-text>
    <bit-badge color="success" variant="soft">Operational</bit-badge>
  </div>
  <div style="display:flex;align-items:center;gap:var(--size-2)">
    <bit-text>Image Service</bit-text>
    <bit-badge color="warning" variant="soft">Degraded</bit-badge>
  </div>
  <div style="display:flex;align-items:center;gap:var(--size-2)">
    <bit-text>Billing Worker</bit-text>
    <bit-badge color="danger" variant="soft">Outage</bit-badge>
  </div>
</div>
```

**Tip:** Keep badge labels to 1–2 words. Use consistent color-to-meaning mapping site-wide so users build instant recognition.

## API Reference

### Attributes

| Attribute | Type                                                                      | Default   | Description                                       |
| --------- | ------------------------------------------------------------------------- | --------- | ------------------------------------------------- |
| `variant` | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'frost'`                 | `'solid'` | Visual style variant                              |
| `color`   | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -         | Theme color                                       |
| `size`    | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`    | Badge size                                        |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                | `'full'`  | Border radius                                     |
| `count`   | `number`                                                                  | -         | Numeric count to display                          |
| `max`     | `number`                                                                  | `99`      | Maximum count before showing `{max}+`             |
| `dot`     | `boolean`                                                                 | `false`   | Show as a dot indicator (no label)                |
| `anchor`  | `'top-end' \| 'top-start' \| 'bottom-end' \| 'bottom-start'`              | —         | Pin badge to a corner of slotted `anchor` content |

### Slots

| Slot      | Description                                          |
| --------- | ---------------------------------------------------- |
| (default) | Badge label text                                     |
| `icon`    | Icon prepended inside the badge                      |
| `anchor`  | Content the badge overlays when `anchor` prop is set |

### CSS Custom Properties

| Property               | Description                | Default               |
| ---------------------- | -------------------------- | --------------------- |
| `--badge-bg`           | Background color           | Theme-dependent       |
| `--badge-color`        | Text / icon color          | Theme-dependent       |
| `--badge-border-color` | Border color               | Theme-dependent       |
| `--badge-radius`       | Border radius              | `var(--rounded-full)` |
| `--badge-font-size`    | Font size                  | `var(--text-xs)`      |
| `--badge-padding-x`    | Horizontal padding         | `var(--size-2)`       |
| `--badge-padding-y`    | Vertical padding           | `var(--size-0-5)`     |
| `--badge-gap`          | Gap between icon and label | `var(--size-1)`       |

## Accessibility

The badge component follows WAI-ARIA best practices.

### `bit-badge`

✅ **Screen Readers**

- Badge text content is read by screen readers as inline text.
- Count badges expose the full value (or `{max}+`) as visible text that is read aloud.
- Dot indicator badges convey meaning through color and shape only — always pair them with a contextual label in the surrounding UI.
- When a badge is the only visible status indicator, add `aria-label` to its parent element to describe the meaning.

## Best Practices

**Do:**

- Use count badges near buttons, nav items, or avatars to show notification totals.
- Keep badge labels very short (1–3 words). For longer status text use `bit-alert`.
- Use `dot` when presence alone is enough (e.g., online indicator, unread indicator).
- Use `color="error"` for notification counts to draw immediate attention.

**Don't:**

- Use badges as the primary call-to-action; use `bit-button` for that.
- Display lengthy sentences inside a badge.
