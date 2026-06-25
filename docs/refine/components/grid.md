# Grid

A flexible CSS Grid layout component with element-width responsive columns, named grid areas, and fine-grained item placement. Perfect for dashboards, card grids, photo galleries, and complex page layouts.

## Column Layouts

### Fixed Columns

Create grids with a fixed number of columns from 1 to 12.

<ComponentPreview center vertical>

```html
<ore-grid cols="3" gap="md" style="width: 100%;">
  <ore-card padding="md"><ore-text>Item 1</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 2</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 3</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 4</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 5</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 6</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

### Responsive Columns with Breakpoints

Use `cols-sm`, `cols-md`, `cols-lg`, `cols-xl`, and `cols-2xl` attributes for explicit responsive control.

<ComponentPreview center vertical>

```html
<ore-grid cols="1" cols-sm="2" cols-md="3" cols-lg="4" gap="md" style="width: 100%;">
  <ore-card padding="md" color="primary"><ore-text>1</ore-text></ore-card>
  <ore-card padding="md" color="secondary"><ore-text>2</ore-text></ore-card>
  <ore-card padding="md" color="success"><ore-text>3</ore-text></ore-card>
  <ore-card padding="md" color="warning"><ore-text>4</ore-text></ore-card>
  <ore-card padding="md" color="error"><ore-text>5</ore-text></ore-card>
  <ore-card padding="md" color="info"><ore-text>6</ore-text></ore-card>
  <ore-card padding="md"><ore-text>7</ore-text></ore-card>
  <ore-card padding="md"><ore-text>8</ore-text></ore-card>
</ore-grid>
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
<ore-grid cols="3" rows="2" gap="md" style="width: 100%;">
  <ore-card padding="md"><ore-text>1</ore-text></ore-card>
  <ore-card padding="md"><ore-text>2</ore-text></ore-card>
  <ore-card padding="md"><ore-text>3</ore-text></ore-card>
  <ore-card padding="md"><ore-text>4</ore-text></ore-card>
  <ore-card padding="md"><ore-text>5</ore-text></ore-card>
  <ore-card padding="md"><ore-text>6</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

## Gap Sizes

Control spacing between grid items.

<ComponentPreview center vertical>

```html
<ore-text size="sm">Gap: none</ore-text>
<ore-grid cols="3" gap="none" style="width: 100%;">
  <ore-card padding="sm"><ore-text>1</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>2</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>3</ore-text></ore-card>
</ore-grid>

<ore-text size="sm">Gap: sm</ore-text>
<ore-grid cols="3" gap="sm" style="width: 100%;">
  <ore-card padding="sm"><ore-text>1</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>2</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>3</ore-text></ore-card>
</ore-grid>

<ore-text size="sm">Gap: md</ore-text>
<ore-grid cols="3" gap="md" style="width: 100%;">
  <ore-card padding="sm"><ore-text>1</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>2</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>3</ore-text></ore-card>
</ore-grid>

<ore-text size="sm">Gap: xl</ore-text>
<ore-grid cols="3" gap="xl" style="width: 100%;">
  <ore-card padding="sm"><ore-text>1</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>2</ore-text></ore-card>
  <ore-card padding="sm"><ore-text>3</ore-text></ore-card>
</ore-grid>
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
<ore-grid cols="3" rows="2" flow="row" gap="md" style="width: 100%;">
  <ore-card padding="md" color="primary"><ore-text>1</ore-text></ore-card>
  <ore-card padding="md" color="secondary"><ore-text>2</ore-text></ore-card>
  <ore-card padding="md" color="success"><ore-text>3</ore-text></ore-card>
  <ore-card padding="md" color="warning"><ore-text>4</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

### Column Flow

<ComponentPreview center vertical>

```html
<ore-grid cols="3" rows="2" flow="column" gap="md" style="width: 100%;">
  <ore-card padding="md" color="primary"><ore-text>1</ore-text></ore-card>
  <ore-card padding="md" color="secondary"><ore-text>2</ore-text></ore-card>
  <ore-card padding="md" color="success"><ore-text>3</ore-text></ore-card>
  <ore-card padding="md" color="warning"><ore-text>4</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

### Dense Packing

Automatically fill gaps with smaller items that come later. Avoid `flow="row-dense"` or `flow="column-dense"` when reading order matters — items may appear in a different visual order than they exist in the DOM, which can confuse screen reader users and keyboard navigators.

<ComponentPreview center vertical>

```html
<ore-grid cols="5" flow="row-dense" gap="md" style="width: 100%;">
  <ore-grid-item col-span="3">
    <ore-card padding="lg" color="primary"><ore-text>Wide (3 cols)</ore-text></ore-card>
  </ore-grid-item>
  <ore-card padding="md"><ore-text>A</ore-text></ore-card>
  <ore-grid-item col-span="3">
    <ore-card padding="lg" color="secondary"><ore-text>Wide (3 cols)</ore-text></ore-card>
  </ore-grid-item>
  <ore-card padding="md" color="success"><ore-text>B</ore-text></ore-card>
  <ore-card padding="md" color="warning"><ore-text>C</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

::: tip Dense Packing
With `flow="row-dense"`, item B fills the gap after the first wide item, rather than leaving it empty. This creates a more compact layout but may change visual order.
:::

::: warning Dense Packing & Accessibility
When using `flow="row-dense"` or `flow="column-dense"`, items may appear in a different visual order than they exist in the DOM. This can confuse screen reader users and keyboard navigators. Use dense packing only when layout aesthetics outweigh reading order, or restore meaningful order with `tabindex`.
:::

## Alignment

### Vertical Alignment (align-items)

<ComponentPreview center vertical>

```html
<ore-grid cols="3" align="center" gap="md" style="width: 100%; height: 200px;">
  <ore-card padding="sm"><ore-text>Short</ore-text></ore-card>
  <ore-card padding="lg"
    ><ore-text>Tall Item<br />Multiple<br />Lines</ore-text></ore-card
  >
  <ore-card padding="sm"><ore-text>Short</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

### Horizontal Alignment (justify-items)

<ComponentPreview center vertical>

```html
<ore-grid cols="3" justify="center" gap="md" style="width: 100%;">
  <ore-card padding="md" style="width: 80px;"><ore-text>1</ore-text></ore-card>
  <ore-card padding="md" style="width: 80px;"><ore-text>2</ore-text></ore-card>
  <ore-card padding="md" style="width: 80px;"><ore-text>3</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

## Grid Items

Use `ore-grid-item` for precise placement and span control within a `ore-grid`.

### Named Area Placement

When your grid uses `areas`, assign children with the `area` attribute instead of inline CSS. This keeps shell and dashboard layouts declarative.

<ComponentPreview center vertical>

```html
<ore-grid
  cols="3"
  rows="3"
  areas="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <ore-grid-item area="header">
    <ore-box padding="md" color="primary"><ore-text>Header</ore-text></ore-box>
  </ore-grid-item>
  <ore-grid-item area="nav">
    <ore-box padding="md" color="secondary"><ore-text>Nav</ore-text></ore-box>
  </ore-grid-item>
  <ore-grid-item area="main">
    <ore-box padding="md" color="success"><ore-text>Main</ore-text></ore-box>
  </ore-grid-item>
  <ore-grid-item area="footer">
    <ore-box padding="md" color="warning"><ore-text>Footer</ore-text></ore-box>
  </ore-grid-item>
</ore-grid>
```

</ComponentPreview>

### Column and Row Spans

`col-span` and `row-span` cover the common case of stretching an item across multiple tracks. Use `"full"` to span all columns or rows.

<ComponentPreview center vertical>

```html
<ore-grid cols="6" gap="md" style="width: 100%;">
  <ore-grid-item col-span="2">
    <ore-card padding="md" color="primary"><ore-text>Spans 2</ore-text></ore-card>
  </ore-grid-item>
  <ore-grid-item col-span="4">
    <ore-card padding="md" color="secondary"><ore-text>Spans 4</ore-text></ore-card>
  </ore-grid-item>
  <ore-grid-item col-span="3">
    <ore-card padding="md" color="success"><ore-text>Spans 3</ore-text></ore-card>
  </ore-grid-item>
  <ore-grid-item col-span="3">
    <ore-card padding="md" color="warning"><ore-text>Spans 3</ore-text></ore-card>
  </ore-grid-item>
  <ore-grid-item col-span="full">
    <ore-card padding="md" color="info"><ore-text>Full width</ore-text></ore-card>
  </ore-grid-item>
</ore-grid>
```

</ComponentPreview>

### Explicit Placement

Use the `col` and `row` attributes to set raw CSS `grid-column` / `grid-row` values. This accepts any valid CSS shorthand: `"2 / 5"`, `"span 3"`, `"1 / -1"`, etc.

<ComponentPreview center vertical>

```html
<ore-grid cols="4" rows="3" gap="md" style="width: 100%;">
  <ore-grid-item col="1 / 3" row="1 / 3">
    <ore-card padding="lg" color="primary"
      ><ore-text>2×2 item<br />(col 1–2, row 1–2)</ore-text></ore-card
    >
  </ore-grid-item>
  <ore-card padding="md"><ore-text>A</ore-text></ore-card>
  <ore-card padding="md"><ore-text>B</ore-text></ore-card>
  <ore-card padding="md"><ore-text>C</ore-text></ore-card>
  <ore-card padding="md"><ore-text>D</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

### Item Alignment

Use `align` and `justify` on `ore-grid-item` to override the grid's default alignment for a single cell.

<ComponentPreview center vertical>

```html
<ore-grid cols="3" gap="md" style="width: 100%; height: 160px;">
  <ore-grid-item align="start" justify="start">
    <ore-card padding="sm" style="width: 80px;"><ore-text>start</ore-text></ore-card>
  </ore-grid-item>
  <ore-grid-item align="center" justify="center">
    <ore-card padding="sm" style="width: 80px;"><ore-text>center</ore-text></ore-card>
  </ore-grid-item>
  <ore-grid-item align="end" justify="end">
    <ore-card padding="sm" style="width: 80px;"><ore-text>end</ore-text></ore-card>
  </ore-grid-item>
</ore-grid>
```

</ComponentPreview>

## Named Grid Areas

Use `areas` (and its breakpoint variants `areas-sm`, `areas-md`, `areas-lg`, `areas-xl`, `areas-2xl`) to define named regions on the grid. The active value is resolved from the element's own width via `ResizeObserver`, identical to how `cols-*` breakpoints work. Children can be placed into regions with `area="name"` on `ore-grid-item`.

### Basic Areas

<ComponentPreview center vertical>

```html
<ore-grid
  cols="3"
  rows="3"
  areas="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <ore-box padding="md" color="primary" style="grid-area: header;">
    <ore-text variant="heading" size="md">Header</ore-text>
  </ore-box>
  <ore-box padding="md" color="warning" style="grid-area: nav;">
    <ore-text variant="heading" size="md">Nav</ore-text>
  </ore-box>
  <ore-box padding="md" style="grid-area: main;">
    <ore-text variant="heading" size="md">Main</ore-text>
  </ore-box>
  <ore-box padding="md" color="secondary" style="grid-area: footer;">
    <ore-text variant="heading" size="md">Footer</ore-text>
  </ore-box>
</ore-grid>
```

</ComponentPreview>

### Responsive Areas

Provide different area templates at each breakpoint. The grid switches between them as the element resizes — a single-column stack on small widths, full page layout on larger ones.

<ComponentPreview center vertical>

```html
<ore-grid
  cols-sm="3"
  areas="'header' 'nav' 'main' 'footer'"
  areas-sm="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <ore-grid-item area="header">
    <ore-box padding="md" color="primary">
      <ore-text variant="heading" size="md">Header</ore-text>
    </ore-box>
  </ore-grid-item>
  <ore-grid-item area="nav">
    <ore-box padding="md" color="warning">
      <ore-text variant="heading" size="md">Navigation</ore-text>
    </ore-box>
  </ore-grid-item>
  <ore-grid-item area="main">
    <ore-box padding="md" color="success">
      <ore-text variant="heading" size="md">Main content</ore-text>
    </ore-box>
  </ore-grid-item>
  <ore-grid-item area="footer">
    <ore-box padding="md" color="secondary">
      <ore-text variant="heading" size="md">Footer</ore-text>
    </ore-box>
  </ore-grid-item>
  </ore-box>
</ore-grid>
```

</ComponentPreview>

## Responsive Auto-fit Mode

Use `responsive` to let the grid fit as many columns as possible based on a minimum column width. Set `min-col-width` to control the threshold (default: `250px`). Do not mix `responsive` with a fixed `cols` attribute; they target different layout modes.

<ComponentPreview center vertical>

```html
<ore-grid responsive min-col-width="180px" gap="md" style="width: 100%;">
  <ore-card padding="md"><ore-text>Item 1</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 2</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 3</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 4</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 5</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 6</ore-text></ore-card>
</ore-grid>
```

</ComponentPreview>

::: tip Auto-fit vs Fixed Columns
Use `responsive` for fluid layouts where column count depends on available space. Use `cols` with optional breakpoint attributes (`cols-sm`, `cols-md`, etc.) for explicit control.
:::

## API Reference

**`ore-grid`**

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

**`ore-grid-item`**

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
<ore-grid cols="1" cols-md="2" cols-lg="4" gap="lg" style="width: 100%;">
  <ore-card padding="lg" elevation="2">
    <ore-text variant="heading" size="lg">128</ore-text>
    <ore-text size="sm" color="muted">Total Users</ore-text>
  </ore-card>
  <ore-card padding="lg" elevation="2">
    <ore-text variant="heading" size="lg">$12,345</ore-text>
    <ore-text size="sm" color="muted">Revenue</ore-text>
  </ore-card>
  <ore-card padding="lg" elevation="2">
    <ore-text variant="heading" size="lg">89%</ore-text>
    <ore-text size="sm" color="muted">Satisfaction</ore-text>
  </ore-card>
  <ore-card padding="lg" elevation="2">
    <ore-text variant="heading" size="lg">1,432</ore-text>
    <ore-text size="sm" color="muted">Sales</ore-text>
  </ore-card>
</ore-grid>
```

</ComponentPreview>

### Asymmetric Layout

<ComponentPreview center vertical>

```html
<ore-grid cols="4" gap="md" style="width: 100%;">
  <ore-grid-item col-span="3">
    <ore-card padding="lg" color="primary">
      <ore-text variant="heading" size="lg">Featured Content</ore-text>
      <ore-text>This is the main featured area.</ore-text>
    </ore-card>
  </ore-grid-item>
  <ore-card padding="md" color="secondary">
    <ore-text variant="heading" size="md"><ore-icon name="sparkles" size="16"></ore-icon> Side</ore-text></ore-card
  >
  <ore-card padding="md"><ore-text>Item 2</ore-text></ore-card>
  <ore-card padding="md"><ore-text>Item 3</ore-text></ore-card>
  <ore-grid-item col-span="2">
    <ore-card padding="md"><ore-text>Spans 2</ore-text></ore-card>
  </ore-grid-item>
</ore-grid>
```

</ComponentPreview>

### Bento-style Layout with Named Areas

<ComponentPreview center vertical>

```html
<ore-grid
  cols="4"
  rows="3"
  areas="'hero hero hero side' 'hero hero hero side' 'a b c d'"
  gap="md"
  style="width: 100%; min-height: 400px;">
  <ore-box padding="xl" color="primary" style="grid-area: hero;">
    <ore-text variant="heading" size="lg"><ore-icon name="crosshair" size="16"></ore-icon> Main Feature</ore-text>
    <ore-text>Large hero section for your most important content.</ore-text>
  </ore-box>
  <ore-box padding="lg" color="secondary" style="grid-area: side;">
    <ore-text variant="heading" size="md"><ore-icon name="sparkles" size="16"></ore-icon> Side</ore-text>
  </ore-box>
  <ore-box padding="md" style="grid-area: a;"><ore-text variant="heading" size="md">A</ore-text></ore-box>
  <ore-box padding="md" style="grid-area: b;"><ore-text variant="heading" size="md">B</ore-text></ore-box>
  <ore-box padding="md" style="grid-area: c;"><ore-text variant="heading" size="md">C</ore-text></ore-box>
  <ore-box padding="md" style="grid-area: d;"><ore-text variant="heading" size="md">D</ore-text></ore-box>
</ore-grid>
```

</ComponentPreview>

## Accessibility

The grid component follows WAI-ARIA best practices. It maintains semantic HTML structure and document reading order by default — grid layout is purely visual, and keyboard navigation follows DOM order. The component is compatible with screen readers.

Be mindful of visual vs. DOM order when using `flow="dense"` or explicit item placement. When using dense packing modes, items may appear in a different visual order than their DOM position, which can confuse screen reader users and keyboard navigators.
