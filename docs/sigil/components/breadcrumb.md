# Breadcrumb

A navigational landmark that shows the user's current location in a hierarchy. Renders a semantic `<nav>` with an ordered list of `sg-breadcrumb-item` links, separated by a customizable separator glyph.

## Items with Icons

Use the `icon` named slot on any `sg-breadcrumb-item` for a leading icon. When using icon-only crumbs, provide visible text as the default slot content or add `aria-label` to the icon wrapper to keep the crumb meaningful to screen readers.

<ComponentPreview>

```html
<sg-breadcrumb>
  <sg-breadcrumb-item href="/">
    <span slot="icon"><sg-icon name="house" size="16"></sg-icon></span>
    Home
  </sg-breadcrumb-item>
  <sg-breadcrumb-item href="/settings">
    <span slot="icon"><sg-icon name="settings" size="16"></sg-icon>️</span>
    Settings
  </sg-breadcrumb-item>
  <sg-breadcrumb-item active>
    <span slot="icon"><sg-icon name="bell" size="16"></sg-icon></span>
    Notifications
  </sg-breadcrumb-item>
</sg-breadcrumb>
```

</ComponentPreview>

## Custom Separator

Use the `separator` attribute to replace the default `/` separator. You can also override the `--breadcrumb-separator` CSS custom property globally in your theme.

<ComponentPreview vertical>

```html
<!-- Chevron separator -->
<sg-breadcrumb separator="›">
  <sg-breadcrumb-item href="/">Home</sg-breadcrumb-item>
  <sg-breadcrumb-item href="/docs">Docs</sg-breadcrumb-item>
  <sg-breadcrumb-item active>Getting Started</sg-breadcrumb-item>
</sg-breadcrumb>

<!-- Dot separator -->
<sg-breadcrumb separator="·">
  <sg-breadcrumb-item href="/">Home</sg-breadcrumb-item>
  <sg-breadcrumb-item href="/blog">Blog</sg-breadcrumb-item>
  <sg-breadcrumb-item active>2024 in Review</sg-breadcrumb-item>
</sg-breadcrumb>

<!-- Arrow separator -->
<sg-breadcrumb separator="→">
  <sg-breadcrumb-item href="/">Root</sg-breadcrumb-item>
  <sg-breadcrumb-item href="/admin">Admin</sg-breadcrumb-item>
  <sg-breadcrumb-item active>Users</sg-breadcrumb-item>
</sg-breadcrumb>
```

</ComponentPreview>

## Custom `aria-label`

Override the default `"Breadcrumb"` landmark label when a page has multiple navigation regions.

<ComponentPreview>

```html
<sg-breadcrumb label="Product hierarchy">
  <sg-breadcrumb-item href="/">Home</sg-breadcrumb-item>
  <sg-breadcrumb-item href="/shop">Shop</sg-breadcrumb-item>
  <sg-breadcrumb-item href="/shop/footwear">Footwear</sg-breadcrumb-item>
  <sg-breadcrumb-item active>Running Shoes</sg-breadcrumb-item>
</sg-breadcrumb>
```

</ComponentPreview>

## API Reference

**`sg-breadcrumb`** Attributes

| Attribute   | Type     | Default        | Description                                                                 |
| ----------- | -------- | -------------- | --------------------------------------------------------------------------- |
| `label`     | `string` | `'Breadcrumb'` | `aria-label` applied to the wrapping `<nav>` landmark                       |
| `separator` | `string` | `'/'`          | Separator glyph rendered between items (also sets `--breadcrumb-separator`) |

**`sg-breadcrumb`** Slots

| Slot      | Description                                           |
| --------- | ----------------------------------------------------- |
| (default) | `sg-breadcrumb-item` elements representing each crumb |

**`sg-breadcrumb`** CSS Custom Properties

| Property                 | Description                             | Default |
| ------------------------ | --------------------------------------- | ------- |
| `--breadcrumb-separator` | Separator character shown between items | `'/'`   |

**`sg-breadcrumb-item`** Attributes

| Attribute | Type      | Default | Description                                                                     |
| --------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `href`    | `string`  | —       | URL the item links to. Omit for non-linked crumbs.                              |
| `active`  | `boolean` | `false` | Marks this item as the current page (`aria-current="page"`). Disables the link. Always mark the final (current) crumb as `active` — omitting it breaks `aria-current` and confuses screen readers. Only one crumb should carry `aria-current="page"`. |

**`sg-breadcrumb-item`** Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Crumb label text                    |

**Events**

`sg-breadcrumb` and `sg-breadcrumb-item` do not emit custom events. Use standard DOM `click` listeners on individual items if you need to intercept navigation (e.g., in an SPA).

## Accessibility

The breadcrumb component follows WAI-ARIA best practices. It renders a `<nav>` element with `aria-label` matching the `label` attribute, serving as a navigation landmark. Items are rendered as `<li>` elements inside an `<ol>`, conveying the sequential structure to screen readers.

The `active` item receives `aria-current="page"` and `aria-disabled="true"` so it is announced as the current location and not activated when clicked. The separator is rendered via CSS `content` (or a hidden `aria-hidden` element) so it is not read aloud. Keep crumb labels short and descriptive — they should match the `<title>` or `<h1>` of the destination page, and provide an `href` on every non-active crumb so keyboard and screen reader users can navigate directly.
