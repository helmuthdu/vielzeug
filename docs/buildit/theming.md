---
title: Buildit — Theming & Customization
description: Design tokens, dark mode, CSS custom properties, and theme variants for Buildit.
---

# Theming & Customization

::: tip New to Buildit?
Start with the [Usage Guide](./usage.md) to learn the basics of importing and using components before diving into theming.
:::

[[toc]]

Buildit is designed to be highly customizable through CSS Custom Properties (CSS variables). All design tokens are defined in a central theme file that you can reference and override.

## Design Tokens

Buildit provides a comprehensive set of design tokens organized into categories:

- **Sizing Scale**: Spacing, dimensions, and layout utilities
- **Contrast Scale**: Background colors (50-400) and text colors (500-900)
- **Semantic Colors**: Primary, secondary, info, success, warning, and error (defaults to neutral)
- **Typography**: Font sizes, weights, and line heights
- **Shadows & Effects**: Elevation and visual depth
- **Border Radii**: Consistent corner rounding

## Color Palette

<ColorPalette />

### Theme Reference

::: details View theme.css
<<< @/../packages/buildit/src/styles/theme.css
:::

## Contrast Scale Design

Buildit uses a carefully designed contrast scale that divides into two ranges:

### Background Colors (50-400)

Optimized for UI elements, cards, borders, and backgrounds with soft, subtle progression:

- `--color-contrast-50`: Canvas, page background
- `--color-contrast-100`: Cards, elevated surfaces
- `--color-contrast-200`: Nested cards, hover states
- `--color-contrast-300`: Borders, dividers
- `--color-contrast-400`: Disabled backgrounds, subtle UI

### Text Colors (500-900)

Optimized for readability and WCAG AA/AAA compliance:

- `--color-contrast-500`: Tertiary text, placeholders (AA for large text)
- `--color-contrast-600`: Secondary text (AA compliant)
- `--color-contrast-700`: Body text (AAA compliant)
- `--color-contrast-800`: Headings (AAA compliant)
- `--color-contrast-900`: High contrast text (AAA compliant)

::: tip Accessibility
All text color values (500-900) meet or exceed WCAG AA standards, with 700-900 achieving AAA compliance for body text and headings.
:::

## Dark Mode

Buildit uses the CSS [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) function to define every color once with both a light and dark value. `color-scheme: light dark` on `:root` means the OS preference is respected automatically — no `@media` block required.

### How it works

Every color variable in the theme is defined like:

```css
--color-primary: light-dark(hsl(260deg 85% 65%), hsl(260deg 85% 70%));
```

Two rules on `<html>` override the OS preference when needed:

```css
html.dark {
  color-scheme: dark;
} /* force dark  */
html:not(.dark) {
  color-scheme: light;
} /* force light */
```

### VitePress Integration

VitePress automatically adds `.dark` to `<html>` when the user toggles the theme. Buildit responds to this automatically — no extra configuration needed.

### Manual Control

For other frameworks, toggle the `.dark` class on `<html>`:

```javascript
// Switch to dark
document.documentElement.classList.add('dark');

// Switch to light (remove .dark — falls back to OS preference)
document.documentElement.classList.remove('dark');

// Toggle
document.documentElement.classList.toggle('dark');
```

## Global Customization

You can override the default theme by setting CSS variables in your root stylesheet. A plain value always wins over `light-dark()` — use `light-dark()` yourself when you want the override to stay mode-aware:

```css
:root {
  /* Mode-aware override — adapts to light/dark automatically */
  --color-primary: light-dark(hsl(200deg 100% 45%), hsl(200deg 100% 60%));

  /* Static override — same in both modes */
  --rounded-md: 0.5rem;
  --size-4: 1.2rem;
}
```

## Component Customization

Each component exposes specific CSS custom properties for fine-tuned control:

```html
<bit-button
  style="
    --button-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --button-radius: 20px;
    --button-padding: 0.75rem 2rem;
  ">
  Gradient Button
</bit-button>
```

### Component-Specific Variables

Components use scoped CSS variables with descriptive names:

```css
/* Button variables */
--button-bg
--button-color
--button-hover-bg
--button-border
--button-radius
--button-padding

/* Input variables */
--input-bg
--input-color
--input-border-color
--input-placeholder-color
--input-radius

/* Checkbox variables */
--checkbox-size
--checkbox-bg
--checkbox-checked-bg
--checkbox-radius
```

::: tip
Refer to each component's documentation for a complete list of available CSS custom properties.
:::

## Advanced Theming

### Creating Custom Theme Variants

You can create custom theme variants by defining new color palettes:

```css
/* Ocean theme */
.theme-ocean {
  --color-primary: hsl(200deg 100% 50%);
  --color-primary-focus: hsl(200deg 100% 45%);
  --color-success: hsl(180deg 70% 45%);
}

/* Sunset theme */
.theme-sunset {
  --color-primary: hsl(20deg 100% 55%);
  --color-primary-focus: hsl(20deg 100% 50%);
  --color-warning: hsl(40deg 100% 50%);
}
```

### Dynamic Theme Switching

```typescript
function applyTheme(themeName: string) {
  const themes = {
    ocean: {
      '--color-primary': 'hsl(200deg 100% 50%)',
      '--color-success': 'hsl(180deg 70% 45%)',
    },
    sunset: {
      '--color-primary': 'hsl(20deg 100% 55%)',
      '--color-warning': 'hsl(40deg 100% 50%)',
    },
  };

  const theme = themes[themeName];
  if (theme) {
    Object.entries(theme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }
}

// Usage
applyTheme('ocean');
```

## Best Practices

### Use Semantic Colors

Prefer semantic color tokens over direct contrast values:

```css
/* ✅ Good - Uses semantic tokens */
color: var(--text-color-body);
background: var(--color-primary);

/* ❌ Avoid - Uses raw contrast values */
color: var(--color-contrast-800);
background: hsl(210deg 100% 48%);
```

### Respect the Contrast Scale

Use background range (50-400) for backgrounds and text range (500-900) for text:

```css
/* ✅ Good - Follows the scale design */
background: var(--color-contrast-100); /* Card background */
color: var(--text-color-body); /* Body text */

/* ❌ Avoid - Using text colors for backgrounds */
background: var(--color-contrast-700);
```

### Maintain WCAG Compliance

When customizing colors, ensure proper contrast ratios:

- **AA Standard**: 4.5:1 for normal text, 3:1 for large text
- **AAA Standard**: 7:1 for normal text, 4.5:1 for large text

```css
/* Ensure custom colors meet contrast requirements */
:root {
  --custom-bg: hsl(210deg 5% 98%);
  --custom-text: hsl(210deg 4% 12%); /* 17.9:1 contrast - AAA ✅ */
}
```

## Next Steps

::: tip Continue Learning

- [API Reference](./api.md) — Complete list of CSS custom properties per component
- [Components](./components/button.md) — Component-specific theming options
- [Examples](./examples.md) — Real-world theming examples and recipes
  :::
