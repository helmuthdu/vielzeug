# Box

A foundational layout primitive with theming support. Box provides a simple, semantic container with color, elevation, and padding options — the perfect building block for layouts and compositions.

## Features

- <sg-icon name="palette" size="16"></sg-icon> **4 Variants**: solid, flat, glass, frost
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Color Themes**: primary, secondary, info, success, warning, error
- <sg-icon name="star" size="16"></sg-icon> **Animated Border**: Rainbow border effect via `effect="rainbow"`
- <sg-icon name="ruler" size="16"></sg-icon> **5 Padding Sizes**: none, sm, md, lg, xl
- <sg-icon name="theater" size="16"></sg-icon> **6 Elevation Levels**: Customizable shadow depths (0–5)
- <sg-icon name="box" size="16"></sg-icon> **Foundation Component**: Designed to be the base for layouts and compositions
- <sg-icon name="palette" size="16"></sg-icon> **Customizable**: CSS custom properties for complete control

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/layout/box/box.ts
:::

## Basic Usage

Default box with canvas background and gentle border.

<ComponentPreview>

```html
<sg-box>
  <sg-text>Basic box container</sg-text>
</sg-box>
```

</ComponentPreview>

## Variants

Four variants cover the full range from solid to translucent.

- **Default** (no `variant`) — Canvas background with border and subtle shadow. Picks up `color` as a tinted backdrop.
- **`flat`** — Same as default but with no shadow; low visual weight.
- **`glass`** — Glassmorphism with backdrop blur, saturated colors, and brightness boost.
- **`frost`** — Frosted glass with stronger blur and color-tinted transparency.

<ComponentPreview>

```html
<sg-box>
  <sg-text>Default</sg-text>
</sg-box>

<sg-box variant="flat" color="primary">
  <sg-text>Flat</sg-text>
</sg-box>
```

</ComponentPreview>

### Glass & Frost

Translucent effects with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost look best over colorful backgrounds or images to make the blur and transparency visible.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<sg-box variant="glass" fullwidth>
  <sg-text variant="heading" size="md">Glass Effect</sg-text>
  <sg-text>Vibrant glass with saturated colors and brightness boost</sg-text>
</sg-box>
<sg-box variant="frost" fullwidth>
  <sg-text variant="heading" size="md">Frost Effect</sg-text>
  <sg-text>Frosted glass with muted tones and stronger blur</sg-text>
</sg-box>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts. Hover state is included for `solid` and `flat` when a color is set.

<ComponentPreview>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <sg-box>Default</sg-box>
  <sg-box color="primary">Primary</sg-box>
  <sg-box color="secondary">Secondary</sg-box>
  <sg-box color="info">Info</sg-box>
  <sg-box color="success">Success</sg-box>
  <sg-box color="warning">Warning</sg-box>
  <sg-box color="error">Error</sg-box>
</sg-grid>
```

</ComponentPreview>

## Elevation

Control shadow depth with elevation levels from 0 to 5.

<ComponentPreview>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <sg-box elevation="0" color="primary">
    <sg-text size="sm">Elevation 0</sg-text>
  </sg-box>
  <sg-box elevation="1" color="primary">
    <sg-text size="sm">Elevation 1</sg-text>
  </sg-box>
  <sg-box elevation="2" color="primary">
    <sg-text size="sm">Elevation 2</sg-text>
  </sg-box>
  <sg-box elevation="3" color="primary">
    <sg-text size="sm">Elevation 3</sg-text>
  </sg-box>
  <sg-box elevation="4" color="primary">
    <sg-text size="sm">Elevation 4</sg-text>
  </sg-box>
  <sg-box elevation="5" color="primary">
    <sg-text size="sm">Elevation 5</sg-text>
  </sg-box>
</sg-grid>
```

</ComponentPreview>

## Padding

Choose from five padding sizes.

<ComponentPreview>

```html
<sg-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <sg-box padding="none" color="secondary" elevation="1">
    <sg-text size="sm">No padding</sg-text>
  </sg-box>
  <sg-box padding="sm" color="secondary" elevation="1">
    <sg-text size="sm">Small</sg-text>
  </sg-box>
  <sg-box padding="md" color="secondary" elevation="1">
    <sg-text size="sm">Medium (default)</sg-text>
  </sg-box>
  <sg-box padding="lg" color="secondary" elevation="1">
    <sg-text size="sm">Large</sg-text>
  </sg-box>
  <sg-box padding="xl" color="secondary" elevation="1">
    <sg-text size="sm">Extra large</sg-text>
  </sg-box>
</sg-grid>
```

</ComponentPreview>

## Rainbow Border

Animated rainbow border effect — works on any variant.

<ComponentPreview center>

```html
<sg-box
  variant="frost"
  effect="rainbow"
  padding="lg"
  style="min-height: 200px; display: flex; justify-content: center; align-items: center;">
  <sg-text variant="heading" size="lg">Rainbow Box</sg-text>
  <sg-text size="sm">Animated rainbow border with glow effect</sg-text>
</sg-box>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute   | Type                                                                      | Default | Description                    |
| ----------- | ------------------------------------------------------------------------- | ------- | ------------------------------ |
| `variant`   | `'solid' \| 'flat' \| 'glass' \| 'frost'`                                 | -       | Style variant                  |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -       | Color theme                    |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                  | `'md'`  | Internal padding               |
| `elevation` | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                  | -       | Shadow depth (0–5)             |
| `rounded`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | `'md'`  | Border radius                  |
| `effect`    | `'rainbow'`                                                               | —       | Animated border effect         |
| `fullwidth` | `boolean`                                                                 | `false` | Expand to full width           |

### Slots

| Slot      | Description             |
| --------- | ----------------------- |
| (default) | Main content of the box |

### Parts

| Part  | Description                              |
| ----- | ---------------------------------------- |
| `box` | The inner `<div>` — target with `::part` |

### CSS Custom Properties

CSS custom properties work regardless of whether a `color` attribute is set.

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

The box component follows WAI-ARIA best practices.

### `sg-box`

<sg-icon name="check" size="16"></sg-icon> **Semantic Structure**

- Supports all standard ARIA attributes (`aria-label`, `aria-describedby`, `role`, etc.).
- Elevation changes are purely visual and do not affect accessibility.

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

- Glass and frost variants maintain readable contrast ratios.

## Best Practices

**Do:**

- Wrap `sg-box` in a semantic HTML element (`<section>`, `<article>`, etc.) when the content warrants it.
- Combine `color` and `elevation` to create visual hierarchy without custom CSS.
- Use `glass` and `frost` variants only over rich backgrounds where the blur effect is visible.
- Use `--box-*` custom properties on a parent for contextual theming instead of inline styles.

**Don't:**

- Rely only on `color` to convey meaning — box is a container, not a status indicator.
- Nest too many `sg-box` elements — keep structural depth reasonable for maintainability.
