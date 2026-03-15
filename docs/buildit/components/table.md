# Table

A semantic, accessible data table component with striped rows, borders, sticky header, color-themed headers, and responsive horizontal scrolling. Use `<bit-tr head>` for header rows, `<bit-tr foot>` for footer rows, plain `<bit-tr>` for body rows, with `<bit-th>` and `<bit-td>` for cells.

## Features

- 📋 **Flat row API**: Compose with `<bit-tr head>`, `<bit-tr>`, `<bit-tr foot>`, `<bit-th>`, `<bit-td>` — no wrapper elements needed
- 🌈 **6 Color Themes**: primary, secondary, info, success, warning, error
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
<<< @/../packages/buildit/src/content/table/table.ts
:::

## Basic Usage

```html
<bit-table caption="Team Members">
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Role</bit-th>
    <bit-th scope="col">Status</bit-th>
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
  import '@vielzeug/buildit/table';
</script>
```

## Visual Options

### Striped Rows

The `striped` attribute applies alternating row backgrounds, making it easier to track across wide tables.

<ComponentPreview>

```html
<bit-table striped>
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Email</bit-th>
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
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Score</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>98</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>85</bit-td>
  </bit-tr>
</bit-table>
```

</ComponentPreview>

### Color Themes

Apply a `color` attribute to tint the header row background with a semantic theme color.

<ComponentPreview>

```html
<bit-table color="primary">
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Department</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Alice</bit-td>
    <bit-td>Engineering</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Bob</bit-td>
    <bit-td>Design</bit-td>
  </bit-tr>
</bit-table>

<bit-table color="success">
  <bit-tr head>
    <bit-th scope="col">Item</bit-th>
    <bit-th scope="col">Status</bit-th>
  </bit-tr>
  <bit-tr>
    <bit-td>Server</bit-td>
    <bit-td>Healthy</bit-td>
  </bit-tr>
  <bit-tr>
    <bit-td>Database</bit-td>
    <bit-td>Healthy</bit-td>
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
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Value</bit-th>
  </bit-tr>
  <bit-tr><bit-td>Alpha</bit-td><bit-td>1</bit-td></bit-tr>
  <bit-tr><bit-td>Beta</bit-td><bit-td>2</bit-td></bit-tr>
</bit-table>

<!-- Default -->
<bit-table size="md">
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Value</bit-th>
  </bit-tr>
  <bit-tr><bit-td>Alpha</bit-td><bit-td>1</bit-td></bit-tr>
  <bit-tr><bit-td>Beta</bit-td><bit-td>2</bit-td></bit-tr>
</bit-table>

<!-- Spacious -->
<bit-table size="lg">
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Value</bit-th>
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
<bit-table sticky style="--table-sticky-max-height: 10rem">
  <bit-tr head>
    <bit-th scope="col">Rank</bit-th>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Score</bit-th>
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
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Email</bit-th>
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
<bit-table caption="Monthly Sales Report" striped color="primary">
  <bit-tr head>
    <bit-th scope="col">Month</bit-th>
    <bit-th scope="col">Revenue</bit-th>
    <bit-th scope="col">Growth</bit-th>
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
<bit-table caption="Active Users" color="primary" striped bordered sticky>
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Email</bit-th>
    <bit-th scope="col">Role</bit-th>
    <bit-th scope="col">Last Active</bit-th>
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

| Attribute  | Type                                                                      | Default | Description                                        |
| ---------- | ------------------------------------------------------------------------- | ------- | -------------------------------------------------- |
| `caption`  | `string`                                                                  | —       | Visible caption rendered above the table           |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Color theme applied to the header row              |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | —       | Cell padding and font size                         |
| `striped`  | `boolean`                                                                 | `false` | Alternating row background                         |
| `bordered` | `boolean`                                                                 | `false` | Outer border and rounded corners                   |
| `sticky`   | `boolean`                                                                 | `false` | Stick the header row to the top while body scrolls |
| `loading`  | `boolean`                                                                 | `false` | Dims the table and sets `aria-busy="true"`         |

### Slots

| Slot      | Description                                                               |
| --------- | ------------------------------------------------------------------------- |
| `head`    | A `<bit-tr head>` element containing header rows (`<bit-tr>`, `<bit-th>`) |
| (default) | One or more `` elements containing body rows                              |
| `foot`    | A `<bit-tr foot>` element containing footer rows                          |

### Sub-Components

| Element         | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| `<bit-tr head>` | Table head section — slot assigned automatically, no attribute needed |
| ``              | Table body section — goes in the default slot                         |
| `<bit-tr foot>` | Table foot section — slot assigned automatically, no attribute needed |
| `<bit-tr head>` | Header row — slotted into `<thead>` automatically                     |
| `<bit-tr>`      | Body row — default slot                                               |
| `<bit-tr foot>` | Footer row — slotted into `<tfoot>` automatically                     |
| `<bit-th>`      | Header cell — supports `scope="col"` or `scope="row"`                 |
| `<bit-td>`      | Data cell — supports standard HTML attributes like `colspan`          |

### Parts

| Part      | Description                                         |
| --------- | --------------------------------------------------- |
| `root`    | Outermost wrapper element                           |
| `caption` | Visible caption element rendered above the table    |
| `scroll`  | Inner scroll container wrapping the slotted content |
| `table`   | Native `<table>` element in shadow DOM              |
| `head`    | Native `<thead>` element in shadow DOM              |
| `body`    | Native `<tbody>` element in shadow DOM              |
| `foot`    | Native `<tfoot>` element in shadow DOM              |

### CSS Custom Properties

| Property                    | Default                               | Description                              |
| --------------------------- | ------------------------------------- | ---------------------------------------- |
| `--table-bg`                | —                                     | Table background color                   |
| `--table-border`            | `1px solid var(--color-contrast-300)` | Full border shorthand for row separators |
| `--table-header-bg`         | `var(--color-contrast-100)`           | Header row background                    |
| `--table-header-color`      | `var(--color-contrast-600)`           | Header cell text color                   |
| `--table-cell-padding`      | `var(--size-3) var(--size-4)`         | Cell padding shorthand                   |
| `--table-cell-font-size`    | `var(--text-sm)`                      | Cell font size                           |
| `--table-cell-color`        | `var(--color-contrast-900)`           | Body cell text color                     |
| `--table-stripe-bg`         | `var(--color-contrast-100)`           | Alternating row background (striped)     |
| `--table-row-hover-bg`      | `var(--color-contrast-200)`           | Row background on hover                  |
| `--table-radius`            | `var(--rounded-md)`                   | Outer corner radius (bordered variant)   |
| `--table-shadow`            | —                                     | Outer box shadow                         |
| `--table-sticky-max-height` | `24rem`                               | Max height when `sticky` is active       |

## Customization

<ComponentPreview>

```html
<bit-table
  style="
    --table-header-bg: #1e293b;
    --table-header-color: #f8fafc;
    --table-stripe-bg: #f1f5f9;
    --table-row-hover-bg: #e2e8f0;
    --table-border-color: #cbd5e1;
    --table-radius: var(--rounded-xl);
  "
  striped
  bordered>
  <bit-tr head>
    <bit-th scope="col">Name</bit-th>
    <bit-th scope="col">Status</bit-th>
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

- Use `scope="col"` on `<bit-th>` elements for proper column-header association.
- Use `scope="row"` on row-header `<bit-th>` elements when applicable.
- Use the `caption` attribute on `bit-table` to label the table for assistive technologies.

✅ **Keyboard Navigation**

- Standard browser table keyboard navigation applies (Tab, arrow keys with screen readers).

## Best Practices

1. Always use `<bit-th scope="col">` for column headers to establish proper associations.
2. Use the `caption` attribute on `bit-table` to label every data table.
3. Prefer `striped` for tables with many rows and few columns.
4. Set `sticky` only when the table has enough rows to require scrolling.
5. Use `loading` to indicate async data fetching instead of hiding the table.
6. Prefer `size="sm"` for dense dashboard views over a separate `compact` attribute.
7. Avoid placing interactive elements (buttons, inputs) in table cells without ensuring keyboard accessibility of those elements.
