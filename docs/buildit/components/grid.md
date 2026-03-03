# Grid Component

A flexible and powerful CSS Grid layout component with explicit responsive controls, layout presets, and fine-grained item placement. Perfect for creating dashboard layouts, card grids, photo galleries, and complex page structures with minimal code.

## Features

- 📐 **12-Column System**: Standard 1-12 column layouts plus auto-fit mode
- 📱 **Container Query Responsive**: Responds to container width, not viewport (works in previews, sidebars, modals)
- 🎯 **Explicit Breakpoint Control**: Control columns at sm, md, lg, and xl container widths
- 📏 **Row Support**: Define explicit row layouts for dashboard grids
- 🎯 **Layout Presets**: Sidebar, App-Shell, Nav-Drawer, and Bento layouts
- 🔄 **Flow Control**: Row, column, and dense packing modes
- 📏 **7 Gap Sizes**: From none to 2xl with separate row/column gap support
- 🎯 **Alignment Control**: Align and justify items with CSS Grid properties
- 🎨 **Grid Item Component**: Fine-grained control with `bit-grid-item` for spans and placement
- ♿ **Fully Accessible**: Maintains semantic structure and keyboard navigation
- 🔧 **Customizable**: CSS custom properties for complete control
- ⚡ **Zero JavaScript**: Pure CSS Grid implementation for maximum performance

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

Use `cols-sm`, `cols-md`, `cols-lg`, and `cols-xl` attributes for explicit responsive control.

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

The grid uses **CSS Container Queries** to respond to its container's width, not the browser viewport. This means it works perfectly in ComponentPreview, sidebars, modals, and any constrained space.

| Breakpoint  | Attribute     | Min Container Width | Example   |
| ----------- | ------------- | ------------------- | --------- |
| Mobile      | `cols="1"`    | Default             | 1 column  |
| Small       | `cols-sm="2"` | ≥640px              | 2 columns |
| Medium      | `cols-md="3"` | ≥768px              | 3 columns |
| Large       | `cols-lg="4"` | ≥1024px             | 4 columns |
| Extra Large | `cols-xl="6"` | ≥1280px             | 6 columns |

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

## Layout Presets

Pre-built layouts for common page structures.

### Sidebar Layout

250px fixed sidebar with flexible main content.

<ComponentPreview center vertical>

```html
<bit-grid layout="sidebar" gap="md" style="width: 100%; min-height: 300px;">
  <bit-box rounded="none" color="warning" elevation="0" padding="lg" as="aside">
    <bit-text variant="heading" size="md">Sidebar</bit-text>
  </bit-box>
  <bit-box rounded="none" elevation="0" padding="lg" as="main">
    <bit-text variant="heading" size="lg">Main Content</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

### Right Sidebar Layout

Main content first, sidebar on the right.

<ComponentPreview center vertical>

```html
<bit-grid layout="sidebar-right" gap="md" style="width: 100%; min-height: 300px;">
  <bit-box rounded="none" elevation="0" padding="lg" as="main">
    <bit-text variant="heading" size="lg">Main Content</bit-text>
  </bit-box>
  <bit-box rounded="none" color="warning" elevation="0" padding="lg" as="aside">
    <bit-text variant="heading" size="md">Sidebar</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

## App Shell Layout (Navigation Rail)

App shell with navigation rail on desktop. The rail spans the full height on the left, with the header and content offset to the right.

<ComponentPreview center>

```html
<bit-grid layout="app-shell" gap="none" style="width: 100%; height: 500px;">
  <bit-box
    rounded="none"
    elevation="0"
    color="warning"
    padding="lg"
    as="nav"
    style="display: flex; flex-direction: column; gap: var(--size-2); align-items: center;">
    <bit-text size="xl">🏠</bit-text>
    <bit-text size="xl">📊</bit-text>
    <bit-text size="xl">⚙️</bit-text>
  </bit-box>
  <bit-box rounded="none" elevation="0" color="error" padding="lg" as="header">
    <bit-text variant="heading" size="lg">App Title</bit-text>
  </bit-box>
  <bit-box rounded="none" elevation="0" padding="xl" as="main">
    <bit-text variant="heading" size="xl">Main Content Area</bit-text>
    <bit-text>On mobile, implement bottom navigation or modal drawer for access to nav items.</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

## Navigation Drawer Layout

Standard navigation drawer pattern with a full-width header and permanent side drawer. On mobile, the navigation stacks below the header as a scrollable section, keeping it accessible.

<ComponentPreview center>

```html
<bit-grid layout="nav-content" gap="none" style="width: 100%; height: 500px;">
  <bit-box rounded="none" elevation="0" color="warning" padding="lg" as="nav">
    <bit-text variant="heading" size="md">Navigation</bit-text>
    <bit-text size="sm">Dashboard</bit-text>
    <bit-text size="sm">Projects</bit-text>
    <bit-text size="sm">Team</bit-text>
    <bit-text size="sm">Reports</bit-text>
    <bit-text size="sm">Settings</bit-text>
  </bit-box>
  <bit-box rounded="none" elevation="0" color="error" padding="lg" as="header">
    <bit-text variant="heading" size="lg">App</bit-text>
  </bit-box>
  <bit-box rounded="none" elevation="0" padding="xl" as="main" style="overflow: auto;">
    <bit-text variant="heading" size="2xl">Dashboard</bit-text>
    <bit-text>Main content</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

### Bento Grid Layout

Asymmetric magazine-style layout perfect for showcasing content with varying importance. The bento grid creates a visually interesting layout with a large hero area and smaller feature cards.

<ComponentPreview center>

```html
<bit-grid layout="bento" gap="md" style="width: 100%; min-height: 500px;">
  <bit-box padding="lg" color="primary">
    <bit-text variant="heading" size="2xl">Hero</bit-text>
    <bit-text>Large featured content area</bit-text>
  </bit-box>
  <bit-box padding="lg" color="info">
    <bit-text variant="heading" size="lg">Featured</bit-text>
    <bit-text>Secondary feature</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary">
    <bit-text variant="heading" size="md">Card 1</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary">
    <bit-text variant="heading" size="md">Card 2</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary">
    <bit-text variant="heading" size="md">Card 3</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary">
    <bit-text variant="heading" size="md">Card 4</bit-text>
  </bit-box>
  <bit-box padding="lg" color="secondary">
    <bit-text variant="heading" size="lg">Card 5</bit-text>
  </bit-box>
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
  <bit-grid-item colSpan="3">
    <bit-card padding="lg" color="primary"><bit-text>Wide (3 cols)</bit-text></bit-card>
  </bit-grid-item>
  <bit-card padding="md"><bit-text>A</bit-text></bit-card>
  <bit-grid-item colSpan="3">
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

## Grid Items with Spans

Use `bit-grid-item` for precise control over item placement.

<ComponentPreview center vertical>

```html
<bit-grid cols="6" gap="md" style="width: 100%;">
  <bit-grid-item colSpan="2">
    <bit-card padding="md" color="primary"><bit-text>Spans 2</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item colSpan="4">
    <bit-card padding="md" color="secondary"><bit-text>Spans 4</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item colSpan="3">
    <bit-card padding="md" color="success"><bit-text>Spans 3</bit-text></bit-card>
  </bit-grid-item>
  <bit-grid-item colSpan="3">
    <bit-card padding="md" color="warning"><bit-text>Spans 3</bit-text></bit-card>
  </bit-grid-item>
</bit-grid>
```

</ComponentPreview>

### Explicit Placement

<ComponentPreview center vertical>

```html
<bit-grid cols="4" rows="3" gap="md" style="width: 100%;">
  <bit-grid-item colStart="1" colEnd="3" rowStart="1" rowEnd="3">
    <bit-card padding="lg" color="primary"
      ><bit-text>Large Item<br />2x2</bit-text></bit-card
    >
  </bit-grid-item>
  <bit-card padding="md"><bit-text>A</bit-text></bit-card>
  <bit-card padding="md"><bit-text>B</bit-text></bit-card>
  <bit-card padding="md"><bit-text>C</bit-text></bit-card>
  <bit-card padding="md"><bit-text>D</bit-text></bit-card>
</bit-grid>
```

</ComponentPreview>

## Responsive Auto-fit Mode

Let the grid automatically fit as many columns as possible.

<ComponentPreview center vertical>

```html
<bit-grid responsive gap="md" style="width: 100%; --grid-min-col-width: 200px;">
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
Use `responsive` for fluid layouts where column count depends on available space. Use `cols` with breakpoint attributes (`cols-sm`, `cols-md`, etc.) for explicit control.
:::

## API

### Grid Attributes

| Attribute    | Type                                                                      | Default  | Description          |
| ------------ | ------------------------------------------------------------------------- | -------- | -------------------- |
| `cols`       | `'1'-'12' \| 'auto'`                                                      | -        | Number of columns    |
| `cols-sm`    | `'1'-'12' \| 'auto'`                                                      | -        | Columns at ≥640px    |
| `cols-md`    | `'1'-'12' \| 'auto'`                                                      | -        | Columns at ≥768px    |
| `cols-lg`    | `'1'-'12' \| 'auto'`                                                      | -        | Columns at ≥1024px   |
| `cols-xl`    | `'1'-'12' \| 'auto'`                                                      | -        | Columns at ≥1280px   |
| `rows`       | `'1'-'6' \| 'auto'`                                                       | `'auto'` | Number of rows       |
| `gap`        | `'none' \| 'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'`                 | `'md'`   | Gap between items    |
| `align`      | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'`                 | -        | Vertical alignment   |
| `justify`    | `'start' \| 'center' \| 'end' \| 'stretch'`                               | -        | Horizontal alignment |
| `flow`       | `'row' \| 'column' \| 'row-dense' \| 'column-dense'`                      | `'row'`  | Grid auto flow       |
| `layout`     | `'sidebar' \| 'sidebar-right' \| 'app-shell' \| 'nav-content' \| 'bento'` | -        | Preset layout        |
| `responsive` | `boolean`                                                                 | `false`  | Enable auto-fit mode |

### Grid Item Attributes

| Attribute  | Type                                        | Default | Description               |
| ---------- | ------------------------------------------- | ------- | ------------------------- |
| `colSpan`  | `'1'-'12'`                                  | `'1'`   | Number of columns to span |
| `rowSpan`  | `'1'-'6'`                                   | `'1'`   | Number of rows to span    |
| `colStart` | `'1'-'13'`                                  | -       | Column start position     |
| `colEnd`   | `'1'-'13'`                                  | -       | Column end position       |
| `rowStart` | `'1'-'7'`                                   | -       | Row start position        |
| `rowEnd`   | `'1'-'7'`                                   | -       | Row end position          |
| `align`    | `'start' \| 'center' \| 'end' \| 'stretch'` | -       | Self vertical alignment   |
| `justify`  | `'start' \| 'center' \| 'end' \| 'stretch'` | -       | Self horizontal alignment |

### CSS Custom Properties

| Property               | Default           | Description                        |
| ---------------------- | ----------------- | ---------------------------------- |
| `--grid-cols`          | -                 | Custom column template             |
| `--grid-rows`          | -                 | Custom row template                |
| `--grid-gap`           | `var(--size-4)`   | Gap between items                  |
| `--grid-row-gap`       | `var(--grid-gap)` | Row gap specifically               |
| `--grid-col-gap`       | `var(--grid-gap)` | Column gap specifically            |
| `--grid-min-col-width` | `250px`           | Min column width (responsive mode) |
| `--grid-max-col-width` | `1fr`             | Max column width (responsive mode) |

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

### Bento Grid Showcase

<ComponentPreview center>

```html
<bit-grid layout="bento" gap="lg" style="width: 100%; min-height: 600px;">
  <bit-card padding="xl" color="primary" elevation="3">
    <bit-text variant="heading" size="3xl">🎯</bit-text>
    <bit-text variant="heading" size="xl">Main Feature</bit-text>
    <bit-text>Large hero section for your most important content</bit-text>
  </bit-card>
  <bit-card padding="lg" color="secondary" elevation="2">
    <bit-text variant="heading" size="lg">✨ Featured</bit-text>
    <bit-text>Secondary highlight</bit-text>
  </bit-card>
  <bit-card padding="md" elevation="1">
    <bit-text variant="heading" size="md">📊 Stats</bit-text>
  </bit-card>
  <bit-card padding="md" elevation="1">
    <bit-text variant="heading" size="md">📈 Growth</bit-text>
  </bit-card>
  <bit-card padding="md" color="success" elevation="1">
    <bit-text variant="heading" size="md">✅ Tasks</bit-text>
  </bit-card>
  <bit-card padding="md" color="warning" elevation="1">
    <bit-text variant="heading" size="md">⚡ Quick</bit-text>
  </bit-card>
  <bit-card padding="lg" color="info" elevation="2">
    <bit-text variant="heading" size="lg">🎨 Bottom Feature</bit-text>
    <bit-text>Wide area for additional content</bit-text>
  </bit-card>
</bit-grid>
```

</ComponentPreview>

### Asymmetric Layout

<ComponentPreview center vertical>

```html
<bit-grid cols="4" gap="md" style="width: 100%;">
  <bit-grid-item colSpan="3">
    <bit-card padding="lg" color="primary">
      <bit-text variant="heading" size="lg">Featured Content</bit-text>
      <bit-text>This is the main featured area.</bit-text>
    </bit-card>
  </bit-grid-item>
  <bit-card padding="md"><bit-text>Side 1</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 2</bit-text></bit-card>
  <bit-card padding="md"><bit-text>Item 3</bit-text></bit-card>
  <bit-grid-item colSpan="2">
    <bit-card padding="md" color="secondary"><bit-text>Spans 2</bit-text></bit-card>
  </bit-grid-item>
</bit-grid>
```

</ComponentPreview>

## Accessibility

- ✅ Maintains semantic HTML structure
- ✅ Preserves document reading order by default
- ✅ Works with keyboard navigation
- ✅ Compatible with screen readers
- ⚠️ Be mindful of visual vs. DOM order when using `flow="dense"` or explicit placement

::: warning Dense Packing & Accessibility
When using `flow="row-dense"` or `flow="column-dense"`, items may appear in a different visual order than they exist in the DOM. This can confuse screen reader users and keyboard navigators. Use dense packing only when layout is more important than reading order, or ensure meaningful tab order with `tabindex`.
:::

## Related Components

- [Card](/buildit/components/card) - Perfect for grid items
- [Grid Item](/buildit/components/grid-item) - Fine-grained item control
- [Button Group](/buildit/components/button-group) - Group actions in grid cells
- [Text](/buildit/components/text) - Typography for grid content
