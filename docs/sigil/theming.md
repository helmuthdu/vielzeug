---
title: Sigil — Theming & Customization
description: Design tokens, dark mode, CSS custom properties, and theme variants for Sigil.
---

# Theming & Customization

[[toc]]

Sigil exposes its entire visual system as CSS custom properties. Every color, spacing value, shadow, and transition is a variable you can override. Nothing requires `!important`.

::: tip New to Sigil?
Read the [Usage Guide](./usage.md) first. This page covers customization only.
:::

## Quick Start

**Change the primary color:**

```css
:root {
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));
  --color-primary-focus: light-dark(oklch(61% 0.18 220deg), oklch(68% 0.18 220deg));
  --color-primary-backdrop: light-dark(oklch(93% 0.05 220deg), oklch(28% 0.08 220deg / 40%));
  --color-primary-content: light-dark(oklch(22% 0.08 220deg), oklch(95% 0.02 220deg));
  --color-primary-contrast: light-dark(oklch(98% 0.01 220deg), oklch(14% 0.05 220deg));
  --color-primary-border: light-dark(oklch(61% 0.18 220deg / 60%), oklch(68% 0.18 220deg / 60%));
  --color-primary-focus-shadow: 0 0 0 4px color-mix(in oklch, var(--color-primary) 40%, transparent), var(--shadow-sm);
}
```

**Toggle dark mode:**

```javascript
document.documentElement.classList.add('dark');    // force dark
document.documentElement.classList.remove('dark'); // force light (falls back to OS)
document.documentElement.classList.toggle('dark'); // toggle
```

Dark mode works automatically from the OS preference. The `.dark` class overrides it. No `@media (prefers-color-scheme)` blocks needed — every color token uses `light-dark()` and resolves based on the active `color-scheme`.

## How Overrides Work

All Sigil tokens live inside `@layer sigil.tokens { … }`. Any unlayered `:root` rule in your stylesheet takes precedence automatically:

```css
/* This wins over sigil.tokens without !important */
:root {
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));
  --rounded-md: 0.5rem;
}
```

If you need to scope overrides to a subtree, put them on a class instead of `:root`:

```css
.my-section {
  --color-primary: light-dark(oklch(60% 0.2 35deg), oklch(66% 0.2 35deg));
}
```

## Semantic Colors

Each semantic color ships with **7 coordinated sub-tokens**. Always define all seven together — a partial override leaves some states using the wrong base color.

| Sub-token                       | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `--color-{name}`                | Base interactive color (buttons, links, highlights)            |
| `--color-{name}-focus`          | Hover and active state                                         |
| `--color-{name}-backdrop`       | Tinted surface behind a colored element                        |
| `--color-{name}-content`        | Foreground text or icon on the base color                      |
| `--color-{name}-contrast`       | High-contrast inverse surface                                  |
| `--color-{name}-border`         | Border at reduced opacity                                      |
| `--color-{name}-focus-shadow`   | Focus ring `box-shadow`                                        |

Available families: **neutral**, **primary**, **secondary**, **info**, **success**, **warning**, **error**.

### Overriding the Neutral Palette

Uncolored components (buttons, inputs, chips without a `color` attribute) use the neutral family. Override it via the `--sigil-color-neutral-*` surface:

```css
:root {
  --sigil-color-neutral: light-dark(oklch(50% 0.01 240deg), oklch(68% 0.01 240deg));
  --sigil-color-neutral-focus: light-dark(oklch(56% 0.01 240deg), oklch(74% 0.01 240deg));
  --sigil-color-neutral-backdrop: light-dark(oklch(95% 0.005 240deg / 83%), oklch(25% 0.005 240deg / 60%));
  --sigil-color-neutral-border: light-dark(oklch(84% 0.006 240deg / 75%), oklch(28% 0.006 240deg / 75%));
  --sigil-color-neutral-content: light-dark(oklch(40% 0.01 240deg), oklch(80% 0.01 240deg));
  --sigil-color-neutral-contrast: light-dark(oklch(99% 0 240deg), oklch(13% 0 240deg));
}
```

This affects every component that defaults to neutral — without needing `color="primary"` on each element.

## Dark Mode

Every color token uses the CSS [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) function. Sigil sets `color-scheme: light dark` on `:root`, so the OS preference applies automatically from day one.

Two rules on `<html>` let you override the OS:

```css
html.dark       { color-scheme: dark; }
html:not(.dark) { color-scheme: light; }
```

Toggle the `.dark` class to switch modes. VitePress handles this automatically — no extra configuration needed when building docs.

### Keeping Overrides Mode-Aware

A flat color override is always light (or always dark). Use `light-dark()` to keep it adaptive:

```css
:root {
  /* ✓ Adapts to light and dark */
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));

  /* ⚠ Static — same in both modes */
  --color-primary: oklch(58% 0.18 220deg);
}
```

OKLCH is recommended for custom colors: lightness steps are perceptually uniform, contrast ratios stay consistent across the ramp, and the wide gamut covers P3 displays.

## Custom Themes

### Scoped Theme Class

Create a theme by defining a full color family on a scoped selector:

```css
.theme-ocean {
  --color-primary: light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg));
  --color-primary-focus: light-dark(oklch(61% 0.18 220deg), oklch(68% 0.18 220deg));
  --color-primary-backdrop: light-dark(oklch(93% 0.05 220deg), oklch(28% 0.08 220deg / 40%));
  --color-primary-content: light-dark(oklch(22% 0.08 220deg), oklch(95% 0.02 220deg));
  --color-primary-contrast: light-dark(oklch(98% 0.01 220deg), oklch(14% 0.05 220deg));
  --color-primary-border: light-dark(oklch(61% 0.18 220deg / 60%), oklch(68% 0.18 220deg / 60%));
  --color-primary-focus-shadow: 0 0 0 4px color-mix(in oklch, var(--color-primary) 40%, transparent), var(--shadow-sm);
}
```

Apply it anywhere in the DOM:

```html
<div class="theme-ocean">
  <sg-button color="primary">Save</sg-button>
</div>
```

### Dynamic Theme Switching

```typescript
const THEMES = {
  ocean: {
    '--color-primary': 'light-dark(oklch(55% 0.18 220deg), oklch(62% 0.18 220deg))',
    '--color-primary-focus': 'light-dark(oklch(61% 0.18 220deg), oklch(68% 0.18 220deg))',
    '--color-primary-backdrop': 'light-dark(oklch(93% 0.05 220deg), oklch(28% 0.08 220deg / 40%))',
    '--color-primary-content': 'light-dark(oklch(22% 0.08 220deg), oklch(95% 0.02 220deg))',
    '--color-primary-contrast': 'light-dark(oklch(98% 0.01 220deg), oklch(14% 0.05 220deg))',
    '--color-primary-border': 'light-dark(oklch(61% 0.18 220deg / 60%), oklch(68% 0.18 220deg / 60%))',
    '--color-primary-focus-shadow': '0 0 0 4px color-mix(in oklch, var(--color-primary) 40%, transparent), var(--shadow-sm)',
  },
} as const;

function applyTheme(name: keyof typeof THEMES) {
  const root = document.documentElement;
  Object.entries(THEMES[name]).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
}
```

## Component-Level Overrides

Each component exposes CSS custom properties for fine-tuned control. Set them inline or in a stylesheet:

```html
<sg-button style="
  --button-bg: linear-gradient(135deg, #667eea, #764ba2);
  --button-radius: 20px;
  --button-padding: 0.75rem 2rem;
">
  Gradient Button
</sg-button>
```

Common component variables:

```css
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

/* sg-text */
--text-size
--text-weight
--text-color
--text-line-height
--text-letter-spacing
```

Refer to each component's documentation for its full variable list.

## Token Reference

### Color Palette

<ColorPalette />

### Contrast Scale

Sigil uses an 11-step contrast scale driven by `light-dark()`. Values flip automatically between light and dark poles — no `@media` query needed.

**Background range (50–400)** — surfaces, borders, UI structure:

| Token                  | Light                     | Dark                      | Usage                              |
| ---------------------- | ------------------------- | ------------------------- | ---------------------------------- |
| `--color-contrast-50`  | oklch(99% 0.001 264deg)   | oklch(17% 0.001 250deg)   | Canvas, page background            |
| `--color-contrast-100` | oklch(97% 0.001 264deg)   | oklch(21% 0.001 250deg)   | Cards, elevated surfaces           |
| `--color-contrast-150` | oklch(95.5% 0.001 264deg) | oklch(23.5% 0.001 250deg) | Midpoint — chip base, subtle fills |
| `--color-contrast-200` | oklch(94% 0.001 264deg)   | oklch(26% 0.001 250deg)   | Nested cards, hover states         |
| `--color-contrast-300` | oklch(89% 0.002 264deg)   | oklch(32% 0.001 250deg)   | Borders, dividers                  |
| `--color-contrast-400` | oklch(81% 0.002 264deg)   | oklch(40% 0.001 250deg)   | Disabled backgrounds, subtle UI    |

**Text range (500–900)** — readability and WCAG compliance:

| Token                  | Light                   | Dark                    | WCAG            | Usage                       |
| ---------------------- | ----------------------- | ----------------------- | --------------- | --------------------------- |
| `--color-contrast-500` | oklch(49% 0.002 264deg) | oklch(58% 0.001 250deg) | AA (large text) | Tertiary text, placeholders |
| `--color-contrast-600` | oklch(40% 0.002 264deg) | oklch(68% 0.001 250deg) | AA              | Secondary / muted text      |
| `--color-contrast-700` | oklch(32% 0.002 264deg) | oklch(78% 0.001 250deg) | AAA             | Supplemental body text      |
| `--color-contrast-800` | oklch(22% 0.002 264deg) | oklch(88% 0.001 250deg) | AAA             | Default body text           |
| `--color-contrast-900` | oklch(12% 0.002 264deg) | oklch(95% 0.001 250deg) | AAA             | Headings, highest contrast  |

**Aliases:**

| Token              | Value                                                              | Usage                             |
| ------------------ | ------------------------------------------------------------------ | --------------------------------- |
| `--color-canvas`   | `color-mix(in oklch, var(--color-contrast-50) 85%, transparent)`   | Default page/component background |
| `--color-divider`  | `color-mix(in oklch, var(--color-contrast-300) 85%, transparent)`  | Separator lines and borders       |
| `--color-contrast` | `color-mix(in oklch, var(--color-contrast-900) 85%, transparent)`  | Maximum-contrast text/icon color  |

### Semantic Text Colors

| Token                    | Contrast step          | Use                               |
| ------------------------ | ---------------------- | --------------------------------- |
| `--text-color-heading`   | `--color-contrast-900` | Headings — AAA                    |
| `--text-color-body`      | `--color-contrast-800` | Default body text — AAA           |
| `--text-color-secondary` | `--color-contrast-600` | Secondary / muted text — AA       |
| `--text-color-tertiary`  | `--color-contrast-500` | Placeholder, hint text — AA large |
| `--text-color-disabled`  | `--color-contrast-400` | Disabled state — decorative only  |
| `--text-color-contrast`  | `--color-contrast-100` | Text on dark/colored backgrounds  |

Prefer semantic tokens over raw contrast values — they stay meaningful in both modes:

```css
/* ✓ Semantic — adapts automatically */
color: var(--text-color-body);

/* ✗ Avoid — raw value is less expressive */
color: var(--color-contrast-800);
```

### Typography

**Body scale (`--text-*`):**

| Token         | Value           |
| ------------- | --------------- |
| `--text-2xs`  | 0.625rem (10px) |
| `--text-xs`   | 0.75rem (12px)  |
| `--text-sm`   | 0.875rem (14px) |
| `--text-base` | 1rem (16px)     |
| `--text-lg`   | 1.125rem (18px) |
| `--text-xl`   | 1.25rem (20px)  |
| `--text-2xl`  | 1.5rem (24px)   |
| `--text-3xl`  | 1.875rem (30px) |

**Heading scale (`--heading-*`)** — used by `<sg-text variant="heading">`:

| Token           | Value           |
| --------------- | --------------- |
| `--heading-xs`  | 0.875rem (14px) |
| `--heading-sm`  | 1rem (16px)     |
| `--heading-md`  | 1.5rem (24px)   |
| `--heading-lg`  | 2rem (32px)     |
| `--heading-xl`  | 3rem (48px)     |
| `--heading-2xl` | 4rem (64px)     |

**Font weights:**

| Token              | Value | Note                        |
| ------------------ | ----- | --------------------------- |
| `--font-thin`      | 100   |                             |
| `--font-extralight`| 200   |                             |
| `--font-light`     | 300   |                             |
| `--font-normal`    | 400   | Minimum for body text       |
| `--font-medium`    | 500   |                             |
| `--font-semibold`  | 600   |                             |
| `--font-bold`      | 700   |                             |
| `--font-extrabold` | 800   |                             |
| `--font-black`     | 900   |                             |

**Letter spacing:**

| Token               | Value      | Use                              |
| ------------------- | ---------- | -------------------------------- |
| `--tracking-tight`  | -0.025em   | Headers, display text            |
| `--tracking-header` | -0.025em   | Alias for `--tracking-tight`     |
| `--tracking-normal` | 0em        | Default body tracking            |
| `--tracking-wide`   | 0.05em     | Labels, badges, uppercase caps   |

**Line heights:**

| Token              | Value  | Use                              |
| ------------------ | ------ | -------------------------------- |
| `--leading-none`   | 1      |                                  |
| `--leading-tight`  | 1.15   | Headings                         |
| `--leading-snug`   | 1.375  |                                  |
| `--leading-normal` | 1.5    | Body text (WCAG recommended)     |
| `--leading-relaxed`| 1.625  |                                  |
| `--leading-loose`  | 2      |                                  |
| `--leading-3`      | 0.75rem (12px) |                          |
| `--leading-4`      | 1rem (16px)    |                          |
| `--leading-5`      | 1.25rem (20px) |                          |
| `--leading-6`      | 1.5rem (24px)  |                          |
| `--leading-7`      | 1.75rem (28px) |                          |
| `--leading-8`      | 2rem (32px)    |                          |
| `--leading-9`      | 2.25rem (36px) |                          |
| `--leading-10`     | 2.5rem (40px)  |                          |

### Transitions & Animation

**Duration scale:**

| Token             | Value  | Zeroed under reduced-motion |
| ----------------- | ------ | --------------------------- |
| `--duration-75`   | 75ms   | Yes                         |
| `--duration-100`  | 100ms  | Yes                         |
| `--duration-150`  | 150ms  | Yes                         |
| `--duration-200`  | 200ms  | Yes                         |
| `--duration-300`  | 300ms  | Yes                         |
| `--duration-500`  | 500ms  | Yes                         |
| `--duration-600`  | 600ms  | No — spinner rotation       |
| `--duration-700`  | 700ms  | Yes                         |
| `--duration-1000` | 1000ms | Yes                         |
| `--duration-1400` | 1400ms | No — looping indicator      |
| `--duration-1500` | 1500ms | No — looping indicator      |

**Easing:**

| Token              | Value                             | Use                            |
| ------------------ | --------------------------------- | ------------------------------ |
| `--ease-linear`    | `linear`                          |                                |
| `--ease-in`        | `cubic-bezier(0.4, 0, 1, 1)`     |                                |
| `--ease-out`       | `cubic-bezier(0, 0, 0.2, 1)`     |                                |
| `--ease-in-out`    | `cubic-bezier(0.4, 0, 0.2, 1)`   | Default for most transitions   |
| `--ease-spring`    | `cubic-bezier(0.22, 1, 0.36, 1)` | Fast start, soft landing       |
| `--ease-move`      | `cubic-bezier(0.25, 1, 0.5, 1)`  | Drawers, panels, carousels     |
| `--ease-overshoot` | `cubic-bezier(0.34, 1.1, 0.64, 1)` | Toasts, popups               |

**Pre-built transitions:**

| Token                 | Value                          | Use                              |
| --------------------- | ------------------------------ | -------------------------------- |
| `--transition-none`   | `none`                         |                                  |
| `--transition-fast`   | `150ms var(--ease-in-out)`     | Hover states, toggles            |
| `--transition-normal` | `200ms var(--ease-in-out)`     | Default                          |
| `--transition-slow`   | `300ms var(--ease-in-out)`     | Panels, accordions               |
| `--transition-slower` | `500ms var(--ease-in-out)`     |                                  |
| `--transition-spring` | `300ms var(--ease-spring)`     | Bouncy interactions              |
| `--transition-exit`   | `300ms var(--ease-out)`        | Overlay dismiss, alert collapse  |
| `--transition-loader` | `600ms linear`                 | Spinner constant rotation        |

::: warning
`--transition-all` does not exist in Sigil. Use explicit property transitions to avoid forcing layout recalculation on every style change:
```css
transition: color var(--transition-fast), background var(--transition-fast);
```
:::

### All Token Categories

| Category                   | Prefix                                      | Description                                        |
| -------------------------- | ------------------------------------------- | -------------------------------------------------- |
| **Spacing Scale**          | `--size-{n}`                                | 4px-increment spacing (0 → 96)                     |
| **Container Sizes**        | `--size-{2xs–7xl}`                          | Named width breakpoints (256px → 1280px)            |
| **Special Sizes**          | `--size-{full,fit,min,max,auto,none,prose}` | Keyword size utilities                             |
| **Viewport & Breakpoints** | `--size-screen-*`                           | Viewport units + breakpoint values                 |
| **Aspect Ratios**          | `--aspect-*`                                | Common aspect ratios (square, video, wide…)        |
| **3D Perspective**         | `--perspective-*`                           | Transform perspective distances                    |
| **Grid Templates**         | `--grid-{1–12}`                             | CSS Grid column repeat helpers                     |
| **Border Widths**          | `--border-*`                                | Stroke widths (0, 1px, 2px, 4px, 8px)              |
| **Ring Utilities**         | `--ring-*`                                  | Focus ring box-shadow helpers                      |
| **Border Radius**          | `--rounded-*`                               | Corner rounding scale                              |
| **Blur Effects**           | `--blur-*`                                  | Blur filter scale                                  |
| **Box Shadows**            | `--shadow-*`                                | Elevation shadows (light-dark aware)               |
| **Inset Shadows**          | `--inset-shadow-*`                          | Inner shadow scale                                 |
| **Drop Shadows**           | `--drop-shadow-*`                           | CSS filter drop-shadows                            |
| **Text Shadows**           | `--text-shadow-*`                           | Typographic text shadows                           |
| **Halo Shadows**           | `--halo-shadow-*`                           | Branded glow per semantic color                    |
| **Font Families**          | `--font-{sans,serif,mono}`                  | System font stacks                                 |
| **Semantic Colors**        | `--color-{name}-*`                          | 7 sub-tokens per semantic color family             |
| **Contrast Scale**         | `--color-contrast-{50–900}`                 | 11-step light/dark adaptive palette                |
| **Section Spacing**        | `--section-spacing`                         | Default block section gap (2rem)                   |

::: details View theme.css
<<< @/../packages/sigil/src/styles/theme.css
:::
