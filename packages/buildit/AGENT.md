# Buildit Agent Guide (AGENT.md)

**Critical technical instructions for AI agents building Buildit components.**

This document provides battle-tested patterns from the Buildit component library. Follow these guidelines to ensure consistency, accessibility, and maintainability.

---

## 1. Core Directives [CRITICAL]

### 1.1 Naming Conventions
- **Element name**: `bit-[component-name]` (singular, kebab-case)
  - ✅ `bit-button`, `bit-checkbox`, `bit-switch`
  - ❌ `bit-buttons`, `BitButton`, `bit_button`
- **File name**: `[component-name].ts` (singular, lowercase)
  - ✅ `button.ts`, `checkbox.ts`, `switch.ts`
- **Directory**: `src/[category]/[component-name]/`
  - ✅ `src/form/checkbox/`, `src/base/button/`
- **Props type**: `[ComponentName]Props` (PascalCase)
  - ✅ `ButtonProps`, `CheckboxProps`, `SwitchProps`

### 1.2 Boolean Attributes [CRITICAL]
**Always use presence/absence, NEVER string values.**

```typescript
// ✅ CORRECT
if (name === 'checked') {
  const isChecked = newValue !== null; // presence check
  host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
}

// ❌ WRONG - Do NOT use string values
if (el.getAttribute('disabled') === 'true') { } // Bug: "false" string is truthy!
```

> [!CRITICAL]
> Any non-null string (including `"false"`) evaluates to `true` in JavaScript. Always use `newValue !== null` or `hasAttribute()`.

### 1.3 Design Tokens Only
**Never hardcode values. Always use design tokens from `theme.css`.**

```css
/* ✅ CORRECT - Use design tokens */
--_size: var(--size-5);
padding: var(--size-2) var(--size-4);
font-size: var(--text-sm);
border-radius: var(--rounded-md);
background: var(--color-primary);
box-shadow: var(--shadow-sm);
transition: all var(--transition-normal);

/* ❌ WRONG - Hardcoded values */
width: 20px;
padding: 0.5rem 1rem;
font-size: 14px;
border-radius: 6px;
background: #3b82f6;
```

**Available token categories**:
- Spacing: `--size-0` to `--size-96` (0.25rem increments)
- Typography: `--text-xs` to `--text-9xl`, `--font-normal` to `--font-bold`
- Colors: `--color-primary`, `--color-success`, etc. (6 variants each: base, contrast, focus, content, backdrop, shadow)
- Border radius: `--rounded-xs` to `--rounded-full`
- Shadows: `--shadow-sm` to `--shadow-2xl`
- Transitions: `--transition-fast`, `--transition-normal`, `--transition-slow`, `--transition-slower`, `--transition-spring`
- Borders: `--border`, `--border-2`, `--border-4`

---

## 2. CSS Styling Pattern [REQUIRED]

### 2.1 Internal Variables Pattern
Separate **Public API** (user-customizable) from **Internal Implementation** (component logic).

```css
:host {
  /* Public API - users can override these */
  --checkbox-size: var(--size-5);
  --checkbox-bg: var(--color-contrast-200);
  --checkbox-checked-bg: /* set per color */;
  
  /* Internal variables - read from public API with fallbacks */
  --_size: var(--checkbox-size, var(--size-5));
  --_bg: var(--checkbox-bg, var(--color-contrast-200));
  --_font-size: var(--checkbox-font-size, var(--text-sm));
}

/* Use internal variables in selectors */
.box {
  width: var(--_size);
  height: var(--_size);
  background: var(--_bg);
}
```

**Naming convention**:
- Public API: `--[component]-[property]` (e.g., `--checkbox-size`, `--button-bg`)
- Internal: `--_[property]` (e.g., `--_size`, `--_bg`, `--_active-bg`)

### 2.2 CSS Structure [REQUIRED]
Organize styles with clear section headers for readability:

```css
const styles = css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    --_size: var(--component-size, var(--size-5));
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

  /* ... other colors: success, warning, error */

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
    background: var(--_bg);
    transition: all var(--transition-normal);
  }
`;
```

### 2.3 Color System [REQUIRED]
All semantic colors provide 6 variants. Use the appropriate one:

```css
:host([color='primary']) {
  --_active-bg: var(--color-primary);           /* Base color for backgrounds */
  --_text: var(--color-primary-contrast);       /* High contrast text */
  --_hover: var(--color-primary-focus);         /* Hover/focus states */
  --_content: var(--color-primary-content);     /* Alternative text */
  --_backdrop: var(--color-primary-backdrop);   /* Subtle background */
  --_shadow: var(--color-primary-shadow);       /* Focus ring/shadow */
}
```

**Available colors**: `primary`, `secondary`, `success`, `warning`, `error`

---

## 3. Component Template [REQUIRED]

### 3.1 Complete Component Structure

```typescript
import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-[component-name] - Component description
 *
 * @element bit-[component-name]
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disabled state
 * @attr {string} value - Component value
 * @attr {string} name - Form field name
 * @attr {string} color - Color theme: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
 * @attr {string} size - Component size: 'sm' | 'md' | 'lg'
 *
 * @slot - Default slot for component label
 *
 * @cssprop --component-size - Size of the component
 * @cssprop --component-bg - Background color
 * @cssprop --component-checked-bg - Background when checked
 * @cssprop --component-color - Icon/text color
 * @cssprop --component-font-size - Font size
 *
 * @fires change - Emitted when state changes
 *   detail: { checked: boolean; value: string | null; originalEvent: Event }
 */

// -------------------- Styles --------------------
const styles = css`
  /* ...see section 2.2 for structure... */
`;

// -------------------- Props Type --------------------
export type [ComponentName]Props = {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
  name?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
};

// -------------------- Component Definition --------------------
defineElement<HTMLElement, [ComponentName]Props>('bit-[component-name]', {
  observedAttributes: ['checked', 'disabled', 'value', 'name', 'color', 'size'] as const,

  onAttributeChanged(el, name, _oldValue, newValue) {
    const host = el as unknown as HTMLElement;

    if (name === 'checked') {
      const isChecked = newValue !== null;
      host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
      
      // Sync with internal input if present
      const input = host.shadowRoot?.querySelector('input') as HTMLInputElement | null;
      if (input) input.checked = isChecked;
    } else if (name === 'disabled') {
      const isDisabled = newValue !== null;
      host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
      
      // Manage tabindex
      if (isDisabled) {
        host.removeAttribute('tabindex');
      } else if (!host.hasAttribute('tabindex')) {
        host.setAttribute('tabindex', '0');
      }
    }
  },

  onConnected(el) {
    const host = el as unknown as HTMLElement;

    // Initial ARIA setup
    const isChecked = host.hasAttribute('checked');
    const isDisabled = host.hasAttribute('disabled');

    host.setAttribute('role', 'checkbox'); // or 'switch', 'radio', etc.
    host.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    host.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    if (!isDisabled && !host.hasAttribute('tabindex')) {
      host.setAttribute('tabindex', '0');
    }

    // Keyboard interaction
    el.on(el, 'keydown', (e) => {
      const keyEvent = e as KeyboardEvent;
      if (host.hasAttribute('disabled')) return;
      if (keyEvent.key === ' ' || keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        toggleState(keyEvent);
      }
    });

    // Click interaction
    el.on(el, 'click', (e) => {
      if (host.hasAttribute('disabled')) return;
      toggleState(e);
    });

    function toggleState(originalEvent?: Event) {
      const nextChecked = !host.hasAttribute('checked');

      if (nextChecked) {
        host.setAttribute('checked', '');
      } else {
        host.removeAttribute('checked');
      }

      el.emit('change', {
        checked: nextChecked,
        value: host.getAttribute('value'),
        originalEvent: originalEvent || new Event('change'),
      });
    }
  },

  styles: [styles],

  template: (el) => html`
    <input
      type="checkbox"
      ?checked="${el.hasAttribute('checked')}"
      ?disabled="${el.hasAttribute('disabled')}"
      name="${el.getAttribute('name') || ''}"
      value="${el.getAttribute('value') || ''}"
      aria-hidden="true"
      tabindex="-1" />
    <div class="element">
      <!-- Visual element -->
    </div>
    <span class="label"><slot></slot></span>
  `,
});

export default {};
```

### 3.2 Key Implementation Details

**ARIA Roles**:
- Form controls: `role="checkbox"`, `role="switch"`, `role="radio"`
- Use `aria-checked`, `aria-disabled`, `aria-label` appropriately
- Add `tabindex="0"` to host for keyboard navigation (remove when disabled)

**Hidden Input Pattern**:
```html
<input
  type="checkbox"
  aria-hidden="true"
  tabindex="-1"
  ?checked="${el.hasAttribute('checked')}"
  ?disabled="${el.hasAttribute('disabled')}" />
```
- Ensures form integration
- Hidden from accessibility tree (`aria-hidden="true"`, `tabindex="-1"`)
- Host element handles all user interaction

**Event Emission**:
```typescript
el.emit('change', {
  checked: nextChecked,
  value: host.getAttribute('value'),
  originalEvent: e,  // Always include for user-driven events
});
```

### 3.7 Event Listener Pattern [CRITICAL]

**Use the unified `el.on()` method with TypeScript overloads for all event handling.**

```typescript
// ✅ BEST - Host element events (2 params)
el.on('click', (e) => {
  // e is automatically typed as MouseEvent
  console.log('Clicked at:', e.clientX, e.clientY);
  el.emit('card-clicked', { x: e.clientX, y: e.clientY });
});

// ✅ BEST - Shadow DOM delegation (3 params)
el.on('button', 'click', (e, target) => {
  // e is MouseEvent, target is the matched button
  console.log('Button clicked:', target.textContent);
  el.emit('action', { button: target.textContent });
});

// ✅ BEST - Direct element binding (3 params)
const input = el.query('input');
if (input) {
  el.on(input, 'input', (e) => {
    // e is Event, automatically typed
    console.log('Input changed');
  });
}

// ✅ GOOD - Query shortcuts (cleaner than find())
const button = el.query<HTMLButtonElement>('button'); // undefined if not found
const buttons = el.queryAll<HTMLButtonElement>('button'); // Always returns array
const input = el.queryRequired<HTMLInputElement>('input'); // Throws if not found
```

**Benefits:**
- ✅ Full TypeScript inference for event types
- ✅ Single method for all event scenarios (host, delegation, direct)
- ✅ Automatic cleanup via AbortSignal
- ✅ Returns cleanup function for manual control
- ✅ Undefined instead of null (better ergonomics)

### 3.8 Event Handling Anti-Patterns [CRITICAL]

**Never listen for and emit events with the same name on the same element:**

```typescript
// ❌ WRONG - Creates infinite loop!
el.on('click', (e) => {
  el.emit('click', { originalEvent: e }); // Triggers listener again!
});

// ✅ CORRECT - Transform event name
el.on('click', (e) => {
  el.emit('change', { originalEvent: e }); // Different name = no loop
});

// ✅ CORRECT - Use event delegation on internal element
el.on('button', 'click', (e) => {
  el.emit('click', { originalEvent: e }); // Internal button ≠ host
  e.stopPropagation(); // Stop internal event
});

// ✅ CORRECT - For visual-only states, don't intercept at all
// Just use CSS: :host([clickable]) { cursor: pointer; }
// Let native events bubble naturally
```

**Event transformation patterns:**
- `click` → `change` (form controls)
- `toggle` → `expand`/`collapse` (accordions)
- `input` → re-emit `input` (from internal to host, different elements)

### 3.9 State Management Best Practices [RECOMMENDED]

**Use batch updates for multiple state changes:**

```typescript
// ❌ BAD - Multiple renders
onConnected(el) {
  el.on('button', 'click', () => {
    el.state.count = 10;      // Renders
    el.state.name = 'Alice';  // Renders again
    el.state.items = [];      // Renders again
  });
}

// ✅ GOOD - Single render with batch
onConnected(el) {
  el.on('button', 'click', () => {
    el.batch((state) => {
      state.count = 10;
      state.name = 'Alice';
      state.items = [];
      // Only renders once at the end
    });
  });
}
```

**Use watch for side effects:**

```typescript
onConnected(el) {
  // React to specific state changes
  el.watch(
    (state) => state.count,
    (newCount, oldCount) => {
      if (newCount > 10) {
        console.log('Count exceeded 10!');
      }
    }
  );
}
```

---

## 4. Integration Checklist [REQUIRED]

After creating a component, integrate it into the build system:

### 4.1 Build Configuration

**1. Vite Config** (`vite.config.ts`)
```typescript
entry: {
  // ...existing entries...
  'component-name': resolve(__dirname, './src/[category]/[component-name]/[component-name]'),
}
```

**2. Package Exports** (`package.json`)
```json
"./component-name": {
  "types": "./dist/component-name.d.ts",
  "import": "./dist/component-name.js",
  "require": "./dist/component-name.cjs"
}
```

**3. Global Types** (`src/types.d.ts`)
```typescript
declare global {
  interface HTMLElementTagNameMap {
    'bit-component-name': HTMLElement;
  }
}

export type ComponentNameProps = {
  checked?: boolean;
  // ...props...
};
```

**4. Category Export** (`src/[category]/index.ts`)
```typescript
export * from './component-name/component-name';
```

### 4.2 Documentation Updates

**1. Component Guide** (`COMPONENT-GUIDE.md`)
- Add to component list in section 1

**2. API Documentation** (`docs/buildit/api.md`)
- Add import path
- Add API reference section

**3. Index Page** (`docs/buildit/index.md`)
- Add to "Available Components" section

**4. Navigation Config** (`docs/.vitepress/config.ts`)
- Add to sidebar configuration

**5. Component Documentation** (`docs/buildit/components/[name].md`)
- Create comprehensive documentation file

---

## 5. Testing Pattern [REQUIRED]

### 5.1 Unit Tests

**File**: `src/[category]/[component-name]/__tests__/[component-name].test.ts`

```typescript
import { type ComponentFixture, createFixture, userEvent, waitForEvent } from '@vielzeug/craftit/testing';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

describe('bit-component-name', () => {
  let fixture: ComponentFixture<HTMLElement>;

  beforeAll(async () => {
    await import('../component-name');
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe('Rendering', () => {
    it('should render with required shadow DOM elements', async () => {
      fixture = await createFixture('bit-component-name');

      expect(fixture.query('.element')).toBeTruthy();
      expect(fixture.query('slot')).toBeTruthy();
    });
  });

  describe('Checked State', () => {
    it('should sync checked attribute', async () => {
      fixture = await createFixture('bit-component-name', { checked: true });

      expect(fixture.element.hasAttribute('checked')).toBe(true);
      expect(fixture.element.getAttribute('aria-checked')).toBe('true');
    });

    it('should toggle checked state dynamically', async () => {
      fixture = await createFixture('bit-component-name');

      await fixture.setAttribute('checked', true);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await fixture.setAttribute('checked', false);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should toggle on click', async () => {
      fixture = await createFixture('bit-component-name');

      await userEvent.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await userEvent.click(fixture.element);
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });

    it('should toggle with keyboard (Space/Enter)', async () => {
      fixture = await createFixture('bit-component-name');

      await userEvent.keyboard(fixture.element, ' ');
      expect(fixture.element.hasAttribute('checked')).toBe(true);

      await userEvent.keyboard(fixture.element, 'Enter');
      expect(fixture.element.hasAttribute('checked')).toBe(false);
    });
  });

  describe('Disabled State', () => {
    it('should prevent interaction when disabled', async () => {
      fixture = await createFixture('bit-component-name', { disabled: true });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('Events', () => {
    it('should emit change event with correct detail', async () => {
      fixture = await createFixture('bit-component-name', { value: 'test' });
      const changeHandler = vi.fn();

      fixture.element.addEventListener('change', changeHandler);
      await userEvent.click(fixture.element);

      expect(changeHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            checked: true,
            value: 'test',
            originalEvent: expect.any(Event),
          }),
        })
      );
    });

    it('should emit event asynchronously', async () => {
      fixture = await createFixture('bit-component-name');
      
      const eventPromise = waitForEvent(fixture.element, 'change');
      await userEvent.click(fixture.element);
      const event = await eventPromise;

      expect(event.type).toBe('change');
    });
  });

  describe('Color Variants', () => {
    const colors = ['primary', 'secondary', 'success', 'warning', 'error'] as const;

    colors.forEach((color) => {
      it(`should apply ${color} color`, async () => {
        fixture = await createFixture('bit-component-name', { color });
        expect(fixture.element.getAttribute('color')).toBe(color);
      });
    });
  });

  describe('Size Variants', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      it(`should apply ${size} size`, async () => {
        fixture = await createFixture('bit-component-name', { size });
        expect(fixture.element.getAttribute('size')).toBe(size);
      });
    });
  });
});
```

**Key Testing Utilities from `@vielzeug/craftit/testing`:**

- **`userEvent.click(element)`** - Simulate click (use instead of `element.click()`)
- **`userEvent.keyboard(element, key)`** - Simulate keyboard input (e.g., `' '`, `'Enter'`, `'Escape'`)
- **`userEvent.type(input, text)`** - Type text into input elements
- **`userEvent.focus(element)`** / **`userEvent.blur(element)`** - Focus/blur simulation
- **`userEvent.hover(element)`** / **`userEvent.unhover(element)`** - Hover states
- **`userEvent.clear(input)`** - Clear input value
- **`waitForEvent(element, 'eventName')`** - Wait for specific event to fire
- **`fixture.query(selector)`** - Query shadow DOM (no need for `shadowRoot?.querySelector`)
- **`fixture.queryAll(selector)`** - Query all in shadow DOM
- **`fixture.setAttribute(name, value)`** - Set attribute and auto-update
- **`fixture.setAttributes({...})`** - Set multiple attributes at once
- **`fixture.update()`** - Wait for re-render (calls `flush()` if available)

**Benefits of using `userEvent`:**
- ✅ More realistic user interactions
- ✅ Automatically waits for render after actions
- ✅ Consistent behavior across tests
- ✅ Simpler and cleaner test code

> [!NOTE]
> **Test Requirements:** Tests should be simple, non-redundant, non-trivial but ensure maximum coverage while also covering all edge cases. Focus on meaningful tests that validate actual functionality and user interactions.

### 5.2 Accessibility Tests

**File**: `src/[category]/[component-name]/__tests__/[component-name].a11y.test.ts`

```typescript
import { createFixture } from '@vielzeug/craftit/testing';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

describe('bit-component-name accessibility', () => {
  beforeAll(async () => {
    await import('../component-name');
  });

  describe('WCAG 2.1 Compliance', () => {
    it('should have no accessibility violations', async () => {
      const fixture = await createFixture('bit-component-name');
      fixture.element.textContent = 'Label text';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when checked', async () => {
      const fixture = await createFixture('bit-component-name', { checked: true });
      fixture.element.textContent = 'Checked label';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });

    it('should have no violations when disabled', async () => {
      const fixture = await createFixture('bit-component-name', { disabled: true });
      fixture.element.textContent = 'Disabled label';

      const results = await axe.run(fixture.element);
      expect(results.violations).toHaveLength(0);

      fixture.destroy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be keyboard accessible', async () => {
      const fixture = await createFixture('bit-component-name');
      
      expect(fixture.element.getAttribute('tabindex')).toBe('0');
      
      fixture.destroy();
    });

    it('should not be keyboard accessible when disabled', async () => {
      const fixture = await createFixture('bit-component-name', { disabled: true });
      
      expect(fixture.element.hasAttribute('tabindex')).toBe(false);
      
      fixture.destroy();
    });
  });
});
```

### 5.3 Test Coverage Goals
- ✅ 100% code coverage for unit tests
- ✅ All WCAG 2.1 Level AA compliance checks
- ✅ All user interactions (click, keyboard, disabled states)
- ✅ All variants (colors, sizes)
- ✅ All attribute synchronization
- ✅ Event emission with correct detail structure

---

## 6. Common Patterns [REFERENCE]

### 6.1 Form Integration Pattern
```typescript
// Hidden input for form submission
template: (el) => html`
  <input
    type="checkbox"
    name="${el.getAttribute('name') || ''}"
    value="${el.getAttribute('value') || ''}"
    ?checked="${el.hasAttribute('checked')}"
    ?disabled="${el.hasAttribute('disabled')}"
    aria-hidden="true"
    tabindex="-1" />
  <!-- Visual elements -->
`;
```

### 6.2 Transition Pattern
```css
.element {
  transition:
    background var(--transition-slower),
    border-color var(--transition-slower),
    transform var(--transition-spring),
    box-shadow var(--transition-normal);
  will-change: background, transform; /* Performance hint */
}
```

### 6.3 Focus State Pattern
```css
/* Use hidden input for focus detection */
input:focus-visible + .element {
  box-shadow: var(--_focus-shadow);
}

/* Or on host itself */
:host(:focus-visible) .element {
  box-shadow: var(--_focus-shadow);
}
```

### 6.4 Size Variant Pattern
```css
:host {
  --_size: var(--component-size, var(--size-5)); /* Default: md */
}

:host([size='sm']) {
  --_size: var(--size-4);
  --_font-size: var(--text-xs);
}

:host([size='lg']) {
  --_size: var(--size-6);
  --_font-size: var(--text-base);
}
```

---

## 7. Quick Reference [CHEATSHEET]

### 7.1 Checklist for New Components

- [ ] File structure: `src/[category]/[component-name]/[component-name].ts`
- [ ] Naming: `bit-[component-name]`, `[ComponentName]Props`
- [ ] Boolean attributes use presence/absence (`newValue !== null`)
- [ ] All values from design tokens (no hardcoding)
- [ ] Internal variables pattern (`--_*`) with public API (`--component-*`)
- [ ] CSS sections clearly labeled
- [ ] All 5 color variants (primary, secondary, success, warning, error)
- [ ] All 3 size variants (sm, md, lg)
- [ ] ARIA attributes (role, aria-checked, aria-disabled)
- [ ] Keyboard support (Space, Enter keys)
- [ ] Disabled state prevents interaction
- [ ] Events include `originalEvent` in detail
- [ ] Hidden input for form integration (if form control)
- [ ] JSDoc with `@element`, `@attr`, `@slot`, `@cssprop`, `@fires`
- [ ] Unit tests (100% coverage goal)
- [ ] Accessibility tests (axe-core)
- [ ] Build integration (vite.config.ts, package.json, types.d.ts)
- [ ] Documentation (component docs, API docs, navigation)

### 7.2 Common Mistakes to Avoid

❌ **DON'T**: Use `"true"`/`"false"` string values for boolean attributes  
✅ **DO**: Use presence/absence (`newValue !== null`)

❌ **DON'T**: Hardcode colors, sizes, spacing  
✅ **DO**: Use design tokens (`--color-primary`, `--size-4`, etc.)

❌ **DON'T**: Mix public and internal CSS variables  
✅ **DO**: Separate `--component-*` (public) from `--_*` (internal)

❌ **DON'T**: Forget to sync attributes with ARIA  
✅ **DO**: Update `aria-checked`, `aria-disabled` in `onAttributeChanged`

❌ **DON'T**: Make interactive elements non-keyboard accessible  
✅ **DO**: Add `tabindex="0"` and handle Space/Enter keys

❌ **DON'T**: Emit events without `originalEvent`  
✅ **DO**: Include `originalEvent` in event detail

❌ **DON'T**: Forget to prevent disabled interaction  
✅ **DO**: Check `hasAttribute('disabled')` in event handlers

---

## 8. Example: Complete Checkbox Component

See `src/form/checkbox/checkbox.ts` and `src/form/switch/switch.ts` as gold standard implementations that follow all these patterns.

> [!NOTE]
> **Important:** The project is a greenfield project. All existing code is considered legacy and should be refactored as needed.
> Please do not create/add report or summary files of the changes you made into the project. All important information should live in the existing documentation.