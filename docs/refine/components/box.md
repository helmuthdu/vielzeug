# Box

A foundational layout primitive with theming support. Box provides a simple, semantic container with color, elevation, and padding options — the perfect building block for layouts and compositions.

## Variants

Four variants cover the full range from solid to translucent.

- **Default** (no `variant`) — Canvas background with border and subtle shadow. Picks up `color` as a tinted backdrop.
- **`flat`** — Same as default but with no shadow; low visual weight.
- **`glass`** — Glassmorphism with backdrop blur, saturated colors, and brightness boost.
- **`frost`** — Frosted glass with stronger blur and color-tinted transparency.

<ComponentPreview>

```html
<ore-box>
  <ore-text>Default</ore-text>
</ore-box>

<ore-box variant="flat" color="primary">
  <ore-text>Flat</ore-text>
</ore-box>
```

</ComponentPreview>

### Glass & Frost

Translucent effects with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost look best over colorful backgrounds or images to make the blur and transparency visible.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<ore-box variant="glass" fullwidth>
  <ore-text variant="heading" size="md">Glass Effect</ore-text>
  <ore-text>Vibrant glass with saturated colors and brightness boost</ore-text>
</ore-box>
<ore-box variant="frost" fullwidth>
  <ore-text variant="heading" size="md">Frost Effect</ore-text>
  <ore-text>Frosted glass with muted tones and stronger blur</ore-text>
</ore-box>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts. Hover state is included for `solid` and `flat` when a color is set. Combine `color` and `elevation` to create visual hierarchy without custom CSS. Note that `color` alone does not convey meaning — box is a container, not a status indicator.

<ComponentPreview>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <ore-box>Default</ore-box>
  <ore-box color="primary">Primary</ore-box>
  <ore-box color="secondary">Secondary</ore-box>
  <ore-box color="info">Info</ore-box>
  <ore-box color="success">Success</ore-box>
  <ore-box color="warning">Warning</ore-box>
  <ore-box color="error">Error</ore-box>
</ore-grid>
```

</ComponentPreview>

## Elevation

Control shadow depth with elevation levels from 0 to 5. Elevation changes are purely visual and do not affect accessibility.

<ComponentPreview>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <ore-box elevation="0" color="primary">
    <ore-text size="sm">Elevation 0</ore-text>
  </ore-box>
  <ore-box elevation="1" color="primary">
    <ore-text size="sm">Elevation 1</ore-text>
  </ore-box>
  <ore-box elevation="2" color="primary">
    <ore-text size="sm">Elevation 2</ore-text>
  </ore-box>
  <ore-box elevation="3" color="primary">
    <ore-text size="sm">Elevation 3</ore-text>
  </ore-box>
  <ore-box elevation="4" color="primary">
    <ore-text size="sm">Elevation 4</ore-text>
  </ore-box>
  <ore-box elevation="5" color="primary">
    <ore-text size="sm">Elevation 5</ore-text>
  </ore-box>
</ore-grid>
```

</ComponentPreview>

## Padding

Choose from five padding sizes.

<ComponentPreview>

```html
<ore-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <ore-box padding="none" color="secondary" elevation="1">
    <ore-text size="sm">No padding</ore-text>
  </ore-box>
  <ore-box padding="sm" color="secondary" elevation="1">
    <ore-text size="sm">Small</ore-text>
  </ore-box>
  <ore-box padding="md" color="secondary" elevation="1">
    <ore-text size="sm">Medium (default)</ore-text>
  </ore-box>
  <ore-box padding="lg" color="secondary" elevation="1">
    <ore-text size="sm">Large</ore-text>
  </ore-box>
  <ore-box padding="xl" color="secondary" elevation="1">
    <ore-text size="sm">Extra large</ore-text>
  </ore-box>
</ore-grid>
```

</ComponentPreview>

## Rainbow Border

Animated rainbow border effect — works on any variant.

<ComponentPreview center>

```html
<ore-box
  variant="frost"
  effect="rainbow"
  padding="lg"
  style="min-height: 200px; display: flex; justify-content: center; align-items: center;">
  <ore-text variant="heading" size="lg">Rainbow Box</ore-text>
  <ore-text size="sm">Animated rainbow border with glow effect</ore-text>
</ore-box>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute   | Type                                                                      | Default | Description            |
| ----------- | ------------------------------------------------------------------------- | ------- | ---------------------- |
| `variant`   | `'solid' \| 'flat' \| 'glass' \| 'frost'`                                 | -       | Style variant          |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -       | Color theme            |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                  | `'md'`  | Internal padding       |
| `elevation` | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                  | -       | Shadow depth (0–5)     |
| `rounded`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | `'md'`  | Border radius          |
| `effect`    | `'rainbow'`                                                               | —       | Animated border effect |
| `fullwidth` | `boolean`                                                                 | `false` | Expand to full width   |

### Slots

| Slot      | Description             |
| --------- | ----------------------- |
| (default) | Main content of the box |

### Parts

| Part  | Description                              |
| ----- | ---------------------------------------- |
| `box` | The inner `<div>` — target with `::part` |

### CSS Custom Properties

CSS custom properties work regardless of whether a `color` attribute is set. Use `--box-*` custom properties on a parent for contextual theming instead of inline styles.

| Property             | Default                     | Description   |
| -------------------- | --------------------------- | ------------- |
| `--box-bg`           | `var(--color-canvas)`       | Background    |
| `--box-color`        | `var(--color-contrast-900)` | Text color    |
| `--box-border`       | `var(--border)`             | Border width  |
| `--box-border-color` | `var(--color-contrast-300)` | Border color  |
| `--box-radius`       | `var(--rounded-lg)`         | Border radius |
| `--box-padding`      | `var(--size-4)`             | Inner padding |
| `--box-shadow`       | `var(--shadow-sm)`          | Box shadow    |

## Accessibility

`ore-box` follows WAI-ARIA best practices. It supports all standard ARIA attributes (`aria-label`, `aria-describedby`, `role`, etc.), making it straightforward to integrate into accessible layouts. Wrap `ore-box` in a semantic HTML element (`<section>`, `<article>`, etc.) when the content warrants it. Glass and frost variants maintain readable contrast ratios against their typical backgrounds.
