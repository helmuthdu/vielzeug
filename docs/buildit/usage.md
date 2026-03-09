---
title: Buildit — Usage Guide
description: Import patterns, slots, events, and accessibility for Buildit components.
---

# Buildit Usage Guide

::: tip New to Buildit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Buildit?

Every project needs UI primitives. Buildit provides accessible web components that work natively anywhere HTML is rendered—no framework required.

```html
<!-- Before — roll your own button with ARIA -->
<button class="btn btn-primary" role="button" aria-pressed="false" tabindex="0">
  <span class="btn-spinner" aria-hidden="true"></span>
  Save
</button>

<!-- After — Buildit -->
<bit-button variant="primary" loading>Save</bit-button>
```

| Feature            | Buildit                                       | Shoelace | Material Web |
| ------------------ | --------------------------------------------- | -------- | ------------ |
| Bundle size        | <PackageInfo package="buildit" type="size" /> | ~145 kB  | ~200 kB      |
| Built with         | Craftit                                       | Lit      | Lit          |
| Accessible         | WCAG AA                                       | WCAG AA  | WCAG AA      |
| Framework agnostic | ✅                                            | ✅       | ✅           |

**Use Buildit when** you want accessible web components that match the Vielzeug design system without a heavy framework dependency.

## Import

Always import the global styles **first**, then import the components you need:

```ts
// 1. Global styles — required
import '@vielzeug/buildit/styles';

// 2. Individual components (tree-shakeable)
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/checkbox';
import '@vielzeug/buildit/input';

// Or import everything at once
import '@vielzeug/buildit';
```

## Basic Usage

### Using Components

Once imported, components are available as custom elements:

```html
<bit-button>Click me</bit-button>
```

### Setting Attributes

Set attributes directly on the custom element:

```html
<bit-button variant="outline" color="secondary" size="lg" disabled> Large Outline Button </bit-button>
```

### Event Handling

Components emit custom events. You can listen to them using standard `addEventListener`.

```javascript
const button = document.querySelector('bit-button');

button.addEventListener('click', (event) => {
  console.log('Button clicked!', event.detail);
});
```

Check the **[Framework Integration](./frameworks.md)** guide for specific instructions on using Buildit with React, Vue, Svelte, or Angular.

## Slots

Buildit components use named and default slots for content projection. Slots let you pass arbitrary HTML — icons, text, other components — into designated regions of a component without JavaScript.

### Default Slot

Content placed directly inside the element fills the default slot:

```html
<bit-button>Save Changes</bit-button> <bit-card>Any HTML content here</bit-card>
```

### Named Slots

Components that have distinct regions expose them as named slots:

```html
<bit-card>
  <span slot="header">Card Heading</span>
  <p>Main card body content fills the default slot.</p>
  <div slot="footer">
    <bit-button size="sm" variant="outline">Cancel</bit-button>
    <bit-button size="sm">Confirm</bit-button>
  </div>
</bit-card>
```

### Icon Slots

Many interactive components (e.g., `bit-button`, `bit-input`) expose `icon` slots for leading or trailing icons:

```html
<bit-button>
  <svg slot="icon" aria-hidden="true"><!-- ... --></svg>
  Submit
</bit-button>

<bit-input label="Search">
  <svg slot="suffix" aria-hidden="true"><!-- search icon --></svg>
</bit-input>
```

Slot availability per component is listed in the **[Component Docs](./components/)** and the **[API Reference](./api.md)**.

## Accessibility

Buildit components are designed to meet **WCAG 2.1 AA** standards out-of-the-box. The key patterns are documented below.

### Keyboard Navigation

| Component type  | Key                       | Behavior                                 |
| --------------- | ------------------------- | ---------------------------------------- |
| `bit-button`    | `Space` / `Enter`         | Activates the button                     |
| `bit-checkbox`  | `Space`                   | Toggles checked state                    |
| `bit-radio`     | `Arrow Up` / `Arrow Down` | Moves focus between options in the group |
| `bit-select`    | `Enter` / `Space`         | Opens/closes the listbox                 |
| `bit-select`    | `Arrow Up` / `Arrow Down` | Navigates options                        |
| `bit-accordion` | `Enter` / `Space`         | Expands/collapses panel                  |
| `bit-tabs`      | `Arrow Left` / `Right`    | Moves focus between tab triggers         |
| `bit-tooltip`   | `Escape`                  | Dismisses an open tooltip                |

### ARIA Attributes

Components manage their ARIA roles and states automatically. You can override specific attributes where needed:

```html
<!-- Custom label when visual label is not enough -->
<bit-button aria-label="Delete item">×</bit-button>

<!-- Associate an input with external help text -->
<bit-input label="Password" aria-describedby="pwd-hint" />
<p id="pwd-hint">Minimum 8 characters, one uppercase, one number.</p>
```

### Focus Management

- All interactive components participate in the native tab order.
- Use `disabled` to remove a component from the tab order. Disabled elements are not focusable.
- Modals and overlays (`bit-tooltip`) trap or restore focus automatically.

### Screen Readers

- Labels are connected to inputs via `aria-labelledby` internally.
- Loading and error states announce themselves with `aria-live` regions.
- Decorative icons should receive `aria-hidden="true"`; meaningful icons should have an `aria-label`.

## Best Practices

### Design Intensity

Use component variants to tune visual intensity without rebuilding layouts:

- `bolder`: Pair `solid` buttons with semantic colors and stronger elevation for one clear primary action.
- `quieter`: Use `ghost`, `text`, or `outline` variants for secondary actions and dense toolbars.
- `delight`: Add short, purposeful motion after meaningful events (save complete, invite sent), and always respect `prefers-reduced-motion`.
- `onboard`: Start with clear labels, helper text, and one recommended next action in empty states.

### 1. Import Global Styles First

Always import `@vielzeug/buildit/styles` before any component. Without it, components will render without design tokens.

### 2. Use Named Component Imports for Tree-Shaking

```ts
// ✅ imports only what you use
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';

// ❌ imports all components — increases bundle size
import '@vielzeug/buildit';
```

### 3. Control Appearance with CSS Custom Properties

```css
bit-button {
  --bit-button-radius: 4px;
  --bit-button-font-size: 0.875rem;
}
```

### 4. Use Declarative Attributes Over JavaScript

```html
<!-- ✅ prefer attribute-driven state -->
<bit-button loading disabled>Saving…</bit-button>

<!-- ❌ avoid manual DOM manipulation when an attribute exists -->
<bit-button id="btn">Save</bit-button>
<script>
  document.getElementById('btn').setAttribute('loading', '');
</script>
```

### 5. Listen to Custom Events

```js
const input = document.querySelector('bit-input');
input.addEventListener('bit-change', (e) => console.log(e.detail.value));
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./frameworks">Framework Integration</a> – React, Vue, Svelte, Angular</li>
      <li><a href="./theming">Theming</a> – Customize design tokens</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
    </ul>
  </div>
</div>
