# Table

A semantic, accessible data table component with striped rows, borders, sticky header, and responsive horizontal scrolling. Use `<bit-tr head>` for header rows, `<bit-tr foot>` for footer rows, plain `<bit-tr>` for body rows, with `<bit-th>` and `<bit-td>` for cells.

## Features

- 📋 **Flat row API**: Compose with `<bit-tr head>`, `<bit-tr>`, `<bit-tr foot>`, `<bit-th>`, `<bit-td>` — no wrapper elements needed
- 📏 **3 Size Variants**: sm, md, lg
- 🦓 **Striped rows** for easier scanning of dense data
- 🔲 **Bordered** variant with rounded outline
- 📌 **Sticky header** that stays visible while the body scrolls
- 🔄 **Loading / busy state** with reduced opacity and `aria-busy`
- 📱 **Responsive**: horizontal scroll container prevents layout overflow
- 🏷️ **Visible caption** rendered above the table, also used as `aria-label`
- ♿ **Fully Accessible**: WCAG 2.1 Level AA compliant
- 🎨 **CSS custom properties** for complete styling control

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/content/table/table.ts
:::

## Basic Usage

```html
<bit-table caption="Team Members">
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Role</bit-th>
    <bit-th>Status</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>Admin</bit-td>
    <bit-td>Active</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>Editor</bit-td>
    <bit-td>Active</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Carol</bit-td>
    <bit-td>Viewer</bit-td>
    <bit-td>Inactive</bit-td>
  </bit-tr>
</bit-table>

<script type="module">
  import '@vielzeug/sigil/table';
</script>
```

## Visual Options

### Striped Rows

The `striped` attribute applies alternating row backgrounds, making it easier to track across wide tables.

<ComponentPreview>

```html
<bit-table striped>
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Email</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>alice@example.com</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>bob@example.com</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Carol</bit-td>
    <bit-td>carol@example.com</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

### Bordered

The `bordered` attribute adds an outer border and radius around the whole table.

<ComponentPreview>

```html
<bit-table bordered>
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Email</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>alice@example.com</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>bob@example.com</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Carol</bit-td>
    <bit-td>carol@example.com</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

### Fullwidth

The `fullwidth` attribute expands the table to fill 100% of its container width.

<ComponentPreview>

```html
<bit-table fullwidth>
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Role</bit-th>
    <bit-th>Status</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>Admin</bit-td>
    <bit-td>Active</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>Editor</bit-td>
    <bit-td>Inactive</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

### Size Variants

Control cell padding and font size with the `size` attribute.

<ComponentPreview>

```html
<!-- Compact -->
<bit-table size="sm">
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Value</bit-th>
  </bit-tr>
  <bit-tr><bit-td>Alpha</bit-td><bit-td>1</bit-td></bit-tr>
  <bit-tr><bit-td>Beta</bit-td><bit-td>2</bit-td></bit-tr>
</bit-table>

<!-- Default -->
<bit-table size="md">
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Value</bit-th>
  </bit-tr>
  <bit-tr><bit-td>Alpha</bit-td><bit-td>1</bit-td></bit-tr>
  <bit-tr><bit-td>Beta</bit-td><bit-td>2</bit-td></bit-tr>
</bit-table>

<!-- Spacious -->
<bit-table size="lg">
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Value</bit-th>
  </bit-tr>
  <bit-tr><bit-td>Alpha</bit-td><bit-td>1</bit-td></bit-tr>
  <bit-tr><bit-td>Beta</bit-td><bit-td>2</bit-td></bit-tr>
</bit-table>
```

</ComponentPreview>

### Sticky Header

Set `sticky` to keep the header row visible when the table body scrolls. Set `--table-sticky-max-height` to control the scroll viewport height (default `24rem`).

<ComponentPreview>

```html
<bit-table sticky style="--table-sticky-max-height: 20rem">
  <bit-tr head>
    <bit-th>Rank</bit-th>
    <bit-th>Name</bit-th>
    <bit-th>Score</bit-th>
  </bit-tr>
  <bit-tr><bit-td>1</bit-td><bit-td>Alice</bit-td><bit-td>98</bit-td></bit-tr>
  <bit-tr><bit-td>2</bit-td><bit-td>Bob</bit-td><bit-td>95</bit-td></bit-tr>
  <bit-tr><bit-td>3</bit-td><bit-td>Carol</bit-td><bit-td>91</bit-td></bit-tr>
  <bit-tr><bit-td>4</bit-td><bit-td>Dan</bit-td><bit-td>88</bit-td></bit-tr>
  <bit-tr><bit-td>5</bit-td><bit-td>Eve</bit-td><bit-td>85</bit-td></bit-tr>
  <bit-tr><bit-td>6</bit-td><bit-td>Frank</bit-td><bit-td>82</bit-td></bit-tr>
  <bit-tr><bit-td>7</bit-td><bit-td>Grace</bit-td><bit-td>79</bit-td></bit-tr>
  <bit-tr><bit-td>8</bit-td><bit-td>Hank</bit-td><bit-td>77</bit-td></bit-tr>
  <bit-tr><bit-td>9</bit-td><bit-td>Ivy</bit-td><bit-td>74</bit-td></bit-tr>
  <bit-tr><bit-td>10</bit-td><bit-td>Jake</bit-td><bit-td>71</bit-td></bit-tr>
</bit-table>
```

</ComponentPreview>

### Loading State

The `loading` attribute dims the table and sets `aria-busy="true"` while data is being fetched.

<ComponentPreview>

```html
<bit-table loading>
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Email</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>alice@example.com</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

### Caption

The `caption` attribute renders a visible label above the table and also serves as the accessible `aria-label`.

<ComponentPreview>

```html
<bit-table caption="Monthly Sales Report" striped>
  <bit-tr head>
    <bit-th>Month</bit-th>
    <bit-th>Revenue</bit-th>
    <bit-th>Growth</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>January</bit-td>
    <bit-td>$12,400</bit-td>
    <bit-td>+8%</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>February</bit-td>
    <bit-td>$13,100</bit-td>
    <bit-td>+5.6%</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>March</bit-td>
    <bit-td>$14,800</bit-td>
    <bit-td>+13%</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

### Combining Options

Mix attributes for a fully styled, accessible table.

<ComponentPreview>

```html
<bit-table caption="Active Users" striped bordered sticky>
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Email</bit-th>
    <bit-th>Role</bit-th>
    <bit-th>Last Active</bit-th>
  </bit-tr>

  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>alice@example.com</bit-td>
    <bit-td>Admin</bit-td>
    <bit-td>Today</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>bob@example.com</bit-td>
    <bit-td>Editor</bit-td>
    <bit-td>Yesterday</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Carol</bit-td>
    <bit-td>carol@example.com</bit-td>
    <bit-td>Viewer</bit-td>
    <bit-td>3 days ago</bit-td>
  </bit-tr>

  <bit-tr foot>
    <bit-td colspan="4">3 users total</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute   | Type                    | Default | Description                                        |
| ----------- | ----------------------- | ------- | -------------------------------------------------- |
| `caption`   | `string`                | —       | Visible caption rendered above the table           |
| `size`      | `'sm' \| 'md' \| 'lg'` | —       | Cell padding and font size                         |
| `striped`   | `boolean`               | `false` | Alternating row background                         |
| `bordered`  | `boolean`               | `false` | Outer border and rounded corners                   |
| `fullwidth` | `boolean`               | `false` | Expands the table to 100% of its container width   |
| `sticky`    | `boolean`               | `false` | Stick the header row to the top while body scrolls |
| `loading`   | `boolean`               | `false` | Dims the table and sets `aria-busy="true"`         |

### Child Elements

`bit-table` reads light-DOM marker elements and projects them into a native shadow `<table>`. There are no slots — child elements are observed via `MutationObserver`.

| Element         | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| `<bit-tr head>` | Header row — projected into `<thead>`                                         |
| `<bit-tr>`      | Body row — projected into `<tbody>`                                           |
| `<bit-tr foot>` | Footer row — projected into `<tfoot>`                                         |
| `<bit-th>`      | Header cell — mirrored as native `<th>`; `scope` is auto-inferred if omitted  |
| `<bit-td>`      | Data cell — mirrored as native `<td>`; supports `colspan`, `rowspan`, etc.    |

### Mirrored Attributes

Attributes on `<bit-th>` and `<bit-td>` are forwarded to the generated native `<th>`/`<td>` in the shadow tree.

| Attribute  | Elements           | Description                                     |
| ---------- | ------------------ | ----------------------------------------------- |
| `colspan`  | `bit-th`, `bit-td` | Spans multiple columns                          |
| `rowspan`  | `bit-th`, `bit-td` | Spans multiple rows                             |
| `scope`    | `bit-th`           | Column/row association — auto-inferred if absent |
| `headers`  | `bit-th`, `bit-td` | Associates cell with header IDs                 |

### Parts

| Part     | Description                                            |
| -------- | ------------------------------------------------------ |
| `scroll` | Overflow container — target for max-height / scrolling |
| `table`  | Generated native `<table>` element                     |
| `head`   | Generated native `<thead>` element                     |
| `body`   | Generated native `<tbody>` element                     |
| `foot`   | Generated native `<tfoot>` element                     |

### CSS Custom Properties

| Property                     | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `--table-bg`                 | Table background color                               |
| `--table-border-color`       | Cell separator and outer border color                |
| `--table-radius`             | Corner radius (applied when `bordered`)              |
| `--table-shadow`             | Box shadow on the host element                       |
| `--table-header-bg`          | Background of `<thead>` and `<tfoot>`                |
| `--table-accent`             | Accent color used for hover states                   |
| `--table-row-hover-bg`       | Row background on hover                              |
| `--table-stripe-bg`          | Even-row background when `striped`                   |
| `--table-cell-padding-x`     | Horizontal cell padding                              |
| `--table-cell-padding-y`     | Vertical cell padding                                |
| `--table-font-size`          | Base font size for all cells                         |
| `--table-sticky-max-height`  | Max height of the scroll container when `sticky`     |
| `--table-sticky-header-bg`   | Background of the sticky `<thead>` (with blur)       |
| `--table-sticky-blur`        | Backdrop blur intensity on the sticky header         |

## Customization

<ComponentPreview>

```html
<bit-table
  style="
    --table-header-bg: #1e293b;
    --table-stripe-bg: #f1f5f9;
    --table-row-hover-bg: #e2e8f0;
    --table-border-color: #cbd5e1;
    --table-radius: var(--rounded-xl);
  "
  striped
  bordered>
  <bit-tr head>
    <bit-th>Name</bit-th>
    <bit-th>Status</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>Active</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>Inactive</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

## Accessibility

The table component follows WCAG 2.1 Level AA standards.

### `bit-table`

✅ **Screen Readers**

- `aria-busy` is set to `"true"` when `loading` is active.
- `aria-label` is set to the `caption` value when provided.
- The native `<table>`, `<thead>`, `<tbody>`, and `<tfoot>` elements are owned by `bit-table`'s shadow DOM, preserving all table semantics for assistive technologies.

✅ **Semantic Structure**

- `<bit-th>` in a `<bit-tr head>` row automatically gets `scope="col"` on the native `<th>`.
- `<bit-th>` in a body row automatically gets `scope="row"`. Provide an explicit `scope` attribute to override.
- Use the `caption` attribute on `bit-table` to label the table for assistive technologies.

✅ **Keyboard Navigation**

- Standard browser table keyboard navigation applies (Tab, arrow keys with screen readers).

## Best Practices

1. Always use `<bit-th>` (not `<bit-td>`) for header cells — `scope` is inferred automatically.
2. Use the `caption` attribute on every data table to give it an accessible label.
3. Prefer `striped` for tables with many rows and few columns to aid row tracking.
4. Set `sticky` only when the table has enough rows to require scrolling; pair with `--table-sticky-max-height`.
5. Use `loading` to indicate async data fetching instead of hiding or removing the table.
6. Prefer `size="sm"` for dense dashboard tables.
7. Avoid placing interactive elements (buttons, inputs) inside cells without ensuring their keyboard accessibility.
