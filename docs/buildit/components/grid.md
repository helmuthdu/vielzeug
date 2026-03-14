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
- 🎨 **Grid Item Component**: Precise placement with `bit-grid-item` using spans or raw CSS grid shorthand
- 🔧 **Customizable**: CSS custom properties available as fallbacks

## Source Code

::: details View Source Code (Grid)
<<< @/../packages/buildit/src/layout/grid/grid.ts
:::

::: details View Source Code (Grid Item)
<<< @/../packages/buildit/src/layout/grid-item/grid-item.ts
:::

## Basic Usage

```html
<bit-grid cols="3" gap="md">
  <bit-card>Item 1</bit-card>
  <bit-card>Item 2</bit-card>
  <bit-card>Item 3</bit-card>
</bit-grid>

<script type="module">
  import '@vielzeug/buildit/grid';
  import '@vielzeug/buildit/card';
</script>
```

## Column Layouts

### Fixed Columns

Create grids with a fixed number of columns from 1 to 12.

<ComponentPreview center vertical>

```html
<bit-grid cols="3" gap="md" style="width: 100%;">
  <bit-card padding="md"><bit-text>Item 1</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 2</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 3</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 4</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 5</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 6</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

### Responsive Columns with Breakpoints

Use `cols-sm`, `cols-md`, `cols-lg`, `cols-xl`, and `cols-2xl` attributes for explicit responsive control.

<ComponentPreview center vertical>

```html
<bit-grid cols="1" cols-sm="2" cols-md="3" cols-lg="4" gap="md" style="width: 100%;">
  <bit-card padding="md" color="primary"><bit-text>1</bit-text></bit-card>
  <bit-card padding="md" color="secondary"><bit-text>2</bit-text></bit-card>
  <bit-card padding="md" color="success"><bit-text>3</bit-text></bit-card>
  <bit-card padding="md" color="warning"><bit-text>4</bit-text></bit-card>
  <bit-card padding="md" color="error"><bit-text>5</bit-text></bit-card>
  <bit-card padding="md" color="info"><bit-text>6</bit-text></bit-card>
  <bit-card padding="md"><bit-text>7</bit-text></bit-card>
  <bit-card padding="md"><bit-text>8</bit-text></bit-card>
</bit-grid>
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
<bit-grid cols="3" rows="2" gap="md" style="width: 100%;">
  <bit-card padding="md"><bit-text>1</bit-text></bit-card>
  <bit-card padding="md"><bit-text>2</bit-text></bit-card>
  <bit-card padding="md"><bit-text>3</bit-text></bit-card>
  <bit-card padding="md"><bit-text>4</bit-text></bit-card>
  <bit-card padding="md"><bit-text>5</bit-text></bit-card>
  <bit-card padding="md"><bit-text>6</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

## Gap Sizes

Control spacing between grid items.

<ComponentPreview center vertical>

```html
<bit-text size="sm">Gap: none</bit-text>
<bit-grid cols="3" gap="none" style="width: 100%;">
  <bit-card padding="sm"><bit-text>1</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>2</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>3</bit-text></bit-card>
</bit-grid>

<bit-text size="sm">Gap: sm</bit-text>
<bit-grid cols="3" gap="sm" style="width: 100%;">
  <bit-card padding="sm"><bit-text>1</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>2</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>3</bit-text></bit-card>
</bit-grid>

<bit-text size="sm">Gap: md</bit-text>
<bit-grid cols="3" gap="md" style="width: 100%;">
  <bit-card padding="sm"><bit-text>1</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>2</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>3</bit-text></bit-card>
</bit-grid>

<bit-text size="sm">Gap: xl</bit-text>
<bit-grid cols="3" gap="xl" style="width: 100%;">
  <bit-card padding="sm"><bit-text>1</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>2</bit-text></bit-card>
  <bit-card padding="sm"><bit-text>3</bit-text></bit-card>
</bit-grid>
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
<bit-grid cols="3" rows="2" flow="row" gap="md" style="width: 100%;">
  <bit-card padding="md" color="primary"><bit-text>1</bit-text></bit-card>
  <bit-card padding="md" color="secondary"><bit-text>2</bit-text></bit-card>
  <bit-card padding="md" color="success"><bit-text>3</bit-text></bit-card>
  <bit-card padding="md" color="warning"><bit-text>4</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

### Column Flow

<ComponentPreview center vertical>

```html
<bit-grid cols="3" rows="2" flow="column" gap="md" style="width: 100%;">
  <bit-card padding="md" color="primary"><bit-text>1</bit-text></bit-card>
  <bit-card padding="md" color="secondary"><bit-text>2</bit-text></bit-card>
  <bit-card padding="md" color="success"><bit-text>3</bit-text></bit-card>
  <bit-card padding="md" color="warning"><bit-text>4</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

### Dense Packing

Automatically fill gaps with smaller items that come later.

<ComponentPreview center vertical>

```html
<bit-grid cols="5" flow="row-dense" gap="md" style="width: 100%;">
  <bit-grid-item col-span="3">
    <bit-card padding="lg" color="primary"><bit-text>Wide (3 cols)</bit-text></bit-card>
  </bit-grid-item>
  <bit-card padding="md"><bit-text>A</bit-text></bit-card>
  <bit-grid-item col-span="3">
    <bit-card padding="lg" color="secondary"><bit-text>Wide (3 cols)</bit-text></bit-card>
  </bit-grid-item>
  <bit-card padding="md" color="success"><bit-text>B</bit-text></bit-card>
  <bit-card padding="md" color="warning"><bit-text>C</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

::: tip Dense Packing
With `flow="row-dense"`, item B fills the gap after the first wide item, rather than leaving it empty. This creates a more compact layout but may change visual order.
:::

## Alignment

### Vertical Alignment (align-items)

<ComponentPreview center vertical>

```html
<bit-grid cols="3" align="center" gap="md" style="width: 100%; height: 200px;">
  <bit-card padding="sm"><bit-text>Short</bit-text></bit-card>
  <bit-card padding="lg"
    ><bit-text>Tall Item<br />Multiple<br />Lines</bit-text></bit-card
  >
  <bit-card padding="sm"><bit-text>Short</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

### Horizontal Alignment (justify-items)

<ComponentPreview center vertical>

```html
<bit-grid cols="3" justify="center" gap="md" style="width: 100%;">
  <bit-card padding="md" style="width: 80px;"><bit-text>1</bit-text></bit-card>
  <bit-card padding="md" style="width: 80px;"><bit-text>2</bit-text></bit-card>
  <bit-card padding="md" style="width: 80px;"><bit-text>3</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

## Grid Items

Use `bit-grid-item` for precise placement and span control within a `bit-grid`.

### Column and Row Spans

`col-span` and `row-span` cover the common case of stretching an item across multiple tracks. Use `"full"` to span all columns or rows.

<ComponentPreview center vertical>

```html
<bit-grid cols="6" gap="md" style="width: 100%;">
  <bit-grid-item col-span="2">
    <bit-card padding="md" color="primary"><bit-text>Spans 2</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item col-span="4">
    <bit-card padding="md" color="secondary"><bit-text>Spans 4</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item col-span="3">
    <bit-card padding="md" color="success"><bit-text>Spans 3</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item col-span="3">
    <bit-card padding="md" color="warning"><bit-text>Spans 3</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item col-span="full">
    <bit-card padding="md" color="info"><bit-text>Full width</bit-text></bit-card>
  </bit-grid-item>
</bit-grid>
```

</ComponentPreview>

### Explicit Placement

Use the `col` and `row` attributes to set raw CSS `grid-column` / `grid-row` values. This accepts any valid CSS shorthand: `"2 / 5"`, `"span 3"`, `"1 / -1"`, etc.

<ComponentPreview center vertical>

```html
<bit-grid cols="4" rows="3" gap="md" style="width: 100%;">
  <bit-grid-item col="1 / 3" row="1 / 3">
    <bit-card padding="lg" color="primary"
      ><bit-text>2×2 item<br />(col 1–2, row 1–2)</bit-text></bit-card
    >
  </bit-grid-item>
  <bit-card padding="md"><bit-text>A</bit-text></bit-card>
  <bit-card padding="md"><bit-text>B</bit-text></bit-card>
  <bit-card padding="md"><bit-text>C</bit-text></bit-card>
  <bit-card padding="md"><bit-text>D</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

### Item Alignment

Use `align` and `justify` on `bit-grid-item` to override the grid's default alignment for a single cell.

<ComponentPreview center vertical>

```html
<bit-grid cols="3" gap="md" style="width: 100%; height: 160px;">
  <bit-grid-item align="start" justify="start">
    <bit-card padding="sm" style="width: 80px;"><bit-text>start</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item align="center" justify="center">
    <bit-card padding="sm" style="width: 80px;"><bit-text>center</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item align="end" justify="end">
    <bit-card padding="sm" style="width: 80px;"><bit-text>end</bit-text></bit-card>
  </bit-grid-item>
</bit-grid>
```

</ComponentPreview>

## Named Grid Areas

Use `areas` (and its breakpoint variants `areas-sm`, `areas-md`, `areas-lg`, `areas-xl`, `areas-2xl`) to define named regions on the grid. The active value is resolved from the element's own width via `ResizeObserver`, identical to how `cols-*` breakpoints work. Children can be placed into regions with `style="grid-area: name"` or via the `col` / `row` attrs on `bit-grid-item`.

### Basic Areas

<ComponentPreview center vertical>

```html
<bit-grid
  cols="3"
  rows="3"
  areas="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <bit-box padding="md" color="primary" style="grid-area: header;">
    <bit-text variant="heading" size="md">Header</bit-text>
  </bit-box>
  <bit-box padding="md" color="warning" style="grid-area: nav;">
    <bit-text variant="heading" size="md">Nav</bit-text>
  </bit-box>
  <bit-box padding="md" style="grid-area: main;">
    <bit-text variant="heading" size="md">Main</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary" style="grid-area: footer;">
    <bit-text variant="heading" size="md">Footer</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

### Responsive Areas

Provide different area templates at each breakpoint. The grid switches between them as the element resizes — a single-column stack on small widths, full page layout on larger ones.

<ComponentPreview center vertical>

```html
<bit-grid
  cols="1"
  cols-md="3"
  areas="'header' 'nav' 'main' 'footer'"
  areas-md="'header header header' 'nav main main' 'footer footer footer'"
  gap="md"
  style="width: 100%; min-height: 300px;">
  <bit-box padding="md" color="primary" style="grid-area: header;">
    <bit-text variant="heading" size="md">Header</bit-text>
  </bit-box>
  <bit-box padding="md" color="warning" style="grid-area: nav;">
    <bit-text variant="heading" size="md">Nav</bit-text>
  </bit-box>
  <bit-box padding="md" style="grid-area: main;">
    <bit-text variant="heading" size="md">Main</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary" style="grid-area: footer;">
    <bit-text variant="heading" size="md">Footer</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

## Responsive Auto-fit Mode

Use `responsive` to let the grid fit as many columns as possible based on a minimum column width. Set `min-col-width` to control the threshold (default: `250px`).

<ComponentPreview center vertical>

```html
<bit-grid responsive min-col-width="180px" gap="md" style="width: 100%;">
  <bit-card padding="md"><bit-text>Item 1</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 2</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 3</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 4</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 5</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 6</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

::: tip Auto-fit vs Fixed Columns
Use `responsive` for fluid layouts where column count depends on available space. Use `cols` with optional breakpoint attributes (`cols-sm`, `cols-md`, etc.) for explicit control.
:::

## Guideline Recipe: Adapt a Responsive Dashboard

**Guideline: adapt** — using breakpoint column attributes makes the same markup reflow from a single-column mobile view to a rich multi-column desktop layout with no JavaScript.

```html
<bit-grid cols="1" cols-md="2" cols-lg="3" gap="md">
  <bit-card variant="elevated">Visitors</bit-card>
  <bit-card variant="elevated">Signups</bit-card>
  <bit-card variant="elevated">Revenue</bit-card>
  <bit-card variant="elevated" colspan="1" colspan-lg="2">Conversion funnel</bit-card>
  <bit-card variant="elevated">Churn rate</bit-card>
</bit-grid>
```

**Tip:** Use `colspan` attributes on individual `bit-grid-item` children to let key metrics span more columns at larger breakpoints.

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
<bit-grid cols="1" cols-md="2" cols-lg="4" gap="lg" style="width: 100%;">
  <bit-card padding="lg" elevation="2">
    <bit-text variant="heading" size="lg">128</bit-text>
    <bit-text size="sm" color="muted">Total Users</bit-text>
  </bit-card>
  <bit-card padding="lg" elevation="2">
    <bit-text variant="heading" size="lg">$12,345</bit-text>
    <bit-text size="sm" color="muted">Revenue</bit-text>
  </bit-card>
  <bit-card padding="lg" elevation="2">
    <bit-text variant="heading" size="lg">89%</bit-text>
    <bit-text size="sm" color="muted">Satisfaction</bit-text>
  </bit-card>
  <bit-card padding="lg" elevation="2">
    <bit-text variant="heading" size="lg">1,432</bit-text>
    <bit-text size="sm" color="muted">Sales</bit-text>
  </bit-card>
</bit-grid>
```

</ComponentPreview>

### Asymmetric Layout

<ComponentPreview center vertical>

```html
<bit-grid cols="4" gap="md" style="width: 100%;">
  <bit-grid-item col-span="3">
    <bit-card padding="lg" color="primary">
      <bit-text variant="heading" size="lg">Featured Content</bit-text>
      <bit-text>This is the main featured area.</bit-text>
    </bit-card>
  </bit-grid-item>
  <bit-card padding="md"><bit-text>Side 1</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 2</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 3</bit-text></bit-card>
  <bit-grid-item col-span="2">
    <bit-card padding="md" color="secondary"><bit-text>Spans 2</bit-text></bit-card>
  </bit-grid-item>
</bit-grid>
```

</ComponentPreview>

### Bento-style Layout with Named Areas

<ComponentPreview center vertical>

```html
<bit-grid
  cols="4"
  rows="3"
  areas="'hero hero hero side' 'hero hero hero side' 'a b c d'"
  gap="md"
  style="width: 100%; min-height: 400px;">
  <bit-box padding="xl" color="primary" style="grid-area: hero;">
    <bit-text variant="heading" size="2xl">🎯 Main Feature</bit-text>
    <bit-text>Large hero section for your most important content.</bit-text>
  </bit-box>
  <bit-box padding="lg" color="secondary" style="grid-area: side;">
    <bit-text variant="heading" size="lg">✨ Side</bit-text>
  </bit-box>
  <bit-box padding="md" style="grid-area: a;"><bit-text variant="heading" size="md">A</bit-text></bit-box>
  <bit-box padding="md" style="grid-area: b;"><bit-text variant="heading" size="md">B</bit-text></bit-box>
  <bit-box padding="md" style="grid-area: c;"><bit-text variant="heading" size="md">C</bit-text></bit-box>
  <bit-box padding="md" style="grid-area: d;"><bit-text variant="heading" size="md">D</bit-text></bit-box>
</bit-grid>
```

</ComponentPreview>

## Accessibility

The grid component follows WAI-ARIA best practices.

### `bit-grid`

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
- Use `bit-grid-item` with `col-span` for featured items that need to span multiple columns.
- Use `areas` with named regions for complex or asymmetric page layouts.

**Don't:**

- Use `flow="dense"` when reading order matters — it visually reorders items relative to the DOM.
- Mix `responsive` with a fixed `cols` attribute; they target different layout modes.
