# Pagination

A page-navigation control for splitting content across multiple pages. Renders numbered page buttons with optional ellipsis, first/last shortcuts, and previous/next arrows.

## Usage

```html
<sg-pagination page="1" total-pages="10"></sg-pagination>
```

Listen for page changes:

```html
<sg-pagination id="pager" page="1" total-pages="20" show-prev-next></sg-pagination>

<script type="module">
  import '@vielzeug/sigil';

  document.getElementById('pager').addEventListener('change', (e) => {
    console.log('New page:', e.detail.page);
  });
</script>
```

## Colors

<ComponentPreview vertical>

```html
<sg-pagination page="3" total-pages="10" color="primary" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="secondary" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="info" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="success" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="warning" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="error" show-prev-next></sg-pagination>
```

</ComponentPreview>

## Variants

The `variant` prop controls the visual style of the previous, next, first, and last navigation buttons. Page number buttons are unaffected.

<ComponentPreview vertical>

```html
<sg-pagination page="5" total-pages="12" color="primary" variant="ghost" show-prev-next show-first-last></sg-pagination>
<sg-pagination page="5" total-pages="12" color="primary" variant="solid" show-prev-next show-first-last></sg-pagination>
<sg-pagination page="5" total-pages="12" color="primary" variant="flat" show-prev-next show-first-last></sg-pagination>
<sg-pagination
  page="5"
  total-pages="12"
  color="primary"
  variant="bordered"
  show-prev-next
  show-first-last></sg-pagination>
<sg-pagination
  page="5"
  total-pages="12"
  color="primary"
  variant="outline"
  show-prev-next
  show-first-last></sg-pagination>
<sg-pagination page="5" total-pages="12" color="primary" variant="text" show-prev-next show-first-last></sg-pagination>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<sg-pagination page="3" total-pages="10" color="primary" size="sm" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="primary" size="md" show-prev-next></sg-pagination>
<sg-pagination page="3" total-pages="10" color="primary" size="lg" show-prev-next></sg-pagination>
```

</ComponentPreview>

## Navigation Controls

### With Previous / Next

<ComponentPreview center>

```html
<sg-pagination page="5" total-pages="12" color="primary" show-prev-next></sg-pagination>
```

</ComponentPreview>

### With First / Last

<ComponentPreview center>

```html
<sg-pagination page="5" total-pages="12" color="primary" show-first-last></sg-pagination>
```

</ComponentPreview>

### All Controls

<ComponentPreview center>

```html
<sg-pagination page="5" total-pages="12" color="primary" show-prev-next show-first-last></sg-pagination>
```

</ComponentPreview>

## Ellipsis / Sibling Pages

Use `siblings` to control how many page numbers appear on each side of the current page before collapsing to an ellipsis.

<ComponentPreview vertical>

```html
<sg-pagination page="10" total-pages="20" color="primary" siblings="1" show-prev-next></sg-pagination>
<sg-pagination page="10" total-pages="20" color="primary" siblings="2" show-prev-next></sg-pagination>
<sg-pagination page="10" total-pages="20" color="primary" siblings="3" show-prev-next></sg-pagination>
```

</ComponentPreview>

## API Reference

**Attributes**

| Attribute         | Type                                                                                      | Default        | Description                                           |
| ----------------- | ----------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------- |
| `page`            | `number`                                                                                  | `1`            | Currently active page (1-based)                       |
| `total-pages`     | `number`                                                                                  | `1`            | Total number of pages                                 |
| `siblings`        | `number`                                                                                  | `1`            | Page buttons visible on each side of the current page |
| `show-first-last` | `boolean`                                                                                 | `false`        | Show first and last page buttons                      |
| `show-prev-next`  | `boolean`                                                                                 | `false`        | Show previous and next page buttons                   |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`                 | —              | Active page color                                     |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost' \| 'glass'` | `'ghost'`      | Visual style of nav buttons                           |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                                    | `'md'`         | Component size                                        |
| `label`           | `string`                                                                                  | `'Pagination'` | `aria-label` for the nav landmark                     |

**Events**

| Event    | Detail             | Description                        |
| -------- | ------------------ | ---------------------------------- |
| `change` | `{ page: number }` | Fired when the user selects a page |

**CSS Custom Properties**

| Property                 | Description                          |
| ------------------------ | ------------------------------------ |
| `--pagination-item-size` | Width and height of each page button |
| `--pagination-gap`       | Gap between page buttons             |
| `--pagination-radius`    | Border radius of page buttons        |

## Accessibility

The pagination component follows WAI-ARIA best practices. The component renders a `<nav>` element as a navigation landmark, with an `aria-label` configurable via the `label` attribute (defaults to `"Pagination"`).

`Tab` moves focus between page buttons, and `Enter` or `Space` activates the focused button. Previous and next navigation buttons are individually focusable.

Each page button's accessible name includes the page number. The active page has `aria-current="page"`. Ellipsis items are decorative and marked `aria-hidden="true"`.
