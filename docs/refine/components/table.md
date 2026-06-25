# Table

A semantic, accessible data table component with striped rows, borders, sticky header, and responsive horizontal scrolling. Use `<ore-tr head>` for header rows, `<ore-tr foot>` for footer rows, plain `<ore-tr>` for body rows, with `<ore-th>` and `<ore-td>` for cells.

## Striped Rows

The `striped` attribute applies alternating row backgrounds, making it easier to track across wide tables. Prefer `striped` for tables with many rows and few columns to aid row tracking.

<ComponentPreview>

```html
<ore-table striped>
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Email</ore-th>
  </ore-tr>
  <ore-tr>
    <ore-td>Alice</ore-td>
    <ore-td>alice@example.com</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Bob</ore-td>
    <ore-td>bob@example.com</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Carol</ore-td>
    <ore-td>carol@example.com</ore-td>
  </ore-tr>
</ore-table>
```

</ComponentPreview>

## Bordered

The `bordered` attribute adds an outer border and radius around the whole table.

<ComponentPreview>

```html
<ore-table bordered>
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Email</ore-th>
  </ore-tr>
  <ore-tr>
    <ore-td>Alice</ore-td>
    <ore-td>alice@example.com</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Bob</ore-td>
    <ore-td>bob@example.com</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Carol</ore-td>
    <ore-td>carol@example.com</ore-td>
  </ore-tr>
</ore-table>
```

</ComponentPreview>

## Fullwidth

The `fullwidth` attribute expands the table to fill 100% of its container width.

<ComponentPreview>

```html
<ore-table fullwidth>
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Role</ore-th>
    <ore-th>Status</ore-th>
  </ore-tr>
  <ore-tr>
    <ore-td>Alice</ore-td>
    <ore-td>Admin</ore-td>
    <ore-td>Active</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Bob</ore-td>
    <ore-td>Editor</ore-td>
    <ore-td>Inactive</ore-td>
  </ore-tr>
</ore-table>
```

</ComponentPreview>

## Density

Control cell padding with the `density` attribute. Font size is unaffected. Use `density="compact"` for dense dashboard tables; `density="comfortable"` when more breathing room is needed. The default `density="cozy"` suits most cases.

<ComponentPreview>

```html
<!-- Compact: tightest padding -->
<ore-table density="compact">
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Value</ore-th>
  </ore-tr>
  <ore-tr><ore-td>Alpha</ore-td><ore-td>1</ore-td></ore-tr>
  <ore-tr><ore-td>Beta</ore-td><ore-td>2</ore-td></ore-tr>
</ore-table>

<!-- Cozy: default padding -->
<ore-table density="cozy">
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Value</ore-th>
  </ore-tr>
  <ore-tr><ore-td>Alpha</ore-td><ore-td>1</ore-td></ore-tr>
  <ore-tr><ore-td>Beta</ore-td><ore-td>2</ore-td></ore-tr>
</ore-table>

<!-- Comfortable: widest padding -->
<ore-table density="comfortable">
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Value</ore-th>
  </ore-tr>
  <ore-tr><ore-td>Alpha</ore-td><ore-td>1</ore-td></ore-tr>
  <ore-tr><ore-td>Beta</ore-td><ore-td>2</ore-td></ore-tr>
</ore-table>
```

</ComponentPreview>

## Sticky Header

Set `sticky` to keep the header row visible when the table body scrolls. Set `--table-sticky-max-height` to control the scroll viewport height (default `24rem`). Only use `sticky` when the table has enough rows to require scrolling; pair it with `--table-sticky-max-height`.

<ComponentPreview>

```html
<ore-table sticky style="--table-sticky-max-height: 20rem">
  <ore-tr head>
    <ore-th>Rank</ore-th>
    <ore-th>Name</ore-th>
    <ore-th>Score</ore-th>
  </ore-tr>
  <ore-tr><ore-td>1</ore-td><ore-td>Alice</ore-td><ore-td>98</ore-td></ore-tr>
  <ore-tr><ore-td>2</ore-td><ore-td>Bob</ore-td><ore-td>95</ore-td></ore-tr>
  <ore-tr><ore-td>3</ore-td><ore-td>Carol</ore-td><ore-td>91</ore-td></ore-tr>
  <ore-tr><ore-td>4</ore-td><ore-td>Dan</ore-td><ore-td>88</ore-td></ore-tr>
  <ore-tr><ore-td>5</ore-td><ore-td>Eve</ore-td><ore-td>85</ore-td></ore-tr>
  <ore-tr><ore-td>6</ore-td><ore-td>Frank</ore-td><ore-td>82</ore-td></ore-tr>
  <ore-tr><ore-td>7</ore-td><ore-td>Grace</ore-td><ore-td>79</ore-td></ore-tr>
  <ore-tr><ore-td>8</ore-td><ore-td>Hank</ore-td><ore-td>77</ore-td></ore-tr>
  <ore-tr><ore-td>9</ore-td><ore-td>Ivy</ore-td><ore-td>74</ore-td></ore-tr>
  <ore-tr><ore-td>10</ore-td><ore-td>Jake</ore-td><ore-td>71</ore-td></ore-tr>
</ore-table>
```

</ComponentPreview>

## Loading State

The `loading` attribute dims the table and sets `aria-busy="true"` while data is being fetched. Use `loading` to indicate async data fetching instead of hiding or removing the table.

<ComponentPreview>

```html
<ore-table loading>
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Email</ore-th>
  </ore-tr>
  <ore-tr>
    <ore-td>Alice</ore-td>
    <ore-td>alice@example.com</ore-td>
  </ore-tr>
</ore-table>
```

</ComponentPreview>

## Caption

The `caption` attribute renders a visible label above the table and also serves as the accessible `aria-label`. Always use the `caption` attribute on every data table to give it an accessible label.

<ComponentPreview>

```html
<ore-table caption="Monthly Sales Report" striped>
  <ore-tr head>
    <ore-th>Month</ore-th>
    <ore-th>Revenue</ore-th>
    <ore-th>Growth</ore-th>
  </ore-tr>
  <ore-tr>
    <ore-td>January</ore-td>
    <ore-td>$12,400</ore-td>
    <ore-td>+8%</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>February</ore-td>
    <ore-td>$13,100</ore-td>
    <ore-td>+5.6%</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>March</ore-td>
    <ore-td>$14,800</ore-td>
    <ore-td>+13%</ore-td>
  </ore-tr>
</ore-table>
```

</ComponentPreview>

## Combining Options

Mix attributes for a fully styled, accessible table.

<ComponentPreview>

```html
<ore-table caption="Active Users" striped bordered sticky>
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Email</ore-th>
    <ore-th>Role</ore-th>
    <ore-th>Last Active</ore-th>
  </ore-tr>

  <ore-tr>
    <ore-td>Alice</ore-td>
    <ore-td>alice@example.com</ore-td>
    <ore-td>Admin</ore-td>
    <ore-td>Today</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Bob</ore-td>
    <ore-td>bob@example.com</ore-td>
    <ore-td>Editor</ore-td>
    <ore-td>Yesterday</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Carol</ore-td>
    <ore-td>carol@example.com</ore-td>
    <ore-td>Viewer</ore-td>
    <ore-td>3 days ago</ore-td>
  </ore-tr>

  <ore-tr foot>
    <ore-td colspan="4">3 users total</ore-td>
  </ore-tr>
</ore-table>
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

`ore-table` reads light-DOM marker elements and projects them into a native shadow `<table>`. There are no slots — child elements are observed via `MutationObserver`. Always use `<ore-th>` (not `<ore-td>`) for header cells — `scope` is inferred automatically.

| Element        | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `<ore-tr head>` | Header row — projected into `<thead>`                                        |
| `<ore-tr>`      | Body row — projected into `<tbody>`                                          |
| `<ore-tr foot>` | Footer row — projected into `<tfoot>`                                        |
| `<ore-th>`      | Header cell — mirrored as native `<th>`; `scope` is auto-inferred if omitted |
| `<ore-td>`      | Data cell — mirrored as native `<td>`; supports `colspan`, `rowspan`, etc.   |

### Mirrored Attributes

Attributes on `<ore-th>` and `<ore-td>` are forwarded to the generated native `<th>`/`<td>` in the shadow tree.

| Attribute | Elements         | Description                                      |
| --------- | ---------------- | ------------------------------------------------ |
| `colspan` | `ore-th`, `ore-td` | Spans multiple columns                           |
| `rowspan` | `ore-th`, `ore-td` | Spans multiple rows                              |
| `scope`   | `ore-th`          | Column/row association — auto-inferred if absent |
| `headers` | `ore-th`, `ore-td` | Associates cell with header IDs                  |

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
<ore-table
  style="
    --table-header-bg: #1e293b;
    --table-stripe-bg: #f1f5f9;
    --table-row-hover-bg: #e2e8f0;
    --table-border-color: #cbd5e1;
    --table-radius: var(--rounded-xl);
  "
  striped
  bordered>
  <ore-tr head>
    <ore-th>Name</ore-th>
    <ore-th>Status</ore-th>
  </ore-tr>
  <ore-tr>
    <ore-td>Alice</ore-td>
    <ore-td>Active</ore-td>
  </ore-tr>
  <ore-tr>
    <ore-td>Bob</ore-td>
    <ore-td>Inactive</ore-td>
  </ore-tr>
</ore-table>
```

</ComponentPreview>

## Accessibility

The table component follows WCAG 2.1 Level AA standards.

When `loading` is active, `aria-busy` is set to `"true"` so screen readers can announce that the table content is being updated. When a `caption` is provided, it is used as the `aria-label` for the table, giving assistive technologies a clear label for the data.

The native `<table>`, `<thead>`, `<tbody>`, and `<tfoot>` elements are owned by `ore-table`'s shadow DOM, preserving all table semantics for assistive technologies. `<ore-th>` elements in a `<ore-tr head>` row automatically receive `scope="col"` on the generated native `<th>`, while `<ore-th>` in a body row automatically gets `scope="row"`. Provide an explicit `scope` attribute to override either default.

Standard browser table keyboard navigation applies, including Tab and arrow key navigation with screen readers. Avoid placing interactive elements such as buttons or inputs inside cells without ensuring their keyboard accessibility.
