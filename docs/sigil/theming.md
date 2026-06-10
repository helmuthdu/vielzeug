---
title: Sigil — Theming & Customization
description: Design tokens, dark mode, CSS custom properties, and theme variants for Sigil.
---

# Theming & Customization

::: tip New to Sigil?
Start with the [Usage Guide](./usage.md) to learn the basics of importing and using components before diving into theming.
:::

[[toc]]

Sigil is designed to be highly customizable through CSS Custom Properties (CSS variables). All design tokens are defined in a central theme file that you can reference and override.

## Design Tokens

Sigil provides a comprehensive set of design tokens organized into the following categories:

| Category                   | Prefix                                         | Description                                                      |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| **Spacing Scale**          | `--size-{n}`                                   | 4px-increment spacing (0 → 96)                                   |
| **Container Sizes**        | `--size-{2xs–7xl}`                             | Named width breakpoints (256px → 1280px)                         |
| **Special Sizes**          | `--size-{full,fit,min,max,auto,none,prose}`    | Keyword size utilities                                           |
| **Viewport & Breakpoints** | `--size-screen-*`                              | Viewport units + breakpoint values                               |
| **Aspect Ratios**          | `--aspect-*`                                   | Common aspect ratios (square, video, wide…)                      |
| **3D Perspective**         | `--perspective-*`                              | Transform perspective distances                                  |
| **Grid Templates**         | `--grid-{1–12}`                                | CSS Grid column repeat helpers                                   |
| **Border Widths**          | `--border-*`                                   | Stroke widths + ring utilities                                   |
| **Border Radius**          | `--rounded-*`                                  | Corner rounding scale                                            |
| **Blur Effects**           | `--blur-*`                                     | Blur filter scale                                                |
| **Box Shadows**            | `--shadow-*`                                   | Elevation shadows                                                |
| **Inset Shadows**          | `--inset-shadow-*`                             | Inner shadow scale                                               |
| **Drop Shadows**           | `--drop-shadow-*`                              | CSS filter drop-shadows                                          |
| **Text Shadows**           | `--text-shadow-*`                              | Typographic text shadows                                         |
| **Halo Shadows**           | `--halo-shadow-*`                              | Branded glow shadows per semantic color                          |
| **Font Families**          | `--font-{sans,serif,mono}`                     | System font stacks                                               |
| **Font Weights**           | `--font-*`                                     | Numeric weight scale (100–900)                                   |
| **Letter Spacing**         | `--tracking-*`                                 | Tracking utilities                                               |
| **Line Heights**           | `--leading-*`                                  | Relative (named) + absolute (numeric) line height scale          |
| **Body Text Scale**        | `--text-{2xs–3xl}`                             | 8-step body font size scale (2xs through 3xl)                    |
| **Heading Scale**          | `--heading-{xs–2xl}`                           | 6-step heading font size scale                                   |
| **Semantic Text Colors**   | `--text-color-*`                               | Role-based text color tokens                                     |
| **Transitions**            | `--transition-*`                               | Pre-built timing + easing combos                                 |
| **Durations**              | `--duration-{75,100,150,200,300,500,700,1000}` | Millisecond step scale (all zero under `prefers-reduced-motion`) |
| **Easing Functions**       | `--ease-*`                                     | Named cubic-bezier curves                                        |
| **Contrast Scale**         | `--color-contrast-{50–900}`                    | 11-step light/dark adaptive palette (includes 150)               |
| **Canvas / Contrast**      | `--color-canvas`, `--color-contrast`           | Aliases for `contrast-50` and `contrast-900`                     |
| **Semantic Colors**        | `--color-{name}-*`                             | 7 sub-tokens per semantic color                                  |
| **Section Spacing**        | `--section-spacing`                            | Default block section gap (`2rem`)                               |
| **Neutral Overrides**      | `--sigil-color-neutral-*`                      | Global neutral palette override surface (6 tokens)               |

## Color Palette

<ColorPalette />

### Theme Reference

::: details View theme.css
<<< @/../packages/sigil/src/styles/theme.css
:::

## Contrast Scale

Sigil uses an 11-step contrast scale driven entirely by `light-dark()`. The values flip automatically between the light and dark poles — no `@media` query needed.

### Background Range (50–400)

Optimized for surfaces, borders, and UI structure:

| Token                  | Light                    | Dark                    | Usage                           |
| ---------------------- | ------------------------ | ----------------------- | ------------------------------- |
| `--color-contrast-50`  | oklch(99% 0.004 264deg)  | oklch(13% 0.005 250deg) | Canvas, page background         |
| `--color-contrast-100` | oklch(97% 0.004 264deg)  | oklch(17% 0.005 250deg) | Cards, elevated surfaces        |
| `--color-contrast-150` | oklch(95.5% 0.0045 264deg) | oklch(19.5% 0.005 250deg) | Midpoint — chip base, subtle fills |
| `--color-contrast-200` | oklch(94% 0.005 264deg)  | oklch(22% 0.005 250deg) | Nested cards, hover states      |
| `--color-contrast-300` | oklch(89% 0.006 264deg)  | oklch(29% 0.006 250deg) | Borders, dividers               |
| `--color-contrast-400` | oklch(81% 0.007 264deg)  | oklch(38% 0.006 250deg) | Disabled backgrounds, subtle UI |

### Text Range (500–900)

Optimized for readability and WCAG compliance. OKLCH provides perceptually-uniform lightness steps so contrast ratios are consistent across the ramp.

| Token                  | Light                  | Dark                   | WCAG            | Usage                       |
| ---------------------- | ---------------------- | ---------------------- | --------------- | --------------------------- |
| `--color-contrast-500` | oklch(49% 0.008 264deg) | oklch(58% 0.006 250deg) | AA (large text) | Tertiary text, placeholders |
| `--color-contrast-600` | oklch(40% 0.008 264deg) | oklch(68% 0.005 250deg) | AA              | Secondary / muted text      |
| `--color-contrast-700` | oklch(32% 0.008 264deg) | oklch(78% 0.004 250deg) | AAA             | Supplemental body text      |
| `--color-contrast-800` | oklch(22% 0.008 264deg) | oklch(88% 0.004 250deg) | AAA             | Default body text           |
| `--color-contrast-900` | oklch(12% 0.008 264deg) | oklch(95% 0.003 250deg) | AAA             | Headings, highest contrast  |

::: tip Accessibility
All text color values (500–900) meet or exceed WCAG AA standards. Values 700–900 achieve AAA compliance for body text and headings.
:::

### Canvas & Contrast Aliases

Two convenience aliases are provided for the most common surface and text needs:

| Token              | Resolves to            | Usage                             |
| ------------------ | ---------------------- | --------------------------------- |
| `--color-canvas`   | `--color-contrast-50`  | Default page/component background |
| `--color-contrast` | `--color-contrast-900` | Maximum-contrast text/icon color  |

## Semantic Text Colors

Six role-based text color tokens are derived from the contrast scale. Use these instead of raw contrast values so your overrides stay meaningful in both light and dark mode.

| Token                    | Contrast step          | Intended use                      |
| ------------------------ | ---------------------- | --------------------------------- |
| `--text-color-heading`   | `--color-contrast-900` | Headings — highest contrast, AAA  |
| `--text-color-body`      | `--color-contrast-800` | Default body text, AAA            |
| `--text-color-secondary` | `--color-contrast-600` | Secondary / muted text, AA        |
| `--text-color-tertiary`  | `--color-contrast-500` | Placeholder, hint text — AA large |
| `--text-color-disabled`  | `--color-contrast-400` | Disabled state — decorative only  |
| `--text-color-contrast`  | `--color-contrast-100` | Text on dark/colored backgrounds  |

```css
/* <sg-icon name="circle-check" size="16"></sg-icon> Good — semantic token adapts to light and dark automatically */
color: var(--text-color-body);

/* <sg-icon name="circle-x" size="16"></sg-icon> Avoid — raw contrast value is less expressive */
color: var(--color-contrast-800);
```

## Semantic Colors

Each semantic color ships with **7 coordinated sub-tokens** that cover every common UI need. All values use `light-dark()` and adapt to the active color scheme.

| Sub-token                     | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `--color-{name}`              | Base interactive color (buttons, links, highlights)            |
| `--color-{name}-backdrop`     | Tinted surface behind a colored element                        |
| `--color-{name}-content`      | Foreground text/icon on the base color                         |
| `--color-{name}-contrast`     | High-contrast surface — light in light mode, dark in dark mode |
| `--color-{name}-focus`        | Hover / active state shift of the base color                   |
| `--color-{name}-border`       | Border treatment at reduced opacity                            |
| `--color-{name}-focus-shadow` | Focus ring `box-shadow` with spread + `--shadow-sm`            |

Available semantic color families: **neutral**, **primary**, **secondary**, **info**, **success**, **warning**, **error**.

```css
/* Example — primary color family */
--color-primary             /* base */
--color-primary-backdrop    /* tinted surface */
--color-primary-content     /* text/icon on primary */
--color-primary-contrast    /* inverse surface */
--color-primary-focus       /* hover/active */
--color-primary-border      /* border at 60% opacity */
--color-primary-focus-shadow /* focus ring */
```

### Halo Shadows

Each semantic color also provides a matching `--halo-shadow-{name}` value — a multi-layer box-shadow that creates a soft branded glow around interactive elements.

```css
--halo-shadow-neutral
--halo-shadow-primary
--halo-shadow-secondary
--halo-shadow-info
--halo-shadow-success
--halo-shadow-warning
--halo-shadow-error
```

## Typography Scale

Sigil uses two parallel font-size scales to cleanly separate body text sizing from display heading sizing.

### Body Scale (`--text-*`)

Used by default for all non-heading text:

| Token          | Value            | Usage                               |
| -------------- | ---------------- | ----------------------------------- |
| `--text-2xs`   | 0.625rem (10px)  | Micro labels, dot-only badges       |
| `--text-xs`    | 0.75rem (12px)   | Small labels, captions              |
| `--text-sm`    | 0.875rem (14px)  | Secondary text, labels              |
| `--text-base`  | 1rem (16px)      | Body text (minimum accessible size) |
| `--text-lg`    | 1.125rem (18px)  | Large UI text                       |
| `--text-xl`    | 1.25rem (20px)   | Subheadings                         |
| `--text-2xl`   | 1.5rem (24px)    | Major display text                  |
| `--text-3xl`   | 1.875rem (30px)  | Display / circular progress label   |

### Heading Scale (`--heading-*`)

Used exclusively by `variant="heading"` on `<sg-text>`:

| Token           | Value           | Usage                  |
| --------------- | --------------- | ---------------------- |
| `--heading-xs`  | 0.875rem (14px) | Tiny UI heading        |
| `--heading-sm`  | 1rem (16px)     | Small heading          |
| `--heading-md`  | 1.5rem (24px)   | Default heading size   |
| `--heading-lg`  | 2rem (32px)     | Section heading        |
| `--heading-xl`  | 3rem (48px)     | Page heading           |
| `--heading-2xl` | 4rem (64px)     | Hero / display heading |

### Font Weights

```css
--font-thin: 100;
--font-extralight: 200;
--font-light: 300;
--font-normal: 400; /* minimum for body text */
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
--font-black: 900;
```

### Line Heights

```css
--leading-none: 1;
--leading-tight: 1.15; /* headings */
--leading-snug: 1.375;
--leading-normal: 1.5; /* body text — WCAG recommended */
--leading-relaxed: 1.625;
--leading-loose: 2;

/* Absolute (pixel-aligned) */
--leading-3: 0.75rem; /* 12px */
--leading-4: 1rem; /* 16px */
--leading-5: 1.25rem; /* 20px */
--leading-6: 1.5rem; /* 24px */
--leading-7: 1.75rem; /* 28px */
--leading-8: 2rem; /* 32px */
--leading-9: 2.25rem; /* 36px */
--leading-10: 2.5rem; /* 40px */
```

### Letter Spacing

```css
--tracking-tight:  -0.025em; /* -2.5% — headers, display text */
--tracking-header: -0.025em; /* alias for --tracking-tight */
--tracking-normal:  0em;     /* default body tracking */
--tracking-wide:    0.05em;  /* labels, badges, uppercase caps */
```

## Cascade Layer

All Sigil tokens are defined inside `@layer sigil.tokens { … }`. This means any unlayered `:root` rule in your own stylesheet wins automatically — no `!important` needed for overrides.

```css
/* <sg-icon name="circle-check" size="16"></sg-icon> This beats sigil.tokens without !important */
:root {
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));
}
```

## Dark Mode

Sigil uses the CSS [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) function to define every color token once with both a light and dark value. `color-scheme: light dark` on `:root` means the OS preference is respected automatically — no `@media` block required.

### How it works

Every color variable in the theme is defined using OKLCH for perceptually-uniform lightness:

```css
--color-primary: light-dark(oklch(56% 0.22 293deg), oklch(62% 0.22 293deg));
```

OKLCH provides two key advantages over HSL: lightness steps that look visually equal across the ramp, and a wider gamut for P3 displays.

Two rules on `<html>` override the OS preference when needed:

```css
html.dark {
  color-scheme: dark;
} /* force dark */

html:not(.dark) {
  color-scheme: light;
} /* force light */
```

### VitePress Integration

VitePress automatically adds `.dark` to `<html>` when the user toggles the theme. Sigil responds to this automatically — no extra configuration needed.

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

## Transitions & Animations

Sigil provides pre-built transition and animation tokens. Under `prefers-reduced-motion: reduce`, **all `--duration-*` tokens resolve to `0ms`** and all `--transition-*` tokens resolve to `none` — no extra configuration needed.

### Duration Scale

```css
--duration-75: 75ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-300: 300ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;
```

### Easing

```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.22, 1, 0.36, 1); /* fast start, soft landing — no overshoot */
```

### Pre-built Transitions

```css
--transition-none: none;
--transition-fast: 150ms var(--ease-in-out);
--transition-normal: 200ms var(--ease-in-out);
--transition-slow: 300ms var(--ease-in-out);
--transition-slower: 500ms var(--ease-in-out);
--transition-spring: 300ms var(--ease-spring);
```

::: warning
`--transition-all` has been removed. Use explicit property-specific transitions (`transition: color var(--transition-fast), background var(--transition-fast)`) to avoid forcing layout recalculation on every style change.
:::

## Global Customization

Override the default theme by setting CSS variables in your root stylesheet. A plain value always wins over `light-dark()` — use `light-dark()` yourself when you want the override to stay mode-aware:

```css
:root {
  /* Mode-aware override — adapts to light/dark automatically (OKLCH recommended) */
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));

  /* Static override — same in both modes */
  --rounded-md: 0.5rem;
  --size-4: 1.2rem;
}
```

## Component Customization

Each component exposes specific CSS custom properties for fine-tuned control. Set them inline or in a stylesheet scoped to your component.

```html
<sg-button
  style="
    --button-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --button-radius: 20px;
    --button-padding: 0.75rem 2rem;
  ">
  Gradient Button
</sg-button>
```

### Component-Specific Variables

::: tip
Refer to each component's documentation for the complete list of CSS custom properties.
:::

```css
/* sg-text */
--text-size           /* font-size */
--text-weight         /* font-weight */
--text-color          /* color */
--text-line-height    /* line-height */
--text-letter-spacing /* letter-spacing */

/* sg-button */
--button-bg
--button-color
--button-border
--button-radius
--button-padding

/* sg-input */
--input-bg
--input-color
--input-border-color
--input-placeholder-color
--input-radius

/* sg-checkbox */
--checkbox-size
--checkbox-bg
--checkbox-checked-bg
--checkbox-radius
```

## Advanced Theming

### Overriding the Neutral Palette

All uncolored Sigil components (buttons, inputs, chips, etc. without a `color` attribute) use the **neutral** token family. Override it globally with the `--sigil-color-neutral-*` surface — no `!important` needed:

```css
:root {
  --sigil-color-neutral:          light-dark(oklch(50% 0.01 240deg), oklch(68% 0.01 240deg));
  --sigil-color-neutral-focus:    light-dark(oklch(56% 0.01 240deg), oklch(74% 0.01 240deg));
  --sigil-color-neutral-backdrop: light-dark(oklch(95% 0.005 240deg / 83%), oklch(25% 0.005 240deg / 60%));
  --sigil-color-neutral-border:   light-dark(oklch(84% 0.006 240deg / 75%), oklch(28% 0.006 240deg / 75%));
  --sigil-color-neutral-content:  light-dark(oklch(40% 0.01 240deg), oklch(80% 0.01 240deg));
  --sigil-color-neutral-contrast: light-dark(oklch(99% 0 240deg), oklch(13% 0 240deg));
}
```

This affects every component that defaults to neutral — buttons, chips, badges, inputs — without needing `color="primary"` on each element. Follow the same OKLCH + `light-dark()` pattern to keep both modes consistent.

::: tip
The six `--sigil-color-neutral-*` tokens mirror the `--color-{name}-*` family shape. All six must be defined together to avoid partially-themed components.
:::

### Creating Custom Theme Variants

Create custom theme variants by defining new color palettes on a scoped selector. Use the full 7-token pattern to keep components consistent:

```css
/* Ocean theme — OKLCH for perceptual uniformity, light-dark() for mode-awareness */
.theme-ocean {
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));
  --color-primary-backdrop: light-dark(oklch(93% 0.05 220deg), oklch(28% 0.08 220deg / 40%));
  --color-primary-content: light-dark(oklch(22% 0.08 220deg), oklch(95% 0.02 220deg));
  --color-primary-contrast: light-dark(oklch(98% 0.01 220deg), oklch(14% 0.05 220deg));
  --color-primary-focus: light-dark(oklch(61% 0.18 220deg), oklch(68% 0.18 220deg));
  --color-primary-border: light-dark(oklch(61% 0.18 220deg / 60%), oklch(68% 0.18 220deg / 60%));
  --color-primary-focus-shadow: 0 0 0 4px color-mix(in oklch, var(--color-primary) 40%, transparent), var(--shadow-sm);
}

/* Sunset theme */
.theme-sunset {
  --color-primary: light-dark(oklch(60% 0.20 35deg), oklch(66% 0.20 35deg));
  --color-primary-backdrop: light-dark(oklch(93% 0.06 35deg), oklch(28% 0.09 35deg / 40%));
  --color-primary-content: light-dark(oklch(22% 0.09 35deg), oklch(95% 0.02 35deg));
  --color-primary-contrast: light-dark(oklch(98% 0.01 35deg), oklch(14% 0.06 35deg));
  --color-primary-focus: light-dark(oklch(66% 0.20 35deg), oklch(72% 0.20 35deg));
  --color-primary-border: light-dark(oklch(66% 0.20 35deg / 60%), oklch(72% 0.20 35deg / 60%));
  --color-primary-focus-shadow: 0 0 0 4px color-mix(in oklch, var(--color-primary) 40%, transparent), var(--shadow-sm);
}
```

### Dynamic Theme Switching

```typescript
type ThemeName = 'ocean' | 'sunset';

const themes: Record<ThemeName, Record<string, string>> = {
  ocean: {
    '--color-primary': 'light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg))',
    '--color-primary-backdrop': 'light-dark(oklch(93% 0.05 220deg), oklch(28% 0.08 220deg / 40%))',
    '--color-primary-content': 'light-dark(oklch(22% 0.08 220deg), oklch(95% 0.02 220deg))',
    '--color-primary-contrast': 'light-dark(oklch(98% 0.01 220deg), oklch(14% 0.05 220deg))',
    '--color-primary-focus': 'light-dark(oklch(61% 0.18 220deg), oklch(68% 0.18 220deg))',
    '--color-primary-border': 'light-dark(oklch(61% 0.18 220deg / 60%), oklch(68% 0.18 220deg / 60%))',
  },
  sunset: {
    '--color-primary': 'light-dark(oklch(60% 0.20 35deg), oklch(66% 0.20 35deg))',
    '--color-primary-backdrop': 'light-dark(oklch(93% 0.06 35deg), oklch(28% 0.09 35deg / 40%))',
    '--color-primary-content': 'light-dark(oklch(22% 0.09 35deg), oklch(95% 0.02 35deg))',
    '--color-primary-contrast': 'light-dark(oklch(98% 0.01 35deg), oklch(14% 0.06 35deg))',
    '--color-primary-focus': 'light-dark(oklch(66% 0.20 35deg), oklch(72% 0.20 35deg))',
    '--color-primary-border': 'light-dark(oklch(66% 0.20 35deg / 60%), oklch(72% 0.20 35deg / 60%))',
  },
};

function applyTheme(name: ThemeName) {
  const theme = themes[name];
  Object.entries(theme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

// Usage
applyTheme('ocean');
```

## Best Practices

### Use Semantic Tokens

Prefer semantic tokens over raw contrast values:

```css
/* <sg-icon name="circle-check" size="16"></sg-icon> Good — semantic tokens */
color: var(--text-color-body);
background: var(--color-primary-backdrop);

/* <sg-icon name="circle-x" size="16"></sg-icon> Avoid — raw contrast values */
color: var(--color-contrast-800);
background: hsl(260deg 85% 65% / 20%);
```

### Respect the Contrast Scale

Use the background range (50–400) for surfaces and the text range (500–900) for text:

```css
/* <sg-icon name="circle-check" size="16"></sg-icon> Good */
background: var(--color-contrast-100); /* card surface */
color: var(--text-color-body); /* body text */

/* <sg-icon name="circle-x" size="16"></sg-icon> Avoid — text-range value used as background */
background: var(--color-contrast-700);
```

### Override with `light-dark()` for Mode-Aware Colors

Flat overrides are always light (or always dark). Wrap in `light-dark()` to keep an override mode-aware:

```css
:root {
  /* <sg-icon name="circle-check" size="16"></sg-icon> Adapts to light and dark (OKLCH recommended) */
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));

  /* <sg-icon name="triangle-alert" size="16"></sg-icon> Static — always the same regardless of color scheme */
  --color-primary: oklch(58% 0.18 220deg);
}
```

### Maintain WCAG Compliance

When customizing colors, verify contrast ratios:

- **AA**: 4.5:1 for normal text, 3:1 for large text
- **AAA**: 7:1 for normal text, 4.5:1 for large text

```css
:root {
  /* OKLCH — perceptually uniform, wide gamut, light-dark() aware */
  --custom-bg: light-dark(oklch(99% 0.004 264deg), oklch(13% 0.005 250deg));
  --custom-text: light-dark(oklch(12% 0.008 264deg), oklch(95% 0.003 250deg)); /* ~17:1 in both modes — AAA ✓ */
}
```

### Set the Full Token Set for Custom Colors

When introducing a brand color, define all 7 sub-tokens so every component renders correctly in both modes:

```css
.my-brand {
  /* Use OKLCH for perceptual uniformity; wrap in light-dark() for automatic mode-switching */
  --color-primary: light-dark(oklch(L% C H), oklch(L% C H));
  --color-primary-backdrop: light-dark(oklch(93% C H), oklch(28% C H / 40%));
  --color-primary-content: light-dark(oklch(22% C H), oklch(95% C H));
  --color-primary-contrast: light-dark(oklch(98% C H), oklch(14% C H));
  --color-primary-focus: light-dark(oklch((L+6)% C H), oklch((L+6)% C H));
  --color-primary-border: light-dark(oklch((L+6)% C H / 60%), oklch((L+6)% C H / 60%));
  --color-primary-focus-shadow: 0 0 0 4px color-mix(in oklch, var(--color-primary) 40%, transparent), var(--shadow-sm);
}
```
