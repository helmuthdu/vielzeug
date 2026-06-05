# Grid

A flexible CSS Grid layout component with element-width responsive columns, named grid areas, and fine-grained item placement. Perfect for dashboards, card grids, photo galleries, and complex page layouts.

## Features

- 📐 **12-Column System**: Fixed 1–12 column layouts plus auto-fit mode
- 📱 **Element-Width Responsive**: Breakpoints respond to the element's own width via ResizeObserver — works correctly inside sidebars, modals, and nested layouts
- 🎯 **Explicit Breakpoint Control**: Set columns at sm, md, lg, and xl widths with dedicated attributes
- 📏 **Row Support**: Define explicit row layouts for dashboard grids
- 🗺️ **Named Grid Areas**: Use `areas` to define named regions directly on the grid
- 🔄 **Flow Control**: Row, column, and dense packing modes
- 📊 **7 Gap Sizes**: From `none` to `2xl` with separate row/column gap support
- 🧲 **Alignment Control**: Align and justify items with CSS Grid properties
- 🎨 **Grid Item Component**: Precise placement with `sg-grid-item` using named areas, spans, or raw CSS grid shorthand
- 🔧 **Customizable**: CSS custom properties available as fallbacks

## Source Code

::: details View Source Code (Grid)
<<< @/../packages/sigil/src/layout/grid/grid.ts
:::

::: details View Source Code (Grid Item)
<<< @/../packages/sigil/src/layout/grid-item/grid-item.ts
:::

## Basic Usage

```html
<sg-grid cols="3" gap="md">
  <sg-card>Item 1</sg-card>
  <sg-card>Item 2</sg-card>
  <sg-card>Item 3</sg-card>
</sg-grid>

<script type="module">
  import '@vielzeug/sigil/grid';
  import '@vielzeug/sigil/card';
</script>
```

## Column Layouts

### Fixed Columns

Create grids with a fixed number of columns from 1 to 12.

<ComponentPreview center vertical>

```html
<sg-grid cols="3" gap="md" style="width: 100%;">
  <sg-card padding="md"><sg-text>Item 1</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 2</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 3</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 4</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 5</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 6</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

### Responsive Columns with Breakpoints

Use `cols-sm`, `cols-md`, `cols-lg`, `cols-xl`, and `cols-2xl` attributes for explicit responsive control.

<ComponentPreview center vertical>

```html
<sg-grid cols="1" cols-sm="2" cols-md="3" cols-lg="4" gap="md" style="width: 100%;">
  <sg-card padding="md" color="primary"><sg-text>1</sg-text></sg-card>
  <sg-card padding="md" color="secondary"><sg-text>2</sg-text></sg-card>
  <sg-card padding="md" color="success"><sg-text>3</sg-text></sg-card>
  <sg-card padding="md" color="warning"><sg-text>4</sg-text></sg-card>
  <sg-card padding="md" color="error"><sg-text>5</sg-text></sg-card>
  <sg-card padding="md" color="info"><sg-text>6</sg-text></sg-card>
  <sg-card padding="md"><sg-text>7</sg-text></sg-card>
  <sg-card padding="md"><sg-text>8</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

::: tip Resize to See It Work
Try resizing your browser window or use the viewport controls above to see the grid automatically adapt:

- **Mobile**: 1 column
- **Small (≥640px)**: 2 columns
- **Medium (≥768px)**: 3 columns
- **Large (≥1024px)**: 4 columns
  :::

### Breakpoint Reference

Breakpoints respond to the **element's own width** via `ResizeObserver`, so they work correctly inside sidebars, modals, ComponentPreviews, and any constrained space.

| Breakpoint  | Attribute      | Min Element Width | Example   |
| ----------- | -------------- | ----------------- | --------- |
| Mobile      | `cols="1"`     | Default           | 1 column  |
| Small       | `cols-sm="2"`  | ≥640px            | 2 columns |
| Medium      | `cols-md="3"`  | ≥768px            | 3 columns |
| Large       | `cols-lg="4"`  | ≥1024px           | 4 columns |
| Extra Large | `cols-xl="6"`  | ≥1280px           | 6 columns |
| 2X Large    | `cols-2xl="8"` | ≥1536px           | 8 columns |

## Row Layouts

Define explicit row counts for dashboard-style layouts.

<ComponentPreview center vertical>

```html
<sg-grid cols="3" rows="2" gap="md" style="width: 100%;">
  <sg-card padding="md"><sg-text>1</sg-text></sg-card>
  <sg-card padding="md"><sg-text>2</sg-text></sg-card>
  <sg-card padding="md"><sg-text>3</sg-text></sg-card>
  <sg-card padding="md"><sg-text>4</sg-text></sg-card>
  <sg-card padding="md"><sg-text>5</sg-text></sg-card>
  <sg-card padding="md"><sg-text>6</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

## Gap Sizes

Control spacing between grid items.

<ComponentPreview center vertical>

```html
<sg-text size="sm">Gap: none</sg-text>
<sg-grid cols="3" gap="none" style="width: 100%;">
  <sg-card padding="sm"><sg-text>1</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>2</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>3</sg-text></sg-card>
</sg-grid>

<sg-text size="sm">Gap: sm</sg-text>
<sg-grid cols="3" gap="sm" style="width: 100%;">
  <sg-card padding="sm"><sg-text>1</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>2</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>3</sg-text></sg-card>
</sg-grid>

<sg-text size="sm">Gap: md</sg-text>
<sg-grid cols="3" gap="md" style="width: 100%;">
  <sg-card padding="sm"><sg-text>1</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>2</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>3</sg-text></sg-card>
</sg-grid>

<sg-text size="sm">Gap: xl</sg-text>
<sg-grid cols="3" gap="xl" style="width: 100%;">
  <sg-card padding="sm"><sg-text>1</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>2</sg-text></sg-card>
  <sg-card padding="sm"><sg-text>3</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

### Available Gap Sizes

| Size   | Token       | Value         |
| ------ | ----------- | ------------- |
| `none` | -           | 0             |
| `xs`   | `--size-1`  | 0.25rem (4px) |
| `sm`   | `--size-2`  | 0.5rem (8px)  |
| `md`   | `--size-4`  | 1rem (16px)   |
| `lg`   | `--size-6`  | 1.5rem (24px) |
| `xl`   | `--size-8`  | 2rem (32px)   |
| `2xl`  | `--size-12` | 3rem (48px)   |

## Flow Control

Control how items flow into the grid.

### Row Flow (Default)

<ComponentPreview center vertical>

```html
<sg-grid cols="3" rows="2" flow="row" gap="md" style="width: 100%;">
  <sg-card padding="md" color="primary"><sg-text>1</sg-text></sg-card>
  <sg-card padding="md" color="secondary"><sg-text>2</sg-text></sg-card>
  <sg-card padding="md" color="success"><sg-text>3</sg-text></sg-card>
  <sg-card padding="md" color="warning"><sg-text>4</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

### Column Flow

<ComponentPreview center vertical>

```html
<sg-grid cols="3" rows="2" flow="column" gap="md" style="width: 100%;">
  <sg-card padding="md" color="primary"><sg-text>1</sg-text></sg-card>
  <sg-card padding="md" color="secondary"><sg-text>2</sg-text></sg-card>
  <sg-card padding="md" color="success"><sg-text>3</sg-text></sg-card>
  <sg-card padding="md" color="warning"><sg-text>4</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

### Dense Packing

Automatically fill gaps with smaller items that come later.

<ComponentPreview center vertical>

```html
<sg-grid cols="5" flow="row-dense" gap="md" style="width: 100%;">
  <sg-grid-item col-span="3">
    <sg-card padding="lg" color="primary"><sg-text>Wide (3 cols)</sg-text></sg-card>
  </sg-grid-item>
  <sg-card padding="md"><sg-text>A</sg-text></sg-card>
  <sg-grid-item col-span="3">
    <sg-card padding="lg" color="secondary"><sg-text>Wide (3 cols)</sg-text></sg-card>
  </sg-grid-item>
  <sg-card padding="md" color="success"><sg-text>B</sg-text></sg-card>
  <sg-card padding="md" color="warning"><sg-text>C</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

::: tip Dense Packing
With `flow="row-dense"`, item B fills the gap after the first wide item, rather than leaving it empty. This creates a more compact layout but may change visual order.
:::

## Alignment

### Vertical Alignment (align-items)

<ComponentPreview center vertical>

```html
<sg-grid cols="3" align="center" gap="md" style="width: 100%; height: 200px;">
  <sg-card padding="sm"><sg-text>Short</sg-text></sg-card>
  <sg-card padding="lg"
    ><sg-text>Tall Item<br />Multiple<br />Lines</sg-text></sg-card
  >
  <sg-card padding="sm"><sg-text>Short</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

### Horizontal Alignment (justify-items)

<ComponentPreview center vertical>

```html
<sg-grid cols="3" justify="center" gap="md" style="width: 100%;">
  <sg-card padding="md" style="width: 80px;"><sg-text>1</sg-text></sg-card>
  <sg-card padding="md" style="width: 80px;"><sg-text>2</sg-text></sg-card>
  <sg-card padding="md" style="width: 80px;"><sg-text>3</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

## Grid Items

Use `sg-grid-item` for precise placement and span control within a `sg-grid`.

### Named Area Placement

When your grid uses `areas`, assign children with the `area` attribute instead of inline CSS. This keeps shell and dashboard layouts declarative.

<ComponentPreview center vertical>

```html
<sg-grid
  cols="3"
  rows="3"
  areas="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <sg-grid-item area="header">
    <sg-box padding="md" color="primary"><sg-text>Header</sg-text></sg-box>
  </sg-grid-item>
  <sg-grid-item area="nav">
    <sg-box padding="md" color="secondary"><sg-text>Nav</sg-text></sg-box>
  </sg-grid-item>
  <sg-grid-item area="main">
    <sg-box padding="md" color="success"><sg-text>Main</sg-text></sg-box>
  </sg-grid-item>
  <sg-grid-item area="footer">
    <sg-box padding="md" color="warning"><sg-text>Footer</sg-text></sg-box>
  </sg-grid-item>
</sg-grid>
```

</ComponentPreview>

### Column and Row Spans

`col-span` and `row-span` cover the common case of stretching an item across multiple tracks. Use `"full"` to span all columns or rows.

<ComponentPreview center vertical>

```html
<sg-grid cols="6" gap="md" style="width: 100%;">
  <sg-grid-item col-span="2">
    <sg-card padding="md" color="primary"><sg-text>Spans 2</sg-text></sg-card>
  </sg-grid-item>
  <sg-grid-item col-span="4">
    <sg-card padding="md" color="secondary"><sg-text>Spans 4</sg-text></sg-card>
  </sg-grid-item>
  <sg-grid-item col-span="3">
    <sg-card padding="md" color="success"><sg-text>Spans 3</sg-text></sg-card>
  </sg-grid-item>
  <sg-grid-item col-span="3">
    <sg-card padding="md" color="warning"><sg-text>Spans 3</sg-text></sg-card>
  </sg-grid-item>
  <sg-grid-item col-span="full">
    <sg-card padding="md" color="info"><sg-text>Full width</sg-text></sg-card>
  </sg-grid-item>
</sg-grid>
```

</ComponentPreview>

### Explicit Placement

Use the `col` and `row` attributes to set raw CSS `grid-column` / `grid-row` values. This accepts any valid CSS shorthand: `"2 / 5"`, `"span 3"`, `"1 / -1"`, etc.

<ComponentPreview center vertical>

```html
<sg-grid cols="4" rows="3" gap="md" style="width: 100%;">
  <sg-grid-item col="1 / 3" row="1 / 3">
    <sg-card padding="lg" color="primary"
      ><sg-text>2×2 item<br />(col 1–2, row 1–2)</sg-text></sg-card
    >
  </sg-grid-item>
  <sg-card padding="md"><sg-text>A</sg-text></sg-card>
  <sg-card padding="md"><sg-text>B</sg-text></sg-card>
  <sg-card padding="md"><sg-text>C</sg-text></sg-card>
  <sg-card padding="md"><sg-text>D</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

### Item Alignment

Use `align` and `justify` on `sg-grid-item` to override the grid's default alignment for a single cell.

<ComponentPreview center vertical>

```html
<sg-grid cols="3" gap="md" style="width: 100%; height: 160px;">
  <sg-grid-item align="start" justify="start">
    <sg-card padding="sm" style="width: 80px;"><sg-text>start</sg-text></sg-card>
  </sg-grid-item>
  <sg-grid-item align="center" justify="center">
    <sg-card padding="sm" style="width: 80px;"><sg-text>center</sg-text></sg-card>
  </sg-grid-item>
  <sg-grid-item align="end" justify="end">
    <sg-card padding="sm" style="width: 80px;"><sg-text>end</sg-text></sg-card>
  </sg-grid-item>
</sg-grid>
```

</ComponentPreview>

## Named Grid Areas

Use `areas` (and its breakpoint variants `areas-sm`, `areas-md`, `areas-lg`, `areas-xl`, `areas-2xl`) to define named regions on the grid. The active value is resolved from the element's own width via `ResizeObserver`, identical to how `cols-*` breakpoints work. Children can be placed into regions with `area="name"` on `sg-grid-item`.

### Basic Areas

<ComponentPreview center vertical>

```html
<sg-grid
  cols="3"
  rows="3"
  areas="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <sg-box padding="md" color="primary" style="grid-area: header;">
    <sg-text variant="heading" size="md">Header</sg-text>
  </sg-box>
  <sg-box padding="md" color="warning" style="grid-area: nav;">
    <sg-text variant="heading" size="md">Nav</sg-text>
  </sg-box>
  <sg-box padding="md" style="grid-area: main;">
    <sg-text variant="heading" size="md">Main</sg-text>
  </sg-box>
  <sg-box padding="md" color="secondary" style="grid-area: footer;">
    <sg-text variant="heading" size="md">Footer</sg-text>
  </sg-box>
</sg-grid>
```

</ComponentPreview>

### Responsive Areas

Provide different area templates at each breakpoint. The grid switches between them as the element resizes — a single-column stack on small widths, full page layout on larger ones.

<ComponentPreview center vertical>

```html
<sg-grid
  cols-sm="3"
  areas="'header' 'nav' 'main' 'footer'"
  areas-sm="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <sg-grid-item area="header">
    <sg-box padding="md" color="primary">
      <sg-text variant="heading" size="md">Header</sg-text>
    </sg-box>
  </sg-grid-item>
  <sg-grid-item area="nav">
    <sg-box padding="md" color="warning">
      <sg-text variant="heading" size="md">Navigation</sg-text>
    </sg-box>
  </sg-grid-item>
  <sg-grid-item area="main">
    <sg-box padding="md" color="success">
      <sg-text variant="heading" size="md">Main content</sg-text>
    </sg-box>
  </sg-grid-item>
  <sg-grid-item area="footer">
    <sg-box padding="md" color="secondary">
      <sg-text variant="heading" size="md">Footer</sg-text>
    </sg-box>
  </sg-grid-item>
  </sg-box>
</sg-grid>
```

</ComponentPreview>

## Responsive Auto-fit Mode

Use `responsive` to let the grid fit as many columns as possible based on a minimum column width. Set `min-col-width` to control the threshold (default: `250px`).

<ComponentPreview center vertical>

```html
<sg-grid responsive min-col-width="180px" gap="md" style="width: 100%;">
  <sg-card padding="md"><sg-text>Item 1</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 2</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 3</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 4</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 5</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 6</sg-text></sg-card>
</sg-grid>
```

</ComponentPreview>

::: tip Auto-fit vs Fixed Columns
Use `responsive` for fluid layouts where column count depends on available space. Use `cols` with optional breakpoint attributes (`cols-sm`, `cols-md`, etc.) for explicit control.
:::

## API Reference

### Grid Attributes

| Attribute       | Type                                                      | Default | Description                                       |
| --------------- | --------------------------------------------------------- | ------- | ------------------------------------------------- |
| `cols`          | `'1'–'12' \| 'auto'`                                      | -       | Number of columns                                 |
| `cols-sm`       | `'1'–'12' \| 'auto'`                                      | -       | Columns when element width ≥ 640px                |
| `cols-md`       | `'1'–'12' \| 'auto'`                                      | -       | Columns when element width ≥ 768px                |
| `cols-lg`       | `'1'–'12' \| 'auto'`                                      | -       | Columns when element width ≥ 1024px               |
| `cols-xl`       | `'1'–'12' \| 'auto'`                                      | -       | Columns when element width ≥ 1280px               |
| `cols-2xl`      | `'1'–'12' \| 'auto'`                                      | -       | Columns when element width ≥ 1536px               |
| `rows`          | `'1'–'12' \| 'auto'`                                      | -       | Number of explicit rows                           |
| `gap`           | `'none' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'md'`  | Gap between items                                 |
| `align`         | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'` | -       | `align-items` for all cells                       |
| `justify`       | `'start' \| 'center' \| 'end' \| 'stretch'`               | -       | `justify-items` for all cells                     |
| `flow`          | `'row' \| 'column' \| 'row-dense' \| 'column-dense'`      | `'row'` | `grid-auto-flow` direction                        |
| `responsive`    | `boolean`                                                 | `false` | Enable `auto-fit` mode                            |
| `min-col-width` | `string`                                                  | `250px` | Minimum column width in `responsive` mode         |
| `fullwidth`     | `boolean`                                                 | `false` | Stretch the grid to fill its container's width    |
| `areas`         | `string`                                                  | -       | CSS `grid-template-areas` value                   |
| `areas-sm`      | `string`                                                  | -       | `grid-template-areas` when element width ≥ 640px  |
| `areas-md`      | `string`                                                  | -       | `grid-template-areas` when element width ≥ 768px  |
| `areas-lg`      | `string`                                                  | -       | `grid-template-areas` when element width ≥ 1024px |
| `areas-xl`      | `string`                                                  | -       | `grid-template-areas` when element width ≥ 1280px |
| `areas-2xl`     | `string`                                                  | -       | `grid-template-areas` when element width ≥ 1536px |

### Grid Item Attributes

| Attribute  | Type                                        | Default | Description                                    |
| ---------- | ------------------------------------------- | ------- | ---------------------------------------------- |
| `col-span` | `'1'–'12' \| 'full'`                        | -       | Columns to span; `'full'` = `1 / -1`           |
| `row-span` | `'1'–'6' \| 'full'`                         | -       | Rows to span; `'full'` = `1 / -1`              |
| `col`      | `string`                                    | -       | Raw `grid-column` value — overrides `col-span` |
| `row`      | `string`                                    | -       | Raw `grid-row` value — overrides `row-span`    |
| `align`    | `'start' \| 'center' \| 'end' \| 'stretch'` | -       | `align-self` for this cell                     |
| `justify`  | `'start' \| 'center' \| 'end' \| 'stretch'` | -       | `justify-self` for this cell                   |

### CSS Custom Properties

These are fallback values — attributes take precedence when set.

| Property         | Default           | Description              |
| ---------------- | ----------------- | ------------------------ |
| `--grid-cols`    | -                 | Fallback column template |
| `--grid-rows`    | -                 | Fallback row template    |
| `--grid-gap`     | `var(--size-4)`   | Fallback gap             |
| `--grid-row-gap` | `var(--grid-gap)` | Fallback row gap         |
| `--grid-col-gap` | `var(--grid-gap)` | Fallback column gap      |

## Examples

### Dashboard Layout

<ComponentPreview center vertical>

```html
<sg-grid cols="1" cols-md="2" cols-lg="4" gap="lg" style="width: 100%;">
  <sg-card padding="lg" elevation="2">
    <sg-text variant="heading" size="lg">128</sg-text>
    <sg-text size="sm" color="muted">Total Users</sg-text>
  </sg-card>
  <sg-card padding="lg" elevation="2">
    <sg-text variant="heading" size="lg">$12,345</sg-text>
    <sg-text size="sm" color="muted">Revenue</sg-text>
  </sg-card>
  <sg-card padding="lg" elevation="2">
    <sg-text variant="heading" size="lg">89%</sg-text>
    <sg-text size="sm" color="muted">Satisfaction</sg-text>
  </sg-card>
  <sg-card padding="lg" elevation="2">
    <sg-text variant="heading" size="lg">1,432</sg-text>
    <sg-text size="sm" color="muted">Sales</sg-text>
  </sg-card>
</sg-grid>
```

</ComponentPreview>

### Asymmetric Layout

<ComponentPreview center vertical>

```html
<sg-grid cols="4" gap="md" style="width: 100%;">
  <sg-grid-item col-span="3">
    <sg-card padding="lg" color="primary">
      <sg-text variant="heading" size="lg">Featured Content</sg-text>
      <sg-text>This is the main featured area.</sg-text>
    </sg-card>
  </sg-grid-item>
  <sg-card padding="md" color="secondary"> <sg-text variant="heading" size="md">✨ Side</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 2</sg-text></sg-card>
  <sg-card padding="md"><sg-text>Item 3</sg-text></sg-card>
  <sg-grid-item col-span="2">
    <sg-card padding="md"><sg-text>Spans 2</sg-text></sg-card>
  </sg-grid-item>
</sg-grid>
```

</ComponentPreview>

### Bento-style Layout with Named Areas

<ComponentPreview center vertical>

```html
<sg-grid
  cols="4"
  rows="3"
  areas="'hero hero hero side' 'hero hero hero side' 'a b c d'"
  gap="md"
  style="width: 100%; min-height: 400px;">
  <sg-box padding="xl" color="primary" style="grid-area: hero;">
    <sg-text variant="heading" size="lg">🎯 Main Feature</sg-text>
    <sg-text>Large hero section for your most important content.</sg-text>
  </sg-box>
  <sg-box padding="lg" color="secondary" style="grid-area: side;">
    <sg-text variant="heading" size="md">✨ Side</sg-text>
  </sg-box>
  <sg-box padding="md" style="grid-area: a;"><sg-text variant="heading" size="md">A</sg-text></sg-box>
  <sg-box padding="md" style="grid-area: b;"><sg-text variant="heading" size="md">B</sg-text></sg-box>
  <sg-box padding="md" style="grid-area: c;"><sg-text variant="heading" size="md">C</sg-text></sg-box>
  <sg-box padding="md" style="grid-area: d;"><sg-text variant="heading" size="md">D</sg-text></sg-box>
</sg-grid>
```

</ComponentPreview>

## Accessibility

The grid component follows WAI-ARIA best practices.

### `sg-grid`

✅ **Semantic Structure**

- Maintains semantic HTML structure and document reading order by default.
- Grid layout is purely visual — keyboard navigation follows DOM order.

✅ **Screen Readers**

- Compatible with screen readers.
- Be mindful of visual vs. DOM order when using `flow="dense"` or explicit item placement.

::: warning Dense Packing & Accessibility
When using `flow="row-dense"` or `flow="column-dense"`, items may appear in a different visual order than they exist in the DOM. This can confuse screen reader users and keyboard navigators. Use dense packing only when layout aesthetics outweigh reading order, or restore meaningful order with `tabindex`.
:::

## Best Practices

**Do:**

- Start mobile-first: set `cols="1"` as the base and scale up with `cols-sm`, `cols-md`, etc.
- Use `responsive` mode for content-driven layouts where column count should adjust automatically to available space.
- Use `sg-grid-item` with `col-span` for featured items that need to span multiple columns.
- Use `areas` with named regions for complex or asymmetric page layouts.

**Don't:**

- Use `flow="dense"` when reading order matters — it visually reorders items relative to the DOM.
- Mix `responsive` with a fixed `cols` attribute; they target different layout modes.
