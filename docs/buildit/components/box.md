# Box

A foundational layout primitive with theming support. Box provides a simple, semantic container with color, elevation, and padding options — the perfect building block for layouts and compositions.

## Features

- 🎨 **4 Variants**: solid, flat, glass, frost
- 🌈 **6 Color Themes**: primary, secondary, info, success, warning, error
- 🌟 **Rainbow Border**: Animated rainbow border with glow effect
- 📏 **5 Padding Sizes**: none, sm, md, lg, xl
- 🎭 **6 Elevation Levels**: Customizable shadow depths (0–5)
- 🧱 **Foundation Component**: Designed to be the base for layouts and compositions
- 🎨 **Customizable**: CSS custom properties for complete control

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/layout/box/box.ts
:::

## Basic Usage

Default box with canvas background and gentle border.

<ComponentPreview>

```html
<bit-box>
  <bit-text>Basic box container</bit-text>
</bit-box>
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
<bit-box>
  <bit-text>Default</bit-text>
</bit-box>

<bit-box variant="flat" color="primary">
  <bit-text>Flat</bit-text>
</bit-box>
```

</ComponentPreview>

### Glass & Frost

Translucent effects with backdrop blur — best used over rich backgrounds.

::: tip Best Used With
Glass and frost look best over colorful backgrounds or images to make the blur and transparency visible.
:::

<ComponentPreview center background="https://plus.unsplash.com/premium_photo-1685082778336-282f52a3a923?q=80&w=2532&auto=format&fit=crop">

```html
<bit-box variant="glass" fullwidth>
  <bit-text variant="heading" size="lg">Glass Effect</bit-text>
  <bit-text>Vibrant glass with saturated colors and brightness boost</bit-text>
</bit-box>
<bit-box variant="frost" fullwidth>
  <bit-text variant="heading" size="lg">Frost Effect</bit-text>
  <bit-text>Frosted glass with muted tones and stronger blur</bit-text>
</bit-box>
```

</ComponentPreview>

## Colors

Six semantic colors for different contexts. Hover state is included for `solid` and `flat` when a color is set.

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
    <bit-text size="sm">Small</bit-text>
  </bit-box>
  <bit-box padding="md" color="secondary" elevation="1">
    <bit-text size="sm">Medium (default)</bit-text>
  </bit-box>
  <bit-box padding="lg" color="secondary" elevation="1">
    <bit-text size="sm">Large</bit-text>
  </bit-box>
  <bit-box padding="xl" color="secondary" elevation="1">
    <bit-text size="sm">Extra large</bit-text>
  </bit-box>
</bit-grid>
```

</ComponentPreview>

## Rainbow Border

Animated rainbow border effect — works on any variant.

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

## Guideline Recipe: Bolder Feature Highlight

**Guideline: bolder** — a solid elevated box with a primary color theme makes a featured section impossible to overlook.

```html
<bit-box variant="solid" color="primary" elevation="2" padding="lg">
  <bit-text variant="heading" size="lg" weight="bold">Start your free trial</bit-text>
  <bit-text variant="body" style="margin-block:var(--size-2)">
    14 days, no credit card required. Cancel anytime.
  </bit-text>
  <bit-button variant="solid" color="canvas" size="lg">Get started</bit-button>
</bit-box>
```

**Tip:** Use `elevation="2"` or `elevation="3"` to lift the box above surrounding content and draw the eye to the CTA.

## API Reference

### Attributes

| Attribute   | Type                                                                      | Default | Description                    |
| ----------- | ------------------------------------------------------------------------- | ------- | ------------------------------ |
| `variant`   | `'solid' \| 'flat' \| 'glass' \| 'frost'`                                 | -       | Style variant                  |
| `color`     | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | -       | Color theme                    |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                  | `'md'`  | Internal padding               |
| `elevation` | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                  | -       | Shadow depth (0–5)             |
| `rounded`   | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | `'md'`  | Border radius                  |
| `rainbow`   | `boolean`                                                                 | `false` | Animated rainbow border effect |
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
| `--box-radius`       | `var(--rounded-md)`         | Border radius |
| `--box-padding`      | `var(--size-4)`             | Inner padding |
| `--box-shadow`       | `var(--shadow-sm)`          | Box shadow    |

## Accessibility

The box component follows WAI-ARIA best practices.

### `bit-box`

✅ **Semantic Structure**

- Supports all standard ARIA attributes (`aria-label`, `aria-describedby`, `role`, etc.).
- Elevation changes are purely visual and do not affect accessibility.

✅ **Screen Readers**

- Glass and frost variants maintain readable contrast ratios.

## Best Practices

**Do:**

- Wrap `bit-box` in a semantic HTML element (`<section>`, `<article>`, etc.) when the content warrants it.
- Combine `color` and `elevation` to create visual hierarchy without custom CSS.
- Use `glass` and `frost` variants only over rich backgrounds where the blur effect is visible.
- Use `--box-*` custom properties on a parent for contextual theming instead of inline styles.

**Don't:**

- Rely only on `color` to convey meaning — box is a container, not a status indicator.
- Nest too many `bit-box` elements — keep structural depth reasonable for maintainability.
