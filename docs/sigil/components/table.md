# Table

A semantic, accessible data table component with striped rows, borders, sticky header, and responsive horizontal scrolling. Use `<sg-tr head>` for header rows, `<sg-tr foot>` for footer rows, plain `<sg-tr>` for body rows, with `<sg-th>` and `<sg-td>` for cells.

## Striped Rows

The `striped` attribute applies alternating row backgrounds, making it easier to track across wide tables. Prefer `striped` for tables with many rows and few columns to aid row tracking.

<ComponentPreview>

```html
<sg-table striped>
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Email</sg-th>
  </sg-tr>
  <sg-tr>
    <sg-td>Alice</sg-td>
    <sg-td>alice@example.com</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Bob</sg-td>
    <sg-td>bob@example.com</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Carol</sg-td>
    <sg-td>carol@example.com</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## Bordered

The `bordered` attribute adds an outer border and radius around the whole table.

<ComponentPreview>

```html
<sg-table bordered>
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Email</sg-th>
  </sg-tr>
  <sg-tr>
    <sg-td>Alice</sg-td>
    <sg-td>alice@example.com</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Bob</sg-td>
    <sg-td>bob@example.com</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Carol</sg-td>
    <sg-td>carol@example.com</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## Fullwidth

The `fullwidth` attribute expands the table to fill 100% of its container width.

<ComponentPreview>

```html
<sg-table fullwidth>
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Role</sg-th>
    <sg-th>Status</sg-th>
  </sg-tr>
  <sg-tr>
    <sg-td>Alice</sg-td>
    <sg-td>Admin</sg-td>
    <sg-td>Active</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Bob</sg-td>
    <sg-td>Editor</sg-td>
    <sg-td>Inactive</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## Density

Control cell padding with the `density` attribute. Font size is unaffected. Use `density="compact"` for dense dashboard tables; `density="comfortable"` when more breathing room is needed. The default `density="cozy"` suits most cases.

<ComponentPreview>

```html
<!-- Compact: tightest padding -->
<sg-table density="compact">
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Value</sg-th>
  </sg-tr>
  <sg-tr><sg-td>Alpha</sg-td><sg-td>1</sg-td></sg-tr>
  <sg-tr><sg-td>Beta</sg-td><sg-td>2</sg-td></sg-tr>
</sg-table>

<!-- Cozy: default padding -->
<sg-table density="cozy">
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Value</sg-th>
  </sg-tr>
  <sg-tr><sg-td>Alpha</sg-td><sg-td>1</sg-td></sg-tr>
  <sg-tr><sg-td>Beta</sg-td><sg-td>2</sg-td></sg-tr>
</sg-table>

<!-- Comfortable: widest padding -->
<sg-table density="comfortable">
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Value</sg-th>
  </sg-tr>
  <sg-tr><sg-td>Alpha</sg-td><sg-td>1</sg-td></sg-tr>
  <sg-tr><sg-td>Beta</sg-td><sg-td>2</sg-td></sg-tr>
</sg-table>
```

</ComponentPreview>

## Sticky Header

Set `sticky` to keep the header row visible when the table body scrolls. Set `--table-sticky-max-height` to control the scroll viewport height (default `24rem`). Only use `sticky` when the table has enough rows to require scrolling; pair it with `--table-sticky-max-height`.

<ComponentPreview>

```html
<sg-table sticky style="--table-sticky-max-height: 20rem">
  <sg-tr head>
    <sg-th>Rank</sg-th>
    <sg-th>Name</sg-th>
    <sg-th>Score</sg-th>
  </sg-tr>
  <sg-tr><sg-td>1</sg-td><sg-td>Alice</sg-td><sg-td>98</sg-td></sg-tr>
  <sg-tr><sg-td>2</sg-td><sg-td>Bob</sg-td><sg-td>95</sg-td></sg-tr>
  <sg-tr><sg-td>3</sg-td><sg-td>Carol</sg-td><sg-td>91</sg-td></sg-tr>
  <sg-tr><sg-td>4</sg-td><sg-td>Dan</sg-td><sg-td>88</sg-td></sg-tr>
  <sg-tr><sg-td>5</sg-td><sg-td>Eve</sg-td><sg-td>85</sg-td></sg-tr>
  <sg-tr><sg-td>6</sg-td><sg-td>Frank</sg-td><sg-td>82</sg-td></sg-tr>
  <sg-tr><sg-td>7</sg-td><sg-td>Grace</sg-td><sg-td>79</sg-td></sg-tr>
  <sg-tr><sg-td>8</sg-td><sg-td>Hank</sg-td><sg-td>77</sg-td></sg-tr>
  <sg-tr><sg-td>9</sg-td><sg-td>Ivy</sg-td><sg-td>74</sg-td></sg-tr>
  <sg-tr><sg-td>10</sg-td><sg-td>Jake</sg-td><sg-td>71</sg-td></sg-tr>
</sg-table>
```

</ComponentPreview>

## Loading State

The `loading` attribute dims the table and sets `aria-busy="true"` while data is being fetched. Use `loading` to indicate async data fetching instead of hiding or removing the table.

<ComponentPreview>

```html
<sg-table loading>
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Email</sg-th>
  </sg-tr>
  <sg-tr>
    <sg-td>Alice</sg-td>
    <sg-td>alice@example.com</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## Caption

The `caption` attribute renders a visible label above the table and also serves as the accessible `aria-label`. Always use the `caption` attribute on every data table to give it an accessible label.

<ComponentPreview>

```html
<sg-table caption="Monthly Sales Report" striped>
  <sg-tr head>
    <sg-th>Month</sg-th>
    <sg-th>Revenue</sg-th>
    <sg-th>Growth</sg-th>
  </sg-tr>
  <sg-tr>
    <sg-td>January</sg-td>
    <sg-td>$12,400</sg-td>
    <sg-td>+8%</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>February</sg-td>
    <sg-td>$13,100</sg-td>
    <sg-td>+5.6%</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>March</sg-td>
    <sg-td>$14,800</sg-td>
    <sg-td>+13%</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## Combining Options

Mix attributes for a fully styled, accessible table.

<ComponentPreview>

```html
<sg-table caption="Active Users" striped bordered sticky>
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Email</sg-th>
    <sg-th>Role</sg-th>
    <sg-th>Last Active</sg-th>
  </sg-tr>

  <sg-tr>
    <sg-td>Alice</sg-td>
    <sg-td>alice@example.com</sg-td>
    <sg-td>Admin</sg-td>
    <sg-td>Today</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Bob</sg-td>
    <sg-td>bob@example.com</sg-td>
    <sg-td>Editor</sg-td>
    <sg-td>Yesterday</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Carol</sg-td>
    <sg-td>carol@example.com</sg-td>
    <sg-td>Viewer</sg-td>
    <sg-td>3 days ago</sg-td>
  </sg-tr>

  <sg-tr foot>
    <sg-td colspan="4">3 users total</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute   | Type                                   | Default  | Description                                                                 |
| ----------- | -------------------------------------- | -------- | --------------------------------------------------------------------------- |
| `caption`   | `string`                               | —        | Visible caption rendered above the table                                    |
| `density`   | `'compact' \| 'cozy' \| 'comfortable'` | `'cozy'` | Cell padding; `compact` = tight, `cozy` = default, `comfortable` = spacious |
| `striped`   | `boolean`                              | `false`  | Alternating row background                                                  |
| `bordered`  | `boolean`                              | `false`  | Outer border and rounded corners                                            |
| `fullwidth` | `boolean`                              | `false`  | Expands the table to 100% of its container width                            |
| `sticky`    | `boolean`                              | `false`  | Stick the header row to the top while body scrolls                          |
| `loading`   | `boolean`                              | `false`  | Dims the table and sets `aria-busy="true"`                                  |

### Child Elements

`sg-table` reads light-DOM marker elements and projects them into a native shadow `<table>`. There are no slots — child elements are observed via `MutationObserver`. Always use `<sg-th>` (not `<sg-td>`) for header cells — `scope` is inferred automatically.

| Element        | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `<sg-tr head>` | Header row — projected into `<thead>`                                        |
| `<sg-tr>`      | Body row — projected into `<tbody>`                                          |
| `<sg-tr foot>` | Footer row — projected into `<tfoot>`                                        |
| `<sg-th>`      | Header cell — mirrored as native `<th>`; `scope` is auto-inferred if omitted |
| `<sg-td>`      | Data cell — mirrored as native `<td>`; supports `colspan`, `rowspan`, etc.   |

### Mirrored Attributes

Attributes on `<sg-th>` and `<sg-td>` are forwarded to the generated native `<th>`/`<td>` in the shadow tree.

| Attribute | Elements         | Description                                      |
| --------- | ---------------- | ------------------------------------------------ |
| `colspan` | `sg-th`, `sg-td` | Spans multiple columns                           |
| `rowspan` | `sg-th`, `sg-td` | Spans multiple rows                              |
| `scope`   | `sg-th`          | Column/row association — auto-inferred if absent |
| `headers` | `sg-th`, `sg-td` | Associates cell with header IDs                  |

### Parts

| Part          | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| `scroll`      | Overflow container — target for max-height / scrolling       |
| `table`       | Generated native `<table>` element                           |
| `head`        | Generated native `<thead>` element                           |
| `body`        | Generated native `<tbody>` element                           |
| `foot`        | Generated native `<tfoot>` element                           |
| `cell`        | Every native `<td>` in `<tbody>` rows                        |
| `header-cell` | Every native `<th>` / `<td>` in `<thead>` and `<tfoot>` rows |

### CSS Custom Properties

| Property                    | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `--table-bg`                | Table background color                           |
| `--table-border-color`      | Cell separator and outer border color            |
| `--table-radius`            | Corner radius (applied when `bordered`)          |
| `--table-shadow`            | Box shadow on the host element                   |
| `--table-header-bg`         | Background of `<thead>` and `<tfoot>`            |
| `--table-accent`            | Accent color used for hover states               |
| `--table-row-hover-bg`      | Row background on hover                          |
| `--table-stripe-bg`         | Even-row background when `striped`               |
| `--table-cell-padding-x`    | Horizontal cell padding                          |
| `--table-cell-padding-y`    | Vertical cell padding                            |
| `--table-font-size`         | Base font size for all cells                     |
| `--table-sticky-max-height` | Max height of the scroll container when `sticky` |
| `--table-sticky-header-bg`  | Background of the sticky `<thead>` (with blur)   |
| `--table-sticky-blur`       | Backdrop blur intensity on the sticky header     |

## Customization

<ComponentPreview>

```html
<sg-table
  style="
    --table-header-bg: #1e293b;
    --table-stripe-bg: #f1f5f9;
    --table-row-hover-bg: #e2e8f0;
    --table-border-color: #cbd5e1;
    --table-radius: var(--rounded-xl);
  "
  striped
  bordered>
  <sg-tr head>
    <sg-th>Name</sg-th>
    <sg-th>Status</sg-th>
  </sg-tr>
  <sg-tr>
    <sg-td>Alice</sg-td>
    <sg-td>Active</sg-td>
  </sg-tr>
  <sg-tr>
    <sg-td>Bob</sg-td>
    <sg-td>Inactive</sg-td>
  </sg-tr>
</sg-table>
```

</ComponentPreview>

## Accessibility

The table component follows WCAG 2.1 Level AA standards.

When `loading` is active, `aria-busy` is set to `"true"` so screen readers can announce that the table content is being updated. When a `caption` is provided, it is used as the `aria-label` for the table, giving assistive technologies a clear label for the data.

The native `<table>`, `<thead>`, `<tbody>`, and `<tfoot>` elements are owned by `sg-table`'s shadow DOM, preserving all table semantics for assistive technologies. `<sg-th>` elements in a `<sg-tr head>` row automatically receive `scope="col"` on the generated native `<th>`, while `<sg-th>` in a body row automatically gets `scope="row"`. Provide an explicit `scope` attribute to override either default.

Standard browser table keyboard navigation applies, including Tab and arrow key navigation with screen readers. Avoid placing interactive elements such as buttons or inputs inside cells without ensuring their keyboard accessibility.
