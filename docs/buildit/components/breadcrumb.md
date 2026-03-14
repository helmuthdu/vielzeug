# Breadcrumb

A navigational landmark that shows the user's current location in a hierarchy. Renders a semantic `<nav>` with an ordered list of `bit-breadcrumb-item` links, separated by a customizable separator glyph.

## Features

- 📍 **Semantic HTML**: renders `<nav>` → `<ol>` → `<li>` for proper landmark semantics
- ✅ **active prop**: marks the current page — adds `aria-current="page"` and disables the link
- 🔗 **Flexible hrefs**: each item accepts an `href` for standard navigation
- 🎨 **Custom separator**: override the separator character per-instance or via CSS variable
- 🖼️ **Icon slot**: each item supports a leading `icon` slot
- ♿ **ARIA**: `aria-label` on `<nav>`, `aria-current="page"` on active item, `aria-disabled` on the active link

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/content/breadcrumb/breadcrumb.ts
:::

## Basic Usage

Wrap `bit-breadcrumb-item` elements inside `bit-breadcrumb`. Mark the current page with `active`.

```html
<bit-breadcrumb>
  <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/products">Products</bit-breadcrumb-item>
  <bit-breadcrumb-item active>Sneakers</bit-breadcrumb-item>
</bit-breadcrumb>

<script type="module">
  import '@vielzeug/buildit/breadcrumb';
</script>
```

## Items with Icons

Use the `icon` named slot on any `bit-breadcrumb-item` for a leading icon.

<ComponentPreview>

```html
<bit-breadcrumb>
  <bit-breadcrumb-item href="/">
    <span slot="icon">🏠</span>
    Home
  </bit-breadcrumb-item>
  <bit-breadcrumb-item href="/settings">
    <span slot="icon">⚙️</span>
    Settings
  </bit-breadcrumb-item>
  <bit-breadcrumb-item active>
    <span slot="icon">🔔</span>
    Notifications
  </bit-breadcrumb-item>
</bit-breadcrumb>
```

</ComponentPreview>

## Custom Separator

Use the `separator` attribute to replace the default `/` separator. You can also override the `--breadcrumb-separator` CSS custom property globally in your theme.

<ComponentPreview vertical>

```html
<!-- Chevron separator -->
<bit-breadcrumb separator="›">
  <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/docs">Docs</bit-breadcrumb-item>
  <bit-breadcrumb-item active>Getting Started</bit-breadcrumb-item>
</bit-breadcrumb>

<!-- Dot separator -->
<bit-breadcrumb separator="·">
  <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/blog">Blog</bit-breadcrumb-item>
  <bit-breadcrumb-item active>2024 in Review</bit-breadcrumb-item>
</bit-breadcrumb>

<!-- Arrow separator -->
<bit-breadcrumb separator="→">
  <bit-breadcrumb-item href="/">Root</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/admin">Admin</bit-breadcrumb-item>
  <bit-breadcrumb-item active>Users</bit-breadcrumb-item>
</bit-breadcrumb>
```

</ComponentPreview>

## Custom `aria-label`

Override the default `"Breadcrumb"` landmark label when a page has multiple navigation regions.

<ComponentPreview>

```html
<bit-breadcrumb label="Product hierarchy">
  <bit-breadcrumb-item href="/">Home</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/shop">Shop</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/shop/footwear">Footwear</bit-breadcrumb-item>
  <bit-breadcrumb-item active>Running Shoes</bit-breadcrumb-item>
</bit-breadcrumb>
```

</ComponentPreview>

## Guideline Recipe: Adapt Navigation Context

**Guideline: adapt** — breadcrumbs give users a spatial anchor on any screen size, reducing disorientation in deep hierarchies.

```html
<bit-breadcrumb aria-label="Checkout steps">
  <bit-breadcrumb-item href="/store">Store</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/store/cart">Cart</bit-breadcrumb-item>
  <bit-breadcrumb-item href="/store/checkout">Checkout</bit-breadcrumb-item>
  <bit-breadcrumb-item aria-current="page">Payment</bit-breadcrumb-item>
</bit-breadcrumb>
```

**Tip:** Always set `aria-current="page"` on the last item and omit its `href` so assistive technology announces it as the current location.

## API Reference

### `bit-breadcrumb` Attributes

| Attribute   | Type     | Default        | Description                                                                 |
| ----------- | -------- | -------------- | --------------------------------------------------------------------------- |
| `label`     | `string` | `'Breadcrumb'` | `aria-label` applied to the wrapping `<nav>` landmark                       |
| `separator` | `string` | `'/'`          | Separator glyph rendered between items (also sets `--breadcrumb-separator`) |

### `bit-breadcrumb` Slots

| Slot      | Description                                            |
| --------- | ------------------------------------------------------ |
| (default) | `bit-breadcrumb-item` elements representing each crumb |

### `bit-breadcrumb` CSS Custom Properties

| Property                 | Description                             | Default |
| ------------------------ | --------------------------------------- | ------- |
| `--breadcrumb-separator` | Separator character shown between items | `'/'`   |

### `bit-breadcrumb-item` Attributes

| Attribute | Type      | Default | Description                                                                     |
| --------- | --------- | ------- | ------------------------------------------------------------------------------- |
| `href`    | `string`  | —       | URL the item links to. Omit for non-linked crumbs.                              |
| `active`  | `boolean` | `false` | Marks this item as the current page (`aria-current="page"`). Disables the link. |

### `bit-breadcrumb-item` Slots

| Slot      | Description                         |
| --------- | ----------------------------------- |
| `icon`    | Optional leading icon or decoration |
| (default) | Crumb label text                    |

### Events

`bit-breadcrumb` and `bit-breadcrumb-item` do not emit custom events. Use standard DOM `click` listeners on individual items if you need to intercept navigation (e.g., in an SPA).

## Accessibility

The breadcrumb component follows WAI-ARIA best practices.

### `bit-breadcrumb`

✅ **Semantic Structure**

- Renders a `<nav>` element with `aria-label` matching the `label` attribute — it serves as a navigation landmark.
- Items are rendered as `<li>` elements inside an `<ol>`, conveying the sequential structure to screen readers.

✅ **Screen Readers**

- The `active` item receives `aria-current="page"` and `aria-disabled="true"` so it is announced as the current location and not activated when clicked.
- The separator is rendered via CSS `content` (or a hidden `aria-hidden` element) so it is not read aloud.
- When using icon-only crumbs, provide visible text as the default slot content or add `aria-label` to the icon wrapper to keep the crumb meaningful to screen readers.

## Best Practices

**Do:**

- Always mark the final (current) crumb as `active` — omitting it breaks `aria-current` and confuses screen readers.
- Keep crumb labels short and descriptive — they should match the `<title>` or `<h1>` of the destination page.
- Provide an `href` on every non-active crumb so keyboard and screen reader users can navigate directly.

**Don't:**

- Mark more than one crumb as `active` — only the current page should carry `aria-current="page"`.
- Use breadcrumbs as a replacement for primary navigation — they supplement, not replace, the main nav.
- Omit the breadcrumb on mobile viewports — breadcrumbs are even more valuable on small screens where back-navigation is harder.
