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

Buildit provides a comprehensive set of design tokens organized into the following categories:

| Category | Prefix | Description |
| -------- | ------ | ----------- |
| **Spacing Scale** | `--size-{n}` | 4px-increment spacing (0 → 96) |
| **Container Sizes** | `--size-{2xs–7xl}` | Named width breakpoints (256px → 1280px) |
| **Special Sizes** | `--size-{full,fit,min,max,auto,prose}` | Keyword size utilities |
| **Viewport & Breakpoints** | `--size-screen-*` | Viewport units + breakpoint values |
| **Aspect Ratios** | `--aspect-*` | Common aspect ratios (square, video, wide…) |
| **3D Perspective** | `--perspective-*` | Transform perspective distances |
| **Grid Templates** | `--grid-{1–12}` | CSS Grid column repeat helpers |
| **Border Widths** | `--border-*` | Stroke widths + ring utilities |
| **Border Radius** | `--rounded-*` | Corner rounding scale |
| **Blur Effects** | `--blur-*` | Blur filter scale |
| **Box Shadows** | `--shadow-*` | Elevation shadows |
| **Inset Shadows** | `--inset-shadow-*` | Inner shadow scale |
| **Drop Shadows** | `--drop-shadow-*` | CSS filter drop-shadows |
| **Text Shadows** | `--text-shadow-*` | Typographic text shadows |
| **Halo Shadows** | `--halo-shadow-*` | Branded glow shadows per semantic color |
| **Font Families** | `--font-{sans,serif,mono}` | System font stacks |
| **Font Weights** | `--font-*` | Numeric weight scale (100–900) |
| **Letter Spacing** | `--tracking-*` | Tracking utilities |
| **Line Heights** | `--leading-*` | Relative + absolute line height scale |
| **Body Text Scale** | `--text-{xs–2xl}` | 6-step body font size scale |
| **Heading Scale** | `--heading-{xs–2xl}` | 6-step heading font size scale |
| **Semantic Text Colors** | `--text-color-*` | Role-based text color tokens |
| **Transitions** | `--transition-*` | Pre-built timing + easing combos |
| **Durations** | `--duration-*` | Millisecond step scale |
| **Easing Functions** | `--ease-*` | Named cubic-bezier curves |
| **Contrast Scale** | `--color-contrast-{50–900}` | 10-step light/dark adaptive palette |
| **Semantic Colors** | `--color-{name}-*` | 7 sub-tokens per semantic color |

## Color Palette

<ColorPalette />

### Theme Reference

::: details View theme.css
<<< @/../packages/buildit/src/styles/theme.css
:::

## Contrast Scale

Buildit uses a 10-step contrast scale driven entirely by `light-dark()`. The values flip automatically between the light and dark poles — no `@media` query needed.

### Background Range (50–400)

Optimized for surfaces, borders, and UI structure:

| Token | Light | Dark | Usage |
| ----- | ----- | ---- | ----- |
| `--color-contrast-50`  | hsl(240 5% 98%) | hsl(210 6% 10%) | Canvas, page background |
| `--color-contrast-100` | hsl(240 5% 96%) | hsl(210 5% 14%) | Cards, elevated surfaces |
| `--color-contrast-200` | hsl(240 5% 93%) | hsl(210 5% 18%) | Nested cards, hover states |
| `--color-contrast-300` | hsl(240 5% 88%) | hsl(210 5% 24%) | Borders, dividers |
| `--color-contrast-400` | hsl(240 4% 80%) | hsl(210 4% 32%) | Disabled backgrounds, subtle UI |

### Text Range (500–900)

Optimized for readability and WCAG compliance:

| Token | Light | Dark | WCAG | Usage |
| ----- | ----- | ---- | ---- | ----- |
| `--color-contrast-500` | hsl(240 4% 60%) | hsl(210 4% 52%) | AA (large text) | Tertiary text, placeholders |
| `--color-contrast-600` | hsl(240 4% 46%) | hsl(210 3% 64%) | AA | Secondary / muted text |
| `--color-contrast-700` | hsl(240 4% 32%) | hsl(210 3% 76%) | AAA | Supplemental body text |
| `--color-contrast-800` | hsl(240 4% 22%) | hsl(210 4% 86%) | AAA | Default body text |
| `--color-contrast-900` | hsl(240 4% 12%) | hsl(210 5% 94%) | AAA | Headings, highest contrast |

::: tip Accessibility
All text color values (500–900) meet or exceed WCAG AA standards. Values 700–900 achieve AAA compliance for body text and headings.
:::

## Semantic Text Colors

Six role-based text color tokens are derived from the contrast scale. Use these instead of raw contrast values so your overrides stay meaningful in both light and dark mode.

| Token | Contrast step | Intended use |
| ----- | ------------- | ------------ |
| `--text-color-heading`   | `--color-contrast-900` | Headings — highest contrast, AAA |
| `--text-color-body`      | `--color-contrast-800` | Default body text, AAA |
| `--text-color-secondary` | `--color-contrast-600` | Secondary / muted text, AA |
| `--text-color-tertiary`  | `--color-contrast-500` | Placeholder, hint text — AA large |
| `--text-color-disabled`  | `--color-contrast-400` | Disabled state — decorative only |
| `--text-color-contrast`  | `--color-contrast-100` | Text on dark/colored backgrounds |

```css
/* ✅ Good — semantic token adapts to light and dark automatically */
color: var(--text-color-body);

/* ❌ Avoid — raw contrast value is less expressive */
color: var(--color-contrast-800);
```

## Semantic Colors

Each semantic color ships with **7 coordinated sub-tokens** that cover every common UI need. All values use `light-dark()` and adapt to the active color scheme.

| Sub-token | Purpose |
| --------- | ------- |
| `--color-{name}`          | Base interactive color (buttons, links, highlights) |
| `--color-{name}-backdrop` | Tinted surface behind a colored element |
| `--color-{name}-content`  | Foreground text/icon on the base color |
| `--color-{name}-contrast` | High-contrast surface — light in light mode, dark in dark mode |
| `--color-{name}-focus`    | Hover / active state shift of the base color |
| `--color-{name}-border`   | Border treatment at reduced opacity |
| `--color-{name}-focus-shadow` | Focus ring `box-shadow` with spread + `--shadow-sm` |

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

Buildit uses two parallel font-size scales to cleanly separate body text sizing from display heading sizing.

### Body Scale (`--text-*`)

Used by default for all non-heading text:

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--text-xs`   | 0.75rem (12px)  | Small labels, captions |
| `--text-sm`   | 0.875rem (14px) | Secondary text, labels |
| `--text-base` | 1rem (16px)     | Body text (minimum accessible size) |
| `--text-lg`   | 1.125rem (18px) | Large UI text |
| `--text-xl`   | 1.25rem (20px)  | Subheadings |
| `--text-2xl`  | 1.5rem (24px)   | Major display text |

### Heading Scale (`--heading-*`)

Used exclusively by `variant="heading"` on `<bit-text>`:

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--heading-xs`  | 0.875rem (14px) | Tiny UI heading |
| `--heading-sm`  | 1rem (16px)     | Small heading |
| `--heading-md`  | 1.5rem (24px)   | Default heading size |
| `--heading-lg`  | 2rem (32px)     | Section heading |
| `--heading-xl`  | 3rem (48px)     | Page heading |
| `--heading-2xl` | 4rem (64px)     | Hero / display heading |

### Font Weights

```css
--font-thin:       100;
--font-extralight: 200;
--font-light:      300;
--font-normal:     400; /* minimum for body text */
--font-medium:     500;
--font-semibold:   600;
--font-bold:       700;
--font-extrabold:  800;
--font-black:      900;
```

### Line Heights

```css
--leading-none:    1;
--leading-tight:   1.15;  /* headings */
--leading-snug:    1.375;
--leading-normal:  1.5;   /* body text — WCAG recommended */
--leading-relaxed: 1.625;
--leading-loose:   2;
```

### Letter Spacing

```css
--tracking-header: -0.025em; /* tight tracking for headings */
```

## Dark Mode

Buildit uses the CSS [`light-dark()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) function to define every color token once with both a light and dark value. `color-scheme: light dark` on `:root` means the OS preference is respected automatically — no `@media` block required.

### How it works

Every color variable in the theme is defined like:

```css
--color-primary: light-dark(hsl(260deg 85% 65%), hsl(260deg 85% 70%));
```

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

## Transitions & Animations

Buildit provides pre-built transition and animation tokens. All duration tokens resolve to `0ms` when `prefers-reduced-motion: reduce` is active.

### Easing

```css
--ease-linear:  linear;
--ease-in:      cubic-bezier(0.4, 0, 1, 1);
--ease-out:     cubic-bezier(0, 0, 0.2, 1);
--ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* bouncy */
```

### Pre-built Transitions

```css
--transition-none:   none;
--transition-fast:   150ms var(--ease-in-out);
--transition-normal: 200ms var(--ease-in-out);
--transition-slow:   300ms var(--ease-in-out);
--transition-slower: 500ms var(--ease-in-out);
--transition-spring: 300ms var(--ease-spring);
--transition-all:    all 150ms var(--ease-in-out);
```

## Global Customization

Override the default theme by setting CSS variables in your root stylesheet. A plain value always wins over `light-dark()` — use `light-dark()` yourself when you want the override to stay mode-aware:

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

Each component exposes specific CSS custom properties for fine-tuned control. Set them inline or in a stylesheet scoped to your component.

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

::: tip
Refer to each component's documentation for the complete list of CSS custom properties.
:::

```css
/* bit-text */
--text-size           /* font-size */
--text-weight         /* font-weight */
--text-color          /* color */
--text-line-height    /* line-height */
--text-letter-spacing /* letter-spacing */

/* bit-button */
--button-bg
--button-color
--button-hover-bg
--button-border
--button-radius
--button-padding

/* bit-input */
--input-bg
--input-color
--input-border-color
--input-placeholder-color
--input-radius

/* bit-checkbox */
--checkbox-size
--checkbox-bg
--checkbox-checked-bg
--checkbox-radius
```

## Advanced Theming

### Creating Custom Theme Variants

Create custom theme variants by defining new color palettes on a scoped selector. Use the full 7-token pattern to keep components consistent:

```css
/* Ocean theme */
.theme-ocean {
  --color-primary:              hsl(200deg 100% 50%);
  --color-primary-backdrop:     hsl(200deg 100% 92%);
  --color-primary-content:      hsl(200deg 100% 10%);
  --color-primary-contrast:     hsl(200deg 100% 98%);
  --color-primary-focus:        hsl(200deg 100% 45%);
  --color-primary-border:       hsl(200deg 100% 50% / 60%);
  --color-primary-focus-shadow: 0 0 0 4px hsl(200deg 100% 50% / 15%), var(--shadow-sm);
}

/* Sunset theme */
.theme-sunset {
  --color-primary:              hsl(20deg 100% 55%);
  --color-primary-backdrop:     hsl(20deg 100% 92%);
  --color-primary-content:      hsl(20deg 100% 10%);
  --color-primary-contrast:     hsl(20deg 100% 98%);
  --color-primary-focus:        hsl(20deg 100% 50%);
  --color-primary-border:       hsl(20deg 100% 55% / 60%);
  --color-primary-focus-shadow: 0 0 0 4px hsl(20deg 100% 55% / 15%), var(--shadow-sm);
}
```

### Dynamic Theme Switching

```typescript
type ThemeName = 'ocean' | 'sunset';

const themes: Record<ThemeName, Record<string, string>> = {
  ocean: {
    '--color-primary':              'hsl(200deg 100% 50%)',
    '--color-primary-backdrop':     'hsl(200deg 100% 92%)',
    '--color-primary-content':      'hsl(200deg 100% 10%)',
    '--color-primary-contrast':     'hsl(200deg 100% 98%)',
    '--color-primary-focus':        'hsl(200deg 100% 45%)',
    '--color-primary-border':       'hsl(200deg 100% 50% / 60%)',
  },
  sunset: {
    '--color-primary':              'hsl(20deg 100% 55%)',
    '--color-primary-backdrop':     'hsl(20deg 100% 92%)',
    '--color-primary-content':      'hsl(20deg 100% 10%)',
    '--color-primary-contrast':     'hsl(20deg 100% 98%)',
    '--color-primary-focus':        'hsl(20deg 100% 50%)',
    '--color-primary-border':       'hsl(20deg 100% 55% / 60%)',
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
/* ✅ Good — semantic tokens */
color: var(--text-color-body);
background: var(--color-primary-backdrop);

/* ❌ Avoid — raw contrast values */
color: var(--color-contrast-800);
background: hsl(260deg 85% 65% / 20%);
```

### Respect the Contrast Scale

Use the background range (50–400) for surfaces and the text range (500–900) for text:

```css
/* ✅ Good */
background: var(--color-contrast-100); /* card surface */
color: var(--text-color-body);         /* body text */

/* ❌ Avoid — text-range value used as background */
background: var(--color-contrast-700);
```

### Override with `light-dark()` for Mode-Aware Colors

Flat overrides are always light (or always dark). Wrap in `light-dark()` to keep an override mode-aware:

```css
:root {
  /* ✅ Adapts to light and dark */
  --color-primary: light-dark(hsl(200deg 100% 45%), hsl(200deg 100% 62%));

  /* ⚠️ Static — always the same regardless of color scheme */
  --color-primary: hsl(200deg 100% 50%);
}
```

### Maintain WCAG Compliance

When customizing colors, verify contrast ratios:

- **AA**: 4.5:1 for normal text, 3:1 for large text
- **AAA**: 7:1 for normal text, 4.5:1 for large text

```css
:root {
  --custom-bg:   hsl(210deg 5% 98%);
  --custom-text: hsl(210deg 4% 12%); /* ~17:1 contrast — AAA ✅ */
}
```

### Set the Full Token Set for Custom Colors

When introducing a brand color, define all 7 sub-tokens so every component renders correctly in both modes:

```css
.my-brand {
  --color-primary:              light-dark(hsl(…), hsl(…));
  --color-primary-backdrop:     light-dark(hsl(…), hsl(…));
  --color-primary-content:      light-dark(hsl(…), hsl(…));
  --color-primary-contrast:     light-dark(hsl(…), hsl(…));
  --color-primary-focus:        light-dark(hsl(…), hsl(…));
  --color-primary-border:       light-dark(hsl(… / 60%), hsl(… / 60%));
  --color-primary-focus-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 15%, transparent), var(--shadow-sm);
}
```
