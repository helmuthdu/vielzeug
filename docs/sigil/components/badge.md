# Badge

A compact label for counts, statuses, and short metadata. Supports numeric overflow capping, a dot-only indicator, an optional icon slot, and all color themes.

## Features

- <sg-icon name="palette" size="16"></sg-icon> **5 Variants**: solid, flat, bordered, outline, frost
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Semantic Colors**: primary, secondary, info, success, warning, error
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes**: sm, md, lg
- <sg-icon name="hash" size="16"></sg-icon> **Count Mode**: display numeric counts with an optional max cap (e.g. `99+`)
- <sg-icon name="circle" size="16"></sg-icon> **Dot Mode**: minimal dot indicator when no label needed- <sg-icon name="map-pin" size="16"></sg-icon> **Overlay Mode**: `anchor` prop pins the badge to a corner of any slotted content- <sg-icon name="wrench" size="16"></sg-icon> **Icon Slot**: prepend an icon inside the badge

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/feedback/badge/badge.ts
:::

## Basic Usage

```html
<sg-badge color="primary">New</sg-badge>
```

## Visual Options

### Variants

The badge comes with five visual variants to match different levels of emphasis.

<ComponentPreview center>

```html
<sg-badge variant="solid">Solid</sg-badge>
<sg-badge variant="flat">Flat</sg-badge>
<sg-badge variant="bordered">Bordered</sg-badge>
<sg-badge variant="outline">Outline</sg-badge>
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
<sg-badge variant="frost">Default</sg-badge>
<sg-badge variant="frost" color="primary">Primary</sg-badge>
<sg-badge variant="frost" color="secondary">Secondary</sg-badge>
<sg-badge variant="frost" color="info">Info</sg-badge>
<sg-badge variant="frost" color="success">Success</sg-badge>
<sg-badge variant="frost" color="warning">Warning</sg-badge>
<sg-badge variant="frost" color="error">Error</sg-badge>
```

</ComponentPreview>

### Colors

Six semantic colors for different contexts.

<ComponentPreview center>

```html
<sg-badge variant="solid">Default</sg-badge>
<sg-badge variant="solid" color="primary">Primary</sg-badge>
<sg-badge variant="solid" color="secondary">Secondary</sg-badge>
<sg-badge variant="solid" color="info">Info</sg-badge>
<sg-badge variant="solid" color="success">Success</sg-badge>
<sg-badge variant="solid" color="warning">Warning</sg-badge>
<sg-badge variant="solid" color="error">Error</sg-badge>
```

</ComponentPreview>

### Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<sg-badge color="primary" size="sm">Small</sg-badge>
<sg-badge color="primary" size="md">Medium</sg-badge>
<sg-badge color="primary" size="lg">Large</sg-badge>
```

</ComponentPreview>

## Count Badge

Use `count` and `max` for numeric notification badges. When `count` exceeds `max` the label renders as `{max}+`.

<ComponentPreview center>

```html
<sg-badge color="error" count="3"></sg-badge>
<sg-badge color="error" count="42"></sg-badge>
<sg-badge color="error" count="150" max="99"></sg-badge>
<sg-badge color="warning" count="7" max="9"></sg-badge>
```

</ComponentPreview>

## Dot Indicator

Use `dot` for a minimal presence indicator with no label.

<ComponentPreview center>

```html
<sg-badge color="success" dot></sg-badge>
<sg-badge color="error" dot></sg-badge>
<sg-badge color="warning" dot></sg-badge>
```

</ComponentPreview>

## With Icon

Use the `icon` slot to prepend an SVG or icon font glyph.

<ComponentPreview center>

```html
<sg-badge color="success">
  <sg-icon slot="icon" name="check" size="10"></sg-icon>
  Verified
</sg-badge>
<sg-badge color="warning">
  <sg-icon slot="icon" name="alert-circle" size="10"></sg-icon>
  Pending
</sg-badge>
```

</ComponentPreview>

## Rounded Variants

<ComponentPreview center>

```html
<sg-badge color="primary" rounded="sm">sm</sg-badge>
<sg-badge color="primary" rounded="md">md</sg-badge>
<sg-badge color="primary" rounded="full">Full</sg-badge>
```

</ComponentPreview>

## Using Badges with Other Components

Badges work great when combined with other components to show counts, status, or notifications.

### Overlay / Notification Badge

Use the `anchor` prop with the `target` slot to pin a badge to the corner of any element. The host becomes `position: relative` and the badge is positioned absolutely at the specified corner.

<ComponentPreview center>

```html
<sg-badge color="error" count="5" anchor="top-end">
  <sg-button slot="target" variant="ghost" aria-label="Inbox" icon-only rounded>
    <sg-icon name="inbox" size="18"></sg-icon>
  </sg-button>
</sg-badge>

<sg-badge color="success" dot anchor="bottom-end">
  <sg-avatar slot="target" size="sm" src="https://bit.ly/dan-abramov" alt="Dan Abramov">
</sg-badge>

<sg-badge color="warning" count="12" anchor="top-start">
  <sg-button slot="target" variant="outline" size="sm">Messages</sg-button>
</sg-badge>
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
<sg-button>
  Messages
  <sg-badge slot="suffix" color="error" count="5"></sg-badge>
</sg-button>

<sg-button color="primary">
  Inbox
  <sg-badge slot="suffix" color="error" count="23"></sg-badge>
</sg-button>

<sg-button variant="outline">
  Notifications
  <sg-badge slot="suffix" color="warning" count="150" max="99"></sg-badge>
</sg-button>

<sg-button variant="ghost">
  Updates
  <sg-badge slot="suffix" color="success" dot></sg-badge>
</sg-button>
```

</ComponentPreview>

### With Icons

Combine badges with icon buttons for compact notification indicators.

<ComponentPreview center>

```html
<sg-button variant="ghost" style="position: relative;">
  <sg-icon name="bell" size="20"></sg-icon>
  <sg-badge
    slot="suffix"
    color="error"
    count="7"
    size="sm"
    style="position: absolute; top: 0; right: 0; transform: translate(25%, -25%);"></sg-badge>
</sg-button>

<sg-button variant="ghost" style="position: relative;">
  <sg-icon name="mail" size="20"></sg-icon>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
  <sg-badge slot="suffix" color="success" dot size="sm" style="position: absolute; top: 4px; right: 4px;"></sg-badge>
</sg-button>
```

</ComponentPreview>

### Multiple Badges

Stack multiple badges to show different types of information.

<ComponentPreview center>

```html
<sg-button color="primary">
  Deploy to Production
  <sg-badge slot="suffix" color="warning" variant="outline" size="sm">v2.1.0</sg-badge>
  <sg-badge slot="suffix" color="success" variant="flat" size="sm">Ready</sg-badge>
</sg-button>

<sg-button variant="outline">
  Database Server
  <sg-badge slot="suffix" color="success" dot></sg-badge>
  <sg-badge slot="suffix" variant="flat" size="sm">US-East</sg-badge>
</sg-button>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute    | Type                                                                      | Default   | Description                                                                         |
| ------------ | ------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------- |
| `variant`    | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'frost'`                 | `'solid'` | Visual style variant                                                                |
| `color`      | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -         | Theme color                                                                         |
| `size`       | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`    | Badge size                                                                          |
| `rounded`    | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | `'full'`  | Border radius                                                                       |
| `count`      | `number`                                                                  | -         | Numeric count to display                                                            |
| `max`        | `number`                                                                  | `99`      | Maximum count before showing `{max}+`                                               |
| `dot`        | `boolean`                                                                 | `false`   | Show as a dot indicator (no label)                                                  |
| `anchor`     | `'top-end' \| 'top-start' \| 'bottom-end' \| 'bottom-start'`              | —         | Pin badge to a corner of the `target` slot content                                  |
| `aria-label` | `string`                                                                  | —         | Accessible label for assistive technology. Recommended for count-only and dot mode. |

### Slots

| Slot      | Description                                          |
| --------- | ---------------------------------------------------- |
| (default) | Badge label text                                     |
| `icon`    | Icon prepended inside the badge                      |
| `target`  | Element the badge overlays when `anchor` prop is set |

### CSS Custom Properties

| Property               | Description                | Default                |
| ---------------------- | -------------------------- | ---------------------- |
| `--badge-bg`           | Background color           | Theme-dependent        |
| `--badge-color`        | Text / icon color          | Theme-dependent        |
| `--badge-border-color` | Border color               | Theme-dependent        |
| `--badge-radius`       | Border radius              | `var(--rounded-full)`  |
| `--badge-font-size`    | Font size                  | `var(--text-xs)`       |
| `--badge-font-weight`  | Font weight                | `var(--font-semibold)` |
| `--badge-padding-x`    | Horizontal padding         | `var(--size-1-5)`      |
| `--badge-padding-y`    | Vertical padding           | `var(--size-0-5)`      |
| `--badge-gap`          | Gap between icon and label | `var(--size-1)`        |
| `--badge-max-width`    | Maximum text width         | `24ch`                 |

## Accessibility

The badge component follows WAI-ARIA best practices.

### `sg-badge`

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

- Badge text content is read by screen readers as inline text.
- Count badges expose the full value (or `{max}+`) as visible text that is read aloud.
- Dot indicator badges and count-only badges convey meaning through color and shape alone — use the `aria-label` attribute directly on `sg-badge` to provide a text description for assistive technology.
- When multiple badges are present, each should have a distinct `aria-label` to distinguish them.

## Best Practices

**Do:**

- Use count badges near buttons, nav items, or avatars to show notification totals.
- Keep badge labels very short (1–3 words). For longer status text use `sg-alert`.
- Use `dot` when presence alone is enough (e.g., online indicator, unread indicator).
- Use `color="error"` for notification counts to draw immediate attention.

**Don't:**

- Use badges as the primary call-to-action; use `sg-button` for that.
- Display lengthy sentences inside a badge.
