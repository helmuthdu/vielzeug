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
- ✅ `bit-input` – Text input with variants and slots
- ✅ `bit-switch` – Toggle switch with color and size variants

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
 * bit-[component-name] - Component description
 *
 * @element bit-[component-name]
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disabled state
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 * ... all attributes documented
 *
 * @slot - Default slot description
 * @slot slot-name - Named slot description
 *
 * @cssprop --component-size - Size of the component
 * @cssprop --component-bg - Background color
 * @cssprop --component-checked-bg - Background when checked
 * @cssprop --component-color - Icon/text color
 *
 * @fires change - Emitted when state changes
 *   detail: { checked: boolean, value: string | null, originalEvent: Event }
 */

// -------------------- Styles --------------------
const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    /* Internal variables with public CSS custom property fallbacks */
    --_size: var(--component-size, var(--size-5));
    --_font-size: var(--component-font-size, var(--text-sm));
    --_bg: var(--component-bg, var(--color-contrast-200));
    --_border: var(--component-border-color, var(--color-contrast-300));
    
    /* Layout */
    display: inline-flex;
    align-items: center;
    gap: var(--size-2);
    cursor: pointer;
    user-select: none;
  }

  :host([disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  /* ========================================
     Color Themes
     ======================================== */

  :host(:not([color])),
  :host([color='primary']) {
    --_active-bg: var(--component-checked-bg, var(--color-primary));
    --_icon-color: var(--component-color, var(--color-primary-contrast));
    --_focus-shadow: var(--color-primary-shadow);
  }

  :host([color='secondary']) {
    --_active-bg: var(--component-checked-bg, var(--color-secondary));
    --_icon-color: var(--component-color, var(--color-secondary-contrast));
    --_focus-shadow: var(--color-secondary-shadow);
  }

  /* ... other color variants */

  /* ========================================
     States
     ======================================== */

  :host([checked]) .element {
    background: var(--_active-bg);
    border-color: var(--_active-bg);
  }

  /* ========================================
     Focus State
     ======================================== */

  input:focus-visible + .element {
    box-shadow: var(--_focus-shadow);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='sm']) {
    --_size: var(--size-4);
    --_font-size: var(--text-xs);
  }

  :host([size='lg']) {
    --_size: var(--size-6);
    --_font-size: var(--text-base);
  }

  /* ========================================
     Elements
     ======================================== */

  .element {
    width: var(--_size);
    height: var(--_size);
    font-size: var(--_font-size);
    background: var(--_bg);
    border: var(--border-2) solid var(--_border);
    transition: all var(--transition-normal);
  }
`;

// -------------------- Props Type --------------------
export type [ComponentName]Props = {
  checked?: boolean;
  disabled?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  name?: string;
};

// -------------------- Component Definition --------------------
defineElement<HTMLElement, [ComponentName]Props>('bit-[component-name]', {
  observedAttributes: ['checked', 'disabled', 'color', 'size', 'value', 'name'] as const,

  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'checked') {
      const isChecked = newValue !== null;
      host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    } else if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    // Initial ARIA setup
    host.setAttribute('role', 'checkbox'); // or appropriate role
    host.setAttribute('aria-checked', host.hasAttribute('checked') ? 'true' : 'false');
    host.setAttribute('aria-disabled', host.hasAttribute('disabled') ? 'true' : 'false');

    // Event handlers
    host.addEventListener('click', (e) => {
      if (host.hasAttribute('disabled')) return;

      const isChecked = !host.hasAttribute('checked');
      
      if (isChecked) {
        host.setAttribute('checked', '');
      } else {
        host.removeAttribute('checked');
      }

      el.emit('change', {
        checked: isChecked,
        value: host.getAttribute('value'),
        originalEvent: e,
      });
    });
  },

  styles: [styles],

  template: (el) => html`
    <div class="element">
      <!-- Component structure -->
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};
```

### 3.3 Attribute/Prop Guidelines [Required]

- Boolean props (e.g. `disabled`, `loading`, `checked`) must be represented as **presence/absence** attributes:
  - `el.hasAttribute('disabled')` → `true`.
  - Do not rely on `"true"` or `"false"` attribute string values.
- Enum/string attributes should fall back to safe defaults on invalid values.
- Explicitly document which props are reflected as attributes and which are internal-only.

> [!WARNING]
> Never use `true` or `false` string values for boolean attributes. This is a common source of bugs as any non-null string (including `"false"`) evaluates to `true` in a boolean check.

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

All components integrate with the unified design system using CSS custom properties and design tokens.

### 5.1 Core Principles [Required]

- Use design tokens exclusively—avoid hardcoded values
- Set default color theme (primary) in base selector
- Structure CSS with clear section headers
- Support automatic light/dark mode via `prefers-color-scheme`

### 5.2 CSS Organization Pattern [Required]

Follow this structure for all components. Use internal variables (`--_*`) to simplify theming and avoid repetition.

```css
/* ========================================
   Base Styles & Defaults
   ======================================== */

:host {
  /* Internal variables with CSS custom property fallbacks */
  --_size: var(--component-size, var(--size-5));
  --_font-size: var(--component-font-size, var(--text-sm));
  --_bg: var(--component-bg, var(--color-contrast-200));
  --_border: var(--component-border-color, var(--color-contrast-300));
  
  /* Layout */
  display: inline-flex;
  align-items: center;
  gap: var(--size-2);
  cursor: pointer;
}

/* ========================================
   Color Themes
   ======================================== */

:host(:not([color])),
:host([color='primary']) {
  --_active-bg: var(--component-checked-bg, var(--color-primary));
  --_icon-color: var(--component-color, var(--color-primary-contrast));
  --_focus-shadow: var(--color-primary-shadow);
}

:host([color='secondary']) {
  --_active-bg: var(--component-checked-bg, var(--color-secondary));
  --_icon-color: var(--component-color, var(--color-secondary-contrast));
  --_focus-shadow: var(--color-secondary-shadow);
}

:host([color='success']) {
  --_active-bg: var(--component-checked-bg, var(--color-success));
  --_icon-color: var(--component-color, var(--color-success-contrast));
  --_focus-shadow: var(--color-success-shadow);
}

:host([color='warning']) {
  --_active-bg: var(--component-checked-bg, var(--color-warning));
  --_icon-color: var(--component-color, var(--color-warning-contrast));
  --_focus-shadow: var(--color-warning-shadow);
}

:host([color='error']) {
  --_active-bg: var(--component-checked-bg, var(--color-error));
  --_icon-color: var(--component-color, var(--color-error-contrast));
  --_focus-shadow: var(--color-error-shadow);
}

/* ========================================
   States
   ======================================== */

:host([checked]) .element {
  background: var(--_active-bg);
  border-color: var(--_active-bg);
}

:host([disabled]) {
  cursor: not-allowed;
  opacity: 0.5;
  pointer-events: none;
}

/* ========================================
   Focus State
   ======================================== */

input:focus-visible + .element {
  box-shadow: var(--_focus-shadow);
}

/* ========================================
   Size Variants
   ======================================== */

:host([size='sm']) {
  --_size: var(--size-4);
  --_font-size: var(--text-xs);
}

:host([size='lg']) {
  --_size: var(--size-6);
  --_font-size: var(--text-base);
}
```

**Key Pattern:**
- Use `--_*` prefix for internal variables (not exposed to users)
- Provide CSS custom properties (e.g., `--component-size`) for user customization
- Internal variables read from custom properties with sensible defaults
- Set color defaults in `:host(:not([color]))` selector combined with `primary`
- Group all colors in one section, sizes in another for easy maintenance
```

### 5.3 Color System [Required]

Semantic colors with 5 variants each:

```typescript
type Color = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
```

**Per-color tokens:**
- `--color-{name}` - Base color for backgrounds
- `--color-{name}-contrast` - High contrast text on base
- `--color-{name}-focus` - Hover/focus states (lighter/darker)
- `--color-{name}-content` - Alternative text color
- `--color-{name}-backdrop` - Subtle background/overlay
- `--color-{name}-shadow` - Focus ring/shadow color

**Implementation using internal variables:**

```css
/* Set defaults for primary color (combined with :not([color])) */
:host(:not([color])),
:host([color='primary']) {
  --_active-bg: var(--component-checked-bg, var(--color-primary));
  --_icon-color: var(--component-color, var(--color-primary-contrast));
  --_focus-shadow: var(--color-primary-shadow);
}

/* Override for each color variant */
:host([color='success']) {
  --_active-bg: var(--component-checked-bg, var(--color-success));
  --_icon-color: var(--component-color, var(--color-success-contrast));
  --_focus-shadow: var(--color-success-shadow);
}

/* Apply internal variables in elements */
.element {
  background: var(--_active-bg);
  color: var(--_icon-color);
}

.element:focus-visible {
  box-shadow: var(--_focus-shadow);
}
```

**Benefits:**
- Single source of truth for each color state
- Easy to override via CSS custom properties
- No repetition across element selectors
- Consistent pattern across all components

### 5.4 Visual Variants [Required]

Standard variants for interactive components:

```typescript
type Variant = 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'glass' | 'frost';
```

| Variant | Use Case | Key Pattern |
|---------|----------|-------------|
| `solid` | Default, high emphasis | `var(--component-base)` background |
| `flat` | Medium emphasis | `var(--component-backdrop)` background |
| `bordered` | Defined boundaries | `var(--component-backdrop)` + `var(--component-base)` border |
| `outline` | Low emphasis | `transparent` + `var(--component-base)` border |
| `ghost` | Minimal | `transparent`, hover shows background |
| `text` | Minimal | `transparent`, no background |
| `glass` | Modern translucent | `backdrop-filter`, `color-mix`, vibrant |
| `frost` | Subtle translucent | `backdrop-filter`, `color-mix`, neutral |

**Implementation:**

```css
/* Solid (default) - no explicit rule needed if set in base */
button {
  background: var(--button-bg, var(--button-base));
}

/* Flat */
:host([variant='flat']) button {
  background: var(--button-bg, var(--button-backdrop));
  color: var(--button-base);
}

/* Glass - consolidate shared effects */
:host([variant='glass']) button,
:host([variant='frost']) button {
  backdrop-filter: blur(var(--blur-lg)) saturate(180%);
  box-shadow: var(--shadow-md), var(--inset-shadow-xs);
}

:host([variant='glass']) button {
  background: color-mix(in srgb, var(--button-base) 30%, var(--color-contrast) 10%);
  filter: brightness(1.05);
}

:host([variant='frost']) button {
  background: color-mix(in srgb, var(--color-canvas) 55%, transparent);
}
```

### 5.5 Size System [Required]

```typescript
type Size = 'sm' | 'md' | 'lg';
```

**Use internal variables for sizing with custom property fallbacks:**

```css
:host {
  /* Default size (medium) - set in base */
  --_size: var(--component-size, var(--size-5));
  --_font-size: var(--component-font-size, var(--text-sm));
}

:host([size='sm']) {
  --_size: var(--size-4);
  --_font-size: var(--text-xs);
}

:host([size='lg']) {
  --_size: var(--size-6);
  --_font-size: var(--text-base);
}

/* Apply internal variables */
.element {
  width: var(--_size);
  height: var(--_size);
  font-size: var(--_font-size);
}
```

**For button-like components with padding:**

```css
button {
  /* Default size (medium) */
  --_padding: var(--button-padding, var(--size-2) var(--size-4));
  --_font-size: var(--button-font-size, var(--text-sm));
  height: var(--size-10);
  padding: var(--_padding);
  font-size: var(--_font-size);
  line-height: var(--leading-normal);
}

:host([size='sm']) button {
  --_padding: var(--size-1-5) var(--size-3);
  height: var(--size-8);
  line-height: var(--leading-tight);
}

:host([size='lg']) button {
  --_padding: var(--size-2-5) var(--size-5);
  --_font-size: var(--text-base);
  height: var(--size-12);
  line-height: var(--leading-relaxed);
}
```

### 5.6 Design Token Reference

**Spacing Scale** (use exclusively, no arbitrary values):
```css
--size-1 (4px), --size-2 (8px), --size-3 (12px), --size-4 (16px)
--size-5 (20px), --size-6 (24px), --size-8 (32px), --size-10 (40px)
--size-12 (48px), --size-16 (64px) /* ... up to --size-96 */
```

**Typography:**
```css
/* Font sizes */
--text-xs (12px), --text-sm (14px), --text-base (16px), --text-lg (18px)
--text-xl (20px), --text-2xl (24px) /* ... up to --text-9xl */

/* Font weights */
--font-normal (400), --font-medium (500)
--font-semibold (600), --font-bold (700)

/* Line heights */
--leading-tight, --leading-normal, --leading-relaxed

/* Semantic text colors (auto-adapt to theme) */
--text-color-heading, --text-color-body, --text-color-secondary
```

**Effects:**
```css
/* Border radius */
--rounded-sm (4px), --rounded-md (6px), --rounded-lg (8px)
--rounded-xl (12px), --rounded-full (9999px)

/* Shadows */
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
--inset-shadow-xs, --inset-shadow-sm

/* Blur */
--blur-sm (8px), --blur-md (12px), --blur-lg (16px), --blur-xl (24px)

/* Text shadows */
--text-shadow-xs, --text-shadow-sm, --text-shadow-md
```

**Borders:**
```css
--border (1px), --border-2 (2px), --border-4 (4px)
```

### 5.7 Best Practices

**✅ Do:**
```css
/* Use internal variables with CSS custom property fallbacks */
:host {
  --_size: var(--component-size, var(--size-5));
  --_bg: var(--component-bg, var(--color-contrast-200));
}

/* Use design tokens */
padding: var(--size-2) var(--size-4);
font-size: var(--text-sm);
border-radius: var(--rounded-md);
box-shadow: var(--shadow-sm);

/* Combine default color with :not([color]) selector */
:host(:not([color])),
:host([color='primary']) {
  --_active-bg: var(--color-primary);
}

/* Group identical properties */
:host([variant='glass']) button,
:host([variant='frost']) button {
  backdrop-filter: blur(var(--blur-lg));
}
```

**❌ Don't:**
```css
/* Hardcoded values */
padding: 0.5rem 1rem;
font-size: 14px;
border-radius: 6px;

/* Expose internal variables to users */
.element {
  width: var(--_size); /* Internal only */
}

/* Repeat identical properties */
:host([variant='glass']) { backdrop-filter: blur(16px); }
:host([variant='frost']) { backdrop-filter: blur(16px); }

/* Set colors in element selectors */
.element {
  --component-base: var(--color-primary); /* Set in :host instead */
}
```

**Internal vs Public Variables:**
- `--_*` prefix = Internal only (implementation detail)
- `--component-*` prefix = Public API (user can customize)

```css
:host {
  /* Public API - users can override */
  --component-size: var(--size-5);
  --component-bg: var(--color-contrast-200);
  
  /* Internal - reads from public API with fallback */
  --_size: var(--component-size, var(--size-5));
  --_bg: var(--component-bg, var(--color-contrast-200));
}
```
- `--text-color-contrast` - Text on dark backgrounds

### 5.7 Spacing & Grid [Required]

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

### 5.8 Border Radius [Required]

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

### 5.9 Elevation [Required]

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

### 5.10 Borders [Required]

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

### 5.11 Blur Effects [Optional]

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

Expose CSS custom properties for user customization, use internal variables for implementation:

```css
:host {
  /* Public API - users can override these */
  --component-size: var(--size-5);
  --component-bg: var(--color-contrast-200);
  --component-border-color: var(--color-contrast-300);
  --component-font-size: var(--text-sm);
  --component-checked-bg: /* set per color variant */;
  --component-color: /* set per color variant */;
  
  /* Internal variables - read from public API with defaults */
  --_size: var(--component-size, var(--size-5));
  --_bg: var(--component-bg, var(--color-contrast-200));
  --_border: var(--component-border-color, var(--color-contrast-300));
  --_font-size: var(--component-font-size, var(--text-sm));
}

/* Color-specific variables set per color */
:host(:not([color])),
:host([color='primary']) {
  --_active-bg: var(--component-checked-bg, var(--color-primary));
  --_icon-color: var(--component-color, var(--color-primary-contrast));
  --_focus-shadow: var(--color-primary-shadow);
}

/* Apply internal variables in elements */
.element {
  width: var(--_size);
  height: var(--_size);
  background: var(--_bg);
  border-color: var(--_border);
  font-size: var(--_font-size);
}
```

**Document public custom properties in JSDoc:**

```typescript
/**
 * @cssprop --component-size - Size of the component
 * @cssprop --component-bg - Background color
 * @cssprop --component-border-color - Border color
 * @cssprop --component-checked-bg - Background when checked
 * @cssprop --component-color - Icon/text color
 */
```

### 7.2 Naming [Required]

**Public properties (exposed to users):**
- Prefix with component: `--button-*`, `--checkbox-*`, `--radio-*`
- Use clear suffixes: `-size`, `-bg`, `-color`, `-border-color`, `-checked-bg`, etc.
- Reference theme tokens as defaults: `var(--color-primary)`, `var(--size-5)`

**Internal variables (implementation only):**
- Prefix with `--_`: `--_size`, `--_bg`, `--_active-bg`, `--_icon-color`
- Read from public properties with fallbacks
- Never expose in documentation

**Examples:**
```css
/* ✅ Good - Clear naming, public/internal separation */
:host {
  --checkbox-size: var(--size-5);           /* Public */
  --_size: var(--checkbox-size, var(--size-5)); /* Internal */
}

/* ❌ Bad - No separation, unclear naming */
:host {
  --size: var(--size-5);
  --cb-s: var(--size-5);
}
```

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

Each semantic color has 6 variants for different use cases:

**Primary** (Vibrant blue - accessible for all colorblind types)
- `--color-primary` - Base color for backgrounds
- `--color-primary-contrast` - High contrast text on primary background
- `--color-primary-focus` - Hover/focus states
- `--color-primary-content` - Alternative text color
- `--color-primary-backdrop` - Subtle background/overlay
- `--color-primary-shadow` - Focus ring/shadow (e.g., `0 0 0 3px rgba(...)`)

**Secondary** (Blue-gray for neutral actions)
- `--color-secondary` - Base color
- `--color-secondary-contrast` - Contrast text
- `--color-secondary-focus` - Focus state
- `--color-secondary-content` - Content color
- `--color-secondary-backdrop` - Background
- `--color-secondary-shadow` - Focus ring/shadow

**Success** (Teal/cyan - better for red-green colorblindness)
- `--color-success` - Base
- `--color-success-contrast` - Contrast
- `--color-success-focus` - Focus
- `--color-success-content` - Content
- `--color-success-backdrop` - Backdrop
- `--color-success-shadow` - Focus ring/shadow

**Warning** (Amber/orange - distinct from error)
- `--color-warning` - Base
- `--color-warning-contrast` - Contrast
- `--color-warning-focus` - Focus
- `--color-warning-content` - Content
- `--color-warning-backdrop` - Backdrop
- `--color-warning-shadow` - Focus ring/shadow

**Error** (Magenta/vermillion - better for colorblindness)
- `--color-error` - Base
- `--color-error-contrast` - Contrast
- `--color-error-focus` - Focus
- `--color-error-content` - Content
- `--color-error-backdrop` - Backdrop
- `--color-error-shadow` - Focus ring/shadow

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
--text-xs    /* 0.75rem - 12px */
--text-sm    /* 0.875rem - 14px */
--text-base    /* 1rem - 16px - BASE */
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
--font-thin        /* 100 */
--font-extralight  /* 200 */
--font-light       /* 300 */
--font-normal      /* 400 */
--font-medium      /* 500 */
--font-semibold    /* 600 */
--font-bold        /* 700 */
--font-extrabold   /* 800 */
--font-black       /* 900 */
```

**Line heights (leading):**
```css
/* Line Heights
   Optimized for readability - WCAG recommends 1.5 for body text */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;        /* Optimal for body text (WCAG) */
--leading-relaxed: 1.625;
--leading-loose: 2;
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
  line-height: var(--leading-tight);
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

### 13.1 Testing Pattern [Required]

All component tests must follow these established patterns for consistency, maintainability, and reliability.

#### Best Practices

**1. Centralized Fixture Management**

Use a single fixture variable with `afterEach` cleanup instead of manual `destroy()` in every test.

```typescript
import { createFixture, type ComponentFixture } from '@vielzeug/craftit/testing';

describe('bit-checkbox', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../checkbox');
  });

  afterEach(() => {
    fixture?.destroy(); // ✅ Automatic cleanup
  });

  it('should render', async () => {
    fixture = await createFixture('bit-checkbox');
    // No manual destroy needed!
  });
});
```

**2. Type-Safe Queries**

Use generic type parameters for type-safe DOM queries:

```typescript
// ✅ Good - Type-safe with optional chaining
const input = fixture.query<HTMLInputElement>('input');
expect(input?.value).toBe('test');

// ❌ Bad - Type assertion, not safe
const input = fixture.query('input') as HTMLInputElement;
expect(input.value).toBe('test');
```

**3. Use fixture.setAttribute() for Updates**

Instead of manual `setAttribute` + `setTimeout`, use the fixture helper:

```typescript
// ✅ Good - Handles async updates automatically
await fixture.setAttribute('disabled', true);
expect(input?.disabled).toBe(true);

// ❌ Bad - Manual waiting, error-prone
fixture.element.setAttribute('disabled', '');
await new Promise(resolve => setTimeout(resolve, 10));
```

**4. Use fixture.setAttributes() for Multiple Changes**

```typescript
// ✅ Good - Single clean call
await fixture.setAttributes({
  type: 'email',
  placeholder: 'Enter email',
  required: true,
  size: 'lg',
});

// ❌ Bad - Multiple manual calls
fixture.element.setAttribute('type', 'email');
fixture.element.setAttribute('placeholder', 'Enter email');
fixture.element.setAttribute('required', '');
fixture.element.setAttribute('size', 'lg');
```

**5. Array Iteration for Repetitive Tests (DRY)**

```typescript
// ✅ Good - DRY, maintainable
const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'] as const;

variants.forEach((variant) => {
  it(`should apply ${variant} variant`, async () => {
    fixture = await createFixture('bit-input', { variant });
    expect(fixture.element.getAttribute('variant')).toBe(variant);
  });
});

// ❌ Bad - Repetitive, hard to maintain
it('should apply solid variant', async () => {
  fixture = await createFixture('bit-input', { variant: 'solid' });
  expect(fixture.element.getAttribute('variant')).toBe('solid');
});

it('should apply flat variant', async () => {
  fixture = await createFixture('bit-input', { variant: 'flat' });
  expect(fixture.element.getAttribute('variant')).toBe('flat');
});
// ... 4 more repetitive tests
```

**6. Better Event Testing with vi.fn()**

```typescript
// ✅ Good - Clean, verifiable
const changeHandler = vi.fn();
fixture.element.addEventListener('change', changeHandler);

input!.click();

expect(changeHandler).toHaveBeenCalled();
const event = changeHandler.mock.calls[0][0] as CustomEvent;
expect(event.detail.checked).toBe(true);
expect(event.detail.originalEvent).toBeDefined();

// ❌ Bad - Manual state tracking
let changed = false;
let checkedValue = false;

fixture.element.addEventListener('change', (e: any) => {
  changed = true;
  checkedValue = e.detail.checked;
});

input.click();
expect(changed).toBe(true);
expect(checkedValue).toBe(true);
```

### 13.2 Complete Test Example

```typescript
import { createFixture, type ComponentFixture } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-input', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../input');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with correct structure', async () => {
      fixture = await createFixture('bit-input');

      const wrapper = fixture.query('.input-wrapper');
      const field = fixture.query('.field');
      const input = fixture.query('input');

      expect(wrapper).toBeTruthy();
      expect(field).toBeTruthy();
      expect(input).toBeTruthy();
    });
  });

  describe('States', () => {
    it('should handle disabled state', async () => {
      fixture = await createFixture('bit-input', { disabled: true });
      const input = fixture.query<HTMLInputElement>('input');

      expect(fixture.element.hasAttribute('disabled')).toBe(true);
      expect(input?.disabled).toBe(true);
    });

    it('should toggle disabled state', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');

      expect(input?.disabled).toBe(false);

      await fixture.setAttribute('disabled', true);
      expect(input?.disabled).toBe(true);

      await fixture.setAttribute('disabled', false);
      expect(input?.disabled).toBe(false);
    });
  });

  describe('Variants', () => {
    const variants = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text'] as const;

    variants.forEach((variant) => {
      it(`should apply ${variant} variant`, async () => {
        fixture = await createFixture('bit-input', { variant });
        expect(fixture.element.getAttribute('variant')).toBe(variant);
      });
    });

    it('should change variant dynamically', async () => {
      fixture = await createFixture('bit-input', { variant: 'solid' });

      await fixture.setAttribute('variant', 'outline');
      expect(fixture.element.getAttribute('variant')).toBe('outline');
    });
  });

  describe('Events', () => {
    it('should emit input event with details', async () => {
      fixture = await createFixture('bit-input');
      const input = fixture.query<HTMLInputElement>('input');
      const inputHandler = vi.fn();

      fixture.element.addEventListener('input', inputHandler);

      input!.value = 'test';
      input!.dispatchEvent(new Event('input', { bubbles: true }));

      expect(inputHandler).toHaveBeenCalled();
      const event = inputHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.value).toBe('test');
      expect(event.detail.originalEvent).toBeDefined();
    });
  });

  describe('Multiple Attributes', () => {
    it('should handle multiple attributes simultaneously', async () => {
      fixture = await createFixture('bit-input');

      await fixture.setAttributes({
        type: 'email',
        placeholder: 'Enter email',
        required: true,
        size: 'lg',
      });

      const input = fixture.query<HTMLInputElement>('input');
      expect(input?.type).toBe('email');
      expect(input?.placeholder).toBe('Enter email');
      expect(input?.required).toBe(true);
      expect(fixture.element.getAttribute('size')).toBe('lg');
    });
  });
});
```

### 13.3 Accessibility Tests [Recommended]

```typescript
import axe from 'axe-core';
import { createFixture, type ComponentFixture } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

describe('bit-input accessibility', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../input');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it('should have no accessibility violations', async () => {
    fixture = await createFixture('bit-input', {
      placeholder: 'Enter text',
      name: 'test-input',
    });

    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);
  });

  it('should be keyboard accessible', async () => {
    fixture = await createFixture('bit-input');
    const input = fixture.query<HTMLInputElement>('input');

    // Input should not have tabindex -1
    expect(input?.tabIndex).not.toBe(-1);
  });

  it('should not be focusable when disabled', async () => {
    fixture = await createFixture('bit-input', { disabled: true });
    const input = fixture.query<HTMLInputElement>('input');

    expect(input?.disabled).toBe(true);
  });
});
```

### 13.4 Testing Utilities Reference

The testing library provides these helpful utilities:

**ComponentFixture Methods:**
- `fixture.query<T>(selector)` - Query single element with type safety
- `fixture.queryAll<T>(selector)` - Query all matching elements
- `fixture.update()` - Wait for component re-render
- `fixture.setAttribute(name, value)` - Set attribute and wait for update
- `fixture.setAttributes(attrs)` - Set multiple attributes at once
- `fixture.destroy()` - Clean up component and container

**Standalone Utilities:**
- `createFixture(tagName, attributes)` - Create test fixture
- `waitForRender()` - Wait for component render
- `waitForFrames(count)` - Wait for animation frames
- `userEvent.click(element)` - Simulate user click
- `userEvent.type(element, text)` - Simulate typing

### 13.5 Coverage Requirements [Required]

Tests must cover:

✅ **Rendering**
- DOM structure and shadow DOM
- Slot rendering
- Initial state

✅ **Attributes & Props**
- Initial values
- Dynamic updates via `setAttribute()`
- Multiple simultaneous changes
- Invalid/edge case values

✅ **States**
- All boolean states (disabled, loading, checked, etc.)
- State toggling
- State combinations

✅ **Variants, Colors, Sizes**
- All options (use array iteration)
- Dynamic changes
- Default values

✅ **Events**
- Event emission
- Event details (including `originalEvent`)
- Event prevention when disabled
- Multiple event types

✅ **Accessibility**
- ARIA attributes
- Keyboard interactions
- Focus management
- Screen reader compatibility

✅ **Form Integration**
- Name and value attributes
- Form submission
- Validation states

✅ **Edge Cases**
- Empty values
- Null/undefined handling
- Invalid input
- Rapid updates

### 13.6 Test Organization Best Practices

**File Structure:**
```
src/form/input/
├── input.ts
└── __tests__/
    ├── input.test.ts        # Unit tests
    └── input.a11y.test.ts   # Accessibility tests
```

**Test Structure:**
```typescript
describe('bit-component', () => {
  // Setup
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => { /* import component */ });
  afterEach(() => { /* cleanup */ });

  // Organized test groups
  describe('Rendering', () => { /* ... */ });
  describe('States', () => { /* ... */ });
  describe('Variants', () => { /* ... */ });
  describe('Colors', () => { /* ... */ });
  describe('Sizes', () => { /* ... */ });
  describe('Events', () => { /* ... */ });
  describe('Accessibility', () => { /* ... */ });
  describe('Edge Cases', () => { /* ... */ });
});
```

### 13.7 Common Test Patterns

**Testing State Toggles:**
```typescript
it('should toggle disabled state', async () => {
  fixture = await createFixture('bit-input');
  const input = fixture.query<HTMLInputElement>('input');

  expect(input?.disabled).toBe(false);

  await fixture.setAttribute('disabled', true);
  expect(input?.disabled).toBe(true);

  await fixture.setAttribute('disabled', false);
  expect(input?.disabled).toBe(false);
});
```

**Testing Dynamic Attributes:**
```typescript
it('should update placeholder dynamically', async () => {
  fixture = await createFixture('bit-input');
  const input = fixture.query<HTMLInputElement>('input');

  await fixture.setAttribute('placeholder', 'Enter username');
  expect(input?.placeholder).toBe('Enter username');
});
```

**Testing Event Details:**
```typescript
it('should emit change event with correct details', async () => {
  fixture = await createFixture('bit-input', { value: 'initial' });
  const changeHandler = vi.fn();

  fixture.element.addEventListener('change', changeHandler);

  // Trigger change
  const input = fixture.query<HTMLInputElement>('input');
  input!.value = 'updated';
  input!.dispatchEvent(new Event('change', { bubbles: true }));

  // Verify
  const event = changeHandler.mock.calls[0][0] as CustomEvent;
  expect(event.detail.value).toBe('updated');
  expect(event.detail.originalEvent).toBeDefined();
});
```

### 13.8 Visual Testing [Recommended]

Add stories/playgrounds (Storybook, Ladle, VitePress demos) to visually verify:
- All variants
- All colors
- All sizes
- All states
- Interactive behavior
- Responsive design

**Note**: The tests should be simple, non-redundant, non-trivial but ensure the maximum coverage while also covering all the edge cases.

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

## 15. Documentation [Required]

Each component must have comprehensive documentation located at `/docs/buildit/components/bit-[component-name].md`. We use a standardized structure to ensure consistency and high quality across our library.

### 15.1 Standard Structure

Every component page must follow this exact section order:

1. **Title & Overview**: Brief description of purpose and use cases.
2. **Features**: Bulleted list of key technical capabilities (variants, sizes, a11y).
3. **Source Code**: Show a collapsable detail of the source code with syntax highlighting.:
    ```md
    ::: details View Source Code
    <<< @/../packages/buildit/**/component.ts
    :::
    ```
4. **Basic Usage**: Minimal code snippet showing how to get started.
5. **Visual Options**:
    - **Variants**: Show all visual styles (`solid`, `flat`, etc.).
    - **Colors**: Show semantic color options.
    - **Sizes**: Show available dimensions.
6. **Customization**: Examples of slots (icons, prefixes, suffixes) or complex layouts.
7. **States**: Visual demonstration of `disabled`, `loading`, `checked`, etc.
8. **API Reference**:
    - **Attributes Table**: All supported attributes, types, and defaults.
    - **Slots Table**: Description of all default and named slots.
    - **Events Table**: Detailed `CustomEvent` names and their `detail` shapes.
9. **CSS Custom Properties**: Table of exposed variables for fine-tuned styling.
10. **Accessibility**: Detailed notes on keyboard support and ARIA implementation.
11. **Best Practices**: "Do" and "Don't" guidelines for optimal usage.

> [!IMPORTANT]
> Always use the `<ComponentPreview>` wrapper for code examples to ensure they render interactively in the documentation site.

### 15.2 Code Example Patterns

#### Complex Headers (Slots)
For components like Accordions or Cards, use slots for content instead of attributes to allow for rich HTML (icons, tags).

```markdown
<!-- ✅ Recommended: Slot-based patterns -->
<bit-accordion-item>
  <span slot="title">Settings</span>
  <span slot="prefix" class="material-symbols-rounded">settings</span>
  <p>Panel content...</p>
</bit-accordion-item>

<!-- ❌ Avoid: Attribute-based complex content -->
<bit-accordion-item title="Settings">
  <p>Panel content...</p>
</bit-accordion-item>
```

#### Framework Examples
Framework integration examples should be grouped using VitePress code groups and kept in the dedicated `frameworks.md` guide for better maintenance.

### 15.3 Reference Documentation

Study these standardized implementations for guidance:

- **[Button](file:///Users/saatkhel/Projects/vielzeug/docs/buildit/components/button.md)** - Perfect reference for variants/colors/sizes.
- **[Accordion](file:///Users/saatkhel/Projects/vielzeug/docs/buildit/components/accordion.md)** - Best for complex slot usage and single/multiple modes.
- **[Input](file:///Users/saatkhel/Projects/vielzeug/docs/buildit/components/input.md)** - Standard for form elements with prefix/suffix support.
- **[Checkbox](file:///Users/saatkhel/Projects/vielzeug/docs/buildit/components/checkbox.md)** - Example of simple state-driven components.

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

Use these battle-tested components as templates for new development. They represent our current best practices for various component types.

| Component | Category | Best For | Key Patterns |
| :--- | :--- | :--- | :--- |
| **`bit-button`** | Base | Interactive actions | Variants, loading states, slots |
| **`bit-input`** | Form | Data entry | Prefixes/suffixes, validation states |
| **`bit-checkbox`** | Form | Binary choice | Indeterminate state, ARIA checked |
| **`bit-accordion`** | Base | Content density | Parent/child sync, slots, `<details>` |
| **`bit-radio`** | Form | Selection sets | Group coordination, keyboard navigation |
| **`bit-button-group`*** | Base | Layout containers | Property propagation to children |

> [!TIP]
> **`bit-accordion`** is the best example of how to handle synchronization between a container and its children using `MutationObserver`.

---

## 20. Additional Resources

- **Craftit Documentation** – Lifecycle, utilities
- **Design Tokens** – Available CSS variables and system
- **Testing Utilities** – `createFixture`, event helpers
- **Accessibility Guidelines** – WCAG 2.1, ARIA patterns

---

**Note:** Please do not create/add report or summary files of the changes you made into the project. All important information should live in the existing documentation.

**Last Updated:** February 20, 2026
**Version:** 1.1.0
