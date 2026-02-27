# BuildIt Agent Guide

**Comprehensive reference for building consistent, accessible, and well-documented BuildIt components.**

**Last Updated:** February 27, 2026

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Naming & Structure](#2-naming--structure)
3. [TypeScript Types](#3-typescript-types)
4. [CSS Architecture](#4-css-architecture)
5. [Shared Mixins](#5-shared-mixins)
6. [Component Implementation](#6-component-implementation)
7. [JSDoc Documentation](#7-jsdoc-documentation)
8. [Testing](#8-testing)
9. [Build Integration](#9-build-integration)
10. [Checklist](#10-checklist)
11. [Examples](#11-examples)

---

## 1. Project Architecture

### Component Categories

```
src/
├── base/              # UI primitives (button, card, text, accordion, button-group)
├── form/              # Form controls (input, checkbox, radio, switch, slider)
├── layout/            # Layout components (box, grid, grid-item)
├── styles/            # Shared styles and mixins
│   ├── mixins/        # Reusable style mixins
│   │   ├── color-theme.css.ts
│   │   ├── elevation.css.ts
│   │   ├── frost.css.ts
│   │   ├── padding.css.ts
│   │   ├── rounded.css.ts
│   │   └── states.css.ts
│   ├── effects/       # Visual effects
│   │   └── rainbow.css.ts
│   ├── theme.css      # Design tokens
│   ├── preflight.css  # CSS reset
│   ├── layer.css      # CSS cascade layers
│   ├── animation.css  # Animation utilities
│   └── styles.css     # Main stylesheet (imports all)
├── types/             # Shared TypeScript types
│   ├── shared.ts      # Common type definitions
│   ├── index.ts       # Type exports
│   └── bit.d.ts       # Global type augmentation
└── assets/            # Static assets (fonts, images, etc.)
```

### Design Token System

All values use design tokens from `theme.css`:

**Colors:**
- Semantic: `--color-primary`, `--color-secondary`, `--color-info`, `--color-success`, `--color-warning`, `--color-error`
- Neutral: `--color-neutral`, `--color-contrast-*`
- Canvas: `--color-canvas`, `--color-contrast`

**Spacing:**
- `--size-0-5` through `--size-96` (0.125rem to 24rem)

**Typography:**
- Sizes: `--text-xs` through `--text-9xl`
- Weights: `--font-normal`, `--font-medium`, `--font-semibold`, `--font-bold`

**Borders:**
- `--border`, `--border-2`, `--border-4`, `--border-8`
- `--rounded-sm` through `--rounded-full`

**Shadows:**
- `--shadow-xs` through `--shadow-2xl`
- `--inset-shadow-xs` through `--inset-shadow-lg`

**Blur:**
- `--blur-sm` through `--blur-2xl`

**Transitions:**
- `--transition-fast`, `--transition-normal`, `--transition-slow`
- `--duration-75` through `--duration-1000`

---

## 2. Naming & Structure

### Component Naming

- **Element tag:** `bit-[name]` → `bit-button`, `bit-checkbox`
- **File location:** `src/[category]/[name]/[name].ts`
- **Props interface:** `[Name]Props` → `ButtonProps`
- **Event detail:** `[Name]ChangeEvent`, `[Name]ClickEvent`, etc.

### File Structure

```typescript
// 1. Imports
import { css, defineElement, html } from '@vielzeug/craftit';
import { colorThemeMixin, disabledLoadingMixin } from '../../styles';
import type { ThemeColor, ComponentSize, VisualVariant } from '../../types';

// 2. Top comment (minimal)
/**
 * # bit-component
 * 
 * Brief one-line description.
 * 
 * @element bit-component
 */

// 3. Styles
const styles = css`...`;

// 4. Props interface (comprehensive JSDoc)
/**
 * Component Properties
 * ...
 */
export interface ComponentProps { }

// 5. Event detail types
export interface ComponentChangeEvent extends CheckableChangeEventDetail {}

// 6. Component definition
defineElement<HTMLElement, ComponentProps>('bit-component', {
  observedAttributes: [...] as const,
  
  onAttributeChanged(name, _oldValue, newValue, el) {
    // Handle attribute changes
  },
  
  onConnected(el) {
    // Setup event listeners
  },
  
  styles: [styles],
  template: () => html`...`,
});
```

### Boolean Attributes

**Always use presence/absence:**

```typescript
// ✅ CORRECT
const isChecked = el.hasAttribute('checked');
const isDisabled = newValue !== null;

// ❌ WRONG
const isChecked = el.getAttribute('checked') === 'true';
const isDisabled = newValue === 'true';
```

---

## 3. TypeScript Types

### Shared Type System

Use shared types from `../../types`:

```typescript
import type {
  // Common sizes
  ComponentSize,      // 'sm' | 'md' | 'lg'
  RoundedSize,        // 'none' | 'sm' | 'md' | ... | 'full'
  PaddingSize,        // 'none' | 'sm' | 'md' | 'lg' | 'xl'
  ElevationLevel,     // 0 | 1 | 2 | 3 | 4 | 5
  
  // Colors
  ThemeColor,         // 'primary' | 'secondary' | ...
  AllColors,          // ThemeColor | 'neutral'
  
  // Variants
  VisualVariant,      // 'solid' | 'flat' | 'bordered' | ...
  
  // Input types
  InputType,          // 'text' | 'email' | 'password' | ...
  ButtonType,         // 'button' | 'submit' | 'reset'
  
  // Event details
  ClickEventDetail,
  InputChangeEventDetail,
  CheckableChangeEventDetail,
  SliderChangeEventDetail,
  AccordionEventDetail,
} from '../../types';
```

### Component Props Interface

```typescript
/**
 * Component Properties
 * 
 * Detailed description with sections.
 * 
 * ## Slots
 * - **slot-name**: Purpose
 * 
 * ## Events
 * - **event-name**: When it fires
 * 
 * ## CSS Custom Properties
 * - `--prop-name`: Purpose
 * 
 * @example
 * ```html
 * <!-- Multiple examples -->
 * ```
 */
export interface ComponentProps {
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass'>;
  /** Theme color */
  color?: ThemeColor;
  /** Component size */
  size?: ComponentSize;
  /** Disable interaction */
  disabled?: boolean;
}
```

### Type Constraints

Use type utilities for constraints:

```typescript
// Exclude specific values
variant?: Exclude<VisualVariant, 'glass'>

// String literal from number
elevation?: `${ElevationLevel}`

// Require specific props
type RequiredColorProps = RequireProps<ComponentProps, 'color'>
```

---

## 4. CSS Architecture

### Variable Naming Convention

```css
:host {
  /* Public API: --component-* (customizable by users) */
  --button-bg: var(--color-primary);
  --button-radius: var(--rounded-md);
  
  /* Internal: --_* (implementation details) */
  --_bg: var(--button-bg, var(--color-primary));
  --_radius: var(--button-radius, var(--rounded-md));
  --_shadow: var(--shadow-sm);
  
  /* Usage */
  background: var(--_bg);
  border-radius: var(--_radius);
}
```

### CSS Structure (Strict Order)

```css
const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */
  
  :host {
    /* CSS custom properties first */
    --_size: var(--component-size, var(--size-5));
    --_color: var(--component-color, var(--text-color-body));
    
    /* Then regular properties (alphabetically sorted) */
    align-items: center;
    display: inline-flex;
    gap: var(--size-2);
  }
  
  /* ========================================
     States (Shared Mixin)
     ======================================== */
  
  ${disabledLoadingMixin('button')}
  
  /* ========================================
     Color Themes (Shared Mixin)
     ======================================== */
  
  ${colorThemeMixin()}
  
  /* ========================================
     Visual Variants
     ======================================== */
  
  /* Solid (Default) */
  :host(:not([variant])) .element,
  :host([variant='solid']) .element {
    background: var(--_theme-base);
    color: var(--_theme-contrast);
  }
  
  /* Frost Variant (Shared Mixin) */
  ${frostVariantMixin('.element')}
  
  /* ========================================
     Size Variants
     ======================================== */
  
  :host([size='sm']) { --_size: var(--size-4); }
  :host([size='lg']) { --_size: var(--size-6); }
  
  /* ========================================
     Rounded Variant (Shared Mixin)
     ======================================== */
  
  ${roundedVariantMixin()}
  
  /* ========================================
     Rainbow Effect (Shared Mixin)
     ======================================== */
  
  ${rainbowEffectMixin('.element')}
`;
```

### Design Tokens Only

```css
/* ✅ DO - Use design tokens */
padding: var(--size-2);
background: var(--color-primary);
font-size: var(--text-base);
border-radius: var(--rounded-md);
transition: all var(--transition-fast);

/* ❌ DON'T - Hardcoded values */
padding: 0.5rem;
background: #3b82f6;
font-size: 16px;
border-radius: 0.375rem;
transition: all 150ms;
```

### Theme Color Variables

When using `colorThemeMixin()`, these variables are available:

```css
--_theme-base          /* Main color */
--_theme-contrast      /* Text color on base */
--_theme-focus         /* Hover/focus state */
--_theme-content       /* Active/pressed state */
--_theme-backdrop      /* Light background */
--_theme-border        /* Border color */
--_theme-shadow        /* Focus shadow */
```

---

## 5. Shared Mixins

### Available Mixins

Import from `../../styles`:

```typescript
import {
  // Variant mixins
  frostVariantMixin,
  roundedVariantMixin,
  
  // Theme mixins
  colorThemeMixin,
  elevationMixin,
  paddingMixin,
  
  // State mixins
  disabledStateMixin,
  loadingStateMixin,
  disabledLoadingMixin,
  
  // Effects
  rainbowEffectMixin,
  registerRainbowProperty,
} from '../../styles';
```

### Mixin Usage

#### Color Theme Mixin

```typescript
${colorThemeMixin()}

// Provides:
// - Color variables for 6 theme colors
// - Neutral color (no [color] attribute)
// - Halo shadow effects for each color
```

#### Frost Variant Mixin

```typescript
${frostVariantMixin('.element')}

// Provides:
// - Backdrop blur effect
// - Color-adaptive transparency
// - Hover states
// - With and without color variants
```

#### State Mixins

```typescript
// For components with disabled only
${disabledStateMixin()}

// For components with loading only
${loadingStateMixin()}

// For components with both (buttons, inputs)
${disabledLoadingMixin('button')}
```

#### Elevation Mixin

```typescript
${elevationMixin()}

// Provides shadow levels 0-5
// Usage: <component elevation="2">
```

#### Padding Mixin

```typescript
${paddingMixin()}

// Provides padding sizes: none, sm, md, lg, xl
// Usage: <component padding="lg">
```

#### Rounded Variant Mixin

```typescript
${roundedVariantMixin()}

// Provides border radius variants
// Usage: <component rounded="full">
```

#### Rainbow Effect Mixin

```typescript
// Must register property first
registerRainbowProperty();

${rainbowEffectMixin('.element')}

// Provides animated rainbow border
// Usage: <component rainbow>
```

---

## 6. Component Implementation

### Event Handling

```typescript
// Delegation on child elements (3 params: selector, event, handler)
el.on('button', 'click', (e) => {
  if (isDisabled()) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  el.emit('click', { originalEvent: e });
  e.stopPropagation(); // Prevent double firing
});

// Direct element listener (3 params: element, event, handler)
const input = el.query('input');
if (input) {
  el.on(input, 'input', (e) => {
    const target = e.target as HTMLInputElement;
    el.emit('input', { value: target.value, originalEvent: e });
  });
}

// Host element listener (2 params: event, handler - 'this' is host)
el.on('click', (e) => {
  el.emit('change', { checked: true, originalEvent: e });
});
```

### Query Methods

```typescript
// Returns element or undefined if not found
const button = el.query('button');
const button = el.query<HTMLButtonElement>('button'); // with type

// Returns array (empty if none found)
const buttons = el.queryAll('button');
const buttons = el.queryAll<HTMLButtonElement>('button'); // with type

// Always check if element exists before using
const input = el.query('input');
if (input) {
  input.value = 'hello';
}
```

### Template Helpers

```typescript
// Conditional rendering
${html.when(isLoading, () => html`<span class="spinner"></span>`)}

// Repeated elements
${html.repeat(items, item => item.id, item => html`
  <li>${item.name}</li>
`)}

// Dynamic classes
<div class="${html.classes({ active, disabled, selected })}"></div>

// Dynamic styles
<div style="${html.styles({ 
  color: textColor, 
  display: isVisible ? 'block' : 'none' 
})}"></div>

// Boolean attributes
<input ?checked="${isChecked}" ?disabled="${isDisabled}" />
```

### ARIA & Accessibility

```typescript
onConnected(el) {
  const host = el as unknown as HTMLElement;
  const isChecked = host.hasAttribute('checked');
  const isDisabled = host.hasAttribute('disabled');
  
  // Setup ARIA
  host.setAttribute('role', 'checkbox');
  host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
  host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  
  // Keyboard navigation
  if (!isDisabled) {
    host.setAttribute('tabindex', '0');
  }
  
  // Keyboard events
  el.on('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  });
  
  // Click handler
  el.on('click', toggle);
  
  function toggle() {
    if (host.hasAttribute('disabled')) return;
    
    const nextChecked = !host.hasAttribute('checked');
    if (nextChecked) {
      host.setAttribute('checked', '');
    } else {
      host.removeAttribute('checked');
    }
    
    host.setAttribute('aria-checked', nextChecked ? 'true' : 'false');
    el.emit('change', { checked: nextChecked });
  }
}

onAttributeChanged(el, name, _oldValue, newValue) {
  const host = el as unknown as HTMLElement;
  
  if (name === 'checked') {
    host.setAttribute('aria-checked', newValue !== null ? 'true' : 'false');
  } else if (name === 'disabled') {
    const isDisabled = newValue !== null;
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    
    if (isDisabled) {
      host.removeAttribute('tabindex');
    } else {
      host.setAttribute('tabindex', '0');
    }
  }
}
```

### Form Integration

```html
<!-- Hidden form input for native form submission -->
<input
  type="checkbox"
  name="${el.getAttribute('name') || ''}"
  value="${el.getAttribute('value') || ''}"
  ?checked="${el.hasAttribute('checked')}"
  ?disabled="${el.hasAttribute('disabled')}"
  aria-hidden="true"
  tabindex="-1"
  style="display: none;" />
```

---

## 7. JSDoc Documentation

### Top Comment (Minimal)

```typescript
/**
 * # bit-component
 * 
 * Brief one-line description of component purpose.
 * 
 * @element bit-component
 */
```

**Keep it simple:** 5 lines maximum, just header and element tag.

### Props Interface (Comprehensive)

```typescript
/**
 * Component Properties
 * 
 * Detailed description of component capabilities and features.
 * 
 * ## Slots
 * - **default**: Main content
 * - **prefix**: Content before main area (e.g., icons)
 * - **suffix**: Content after main area (e.g., badges)
 * 
 * ## Events
 * - **change**: Emitted when value changes
 * - **click**: Emitted when component is clicked
 * 
 * ## CSS Custom Properties
 * - `--component-bg`: Background color
 * - `--component-color`: Text color
 * - `--component-size`: Component dimensions
 * - `--component-radius`: Border radius
 * 
 * ## Keyboard Support (for interactive components)
 * - `Space/Enter`: Activate component
 * - `Arrow Up/Down`: Navigate options
 * 
 * ## Behavior (for special components)
 * - Single mode: Only one item can be active
 * - Propagates attributes to children
 * 
 * @example
 * ```html
 * <!-- Basic usage -->
 * <bit-component>Default</bit-component>
 * 
 * <!-- With color and size -->
 * <bit-component color="primary" size="lg">
 *   Styled component
 * </bit-component>
 * 
 * <!-- With slots -->
 * <bit-component>
 *   <svg slot="prefix">...</svg>
 *   Content
 * </bit-component>
 * 
 * <!-- Advanced features -->
 * <bit-component variant="frost" rainbow>
 *   Special effects
 * </bit-component>
 * 
 * <!-- Different states -->
 * <bit-component disabled>Cannot interact</bit-component>
 * ```
 */
export interface ComponentProps {
  /** Visual style variant */
  variant?: VisualVariant;
  /** Theme color */
  color?: ThemeColor;
  /** Component size */
  size?: ComponentSize;
  /** Disable component interaction */
  disabled?: boolean;
}
```

### JSDoc Best Practices

✅ **DO:**
- Keep top comment minimal (5 lines)
- Put all details in Props interface JSDoc
- Use `##` for section headers
- Use `-` for list items
- Use backticks for CSS props and keyboard keys
- Show 3-8 examples covering common use cases
- Document each prop with JSDoc comment

❌ **DON'T:**
- Duplicate documentation between top and Props
- Use `@attr`, `@slot`, `@cssprop` at top (use sections instead)
- Show only one basic example
- Forget to document slots and events

---

## 8. Testing

### Test File Structure

```
src/
└── base/
    └── checkbox/
        ├── checkbox.ts
        └── __tests__/
            ├── checkbox.test.ts
            └── checkbox.a11y.test.ts
```

### Unit Tests

```typescript
import { createFixture, userEvent } from '@vielzeug/craftit/testing';

describe('bit-checkbox', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  it('should toggle on click', async () => {
    const fixture = await createFixture('bit-checkbox');
    fixture.element.textContent = 'Label';
    
    expect(fixture.element.hasAttribute('checked')).toBe(false);
    
    await userEvent.click(fixture.element);
    expect(fixture.element.hasAttribute('checked')).toBe(true);
    
    await userEvent.click(fixture.element);
    expect(fixture.element.hasAttribute('checked')).toBe(false);
    
    fixture.destroy();
  });
  
  it('should not toggle when disabled', async () => {
    const fixture = await createFixture('bit-checkbox', { disabled: true });
    
    await userEvent.click(fixture.element);
    expect(fixture.element.hasAttribute('checked')).toBe(false);
    
    fixture.destroy();
  });
  
  it('should emit change event', async () => {
    const fixture = await createFixture('bit-checkbox');
    const changeHandler = vi.fn();
    
    fixture.element.addEventListener('change', changeHandler);
    await userEvent.click(fixture.element);
    
    expect(changeHandler).toHaveBeenCalledTimes(1);
    expect(changeHandler.mock.calls[0][0].detail.checked).toBe(true);
    
    fixture.destroy();
  });
});
```

### Accessibility Tests

```typescript
import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';

describe('bit-checkbox a11y', () => {
  beforeAll(async () => {
    await import('../checkbox');
  });

  it('should have no accessibility violations', async () => {
    const fixture = await createFixture('bit-checkbox');
    fixture.element.textContent = 'Label';
    
    const results = await axe.run(fixture.element);
    expect(results.violations).toHaveLength(0);
    
    fixture.destroy();
  });

  it('should have proper ARIA attributes', async () => {
    const fixture = await createFixture('bit-checkbox', { checked: true });
    
    expect(fixture.element.getAttribute('role')).toBe('checkbox');
    expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    expect(fixture.element.getAttribute('tabindex')).toBe('0');
    
    fixture.destroy();
  });
});
```

### Test Coverage Goals

- ✅ All interactive states (default, hover, focus, active, disabled)
- ✅ All variants (visual, color, size)
- ✅ Keyboard navigation
- ✅ Event emissions
- ✅ ARIA attributes
- ✅ Form integration
- ✅ Edge cases

---

## 9. Build Integration

### 1. vite.config.ts

Add component entry point:

```typescript
export default defineConfig(
  getConfig(__dirname, {
    // ...other config
    entry: {
      'component-name': resolve(__dirname, './src/category/component-name/component-name'),
      // existing entries...
    },
    // ...other config
  }),
);
```

### 2. package.json

Add export mapping:

```json
{
  "exports": {
    "./component-name": {
      "types": "./dist/component-name.d.ts",
      "import": "./dist/component-name.js",
      "require": "./dist/component-name.cjs"
    }
  }
}
```

### 3. src/types/bit.d.ts

Add type augmentation for global `HTMLElementTagNameMap`:

```typescript
import type { ComponentProps } from './category/component-name/component-name';

export type { ComponentProps };

declare global {
  interface HTMLElementTagNameMap {
    'bit-component-name': WebComponent<HTMLElement, ComponentProps>;
  }
}
```

---

## 10. Checklist

### Component Setup

- [ ] **Naming:** `bit-[name]`, `[Name]Props`, proper file location
- [ ] **Imports:** All required types from `../../types`
- [ ] **Top comment:** Minimal 5-line header with `@element`
- [ ] **Styles:** Proper CSS structure with sections
- [ ] **Props:** Comprehensive JSDoc with sections and examples

### TypeScript

- [ ] Use shared types (`ThemeColor`, `ComponentSize`, etc.)
- [ ] Export Props interface with full JSDoc
- [ ] Export event detail types
- [ ] Individual prop JSDoc comments

### CSS Architecture

- [ ] Public variables: `--component-*`
- [ ] Internal variables: `--_*`
- [ ] Design tokens only (no hardcoded values)
- [ ] Alphabetically sorted properties
- [ ] Clear section comments
- [ ] Use shared mixins where appropriate

### Variants

- [ ] **Visual:** Support relevant variants (solid, flat, bordered, outline, ghost, text, frost)
- [ ] **Colors:** 6 theme colors (primary, secondary, info, success, warning, error)
- [ ] **Sizes:** 3 sizes (sm, md, lg)
- [ ] **Rounded:** Border radius variants (if applicable)
- [ ] **Elevation:** Shadow levels (if applicable)
- [ ] **Padding:** Internal spacing (if applicable)

### Mixins Used

- [ ] `colorThemeMixin()` for theme colors
- [ ] `frostVariantMixin()` for frost effect
- [ ] `disabledStateMixin()` or `disabledLoadingMixin()` for states
- [ ] `elevationMixin()` for shadows (if applicable)
- [ ] `paddingMixin()` for spacing (if applicable)
- [ ] `roundedVariantMixin()` for border radius (if applicable)
- [ ] `rainbowEffectMixin()` for rainbow effect (if applicable)

### Accessibility

- [ ] Proper `role` attribute
- [ ] `aria-checked`, `aria-disabled`, `aria-expanded` (as needed)
- [ ] `tabindex` management (0 when enabled, removed when disabled)
- [ ] Keyboard support (Space, Enter, Arrows as appropriate)
- [ ] Focus visible styles
- [ ] Screen reader friendly labels

### Events & Interaction

- [ ] Use `el.on()` for event listeners
- [ ] Include `originalEvent` in emitted events
- [ ] Call `e.stopPropagation()` in delegated events
- [ ] Proper disabled state handling
- [ ] Form integration (hidden input if needed)

### Documentation

- [ ] Top comment: 5 lines maximum
- [ ] Props JSDoc: All sections (Slots, Events, CSS Props, Keyboard, Behavior)
- [ ] 3-8 examples showing common use cases
- [ ] Each prop has JSDoc comment
- [ ] Event detail types exported

### Testing

- [ ] Unit tests for all states
- [ ] Accessibility tests (axe)
- [ ] Event emission tests
- [ ] Keyboard navigation tests
- [ ] Edge case coverage

### Build Integration

- [ ] Entry in `vite.config.ts`
- [ ] Export in `package.json`
- [ ] Type declaration in `src/types/bit.d.ts`

### Common Mistakes to Avoid

- ❌ String values for boolean attributes (`'true'` vs presence)
- ❌ Hardcoded values instead of design tokens
- ❌ Mixed variable naming (`--component-*` vs `--_*`)
- ❌ Unsorted CSS properties
- ❌ Missing `-webkit-backdrop-filter` for frost/glass
- ❌ Forgetting `stopPropagation()` in delegated events
- ❌ Missing `originalEvent` in emitted events
- ❌ Duplicate JSDoc in top comment and Props
- ❌ Not using shared types
- ❌ Not using shared mixins

---

## 11. Examples

### Gold Standard Components

**Button** (`src/base/button/button.ts`)
- ✅ All variant types (solid, flat, bordered, outline, ghost, text, frost)
- ✅ Complete state management (disabled, loading)
- ✅ Loading state with spinner
- ✅ Icon support with prefix/suffix slots
- ✅ Rainbow effect
- ✅ Frost variant
- ✅ Icon-only and fullwidth modes
- ✅ Comprehensive JSDoc with 5 examples
- ✅ Uses mixins: colorTheme, disabledLoading, frost, rainbow, rounded

**Input** (`src/form/input/input.ts`)
- ✅ Form integration
- ✅ Label placement options
- ✅ Prefix/suffix slots
- ✅ Frost variant
- ✅ Comprehensive JSDoc with 5 examples
- ✅ Helper text support

**Checkbox** (`src/form/checkbox/checkbox.ts`)
- ✅ Perfect ARIA implementation
- ✅ Keyboard navigation
- ✅ Indeterminate state
- ✅ Form integration with hidden input
- ✅ Comprehensive JSDoc with 4 examples
- ✅ Uses mixins: colorTheme, disabledState

**Card** (`src/base/card/card.ts`)
- ✅ Multiple slots (media, header, content, footer, actions)
- ✅ Clickable/hoverable states
- ✅ Orientation support
- ✅ Frost variant
- ✅ Comprehensive JSDoc with 5 examples

**Box** (`src/layout/box/box.ts`)
- ✅ Semantic HTML element support (as attribute)
- ✅ Frost variant with and without color
- ✅ Elevation system
- ✅ Padding system
- ✅ Rainbow effect
- ✅ Uses mixins: colorTheme, frost, rainbow
- ✅ Proper observedAttributes

**Slider** (`src/form/slider/slider.ts`)
- ✅ Keyboard navigation (arrows, home, end, page up/down)
- ✅ Pointer interaction
- ✅ Range with min/max/step
- ✅ Comprehensive JSDoc with 5 examples
- ✅ Visual progress indication
- ✅ Form integration

---

## Quick Reference

### Component Template

```typescript
import { css, defineElement, html } from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin } from '../../styles';
import type { ThemeColor, ComponentSize } from '../../types';

/**
 * # bit-component
 * 
 * Brief description.
 * 
 * @element bit-component
 */

const styles = css`
  @layer buildit.base {
    :host {
      --_size: var(--component-size, var(--size-5));
      display: inline-flex;
    }
    
    .element {
      background: var(--_bg);
      color: var(--_color);
    }
  }
  
  ${disabledStateMixin()}
  ${colorThemeMixin()}
  
  @layer buildit.variants {
    :host([size='sm']) { --_size: var(--size-4); }
    :host([size='lg']) { --_size: var(--size-6); }
  }
`;

/**
 * Component Properties
 * 
 * Description
 * 
 * ## Slots
 * - **default**: Content
 * 
 * ## Events
 * - **change**: When changed
 * 
 * ## CSS Custom Properties
 * - `--component-bg`: Background color
 * - `--component-color`: Text color
 * 
 * @example
 * ```html
 * <bit-component>Example</bit-component>
 * ```
 */
export interface ComponentProps {
  /** Theme color */
  color?: ThemeColor;
  /** Component size */
  size?: ComponentSize;
  /** Disable interaction */
  disabled?: boolean;
}

defineElement<HTMLElement, ComponentProps>('bit-component', {
  observedAttributes: ['color', 'size', 'disabled'] as const,
  
  onAttributeChanged(name, _oldValue, newValue, el) {
    const host = el as unknown as HTMLElement;
    
    // Sync ARIA attributes
    if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
    }
  },
  
  onConnected(el) {
    // Setup event listeners
    el.on('click', (e) => {
      if (el.hasAttribute('disabled')) {
        e.preventDefault();
        return;
      }
      el.emit('change', { originalEvent: e });
    });
  },
  
  styles: [styles],
  template: () => html`<slot></slot>`,
});
```

---

**Last Updated:** February 27, 2026  
**Version:** 3.0 (Current State Update)

**Key Updates in v3.0:**
- Updated to reflect actual project structure
- Corrected component implementation patterns
- Updated test patterns to match __tests__ directory structure
- Removed non-existent visual regression testing section
- Added actual component categories and available components
- Updated mixin documentation to match implementation
- Corrected build integration steps
- Updated event handling patterns to match el.on() API
- Fixed query method documentation

