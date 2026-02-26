# Buildit Agent Guide

**Quick reference for building consistent, accessible Buildit components.**

---

## 1. Naming & Structure

- **Element**: `bit-[name]` → `bit-button`, `bit-checkbox`  
- **File**: `src/[category]/[name]/[name].ts`  
- **Props**: `[Name]Props` → `ButtonProps`

**Boolean Attributes** - Use presence/absence:
```typescript
// ✅ CORRECT
const isChecked = newValue !== null;

// ❌ WRONG
if (el.getAttribute('disabled') === 'true') { }
```

**Design Tokens Only**:
```css
/* ✅ DO */
padding: var(--size-2);
background: var(--color-primary);

/* ❌ DON'T */
padding: 0.5rem;
background: #3b82f6;
```

---

## 2. CSS Patterns

**Variables:**
```css
:host {
  /* Public: --component-* */
  --component-size: var(--size-5);
  
  /* Internal: --_* */
  --_size: var(--component-size, var(--size-5));
}
```

**Structure** - Alphabetically sorted, clear sections:
```css
/* ========================================
   Base Styles
   ======================================== */
:host {
  --_padding: var(--size-2) var(--size-4);
  --_radius: var(--rounded-md);
  
  display: inline-flex;
  gap: var(--size-2);
}

/* ========================================
   Color Themes (6: primary, secondary, info, success, warning, error)
   Default: neutral (when no color attribute is set)
   ======================================== */
:host([color='primary']) {
  --_base: var(--color-primary);
  --_contrast: var(--color-primary-contrast);
  --_focus: var(--color-primary-focus);
}

/* ========================================
   Visual Variants
   Button: 6 variants (solid, flat, bordered, outline, ghost, text)
   Box/Card: 1 variant (frost) - default has no variant attribute
   ======================================== */
:host([variant='solid']) {
  --_bg: var(--_base);
  --_shadow: var(--shadow-sm);
}

/* Frost - Backdrop blur with smart color adaptation */
/* Neutral: canvas-based frost */
:host([variant='frost']:not([color])) .element {
  backdrop-filter: blur(var(--blur-md)) saturate(190%);
  -webkit-backdrop-filter: blur(var(--blur-md)) saturate(190%);
}

/* ========================================
   Size Variants (3: sm, md, lg)
   ======================================== */
:host([size='sm']) { --_size: var(--size-4); }
:host([size='lg']) { --_size: var(--size-6); }

/* ========================================
   States
   ======================================== */
:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}
```

---

## 3. Component Implementation

**Events:**
```typescript
// Host (2 params)
el.on('click', (e) => {
  el.emit('change', { checked: true, originalEvent: e });
});

// Delegation (3 params)
el.on('button', 'click', (e, target) => {
  el.emit('action', { button: target.textContent });
  e.stopPropagation();
});

// Direct element (3 params)
const input = el.query('input');
el.on(input, 'input', (e, target) => {
  console.log(target.value);
});
```

**Query:**
```typescript
el.query('button')              // undefined if not found
el.queryAll('button')           // Always array
el.queryRequired('input')       // Throws if not found
```

**Template Helpers:**
```typescript
${html.when(show, () => html`<div>Content</div>`)}
${html.repeat(items, i => i.id, i => html`<li>${i.name}</li>`)}
<div class="${html.classes({ active, disabled })}"></div>
<div style="${html.styles({ color, display: show ? 'block' : 'none' })}"></div>
```

**ARIA & Keyboard:**
```typescript
onConnected(el) {
  const host = el as unknown as HTMLElement;
  
  // Setup
  host.setAttribute('role', 'checkbox');
  host.setAttribute('aria-checked', 'false');
  host.setAttribute('tabindex', '0');
  
  // Keyboard
  el.on('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle();
    }
  });
  
  el.on('click', toggle);
  
  function toggle() {
    if (host.hasAttribute('disabled')) return;
    // ...toggle logic
  }
}

onAttributeChanged(el, name, _old, newValue) {
  const host = el as unknown as HTMLElement;
  
  if (name === 'checked') {
    host.setAttribute('aria-checked', String(newValue !== null));
  } else if (name === 'disabled') {
    const disabled = newValue !== null;
    host.setAttribute('aria-disabled', String(disabled));
    disabled ? host.removeAttribute('tabindex') : host.setAttribute('tabindex', '0');
  }
}
```

**Form Integration:**
```html
<input
  type="checkbox"
  name="${el.getAttribute('name') || ''}"
  value="${el.getAttribute('value') || ''}"
  ?checked="${el.hasAttribute('checked')}"
  aria-hidden="true"
  tabindex="-1" />
```

---

## 4. Testing

**Unit Test:**
```typescript
import { createFixture, userEvent } from '@vielzeug/craftit/testing';

it('should toggle on click', async () => {
  const fixture = await createFixture('bit-checkbox');
  
  await userEvent.click(fixture.element);
  expect(fixture.element.hasAttribute('checked')).toBe(true);
  
  fixture.destroy();
});
```

**A11y Test:**
```typescript
import axe from 'axe-core';

it('should have no violations', async () => {
  const fixture = await createFixture('bit-checkbox');
  const results = await axe.run(fixture.element);
  expect(results.violations).toHaveLength(0);
  fixture.destroy();
});
```

> [!NOTE]
> **Important**: The tests should be simple, non-redundant, non-trivial but ensure the maximum coverage while also covering all the edge cases.

---

## 5. Build Integration

**1. vite.config.ts:**
```typescript
entry: {
  'component-name': resolve(__dirname, './src/[category]/[name]/[name]'),
}
```

**2. package.json:**
```json
"./component-name": {
  "types": "./dist/component-name.d.ts",
  "import": "./dist/component-name.js",
  "require": "./dist/component-name.cjs"
}
```

**3. src/types.d.ts:**
```typescript
declare global {
  interface HTMLElementTagNameMap {
    'bit-component-name': HTMLElement;
  }
}
```

---

## 6. Checklist

**Required:**
- [ ] Naming: `bit-[name]`, `[Name]Props`
- [ ] Boolean attributes use presence/absence
- [ ] Design tokens only (no hardcoded values)
- [ ] CSS: Public `--component-*`, Internal `--_*`
- [ ] CSS: Alphabetically sorted, clear sections
- [ ] Variants: 7 visual (solid, flat, bordered, outline, ghost, text, frost)
- [ ] Colors: 5 (primary, secondary, success, warning, error)
- [ ] Sizes: 3 (sm, md, lg)
- [ ] ARIA: role, aria-checked/disabled, tabindex
- [ ] Keyboard: Space/Enter
- [ ] Events: Use `el.on()`, include `originalEvent`
- [ ] Delegation: Call `e.stopPropagation()`
- [ ] Query: Use `query()`, `queryAll()`, `queryRequired()`
- [ ] Glass/Frost: Include `-webkit-backdrop-filter`
- [ ] JSDoc: `@element`, `@attr`, `@slot`, `@cssprop`, `@fires`
- [ ] Tests: Unit + A11y (100% coverage)
- [ ] Build: vite.config, package.json, types.d.ts
- [ ] Docs: Component docs with examples

**Common Mistakes:**
- ❌ String values for boolean attributes
- ❌ Hardcoded values
- ❌ Mixed variable naming (`--component-*` vs `--_*`)
- ❌ Unsorted CSS properties
- ❌ Missing `-webkit-backdrop-filter`
- ❌ Forgetting `stopPropagation()` in delegation
- ❌ Missing `originalEvent` in emitted events

---

## 7. Examples

**Gold Standard Components:**
- `src/base/button/button.ts` - All 8 variants, fullwidth, events
- `src/form/input/input.ts` - Advanced form, slots, variants
- `src/form/checkbox/checkbox.ts` - ARIA, keyboard, state sync

---

## 8. Quick Patterns

**Full-Width:**
```css
:host([fullwidth]) {
  display: flex;
  width: 100%;
}
```

**Text Alignment:**
```css
:host([align]) {
  display: block; /* Required for text-align */
}
:host([align='center']) { text-align: center; }
```

**Transition:**
```css
.element {
  transition:
    background var(--transition-fast),
    backdrop-filter var(--duration-300) var(--ease-in-out),
    border-color var(--transition-fast);
}
```

---

**Note:** This is a greenfield project. All existing code is legacy and should be refactored as needed. Do not create summary/report files.

