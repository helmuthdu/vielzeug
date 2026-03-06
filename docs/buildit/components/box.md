# Box

<script setup>
import ComponentPreview from '../../.vitepress/theme/components/ComponentPreview.vue';
</script>

A foundational layout primitive with theming support. Box provides a simple, semantic container with color, elevation, and padding options - the perfect building block for layouts and compositions.

## Features

- 🎨 **2 Special Variants**: Glass and Frost effects with smart color adaptation
- 🌈 **6 Color Themes**: Primary, secondary, success, warning, error, info
- 🌟 **Rainbow Border**: Animated rainbow border with glow effect
- 📏 **5 Padding Sizes**: From none to extra-large
- 🎭 **6 Elevation Levels**: Customizable shadow depths (0-5)
- 🧱 **Foundation Component**: Designed to be the base for other components
- ♿ **Fully Accessible**: Supports ARIA attributes and roles
- 🎨 **Customizable**: CSS custom properties for complete control
- ⚡ **Zero JavaScript**: Pure CSS implementation for maximum performance

[Source Code](https://github.com/your-repo/buildit/tree/main/src/layout/box) · [Report Issue](https://github.com/your-repo/buildit/issues/new)

## Basic Usage

Default box with subtle background and gentle borders.

<ComponentPreview>

```html
<bit-box>
  <bit-text>Basic box container</bit-text>
</bit-box>
```

</ComponentPreview>

## Rainbow Border

Animated rainbow border effect perfect for highlighting special content or CTAs.

<ComponentPreview center>

```html
<bit-box
  variant="frost"
  rainbow
  padding="lg"
  style="min-height: 200px; display: flex; justify-content: center; align-items: center;">
  <bit-text variant="heading" size="lg">Rainbow Box</bit-text>
  <bit-text size="sm">Animated rainbow border with glow effect</bit-text>
</bit-box>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts.

<ComponentPreview>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <bit-box>Default</bit-box>
  <bit-box color="primary">Primary</bit-box>
  <bit-box color="secondary">Secondary</bit-box>
  <bit-box color="info">Info</bit-box>
  <bit-box color="success">Success</bit-box>
  <bit-box color="warning">Warning</bit-box>
  <bit-box color="error">Error</bit-box>
</bit-grid>
```

</ComponentPreview>

## Variants

Box supports two special variants for advanced visual effects.

### Glass & Frost Variants

Translucent effects with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost variants look best over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<bit-box variant="glass" fullwidth>
  <bit-text variant="heading" size="lg">Glass Effect</bit-text>
  <bit-text>Vibrant glass with saturated colors and brightness boost</bit-text>
</bit-box>
<bit-box variant="frost" fullwidth>
  <bit-text variant="heading" size="lg">Frost Effect</bit-text>
  <bit-text>Subtle frosted glass with muted tones</bit-text>
</bit-box>
```

</ComponentPreview>


## Elevation

Control shadow depth with elevation levels from 0 to 5.

<ComponentPreview>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <bit-box elevation="0" color="primary">
    <bit-text size="sm">Elevation 0</bit-text>
  </bit-box>
  <bit-box elevation="1" color="primary">
    <bit-text size="sm">Elevation 1</bit-text>
  </bit-box>
  <bit-box elevation="2" color="primary">
    <bit-text size="sm">Elevation 2</bit-text>
  </bit-box>
  <bit-box elevation="3" color="primary">
    <bit-text size="sm">Elevation 3</bit-text>
  </bit-box>
  <bit-box elevation="4" color="primary">
    <bit-text size="sm">Elevation 4</bit-text>
  </bit-box>
  <bit-box elevation="5" color="primary">
    <bit-text size="sm">Elevation 5</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

## Padding

Choose from five padding sizes.

<ComponentPreview>

```html
<bit-grid cols="1" cols-sm="3" cols-md="4" cols-lg="5" gap="lg" style="width: 100%">
  <bit-box padding="none" color="secondary" elevation="1">
    <bit-text size="sm">No padding</bit-text>
  </bit-box>
  <bit-box padding="sm" color="secondary" elevation="1">
    <bit-text size="sm">Small padding</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary" elevation="1">
    <bit-text size="sm">Medium (default)</bit-text>
  </bit-box>
  <bit-box padding="lg" color="secondary" elevation="1">
    <bit-text size="sm">Large padding</bit-text>
  </bit-box>
  <bit-box padding="xl" color="secondary" elevation="1">
    <bit-text size="sm">Extra large</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

## API

### Attributes

| Attribute   | Type                                                                      | Default | Description                    |
| ----------- | ------------------------------------------------------------------------- | ------- | ------------------------------ |
| `variant`   | `'glass' \| 'frost'`                                                      | -       | Style variant                  |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -       | Color theme                    |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                  | `'md'`  | Padding size                   |
| `elevation` | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                  | -       | Shadow elevation (0-5)         |
| `fullwidth` | `boolean`                                                                 | `false` | Expand to full width           |
| `rainbow`   | `boolean`                                                                 | `false` | Animated rainbow border effect |
| `rounded`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | `'md'`  | Border radius                  |
| `as`        | `string`                                                                  | `'div'` | HTML element to render as      |

### Slots

| Slot      | Description             |
| --------- | ----------------------- |
| (default) | Main content of the box |

### CSS Custom Properties

| Property             | Default                     | Description      |
| -------------------- | --------------------------- | ---------------- |
| `--box-bg`           | `var(--color-contrast-50)`  | Background color |
| `--box-color`        | `var(--color-contrast-900)` | Text color       |
| `--box-border`       | `var(--border)`             | Border width     |
| `--box-border-color` | `var(--color-contrast-300)` | Border color     |
| `--box-radius`       | `var(--rounded-md)`         | Border radius    |
| `--box-padding`      | `var(--size-4)`             | Inner padding    |
| `--box-shadow`       | `var(--shadow-sm)`          | Box shadow       |

## Accessibility

- ✅ Supports all standard ARIA attributes (`aria-label`, `aria-describedby`, etc.)
- ✅ Supports `role` attribute for semantic markup
- ✅ Glass and frost variants maintain readable contrast ratios
- ✅ Elevation changes are purely visual and don't affect accessibility

## Related Components

- [Card](/buildit/components/card) - Built on top of Box with additional features
- [Grid](/buildit/components/grid) - Layout system for organizing boxes
- [Text](/buildit/components/text) - Typography for box content
