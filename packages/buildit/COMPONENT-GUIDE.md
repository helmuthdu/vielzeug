# Component Development Guide

This guide documents the patterns and best practices for developing Buildit components. All patterns have been battle-tested across our current component library.

Each section is tagged as:

- **[Required]** – must be followed for all components
- **[Recommended]** – should be followed in most cases; can be added iteratively
- **[Optional]** – useful in specific contexts; adopt when it makes sense

---

## 1. Current Component Library

**Base Components** (`src/base/`)

- ✅ `bit-button` – Interactive button with variants and states
- ✅ `bit-button-group` – Group of related buttons
- ✅ `bit-accordion` – Collapsible content container
- ✅ `bit-accordion-item` – Individual accordion section

**Form Components** (`src/form/`)

- ✅ `bit-checkbox` – Checkbox input with indeterminate state
- ✅ `bit-radio` – Radio button input with keyboard navigation

---

## 2. At a Glance

### 2.1 Core Rules [Required]

All components must:

- Use `bit-[component-name]` (singular, kebab-case) for element names.
- Use per-component directories:  
  `src/[category]/[component-name]/[component-name].ts`.
- Define a props type: `[ComponentName]Props` and use it in  
  `defineElement<HTMLElement, [ComponentName]Props>(...)`.
- Reflect public props to attributes when needed; boolean attributes use presence/absence, not `"true"`/`"false"`.
- Use design tokens (colors, spacing, typography, shadows); avoid hard-coded values.
- Expose CSS custom properties with component-prefixed naming (`--button-*`, `--checkbox-*`, etc.).
- Support variants, colors, sizes where applicable.
- Implement states via attributes (`disabled`, `loading`, `checked`, etc.) with matching visual behavior.
- Provide proper ARIA and keyboard support for interactive components.
- Emit events from the host (`bit-*`) with `CustomEvent` and a `detail` object including `originalEvent` when user-driven.
- Add unit tests for structure, states, events, attributes, ARIA, and keyboard behavior.
- Add documentation with overview, basic usage, API (attributes/slots/events), and accessibility notes.

### 2.2 Recommended Extras [Recommended]

Whenever possible, also add:

- Accessibility tests using axe-core for complex components.
- Haptics for mobile/touch-first contexts via a shared utility.
- Framework integration examples (React, Vue, Svelte).
- Story/playground entries for visual regression testing.

---

## 3. Component Structure

### 3.1 File Organization [Required]

Components are organized by category for easy discovery and maintenance.

**Directory structure**

```txt
src/[component-category]/[component-name]/
├── [component-name].ts               # Main component file
└── __tests__/
    ├── [component-name].test.ts      # Unit tests
    └── [component-name].a11y.test.ts # Accessibility tests (Recommended)
```

**Example**

```txt
src/form/checkbox/
├── checkbox.ts
└── __tests__/
    ├── checkbox.test.ts
    └── checkbox.a11y.test.ts
```

### 3.2 Component File Template [Required]

```typescript
import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * Component JSDoc header
 *
 * @element bit-[component-name]
 *
 * @attr {type} attribute-name - Description
 * ... all attributes documented
 *
 * @slot - Default slot description
 * @slot slot-name - Named slot description
 *
 * @fires event-name - Event description with detail type
 */

// -------------------- Styles --------------------
const styles = css`
  /* Component styles */
`;

// -------------------- Props Type --------------------
export type [ComponentName]Props = {
  variant?: 'solid' | 'outline' | 'ghost';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  // ... component-specific props
};

// -------------------- Component Definition --------------------
// Host type is usually HTMLElement (the custom element itself).
defineElement<HTMLElement, [ComponentName]Props>('bit-[component-name]', {
  // Attribute reflection rules:
  // - Boolean attributes: presence/absence => true/false
  // - String/enum attributes: attribute value => prop value
  observedAttributes: ['variant', 'color', 'size', 'disabled'] as const,

  styles: [styles],

  template: (el) => html`
    <!-- Component template -->
  `,

  onConnected(el) {
    // Event handlers, initial state sync
  },

  onAttributeChanged(el, name, oldValue, newValue) {
    // Keep internal state and ARIA in sync with attribute changes
  },
});

export default {};
```

### 3.3 Attribute/Prop Guidelines [Required]

- Boolean props (e.g. `disabled`, `loading`, `checked`) must be represented as **presence/absence** attributes:
  - `el.hasAttribute('disabled')` → `true`.
  - Do not rely on `"true"` or `"false"` attribute string values.
- Enum/string attributes should fall back to safe defaults on invalid values.
- Explicitly document which props are reflected as attributes and which are internal-only.

---

## 4. Naming Conventions [Required]

- **Element name:** `bit-[component-name]` (singular, kebab-case)
  - `bit-button`, `bit-checkbox`, `bit-accordion-item`
- **File name:** `[component-name].ts` (singular, lowercase)
  - `button.ts`, `checkbox.ts`, `accordion-item.ts`
- **Directory name:** Matches component name
  - `src/base/button/`, `src/form/checkbox/`
- **Import path:** `@vielzeug/buildit/[component-name]`
  - `@vielzeug/buildit/button`
- **Props type:** `[ComponentName]Props`
  - `ButtonProps`, `CheckboxProps`, `AccordionItemProps`

---

## 5. Design System Integration

All components must integrate with the unified design system.

### 5.1 Platform Strategy [Required]

- Prefer brand-first components over platform-native lookalikes.
- Behavior and appearance should be unified across platforms (iOS, Android, web) where possible.
- The theme automatically adapts to light/dark mode via `prefers-color-scheme`.

### 5.2 Variants [Required]

Standard visual variants for components:

```typescript
type Variant = 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text';

/* Usage */
:host([variant='solid']) { /* styles */ }
:host([variant='outline']) { /* styles */ }
```

### 5.3 Colors [Required]

Semantic color palette with automatic light/dark mode support:

```typescript
type Color = 'primary' | 'secondary' | 'success' | 'warning' | 'error';

/* Usage - each color has 5 variants */
:host([color='primary']) {
  --component-bg: var(--color-primary);
  --component-text: var(--color-primary-contrast);
  --component-focus: var(--color-primary-focus);
  --component-content: var(--color-primary-content);
  --component-backdrop: var(--color-primary-backdrop);
}
```

**Available color tokens per semantic color:**
- `--color-{name}` - Base color
- `--color-{name}-contrast` - High contrast text/foreground
- `--color-{name}-focus` - Focus/hover state
- `--color-{name}-content` - Alternative content color
- `--color-{name}-backdrop` - Subtle background/overlay

### 5.4 Sizes [Required]

```typescript
type Size = 'sm' | 'md' | 'lg';

/* Usage with spacing tokens */
:host([size='sm']) {
  --component-padding: var(--size-1-5) var(--size-3);
  --component-font-size: var(--text-sm);
  height: var(--size-8);
}

:host([size='md']) {
  --component-padding: var(--size-2) var(--size-4);
  --component-font-size: var(--text-sm);
  height: var(--size-10);
}

:host([size='lg']) {
  --component-padding: var(--size-2-5) var(--size-5);
  --component-font-size: var(--text-md);
  height: var(--size-12);
}
```

### 5.5 Typography [Required]

Use semantic typography tokens:

```typescript
type TextSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl';
type Weight = 'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
type Leading = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl';

/* Usage */
:host([size='md']) {
  font-size: var(--text-md);
  line-height: var(--leading-md);
}

:host([weight='bold']) {
  font-weight: var(--font-weight-bold);
}

/* Semantic text colors (auto-adapt to theme) */
:host {
  color: var(--text-color-body);
}

h1, h2, h3 {
  color: var(--text-color-heading);
}

.secondary-text {
  color: var(--text-color-secondary);
}
```

**Text color tokens:**
- `--text-color-heading` - Headings (highest contrast)
- `--text-color-body` - Body text
- `--text-color-secondary` - Secondary text
- `--text-color-tertiary` - Tertiary/muted text
- `--text-color-disabled` - Disabled text
- `--text-color-contrast` - Text on dark backgrounds

### 5.6 Spacing & Grid [Required]

Use the `--size-*` scale with 8px base rhythm (`1rem = 16px`).

```css
/* Spacing scale (0.25rem increments up to 3rem, then larger jumps) */
:host {
  padding: var(--size-4);  /* 1rem = 16px */
  gap: var(--size-2);      /* 0.5rem = 8px */
  margin: var(--size-6);   /* 1.5rem = 24px */
}

/* Named sizes for common breakpoints */
.container {
  max-width: var(--size-xl);  /* 36rem = 576px */
  width: var(--size-full);    /* 100% */
}

/* Grid patterns */
.grid {
  grid-template-columns: var(--grid-12);  /* 12-column grid */
}
```

**Available spacing tokens:**
- Fine-grained: `--size-0-25`, `--size-0-5`, `--size-1` through `--size-96`
- Named sizes: `--size-xs` through `--size-7xl`
- Special: `--size-full`, `--size-fit`, `--size-min`, `--size-max`, `--size-auto`, `--size-prose`
- Screen sizes: `--size-screen-width`, `--size-screen-height`
- Breakpoints: `--size-screen-xs` through `--size-screen-2xl`
- Grid: `--grid-1` through `--grid-12`

### 5.7 Border Radius [Required]

```css
:host {
  border-radius: var(--rounded-md);  /* Standard - 0.375rem */
}

/* Available radius tokens */
--rounded-xs   /* 0.125rem - subtle */
--rounded-sm   /* 0.25rem */
--rounded      /* 0.25rem - default */
--rounded-md   /* 0.375rem - most common */
--rounded-lg   /* 0.5rem */
--rounded-xl   /* 0.75rem */
--rounded-2xl  /* 1rem */
--rounded-3xl  /* 1.5rem */
--rounded-full /* 9999px - circular */
```

### 5.8 Elevation [Required]

Use semantic shadow tokens for depth:

```css
/* Standard elevation */
:host {
  box-shadow: var(--shadow-md);
}

/* Available shadow tokens */
--shadow       /* Default - subtle */
--shadow-sm    /* Very subtle */
--shadow-md    /* Medium - cards */
--shadow-lg    /* Large - modals */
--shadow-xl    /* Extra large - popovers */
--shadow-2xl   /* Maximum elevation */
--shadow-inner /* Inset shadow */
```

### 5.9 Borders [Required]

```css
:host {
  border: var(--border) solid currentColor;  /* 1px */
  outline: var(--border-2) solid;            /* 2px */
}

/* Available border widths */
--border-0  /* 0 - no border */
--border    /* 1px - default */
--border-2  /* 2px */
--border-4  /* 4px */
--border-8  /* 8px */

/* Ring shadows (for focus states) */
--ring      /* 0 0 0 1px */
--ring-2    /* 0 0 0 2px */
--ring-4    /* 0 0 0 4px */
--ring-8    /* 0 0 0 8px */
```

### 5.10 Blur Effects [Optional]

```css
/* Backdrop blur for glass morphism */
.glass {
  backdrop-filter: blur(var(--blur-md));
}

/* Available blur tokens */
--blur-xs   /* 4px */
--blur-sm   /* 8px */
--blur-md   /* 12px */
--blur-lg   /* 16px */
--blur-xl   /* 24px */
--blur-2xl  /* 40px */
--blur-3xl  /* 64px */
```

---

## 6. State Management

### 6.1 Boolean States [Required]

Examples:

```typescript
// General
disabled?: boolean;
loading?: boolean;

// Form
checked?: boolean;
indeterminate?: boolean;

// Containers
expanded?: boolean;
```

Behavior:

- `el.hasAttribute('disabled')` → `true` means disabled.
- Avoid `"true"`/`"false"` attributes.

### 6.2 State CSS [Required]

```css
:host([disabled]) {
  pointer-events: none;
  opacity: 0.6;
  cursor: not-allowed;
}

:host([loading]) {
  pointer-events: none;
}

:host([checked]) .checkmark {
  opacity: 1;
  transform: scale(1);
}

:host([expanded]) .content {
  display: block;
}
```

### 6.3 Attribute Change Handling [Required]

```typescript
onAttributeChanged(el, name, _oldValue, newValue) {
  const host = el as unknown as HTMLElement;

  if (name === 'disabled') {
    host.setAttribute('aria-disabled', newValue !== null ? 'true' : 'false');
  }

  if (name === 'checked') {
    const input = el.query('input');
    if (input) {
      (input as HTMLInputElement).checked = newValue !== null;
    }
  }
}
```

---

## 7. CSS Custom Properties

### 7.1 Pattern [Required]

Expose CSS variables for theming:

```css
:host {
  /* Colors & Backgrounds */
  --component-bg: /* default */;
  --component-color: /* default */;
  --component-hover-bg: /* default */;
  --component-active-bg: /* default */;

  /* Borders & Spacing */
  --component-border: /* default */;
  --component-radius: /* default */;
  --component-padding: /* default */;
  --component-gap: /* default */;

  /* Typography */
  --component-font-size: /* default */;
  --component-font-weight: /* default */;
  --component-line-height: /* default */;

  /* Effects */
  --component-shadow: /* default */;
  --component-transition: /* default */;
}
```

### 7.2 Naming [Required]

- Prefix with component: `--button-*`, `--checkbox-*`, `--select-*`.
- Use clear suffixes: `-bg`, `-color`, `-hover-bg`, `-border`, `-padding`, etc.
- Reference theme tokens: e.g. `var(--color-primary)`, `var(--size-4)`, `var(--text-sm)`.

---

## 8. Design Tokens

### 8.1 Usage Rules [Required]

Always use design tokens; avoid hard-coded values.

```css
/* ✅ Good - Uses design tokens */
:host([color='primary']) {
  --button-bg: var(--color-primary);
  --button-text: var(--color-primary-contrast);
  --button-focus: var(--color-primary-focus);
  --button-padding: var(--size-2) var(--size-4);
  --button-font-size: var(--text-sm);
  --button-radius: var(--rounded-md);
  box-shadow: var(--shadow-sm);
}

/* ❌ Bad - Hardcoded values */
:host([color='primary']) {
  --button-bg: #3b82f6;
  --button-text: #ffffff;
  --button-padding: 0.5rem 1rem;
  border-radius: 6px;
}
```

### 8.2 Token Categories

#### 8.2.1 Semantic Colors

Each semantic color has 5 variants for different use cases:

**Primary** (Vibrant blue - accessible for all colorblind types)
- `--color-primary` - Base color for backgrounds
- `--color-primary-contrast` - High contrast text on primary background
- `--color-primary-focus` - Hover/focus states
- `--color-primary-content` - Alternative text color
- `--color-primary-backdrop` - Subtle background/overlay

**Secondary** (Blue-gray for neutral actions)
- `--color-secondary-base` - Base color
- `--color-secondary-contrast` - Contrast text
- `--color-secondary-focus` - Focus state
- `--color-secondary-content` - Content color
- `--color-secondary-backdrop` - Background

**Success** (Teal/cyan - better for red-green colorblindness)
- `--color-success` - Base
- `--color-success-contrast` - Contrast
- `--color-success-focus` - Focus
- `--color-success-content` - Content
- `--color-success-backdrop` - Backdrop

**Warning** (Amber/orange - distinct from error)
- `--color-warning` - Base
- `--color-warning-contrast` - Contrast
- `--color-warning-focus` - Focus
- `--color-warning-content` - Content
- `--color-warning-backdrop` - Backdrop

**Error** (Magenta/vermillion - better for colorblindness)
- `--color-error` - Base
- `--color-error-contrast` - Contrast
- `--color-error-focus` - Focus
- `--color-error-content` - Content
- `--color-error-backdrop` - Backdrop

#### 8.2.2 Neutral Colors

10-step grayscale (auto-adapts light/dark):

- `--color-contrast-50` - Lightest (light mode) / Darkest (dark mode)
- `--color-contrast-100` through `--color-contrast-900`
- `--color-contrast-900` - Darkest (light mode) / Lightest (dark mode)

**Special neutrals:**
- `--color-canvas` - Main background (maps to `--color-contrast-50`)
- `--color-contrast` - Default text (maps to `--color-contrast-900`)

#### 8.2.3 Text Colors

Semantic text colors that automatically adapt to theme:

- `--text-color-heading` - Headings (highest contrast)
- `--text-color-body` - Body text (primary reading color)
- `--text-color-secondary` - Secondary text (less emphasis)
- `--text-color-tertiary` - Tertiary/muted text
- `--text-color-disabled` - Disabled state text
- `--text-color-contrast` - Text on dark backgrounds

#### 8.2.4 Spacing

**Fine-grained scale** (`0.25rem` increments):
```css
--size-0-25  /* 0.0625rem - 1px */
--size-0-5   /* 0.125rem - 2px */
--size-1     /* 0.25rem - 4px */
--size-1-5   /* 0.375rem - 6px */
--size-2     /* 0.5rem - 8px */
--size-2-5   /* 0.625rem - 10px */
--size-3     /* 0.75rem - 12px */
--size-3-5   /* 0.875rem - 14px */
--size-4     /* 1rem - 16px - BASE */
--size-5     /* 1.25rem - 20px */
--size-6     /* 1.5rem - 24px */
--size-7     /* 1.75rem - 28px */
--size-8     /* 2rem - 32px */
--size-9     /* 2.25rem - 36px */
--size-10    /* 2.5rem - 40px */
--size-11    /* 2.75rem - 44px - minimum touch target */
--size-12    /* 3rem - 48px */
```

**Larger increments:**
```css
--size-14, --size-16, --size-20, --size-24, --size-28
--size-32, --size-36, --size-40, --size-44, --size-48
--size-52, --size-56, --size-60, --size-64
--size-72, --size-80, --size-96
```

**Named container sizes:**
```css
--size-xs    /* 20rem - 320px */
--size-sm    /* 24rem - 384px */
--size-md    /* 28rem - 448px */
--size-lg    /* 32rem - 512px */
--size-xl    /* 36rem - 576px */
--size-2xl   /* 42rem - 672px */
--size-3xl   /* 48rem - 768px */
--size-4xl   /* 56rem - 896px */
--size-5xl   /* 64rem - 1024px */
--size-6xl   /* 72rem - 1152px */
--size-7xl   /* 80rem - 1280px */
```

**Special sizing:**
```css
--size-full   /* 100% */
--size-fit    /* fit-content */
--size-min    /* min-content */
--size-max    /* max-content */
--size-auto   /* auto */
--size-none   /* none */
--size-prose  /* 65ch - optimal reading width */
```

**Viewport:**
```css
--size-screen-width   /* 100dvw */
--size-screen-height  /* 100dvh */
```

**Breakpoints:**
```css
--size-screen-xs   /* 480px */
--size-screen-sm   /* 640px */
--size-screen-md   /* 768px */
--size-screen-lg   /* 1024px */
--size-screen-xl   /* 1280px */
--size-screen-2xl  /* 1536px */
```

**Grid columns:**
```css
--grid-1 through --grid-12  /* repeat(N, minmax(0, 1fr)) */
```

#### 8.2.5 Typography

**Font sizes:**
```css
--text-xxs   /* 0.625rem - 10px */
--text-xs    /* 0.75rem - 12px */
--text-sm    /* 0.875rem - 14px */
--text-md    /* 1rem - 16px - BASE */
--text-lg    /* 1.125rem - 18px */
--text-xl    /* 1.25rem - 20px */
--text-2xl   /* 1.5rem - 24px */
--text-3xl   /* 1.875rem - 30px */
--text-4xl   /* 2.25rem - 36px */
--text-5xl   /* 3rem - 48px */
--text-6xl   /* 3.75rem - 60px */
--text-7xl   /* 4.5rem - 72px */
--text-8xl   /* 6rem - 96px */
--text-9xl   /* 8rem - 128px */
```

**Font weights:**
```css
--font-weight-thin        /* 100 */
--font-weight-extralight  /* 200 */
--font-weight-light       /* 300 */
--font-weight-normal      /* 400 */
--font-weight-medium      /* 500 */
--font-weight-semibold    /* 600 */
--font-weight-bold        /* 700 */
--font-weight-extrabold   /* 800 */
--font-weight-black       /* 900 */
```

**Line heights (leading):**
```css
--leading-xxs   /* 0.75rem */
--leading-xs    /* 1rem */
--leading-sm    /* 1.25rem */
--leading-md    /* 1.5rem */
--leading-lg    /* 1.625rem */
--leading-xl    /* 1.75rem */
--leading-2xl   /* 2rem */
--leading-3xl   /* 2.25rem */
--leading-4xl   /* 2.5rem */
--leading-5xl   /* 3.5rem */
--leading-6xl   /* 4rem */
--leading-7xl   /* 5rem */
--leading-8xl   /* 7rem */
--leading-9xl   /* 9rem */
```

#### 8.2.6 Borders

**Widths:**
```css
--border-0   /* 0 */
--border     /* 1px - default */
--border-2   /* 2px */
--border-4   /* 4px */
--border-8   /* 8px */
```

**Radius:**
```css
--rounded-xs    /* 0.125rem - 2px */
--rounded-sm    /* 0.25rem - 4px */
--rounded       /* 0.25rem - 4px */
--rounded-md    /* 0.375rem - 6px - most common */
--rounded-lg    /* 0.5rem - 8px */
--rounded-xl    /* 0.75rem - 12px */
--rounded-2xl   /* 1rem - 16px */
--rounded-3xl   /* 1.5rem - 24px */
--rounded-full  /* 9999px - circular */
```

**Ring (for focus states):**
```css
--ring     /* 0 0 0 1px */
--ring-2   /* 0 0 0 2px */
--ring-4   /* 0 0 0 4px */
--ring-8   /* 0 0 0 8px */
```

#### 8.2.7 Shadows

```css
--shadow       /* Default - subtle depth */
--shadow-sm    /* Minimal - 1px offset */
--shadow-md    /* Medium - cards */
--shadow-lg    /* Large - elevated panels */
--shadow-xl    /* Extra large - modals */
--shadow-2xl   /* Maximum - overlays */
--shadow-inner /* Inset shadow */
```

#### 8.2.8 Blur

```css
--blur-xs    /* 4px */
--blur-sm    /* 8px */
--blur-md    /* 12px */
--blur-lg    /* 16px */
--blur-xl    /* 24px */
--blur-2xl   /* 40px */
--blur-3xl   /* 64px */
```

### 8.3 Theme Adaptation

All color tokens automatically adapt to light/dark mode via:
- `@media (prefers-color-scheme: dark)` - System preference
- `.dark-theme` class - Manual dark mode
- `.light-theme` class - Manual light mode

**In dark mode:**
- `--color-contrast-50` becomes dark (was light)
- `--color-contrast-900` becomes light (was dark)
- Semantic colors adjust for better dark backgrounds
- Text colors automatically flip for proper contrast

### 8.4 Best Practices

**Use semantic tokens first:**
```css
/* ✅ Preferred - semantic meaning */
color: var(--text-color-body);
background: var(--color-primary);

/* ⚠️ Use sparingly - more specific control */
color: var(--color-contrast-700);
background: var(--color-contrast-100);
```

**Combine tokens for consistency:**
```css
:host {
  padding: var(--size-2) var(--size-4);      /* Vertical, horizontal */
  font-size: var(--text-sm);
  line-height: var(--leading-sm);
  border-radius: var(--rounded-md);
  box-shadow: var(--shadow-sm);
}
```

**Respect the spacing scale:**
```css
/* ✅ Good - uses scale */
gap: var(--size-2);        /* 8px */
padding: var(--size-4);    /* 16px */
margin: var(--size-6);     /* 24px */

/* ❌ Bad - arbitrary values */
gap: 0.6rem;
padding: 1.1rem;
margin: 1.3rem;
```

---

## 9. Slots

### 9.1 Pattern [Required when content is flexible]

Use slots to support flexible content.

**Button with prefix/suffix (`bit-button`)**

```typescript
template: (el) => html`
  <button>
    <slot name="prefix"></slot>
    <span class="label">
      <slot></slot>
    </span>
    <slot name="suffix"></slot>
  </button>
`;
```

**Accordion item (`bit-accordion-item`)**

```typescript
template: (el) => html`
  <details>
    <summary>
      <slot name="icon"></slot>
      <slot name="title"></slot>
      <slot name="subtitle"></slot>
      <slot name="indicator"></slot>
    </summary>
    <div class="content">
      <slot></slot>
    </div>
  </details>
`;
```

**Common slot names**

- `prefix` / `suffix`
- `icon`
- `title` / `subtitle`
- `indicator`
- `(default)` – main content

---

## 10. Event Handling

### 10.1 Event Wiring Pattern [Required]

- Bind native events on inner elements (`button`, `input`, etc.).
- Re-emit `CustomEvent`s from the host with a `detail` payload.
- Include:
  - `originalEvent`: the native event (for user-driven events).
  - Component state: e.g. `checked`, `value`, `expanded`.

**Button click**

```typescript
onConnected(el) {
  el.on('button', 'click', (e: Event) => {
    if (el.hasAttribute('disabled') || el.hasAttribute('loading')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    el.emit('click', { originalEvent: e });
  });
}
```

**Checkbox change**

```typescript
onConnected(el) {
  const host = el as unknown as HTMLElement;

  el.on('input', 'change', (e: Event) => {
    const input = e.target as HTMLInputElement;
    const nextChecked = input.checked;

    if (nextChecked) {
      host.setAttribute('checked', '');
    } else {
      host.removeAttribute('checked');
    }

    host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');

    el.emit('change', {
      checked: nextChecked,
      value: host.getAttribute('value'),
      originalEvent: e,
    });
  });
}
```

**Radio keyboard navigation**

```typescript
const host = el as unknown as HTMLElement;

host.addEventListener('keydown', (e: KeyboardEvent) => {
  if (host.hasAttribute('disabled')) return;

  const name = host.getAttribute('name');
  if (!name) return;

  const radios = Array.from(document.querySelectorAll(`bit-radio[name="${name}"]`)) as HTMLElement[];

  const currentIndex = radios.indexOf(host);
  let nextIndex = currentIndex;

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % radios.length;
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + radios.length) % radios.length;
  }

  if (nextIndex !== currentIndex) {
    e.preventDefault();
    radios[nextIndex].click();
    radios[nextIndex].focus();
  }
});
```

### 10.2 Event Naming [Required]

- Prefer DOM-like names: `click`, `change`, `input`, `focus`, `blur`.
- Use descriptive names for custom behaviors: `expand`, `collapse`, `select`, etc.
- Use `CustomEvent` with a `detail` object for all host events.

---

## 11. Accessibility

### 11.1 General Guidance [Required]

- Prefer **native semantics** first: `<button>`, `<input>`, `<details>/<summary>`, etc.
- Only add ARIA roles/attributes when:
  - Native semantics are insufficient, or
  - You’re implementing a custom widget.
- Use only valid ARIA values (`'true'`, `'false'`, `'mixed'`), not empty strings.

### 11.2 Examples

**Button (`bit-button`)**

```typescript
template: (el) => html`
  <button
    type="${el.getAttribute('type') || 'button'}"
    ?disabled="${el.hasAttribute('disabled') || el.hasAttribute('loading')}"
    aria-disabled="${el.hasAttribute('disabled') || el.hasAttribute('loading') ? 'true' : 'false'}"
    aria-busy="${el.hasAttribute('loading') ? 'true' : 'false'}">
    <!-- content -->
  </button>
`;
```

**Checkbox (`bit-checkbox`)**

```typescript
template: (el) => html`
  <div class="checkbox-wrapper">
    <input
      type="checkbox"
      ?checked="${el.hasAttribute('checked')}"
      ?disabled="${el.hasAttribute('disabled')}"
      .indeterminate="${el.hasAttribute('indeterminate')}"
      aria-checked="${el.hasAttribute('indeterminate') ? 'mixed' : el.hasAttribute('checked') ? 'true' : 'false'}"
      aria-disabled="${el.hasAttribute('disabled') ? 'true' : 'false'}" />
    <slot></slot>
  </div>
`;
```

**Accordion item (`bit-accordion-item`)**

```typescript
template: (el) => html`
  <details ?open="${el.hasAttribute('expanded')}">
    <summary
      aria-expanded="${el.hasAttribute('expanded') ? 'true' : 'false'}"
      aria-disabled="${el.hasAttribute('disabled') ? 'true' : 'false'}">
      <!-- header content -->
    </summary>
    <div class="content" role="region">
      <slot></slot>
    </div>
  </details>
`;
```

> We rely on native `<details>/<summary>` semantics. Avoid adding `role="button"` unless replacing native behavior.

### 11.3 Keyboard Support [Required for interactive components]

Patterns to follow:

- `Space` / `Enter` – activate buttons, toggle checkboxes/switches.
- Arrow keys – move within groups (radios, tabs, menus).
- `Escape` – close dialogs, dropdowns, popovers.
- `Tab` / `Shift+Tab` – respect and, if needed, manage focus order.

Example for radios:

```typescript
host.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    focusNextRadio();
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    focusPreviousRadio();
  }
});
```

---

## 12. Form Integration

### 12.1 Form Attributes [Required for form-related components]

Support native form attributes:

```typescript
type FormProps = {
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string;
  required?: boolean;
};

template: (el) => html`
  <button
    type="${el.getAttribute('type') || 'button'}"
    name="${el.getAttribute('name') || ''}"
    value="${el.getAttribute('value') || ''}"
    ?required="${el.hasAttribute('required')}">
    <!-- content -->
  </button>
`;
```

### 12.2 Form-Associated Custom Elements [Optional]

If using `ElementInternals`:

- Use `formAssociated` and `internals` where appropriate.
- Keep behavior aligned with native controls.

---

## 13. Testing

### 13.1 Unit Tests [Required]

Example `component.test.ts`:

```typescript
import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-checkbox', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  describe('Rendering', () => {
    it('should render with correct structure', async () => {
      const fixture = await createFixture('bit-checkbox');
      const wrapper = fixture.query('.checkbox-wrapper');
      expect(wrapper).toBeTruthy();
      fixture.destroy();
    });
  });

  describe('States', () => {
    it('should handle checked state', async () => {
      const fixture = await createFixture('bit-checkbox', { checked: true });
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      const input = fixture.query('input') as HTMLInputElement;
      expect(input.checked).toBe(true);
      fixture.destroy();
    });

    it('should handle indeterminate state', async () => {
      const fixture = await createFixture('bit-checkbox', { indeterminate: true });
      const input = fixture.query('input') as HTMLInputElement;
      expect(input.indeterminate).toBe(true);
      fixture.destroy();
    });
  });

  describe('Events', () => {
    it('should emit change event with details', async () => {
      const fixture = await createFixture('bit-checkbox');
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);

      const input = fixture.query('input') as HTMLInputElement;
      input.click();

      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            checked: true,
          }),
        }),
      );

      fixture.destroy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const fixture = await createFixture('bit-checkbox', {
        checked: true,
        disabled: true,
      });

      const input = fixture.query('input') as HTMLInputElement;
      expect(input.getAttribute('aria-checked')).toBe('true');
      expect(input.getAttribute('aria-disabled')).toBe('true');

      fixture.destroy();
    });
  });
});
```

### 13.2 Accessibility Tests [Recommended]

```typescript
import axe from 'axe-core';
import { createFixture } from '@vielzeug/craftit/testing';

describe('bit-button accessibility', () => {
  beforeAll(async () => {
    await import('../button');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await createFixture('bit-button');
    fixture.element.textContent = 'Click me';

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);

    fixture.destroy();
  });

  it('should be keyboard accessible', async () => {
    const fixture = await createFixture('bit-button');
    const button = fixture.query('button');

    expect(button?.getAttribute('tabindex')).not.toBe('-1');

    fixture.destroy();
  });
});
```

### 13.3 Coverage Expectations [Required]

Tests must cover:

- Rendering and DOM structure.
- All variants, colors, sizes (where applicable).
- All states (disabled, loading, checked, expanded, etc.).
- Event emission (including `detail` shape).
- Attribute updates via `onAttributeChanged`.
- Keyboard interactions.
- ARIA attributes.
- Edge cases (empty content, invalid values, etc.).

### 13.4 Visual Testing [Recommended]

- Add stories/playgrounds (Storybook, Ladle, VitePress demos) to visually verify states and variants.

---

## 14. Haptics & Interaction

### 14.1 Haptics [Recommended]

Use haptics to enhance mobile/touch interactions when appropriate:

- Centralize in a utility (no direct `navigator.vibrate` in components).
- Respect environment (mobile vs desktop).
- Allow global opt-out (config/flag).
- Respect user preferences (e.g. future reduced-haptics setting).

```typescript
const triggerHaptic = (type: 'light' | 'warning') => {
  if (!window.navigator.vibrate) return;
  if (type === 'light') window.navigator.vibrate(10);
  if (type === 'warning') window.navigator.vibrate([10, 30, 10]);
};

onConnected(el) {
  el.on('input', 'change', () => {
    // Optional: triggerHaptic('light');
  });
}
```

### 14.2 Interaction States [Required for touch-friendly components]

```css
:host(:active:not([disabled])) {
  transform: scale(0.97);
  filter: brightness(0.9);
  transition: transform 50ms ease;
}
```

### 14.3 Gesture Safety [Required for touch-targeted controls]

```css
:host {
  min-height: var(--size-11); /* ~44px touch target */
  touch-action: manipulation;
}
```

---

## 15. Documentation

Each component must have docs at `/docs/buildit/components/bit-[component-name].md`.

### 15.1 Minimal Documentation [Required]

Must include:

- Overview (1–2 sentences).
- Basic usage (import + minimal HTML).
- Attributes table (name, type, default, description).
- Events table (name, detail, description).
- Accessibility notes (role, ARIA attributes, keyboard behavior).

### 15.2 Full Documentation [Recommended]

````markdown
---
title: Component Name
description: Brief description
---

# Component Name

Brief overview of what the component does.

## Features

✨ **Feature 1** – Description  
✨ **Feature 2** – Description  
✨ **Feature 3** – Description

## Installation

```bash
pnpm add @vielzeug/buildit
```
````

## Basic Usage

```typescript
import '@vielzeug/buildit/component';
```

```html
<bit-component>Content</bit-component>
```

## Variants

<!-- Examples for all variants -->

## Colors

<!-- Examples for all colors -->

## Sizes

<!-- Examples for all sizes -->

## States

<!-- Disabled / loading / checked / expanded, etc. -->

## API Reference

### Attributes

| Attribute  | Type                              | Default     | Description         |
| ---------- | --------------------------------- | ----------- | ------------------- |
| `variant`  | `'solid' \| 'outline' \| 'ghost'` | `'solid'`   | Visual style        |
| `color`    | `'primary' \| 'secondary' \| ...` | `'primary'` | Color theme         |
| `size`     | `'sm' \| 'md' \| 'lg'`            | `'md'`      | Component size      |
| `disabled` | `boolean`                         | `false`     | Disable interaction |

### Slots

| Slot      | Description         |
| --------- | ------------------- |
| (default) | Main content        |
| `prefix`  | Content before main |
| `suffix`  | Content after main  |

### Events

| Event    | Detail                                | Description                |
| -------- | ------------------------------------- | -------------------------- |
| `change` | `{ checked: boolean, value: string }` | Emitted when state changes |
| `click`  | `{ originalEvent: Event }`            | Emitted on click           |

### CSS Custom Properties

| Property              | Description      | Default                |
| --------------------- | ---------------- | ---------------------- |
| `--component-bg`      | Background color | `var(--color-primary)` |
| `--component-padding` | Internal padding | `var(--size-2)`        |

## Accessibility

- Keyboard navigation behavior.
- Screen reader considerations.
- ARIA attributes used.
- WCAG compliance notes.

## Examples

### With Framework X

Examples for React, Vue, Svelte, grouped with VitePress extensions.

### Advanced Usage

Complex patterns and real-world examples.

````

**Reference:**

- `/docs/buildit/components/bit-button.md`
- `/docs/buildit/components/bit-checkbox.md`
- `/docs/buildit/components/bit-accordion.md`

---

## 16. Component Checklist

Use this as a PR checklist.

### 16.1 Setup [Required]

- [ ] Create component directory `src/[category]/[component-name]/`
- [ ] Create main file `[component-name].ts`
- [ ] Create test directory `__tests__/`
- [ ] Create unit tests `__tests__/[component-name].test.ts`
- [ ] (Recommended) Create a11y tests `__tests__/[component-name].a11y.test.ts`

### 16.2 Implementation [Required]

- [ ] Name: `bit-[component-name]`
- [ ] Define and export `[ComponentName]Props`
- [ ] Use `defineElement<HTMLElement, [ComponentName]Props>`
- [ ] Reflect public props to attributes (boolean via presence/absence)
- [ ] Implement design-system variants/colors/sizes (if applicable)
- [ ] Expose component-prefixed CSS variables
- [ ] Implement slots (if needed)
- [ ] Implement host events with detailed `detail` (including `originalEvent`)
- [ ] Handle all relevant states (disabled, loading, etc.)
- [ ] Add ARIA attributes with valid values
- [ ] Implement keyboard navigation (if interactive)
- [ ] Add JSDoc header
- [ ] `export default {}`

### 16.3 Category Integration [Required]

- [ ] Export from category index `src/[category]/index.ts`:

  ```typescript
  export * from './[component-name]/[component-name]';
````

### 16.4 Testing [Required]

- [ ] Unit tests with comprehensive coverage
- [ ] Test all variants/colors/sizes (if applicable)
- [ ] Test all states
- [ ] Test event emission (and `detail` shape)
- [ ] Test `onAttributeChanged` behavior
- [ ] Test keyboard interactions (if applicable)
- [ ] Verify ARIA attributes
- [ ] (Recommended) axe-core a11y tests
- [ ] (Recommended) Visual checks via stories/playground

### 16.5 Haptics & Interaction [Recommended]

- [ ] Use shared haptic utility (no direct `navigator.vibrate`)
- [ ] Only enable haptics in appropriate contexts (mobile / behind flags)
- [ ] Ensure pressed/active states feel responsive

### 16.6 Package Configuration [Required]

- [ ] Add export to `package.json`:

  ```json
  "./[component-name]": {
    "types": "./dist/[component-name].d.ts",
    "import": "./dist/[component-name].js",
    "require": "./dist/[component-name].cjs"
  }
  ```

- [ ] Add entry to `vite.config.ts`:

  ```typescript
  entry: {
    '[component-name]': resolve(
      __dirname,
      './src/[category]/[component-name]/[component-name]',
    ),
  }
  ```

### 16.7 TypeScript Types [Required]

- [ ] Add props type to `src/types.d.ts`:

  ```typescript
  import type { [ComponentName]Props } from './';

  type Bit[ComponentName] = WebComponent<HTMLElement, [ComponentName]Props>;
  ```

- [ ] Add to `HTMLElementTagNameMap`:

  ```typescript
  'bit-[component-name]': Bit[ComponentName];
  ```

### 16.8 Documentation

- [ ] Minimal docs: overview, basic usage, attributes, events, accessibility notes
- [ ] (Recommended) Full docs: features, variants, states, CSS vars, examples
- [ ] Document all attributes/slots/events/CSS vars
- [ ] (Recommended) Add framework integration examples

### 16.9 Build & Verify [Required]

- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] Bundle size is reasonable
- [ ] Tree-shaking works
- [ ] Types are exported correctly
- [ ] Component works in example application

---

## 17. Example Walkthrough: `bit-switch` (Reference)

This is a reference implementation; adapt as needed.

### 17.1 Directory

```bash
mkdir -p src/form/switch/__tests__
touch src/form/switch/switch.ts
touch src/form/switch/__tests__/switch.test.ts
```

### 17.2 Component (`src/form/switch/switch.ts`)

```typescript
import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-switch - A toggle switch component
 *
 * @element bit-switch
 *
 * @attr {boolean} checked - Switch checked state
 * @attr {boolean} disabled - Disable the switch
 * @attr {string} value - Switch value
 * @attr {string} name - Form field name
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Switch size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for switch label
 *
 * @fires change - Emitted when checked state changes
 */

const styles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    cursor: pointer;
    user-select: none;
    min-height: var(--size-11); /* ~44px touch target */
    touch-action: manipulation;
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .switch-track {
    position: relative;
    width: var(--switch-width, 2.5rem);
    height: var(--switch-height, 1.25rem);
    border-radius: var(--rounded-full);
    background: var(--color-contrast-200);
    transition: background 150ms ease;
  }

  :host([checked]) .switch-track {
    background: var(--switch-bg, var(--color-primary));
  }

  .switch-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: calc(var(--switch-height, 1.25rem) - 4px);
    height: calc(var(--switch-height, 1.25rem) - 4px);
    border-radius: var(--rounded-full);
    background: white;
    transition: transform 150ms ease;
  }

  :host([checked]) .switch-thumb {
    transform: translateX(calc(var(--switch-width, 2.5rem) - var(--switch-height, 1.25rem)));
  }

  /* Size variants */
  :host([size='sm']) {
    --switch-width: 2rem;
    --switch-height: 1rem;
  }

  :host([size='lg']) {
    --switch-width: 3rem;
    --switch-height: 1.5rem;
  }

  /* Color variants */
  :host([color='success']) {
    --switch-bg: var(--color-success);
  }

  :host([color='error']) {
    --switch-bg: var(--color-error);
  }
`;

export type SwitchProps = {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  name?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
};

defineElement<HTMLElement, SwitchProps>('bit-switch', {
  observedAttributes: ['checked', 'disabled', 'value', 'name', 'color', 'size'] as const,

  styles: [styles],

  template: (el) => html`
    <div class="switch-wrapper">
      <input
        type="checkbox"
        ?checked="${el.hasAttribute('checked')}"
        ?disabled="${el.hasAttribute('disabled')}"
        name="${el.getAttribute('name') || ''}"
        value="${el.getAttribute('value') || ''}"
        style="position: absolute; opacity: 0; pointer-events: none;"
        aria-checked="${el.hasAttribute('checked') ? 'true' : 'false'}"
        aria-disabled="${el.hasAttribute('disabled') ? 'true' : 'false'}" />
      <div class="switch-track">
        <div class="switch-thumb"></div>
      </div>
    </div>
    <span class="label"><slot></slot></span>
  `,

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    el.on('input', 'change', (e: Event) => {
      const input = e.target as HTMLInputElement;
      const nextChecked = input.checked;

      if (nextChecked) {
        host.setAttribute('checked', '');
      } else {
        host.removeAttribute('checked');
      }

      host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');

      el.emit('change', {
        checked: nextChecked,
        value: host.getAttribute('value'),
        originalEvent: e,
      });

      // Optional: triggerHaptic('light') if enabled
    });

    host.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (host.hasAttribute('disabled')) return;

        const input = el.query('input') as HTMLInputElement;
        input.click();
      }
    });
  },
});

export default {};
```

### 17.3 Integration

**Form index**

```typescript
export * from './checkbox/checkbox';
export * from './radio/radio';
export * from './switch/switch';
```

**`package.json` exports**

```json
{
  "exports": {
    "./switch": {
      "types": "./dist/switch.d.ts",
      "import": "./dist/switch.js",
      "require": "./dist/switch.cjs"
    }
  }
}
```

**`vite.config.ts`**

```typescript
entry: {
  button: resolve(__dirname, './src/base/button/button'),
  checkbox: resolve(__dirname, './src/form/checkbox/checkbox'),
  radio: resolve(__dirname, './src/form/radio/radio'),
  switch: resolve(__dirname, './src/form/switch/switch'),
}
```

**`src/types.d.ts`**

```typescript
import type { ButtonProps, CheckboxProps, RadioProps, SwitchProps } from './';

type BitButton = WebComponent<HTMLElement, ButtonProps>;
type BitCheckbox = WebComponent<HTMLElement, CheckboxProps>;
type BitRadio = WebComponent<HTMLElement, RadioProps>;
type BitSwitch = WebComponent<HTMLElement, SwitchProps>;

declare global {
  interface HTMLElementTagNameMap {
    'bit-button': BitButton;
    'bit-checkbox': BitCheckbox;
    'bit-radio': BitRadio;
    'bit-switch': BitSwitch;
  }
}
```

---

## 18. Summary

The Buildit component library follows these core principles:

- Consistent structure and naming.
- Strong TypeScript types and generics.
- Deep integration with design tokens and the design system.
- Theming via CSS custom properties.
- Accessibility and keyboard support by default.
- Clear event patterns with rich `detail` objects.
- Comprehensive testing on behavior and a11y.
- Optional haptics for native-feeling mobile interactions.
- Clear documentation and examples.
- Clean packaging for tree-shaking and type exports.

---

## 19. Reference Components

Use these as templates:

| Component            | Best For             | Key Features                               |
| -------------------- | -------------------- | ------------------------------------------ |
| `bit-button`         | Interactive elements | Variants, loading state, slots             |
| `bit-checkbox`       | Form inputs          | Checked/indeterminate states, ARIA         |
| `bit-radio`          | Grouped inputs       | Keyboard navigation, group management      |
| `bit-accordion-item` | Container components | Slots, expand/collapse, native `<details>` |
| `bit-button-group`   | Composite components | Child management, variant propagation      |

---

## 20. Additional Resources

- **Craftit Documentation** – Lifecycle, utilities
- **Design Tokens** – Available CSS variables and system
- **Testing Utilities** – `createFixture`, event helpers
- **Accessibility Guidelines** – WCAG 2.1, ARIA patterns

---

**Note:** Please do not add report or summary files to the project. You can generate them and share them in discussion, but they should not be written to or committed into the repository. All important information should live in the existing documentation.

**Last Updated:** February 20, 2026  
**Version:** 1.1.0
