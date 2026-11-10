# Pagination

A page-navigation control for splitting content across multiple pages. Renders numbered page buttons with optional ellipsis, first/last shortcuts, and previous/next arrows.

## Usage

```html
<ore-pagination page="1" total-pages="10"></ore-pagination>
```

Listen for page changes:

```html
<ore-pagination id="pager" page="1" total-pages="20" show-prev-next></ore-pagination>

<script type="module">
  import '@vielzeug/refine/pagination';

  document.getElementById('pager').addEventListener('change', (e) => {
    console.log('New page:', e.detail.page);
  });
</script>
```

## Behavior

Selecting a page updates the `page` attribute immediately and fires `change` in the same step, so attribute-driven usage works without any wiring. Router-backed apps stay authoritative: read `page` from the URL, push the new URL in `change`, and write the attribute back from your route state — the control simply re-syncs. The component never fetches or renders page content itself.

## Colors

<ComponentPreview vertical>

```html
<ore-pagination page="3" total-pages="10" color="primary" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="secondary" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="info" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="success" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="warning" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="error" show-prev-next></ore-pagination>
```

</ComponentPreview>

## Variants

The `variant` prop controls the visual style of every navigation and page button.

<ComponentPreview vertical>

```html
<ore-pagination page="5" total-pages="12" color="primary" variant="ghost" show-prev-next show-first-last></ore-pagination>
<ore-pagination page="5" total-pages="12" color="primary" variant="solid" show-prev-next show-first-last></ore-pagination>
<ore-pagination page="5" total-pages="12" color="primary" variant="flat" show-prev-next show-first-last></ore-pagination>
<ore-pagination
  page="5"
  total-pages="12"
  color="primary"
  variant="bordered"
  show-prev-next
  show-first-last></ore-pagination>
<ore-pagination
  page="5"
  total-pages="12"
  color="primary"
  variant="outline"
  show-prev-next
  show-first-last></ore-pagination>
<ore-pagination page="5" total-pages="12" color="primary" variant="text" show-prev-next show-first-last></ore-pagination>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<ore-pagination page="3" total-pages="10" color="primary" size="sm" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="primary" size="md" show-prev-next></ore-pagination>
<ore-pagination page="3" total-pages="10" color="primary" size="lg" show-prev-next></ore-pagination>
```

</ComponentPreview>

## Navigation Controls

The previous/next arrows are on by default; set `show-prev-next="false"` for a bare row of page numbers. First/last jump buttons are opt-in.

### With Previous / Next

Previous and next arrows are shown by default:

<ComponentPreview center>

```html
<ore-pagination page="5" total-pages="12" color="primary" show-prev-next></ore-pagination>
```

</ComponentPreview>

### With First / Last

<ComponentPreview center>

```html
<ore-pagination page="5" total-pages="12" color="primary" show-first-last></ore-pagination>
```

</ComponentPreview>

### All Controls

<ComponentPreview center>

```html
<ore-pagination page="5" total-pages="12" color="primary" show-prev-next show-first-last></ore-pagination>
```

</ComponentPreview>

## Ellipsis / Sibling Pages

Use `siblings` to control how many page numbers appear on each side of the current page before collapsing to an ellipsis.

<ComponentPreview vertical>

```html
<ore-pagination page="10" total-pages="20" color="primary" siblings="1" show-prev-next></ore-pagination>
<ore-pagination page="10" total-pages="20" color="primary" siblings="2" show-prev-next></ore-pagination>
<ore-pagination page="10" total-pages="20" color="primary" siblings="3" show-prev-next></ore-pagination>
```

</ComponentPreview>

## Recipes

### URL-driven paging

Keep the page in the address bar so navigation survives refresh and back/forward. The control's optimistic update is harmless here — the route write re-syncs the attribute.

```html
<ore-pagination id="pager" show-prev-next></ore-pagination>
<script>
  const pager = document.getElementById('pager');
  const params = new URLSearchParams(location.search);

  pager.setAttribute('total-pages', String(Math.ceil(totalItems / pageSize)));
  pager.setAttribute('page', String(Math.max(1, Number(params.get('page')) || 1)));

  pager.addEventListener('change', (e) => {
    params.set('page', String(e.detail.page));
    history.pushState({}, '', `${location.pathname}?${params}`);
    loadPage(e.detail.page);
  });

  addEventListener('popstate', () => {
    pager.setAttribute('page', String(Math.max(1, Number(new URLSearchParams(location.search).get('page')) || 1)));
  });
</script>
```

### Summary with previous / next

For long documents a label-bearing prev/next pair with a position summary reads better than a number row. Compose it from ordinary parts — the same pattern `ore-datagrid` uses in its footer.

<ComponentPreview center>

```html
<div style="display: flex; align-items: center; gap: var(--size-3)">
  <ore-text size="sm" style="color: var(--color-contrast-500)">1 to 10 of 124</ore-text>
  <ore-pagination id="pager-min" page="1" total-pages="13" show-prev-next></ore-pagination>
</div>
```

</ComponentPreview>

### Rows-per-page companion

A size selector next to the pager re-computes `total-pages` when the page size changes; keep both in one flex row with the summary.

```js
function applyPageSize(size) {
  const firstRow = (pager.page - 1) * oldSize; // keep position
  oldSize = size;
  pager.setAttribute('total-pages', String(Math.max(1, Math.ceil(totalItems / size))));
  pager.setAttribute('page', String(Math.min(Math.floor(firstRow / size) + 1, pager.totalPages)));
  loadPage(pager.page);
}
```

## API Reference

**Attributes**

| Attribute         | Type                                                                           | Default        | Description                                           |
| ----------------- | ------------------------------------------------------------------------------ | -------------- | ----------------------------------------------------- |
| `page`            | `number`                                                                       | `1`            | Currently active page (1-based)                       |
| `total-pages`     | `number`                                                                       | `1`            | Total number of pages                                 |
| `siblings`        | `number`                                                                       | `1`            | Page buttons visible on each side of the current page |
| `show-first-last` | `boolean`                                                                      | `false`        | Show first and last page buttons                      |
| `show-prev-next`  | `boolean`                                                                      | `true`         | Show previous and next page buttons                   |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`      | N/A            | Active page color                                     |
| `variant`         | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'frost'` | `'ghost'`      | Visual style of nav buttons                           |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`         | Component size                                        |
| `label`           | `string`                                                                       | `'Pagination'` | `aria-label` for the nav landmark                     |

**Events**

| Event    | Detail             | Description                        |
| -------- | ------------------ | ---------------------------------- |
| `change` | `{ page: number }` | Fired when the user selects a page |

**Properties**

| Property | Type                                  | Default          | Description                                                                  |
| -------- | ------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `labels` | `Partial<PaginationLabels>` (JS only) | English defaults | Accessible names for the boundary buttons and `page(n)` for each page button |

```js
const pager = document.querySelector('ore-pagination');
pager.labels = {
  first: 'Erste Seite',
  previous: 'Vorherige Seite',
  next: 'Nächste Seite',
  last: 'Letzte Seite',
  page: (page) => `Seite ${page}`,
};
```

Partial objects merge over the defaults, so overriding one entry leaves the rest in English.

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
