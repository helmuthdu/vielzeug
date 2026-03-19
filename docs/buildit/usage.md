---
title: Buildit — Usage Guide
description: Import patterns, slots, events, and accessibility for Buildit components.
---

# Buildit Usage Guide

::: tip New to Buildit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Basic Usage

### Using Components

Once registered, components are available as custom elements:

```html
<bit-button>Click me</bit-button>
```

### Setting Attributes

Set attributes directly on the custom element:

```html
<bit-button variant="outline" color="secondary" size="lg" disabled> Large Outline Button </bit-button>
```

### Event Handling

Components emit DOM events. Many use familiar event names like `click`, `input`, `change`, `open`, and `close`. A few intentionally use namespaced custom events where collision avoidance matters, such as `bit-select` on `bit-menu`.

```javascript
const button = document.querySelector('bit-button');

button.addEventListener('click', () => {
  console.log('Button clicked');
});

const input = document.querySelector('bit-input');

input.addEventListener('change', (event) => {
  console.log('Input value:', event.detail.value);
});
```

Check the **[Framework Integration](./frameworks.md)** guide for framework-specific interop details.

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

Many interactive components expose leading or trailing content slots. For example, `bit-button` and `bit-input` use `prefix` and `suffix`:

```html
<bit-button>
  <svg slot="prefix" aria-hidden="true"><!-- ... --></svg>
  Submit
</bit-button>

<bit-input label="Search">
  <svg slot="suffix" aria-hidden="true"><!-- search icon --></svg>
</bit-input>
```

Slot availability varies by component; see the component pages in the Buildit sidebar and the **[API Reference](./api.md)** for the currently published surface.

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
- Modal-style overlays such as `bit-dialog` and `bit-drawer` manage focus entry and restoration automatically.

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

Always import `@vielzeug/buildit/styles` before any component registration. Without it, components still render, but they will miss the intended token and base-style layer.

### 2. Use Named Component Imports for Tree-Shaking

```ts
// ✅ registers only what you use
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/input';

// ❌ registers all components — larger bundle
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

### 5. Listen to Component Events

```js
const input = document.querySelector('bit-input');
input.addEventListener('change', (e) => console.log(e.detail.value));
```
