# Badge

A compact label for counts, statuses, and short metadata. Supports numeric overflow capping, a dot-only indicator, an optional icon slot, and all color themes.

## Variants

The badge comes with five visual variants to match different levels of emphasis.

<ComponentPreview center>

```html
<ore-badge variant="solid">Solid</ore-badge>
<ore-badge variant="flat">Flat</ore-badge>
<ore-badge variant="bordered">Bordered</ore-badge>
<ore-badge variant="outline">Outline</ore-badge>
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
<ore-badge variant="frost">Default</ore-badge>
<ore-badge variant="frost" color="primary">Primary</ore-badge>
<ore-badge variant="frost" color="secondary">Secondary</ore-badge>
<ore-badge variant="frost" color="info">Info</ore-badge>
<ore-badge variant="frost" color="success">Success</ore-badge>
<ore-badge variant="frost" color="warning">Warning</ore-badge>
<ore-badge variant="frost" color="error">Error</ore-badge>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts.

<ComponentPreview center>

```html
<ore-badge variant="solid">Default</ore-badge>
<ore-badge variant="solid" color="primary">Primary</ore-badge>
<ore-badge variant="solid" color="secondary">Secondary</ore-badge>
<ore-badge variant="solid" color="info">Info</ore-badge>
<ore-badge variant="solid" color="success">Success</ore-badge>
<ore-badge variant="solid" color="warning">Warning</ore-badge>
<ore-badge variant="solid" color="error">Error</ore-badge>
```

</ComponentPreview>

## Sizes

Three sizes for different contexts.

<ComponentPreview center>

```html
<ore-badge color="primary" size="sm">Small</ore-badge>
<ore-badge color="primary" size="md">Medium</ore-badge>
<ore-badge color="primary" size="lg">Large</ore-badge>
```

</ComponentPreview>

## Count Badge

Use `count` and `max` for numeric notification badges. When `count` exceeds `max` the label renders as `{max}+`. Use `color="error"` for notification counts to draw immediate attention.

<ComponentPreview center>

```html
<ore-badge color="error" count="3"></ore-badge>
<ore-badge color="error" count="42"></ore-badge>
<ore-badge color="error" count="150" max="99"></ore-badge>
<ore-badge color="warning" count="7" max="9"></ore-badge>
```

</ComponentPreview>

## Dot Indicator

Use `dot` for a minimal presence indicator with no label — for example, online status or unread indicators where presence alone is enough.

<ComponentPreview center>

```html
<ore-badge color="success" dot></ore-badge>
<ore-badge color="error" dot></ore-badge>
<ore-badge color="warning" dot></ore-badge>
```

</ComponentPreview>

## With Icon

Use the `icon` slot to prepend an SVG or icon font glyph.

<ComponentPreview center>

```html
<ore-badge color="success">
  <ore-icon slot="icon" name="check" size="10"></ore-icon>
  Verified
</ore-badge>
<ore-badge color="warning">
  <ore-icon slot="icon" name="alert-circle" size="10"></ore-icon>
  Pending
</ore-badge>
```

</ComponentPreview>

## Rounded Variants

<ComponentPreview center>

```html
<ore-badge color="primary" rounded="sm">sm</ore-badge>
<ore-badge color="primary" rounded="md">md</ore-badge>
<ore-badge color="primary" rounded="full">Full</ore-badge>
```

</ComponentPreview>

## Using Badges with Other Components

Badges work great when combined with other components to show counts, status, or notifications.

### Overlay / Notification Badge

Use the `anchor` prop with the `target` slot to pin a badge to the corner of any element. The host becomes `position: relative` and the badge is positioned absolutely at the specified corner.

<ComponentPreview center>

```html
<ore-badge color="error" count="5" anchor="top-end">
  <ore-button slot="target" variant="ghost" aria-label="Inbox" icon-only rounded>
    <ore-icon name="inbox" size="18"></ore-icon>
  </ore-button>
</ore-badge>

<ore-badge color="success" dot anchor="bottom-end">
  <ore-avatar slot="target" size="sm" src="https://bit.ly/dan-abramov" alt="Dan Abramov">
</ore-badge>

<ore-badge color="warning" count="12" anchor="top-start">
  <ore-button slot="target" variant="outline" size="sm">Messages</ore-button>
</ore-badge>
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
<ore-button>
  Messages
  <ore-badge slot="suffix" color="error" count="5"></ore-badge>
</ore-button>

<ore-button color="primary">
  Inbox
  <ore-badge slot="suffix" color="error" count="23"></ore-badge>
</ore-button>

<ore-button variant="outline">
  Notifications
  <ore-badge slot="suffix" color="warning" count="150" max="99"></ore-badge>
</ore-button>

<ore-button variant="ghost">
  Updates
  <ore-badge slot="suffix" color="success" dot></ore-badge>
</ore-button>
```

</ComponentPreview>

### With Icons

Combine badges with icon buttons for compact notification indicators.

<ComponentPreview center>

```html
<ore-button variant="ghost" style="position: relative;">
  <ore-icon name="bell" size="20"></ore-icon>
  <ore-badge
    slot="suffix"
    color="error"
    count="7"
    size="sm"
    style="position: absolute; top: 0; right: 0; transform: translate(25%, -25%);"></ore-badge>
</ore-button>

<ore-button variant="ghost" style="position: relative;">
  <ore-icon name="mail" size="20"></ore-icon>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
  <ore-badge slot="suffix" color="success" dot size="sm" style="position: absolute; top: 4px; right: 4px;"></ore-badge>
</ore-button>
```

</ComponentPreview>

### Multiple Badges

Stack multiple badges to show different types of information.

<ComponentPreview center>

```html
<ore-button color="primary">
  Deploy to Production
  <ore-badge slot="suffix" color="warning" variant="outline" size="sm">v2.1.0</ore-badge>
  <ore-badge slot="suffix" color="success" variant="flat" size="sm">Ready</ore-badge>
</ore-button>

<ore-button variant="outline">
  Database Server
  <ore-badge slot="suffix" color="success" dot></ore-badge>
  <ore-badge slot="suffix" variant="flat" size="sm">US-East</ore-badge>
</ore-button>
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

Badge text content is read by screen readers as inline text. Count badges expose the full value (or `{max}+`) as visible text that is read aloud. Dot indicator badges and count-only badges convey meaning through color and shape alone — use the `aria-label` attribute directly on `ore-badge` to provide a text description for assistive technology. When multiple badges are present, each should have a distinct `aria-label` to distinguish them.

Keep badge labels very short (1–3 words). For longer status text use `ore-alert`. Badges should not be used as the primary call-to-action; use `ore-button` for that.
