# Breadcrumb

A navigational landmark that shows the user's current location in a hierarchy. Renders a semantic `<nav>` with an ordered list of `ore-breadcrumb-item` links, separated by a customizable separator glyph.

## Items with Icons

Use the `icon` named slot on any `ore-breadcrumb-item` for a leading icon. When using icon-only crumbs, provide visible text as the default slot content or add `aria-label` to the icon wrapper to keep the crumb meaningful to screen readers.

<ComponentPreview>

```html
<ore-breadcrumb>
  <ore-breadcrumb-item href="/">
    <span slot="icon"><ore-icon name="house" size="16"></ore-icon></span>
    Home
  </ore-breadcrumb-item>
  <ore-breadcrumb-item href="/settings">
    <span slot="icon"><ore-icon name="settings" size="16"></ore-icon>️</span>
    Settings
  </ore-breadcrumb-item>
  <ore-breadcrumb-item active>
    <span slot="icon"><ore-icon name="bell" size="16"></ore-icon></span>
    Notifications
  </ore-breadcrumb-item>
</ore-breadcrumb>
```

</ComponentPreview>

## Custom Separator

Use the `separator` attribute to replace the default `/` separator. You can also override the `--breadcrumb-separator` CSS custom property globally in your theme.

<ComponentPreview vertical>

```html
<!-- Chevron separator -->
<ore-breadcrumb separator="›">
  <ore-breadcrumb-item href="/">Home</ore-breadcrumb-item>
  <ore-breadcrumb-item href="/docs">Docs</ore-breadcrumb-item>
  <ore-breadcrumb-item active>Getting Started</ore-breadcrumb-item>
</ore-breadcrumb>

<!-- Dot separator -->
<ore-breadcrumb separator="·">
  <ore-breadcrumb-item href="/">Home</ore-breadcrumb-item>
  <ore-breadcrumb-item href="/blog">Blog</ore-breadcrumb-item>
  <ore-breadcrumb-item active>2024 in Review</ore-breadcrumb-item>
</ore-breadcrumb>

<!-- Arrow separator -->
<ore-breadcrumb separator="→">
  <ore-breadcrumb-item href="/">Root</ore-breadcrumb-item>
  <ore-breadcrumb-item href="/admin">Admin</ore-breadcrumb-item>
  <ore-breadcrumb-item active>Users</ore-breadcrumb-item>
</ore-breadcrumb>
```

</ComponentPreview>

## Custom `aria-label`

Override the default `"Breadcrumb"` landmark label when a page has multiple navigation regions.

<ComponentPreview>

```html
<ore-breadcrumb label="Product hierarchy">
  <ore-breadcrumb-item href="/">Home</ore-breadcrumb-item>
  <ore-breadcrumb-item href="/shop">Shop</ore-breadcrumb-item>
  <ore-breadcrumb-item href="/shop/footwear">Footwear</ore-breadcrumb-item>
  <ore-breadcrumb-item active>Running Shoes</ore-breadcrumb-item>
</ore-breadcrumb>
```

</ComponentPreview>

## API Reference

**`ore-breadcrumb`** Attributes

| Attribute   | Type     | Default        | Description                                                                 |
| ----------- | -------- | -------------- | --------------------------------------------------------------------------- |
| `label`     | `string` | `'Breadcrumb'` | `aria-label` applied to the wrapping `<nav>` landmark                       |
| `separator` | `string` | `'/'`          | Separator glyph rendered between items (also sets `--breadcrumb-separator`) |

**`ore-breadcrumb`** Slots

| Slot      | Description                                           |
| --------- | ----------------------------------------------------- |
| (default) | `ore-breadcrumb-item` elements representing each crumb |

**`ore-breadcrumb`** CSS Custom Properties

| Property                 | Description                             | Default |
| ------------------------ | --------------------------------------- | ------- |
| `--breadcrumb-separator` | Separator character shown between items | `'/'`   |

**`ore-breadcrumb-item`** Attributes

| Attribute | Type      | Default | Description                                                                     |
| --------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `href`    | `string`  | —       | URL the item links to. Omit for non-linked crumbs.                              |
| `active`  | `boolean` | `false` | Marks this item as the current page (`aria-current="page"`). Disables the link. Always mark the final (current) crumb as `active` — omitting it breaks `aria-current` and confuses screen readers. Only one crumb should carry `aria-current="page"`. |

**`ore-breadcrumb-item`** Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Crumb label text                    |

**Events**

`ore-breadcrumb` and `ore-breadcrumb-item` do not emit custom events. Use standard DOM `click` listeners on individual items if you need to intercept navigation (e.g., in an SPA).

## Accessibility

The breadcrumb component follows WAI-ARIA best practices. It renders a `<nav>` element with `aria-label` matching the `label` attribute, serving as a navigation landmark. Items are rendered as `<li>` elements inside an `<ol>`, conveying the sequential structure to screen readers.

The `active` item receives `aria-current="page"` and `aria-disabled="true"` so it is announced as the current location and not activated when clicked. The separator is rendered via CSS `content` (or a hidden `aria-hidden` element) so it is not read aloud. Keep crumb labels short and descriptive — they should match the `<title>` or `<h1>` of the destination page, and provide an `href` on every non-active crumb so keyboard and screen reader users can navigate directly.
