# Craftit API Reference

Complete API documentation for all Craftit functions, types, and interfaces.

## Table of Contents

[[toc]]

## Core Functions

### `defineElement(name, options)`

Define and register a custom element.

**Parameters:**

- `name: string` - Element tag name (must contain a hyphen, e.g., 'my-component')
- `options: ComponentOptions<T, S>` - Component configuration

**Returns:** `void`

**Example:**

```ts
import { defineElement, html, css } from '@vielzeug/craftit';

defineElement('my-button', {
  template: html`<button>Click Me</button>`,
  styles: [
    css`
      button {
        color: blue;
      }
    `,
  ],
});
```

---

### `createComponent(options)`

Create a custom element constructor without registering it.

**Parameters:**

- `options: ComponentOptions<T, S>` - Component configuration

**Returns:** `CustomElementConstructor`

**Example:**

```ts
const ButtonComponent = createComponent({
  template: html`<button>Click Me</button>`,
});

// Register manually
customElements.define('my-button', ButtonComponent);
```

---

### `html(strings, ...values)`

Template string helper for HTML content.

**Parameters:**

- `strings: TemplateStringsArray` - Template string array
- `...values: unknown[]` - Template values to interpolate

**Returns:** `string`

**Example:**

```ts
const name = 'Alice';
const template = html`<div>Hello, ${name}!</div>`;
// Result: '<div>Hello, Alice!</div>'
```

---

### `css(strings, ...values)`

Template string helper for CSS content with CSS variable utilities.

**Parameters:**

- `strings: TemplateStringsArray` - Template string array
- `...values: unknown[]` - Template values to interpolate

**Returns:** `string` - CSS string

**Example:**

```ts
import { css } from '@vielzeug/craftit';

const color = 'blue';
const styles = css`
  button {
    color: ${color};
    padding: 1rem;
  }
`;
```

**CSS Variable Helpers:**

#### `css.var(name, fallback?)`

Reference a CSS custom property with `var()`.

**Parameters:**

- `name: string` - Variable name (with or without `--` prefix)
- `fallback?: string | number` - Optional fallback value

**Returns:** `string` - CSS var() function string

**Example:**

```ts
css.var('primaryColor'); // "var(--primary-color)"
css.var('fontSize', '14px'); // "var(--font-size, 14px)"
css.var('--custom-color'); // "var(--custom-color)"
```

#### `css.theme<T>(vars, selector?)`

Create a typed theme with CSS variables and autocomplete support.

**Returns a typed proxy object** that provides both:

1. CSS rule string (via implicit `toString()`)
2. Typed variable references with full autocomplete

**Parameters:**

- `vars: T extends Record<string, string | number>` - Theme variables
- `selector?: string` - CSS selector (default: `:host`)

**Returns:** `ThemeVars<T>` - Typed proxy with autocomplete for all properties

**Example:**

```ts
const theme = css.theme({
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  spacing: '1rem',
});

// Use as CSS rule (implicit toString)
css`
  ${theme}/* → ":host { --primary-color: #3b82f6; --background-color: #ffffff; --spacing: 1rem; }" */
`;

// Use typed properties (with autocomplete!)
css`
  .button {
    color: ${theme.primaryColor}; /* → "var(--primary-color)" - autocomplete! */
    background: ${theme.backgroundColor}; /* → "var(--background-color)" - autocomplete! */
    padding: ${theme.spacing}; /* → "var(--spacing)" - autocomplete! */
  }
`;

// Custom selector
const darkTheme = css.theme({ bgColor: '#000' }, '[data-theme="dark"]');
```

**Benefits:**

- ✨ **Autocomplete** - Type `theme.` and see all available variables
- 🔒 **Type-safe** - Typos caught at compile time
- 🔄 **Refactoring** - Rename variables safely across codebase
- 📦 **No string matching** - No more `css.var('primryColor')` bugs!

**Complete Example:**

```ts
import { css } from '@vielzeug/craftit';

// Define theme with full type inference
const appTheme = css.theme({
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  spacing: '1rem',
  borderRadius: '8px',
});

const styles = css`
  /* Inject CSS variables */
  ${appTheme}

  .button {
    /* Autocomplete works for all properties! */
    color: ${appTheme.primaryColor};
    background: ${appTheme.secondaryColor};
    padding: ${appTheme.spacing};
    border-radius: ${appTheme.borderRadius};
  }
`;
```

**TypeScript Support:**

```ts
// ✅ Autocomplete suggests all theme properties
theme.primaryColor;
theme.spacing;
theme.borderRadius;

// ❌ TypeScript error for typos
theme.primryColor; // Error: Property 'primryColor' does not exist

// ✅ Safe refactoring
// Rename 'primaryColor' → 'accentColor'
// TypeScript will find all usages!
```

---

### `classMap(classes)`

Generate conditional class strings.

**Parameters:**

- `classes: Record<string, boolean | undefined>` - Object mapping class names to conditions

**Returns:** `string`

**Example:**

```ts
classMap({
  active: true,
  disabled: false,
  'is-loading': isLoading,
});
// Result: 'active is-loading' (if isLoading is true)
```

---

### `styleMap(styles)`

Generate inline style strings from objects.

**Parameters:**

- `styles: Partial<CSSStyleDeclaration>` - Object mapping CSS properties to values

**Returns:** `string`

**Example:**

```ts
styleMap({
  color: 'red',
  fontSize: '16px',
  backgroundColor: '#fff',
});
// Result: 'color: red; font-size: 16px; background-color: #fff'
```

---

## Testing Functions

### `attach(element, container?)`

Attach an element to the DOM and wait for first render.

**Parameters:**

- `element: T extends HTMLElement` - The element to attach
- `container?: HTMLElement` - Container element (defaults to `document.body`)

**Returns:** `Promise<T>`

**Example:**

```ts
const el = document.createElement('my-component');
await attach(el); // Mounts to document.body and waits for render

// Custom container
const container = document.querySelector('#app')!;
await attach(el, container);
```

---

### `destroy(element)`

Remove an element from the DOM.

**Parameters:**

- `element: HTMLElement` - The element to remove

**Returns:** `void`

**Example:**

```ts
const el = await attach(document.createElement('my-component'));
// ... test code ...
destroy(el); // Removes element
```

---

## Component Options

### `ComponentOptions<T, S>`

Configuration object for defining a web component.

**Properties:**

#### `template`

- **Type:** `Template<T, S>`
- **Required:** Yes
- **Description:** Component template (string, Node, or function)

```ts
// String template
template: html`<div>Hello</div>`;

// Function template
template: (el) => html`<div>Count: ${el.state.count}</div>`;
```

#### `state`

- **Type:** `S`
- **Required:** No
- **Description:** Initial reactive state

```ts
state: {
  count: 0,
  user: { name: 'Alice' }
}
```

#### `styles`

- **Type:** `(string | CSSStyleSheet)[]`
- **Required:** No
- **Description:** Component styles

```ts
import { css } from '@vielzeug/craftit';

styles: [
  css`
    button {
      color: blue;
    }
  `,
  sharedStyleSheet,
];
```

#### `observedAttributes`

- **Type:** `readonly string[]`
- **Required:** No
- **Description:** Attributes to observe for changes

```ts
observedAttributes: ['data-theme', 'disabled'] as const;
```

#### `formAssociated`

- **Type:** `boolean`
- **Required:** No
- **Default:** `false`
- **Description:** Enable form participation

```ts
formAssociated: true;
```

#### Lifecycle Hooks

##### `onConnected`

- **Type:** `(el: WebComponent<T, S>) => void`
- **Description:** Called when element is added to DOM

```ts
onConnected(el) {
  console.log('Component mounted');
  el.on('button', 'click', () => console.log('clicked'));
}
```

##### `onDisconnected`

- **Type:** `(el: WebComponent<T, S>) => void`
- **Description:** Called when element is removed from DOM

```ts
onDisconnected(el) {
  console.log('Component unmounted');
}
```

##### `onUpdated`

- **Type:** `(el: WebComponent<T, S>) => void`
- **Description:** Called after each render

```ts
onUpdated(el) {
  console.log('Rendered with state:', el.state);
}
```

##### `onAttributeChanged`

- **Type:** `(name: string, oldValue: string | null, newValue: string | null, el: WebComponent<T, S>) => void`
- **Description:** Called when observed attribute changes

```ts
onAttributeChanged(name, oldVal, newVal, el) {
  if (name === 'data-theme') {
    el.state.theme = newVal;
  }
}
```

##### Form Callbacks

###### `onFormDisabled`

- **Type:** `(disabled: boolean, el: WebComponent<T, S>) => void`
- **Description:** Called when parent form's disabled state changes

```ts
onFormDisabled(disabled, el) {
  el.state.isDisabled = disabled;
}
```

###### `onFormReset`

- **Type:** `(el: WebComponent<T, S>) => void`
- **Description:** Called when parent form is reset

```ts
onFormReset(el) {
  el.state.value = '';
}
```

###### `onFormStateRestore`

- **Type:** `(state: string | File | FormData | null, mode: 'restore' | 'autocomplete', el: WebComponent<T, S>) => void`
- **Description:** Called when browser restores form state

```ts
onFormStateRestore(state, mode, el) {
  if (typeof state === 'string') {
    el.state.value = state;
  }
}
```

---

## Web Component Instance

### `WebComponent<T, S>`

Type representing a web component instance with all available methods and properties.

**Generic Parameters:**

- `T` - Root element type (first child in shadow DOM)
- `S` - State object type

### Properties

#### `state`

- **Type:** `S`
- **Readonly:** Yes
- **Description:** Reactive state object

```ts
el.state.count++; // Triggers re-render
```

#### `shadow`

- **Type:** `ShadowRoot`
- **Readonly:** Yes
- **Description:** Shadow DOM root

```ts
el.shadow.querySelector('.button');
```

#### `root`

- **Type:** `T`
- **Readonly:** Yes
- **Description:** First element in shadow DOM

```ts
const button = el.root as HTMLButtonElement;
```

#### `internals`

- **Type:** `ElementInternals | undefined`
- **Readonly:** Yes
- **Description:** ElementInternals (only when `formAssociated: true`)

```ts
if (el.internals) {
  el.internals.setFormValue('value');
}
```

#### `value`

- **Type:** `string | undefined`
- **Description:** Form value (only when `formAssociated: true`)

```ts
el.value = 'new value';
```

#### `form`

- **Type:** `FormHelpers | undefined`
- **Readonly:** Yes
- **Description:** Form utilities (only when `formAssociated: true`)

```ts
el.form?.value('new value');
el.form?.valid({ valueMissing: true }, 'Required');
```

### Methods

#### `render()`

Schedule a render in the next animation frame.

**Returns:** `void`

```ts
el.render();
```

#### `flush()`

Wait for pending render to complete.

**Returns:** `Promise<void>`

```ts
el.state.count = 10;
await el.flush();
console.log('Render complete');
```

#### `set(patch, options?)`

Update component state.

**Parameters:**

- `patch: Partial<S> | ((state: S) => S | Promise<S>)` - State update
- `options?: { replace?: boolean; silent?: boolean }` - Update options

**Returns:** `Promise<void>`

```ts
// Merge update
await el.set({ count: 10 });

// Replace state
await el.set({ count: 0 }, { replace: true });

// Updater function
await el.set((state) => ({ ...state, count: state.count + 1 }));

// Async updater
await el.set(async (state) => {
  const data = await fetch('/api/data').then((r) => r.json());
  return { ...state, data };
});

// Silent update (no re-render)
await el.set({ count: 10 }, { silent: true });
```

#### `watch(selector, callback)`

Watch a state slice and react to changes.

**Parameters:**

- `selector: (state: S) => U` - Function to select a slice of state
- `callback: (value: U, prev: U) => void` - Callback called on changes

**Returns:** `() => void` - Unsubscribe function

```ts
const unwatch = el.watch(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count changed from ${prevCount} to ${count}`);
  },
);

// Cleanup
unwatch();
```

#### `find(selector)`

Find a single element in shadow DOM.

**Parameters:**

- `selector: string` - CSS selector

**Returns:** `E | null`

```ts
const button = el.find<HTMLButtonElement>('button');
const input = el.find<HTMLInputElement>('input[name="email"]');
```

#### `findAll(selector)`

Find all matching elements in shadow DOM.

**Parameters:**

- `selector: string` - CSS selector

**Returns:** `E[]`

```ts
const buttons = el.findAll<HTMLButtonElement>('button');
const items = el.findAll<HTMLDivElement>('.item');
```

#### `on(target, event, handler, options?)`

Add event listener with automatic cleanup.

**Parameters:**

- `target: string | EventTarget` - CSS selector or EventTarget
- `event: string` - Event name
- `handler: EventListener` - Event handler function
- `options?: AddEventListenerOptions` - Event listener options

**Returns:** `void`

```ts
// Direct element binding
const button = el.find('button')!;
el.on(button, 'click', () => console.log('clicked'));

// Delegation (works for dynamic elements)
el.on('.item', 'click', (e) => {
  console.log('Item clicked:', e.currentTarget);
});

// With options
el.on('button', 'click', handler, { once: true });
```

#### `emit(name, detail?, options?)`

Dispatch a custom event.

**Parameters:**

- `name: string` - Event name
- `detail?: unknown` - Event detail data
- `options?: CustomEventInit` - CustomEvent options

**Returns:** `void`

```ts
el.emit('custom-event', { message: 'Hello!' });

el.emit('error', { code: 404 }, { bubbles: true, composed: true });
```

#### `delay(callback, ms)`

Set timeout with automatic cleanup.

**Parameters:**

- `callback: () => void` - Function to call
- `ms: number` - Delay in milliseconds

**Returns:** `number` - Timeout ID

```ts
const id = el.delay(() => {
  console.log('Timeout fired');
}, 1000);

// Clear manually if needed
el.clear(id);
```

#### `clear(id)`

Clear a scheduled timeout.

**Parameters:**

- `id: number` - Timeout ID from `delay()`

**Returns:** `void`

```ts
const id = el.delay(() => console.log('hi'), 1000);
el.clear(id); // Cancel timeout
```

---

## Type Definitions

### `Template<T, S>`

```ts
type Template<T = HTMLElement, S extends object = object> =
  | string
  | Node
  | ((el: WebComponent<T, S>) => string | Node | DocumentFragment);
```

### `LifecycleHook<T, S>`

```ts
type LifecycleHook<T = HTMLElement, S extends object = object> = (el: WebComponent<T, S>) => void;
```

### `AttributeChangeHook<T, S>`

```ts
type AttributeChangeHook<T = HTMLElement, S extends object = object> = (
  name: string,
  oldValue: string | null,
  newValue: string | null,
  el: WebComponent<T, S>,
) => void;
```

### `FormCallbacks<T, S>`

```ts
type FormCallbacks<T = HTMLElement, S extends object = object> = {
  onFormDisabled?: (disabled: boolean, el: WebComponent<T, S>) => void;
  onFormReset?: (el: WebComponent<T, S>) => void;
  onFormStateRestore?: (
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
    el: WebComponent<T, S>,
  ) => void;
};
```

---

## Best Practices

### TypeScript Usage

```ts
// Define state type
type CounterState = {
  count: number;
  label: string;
};

defineElement('typed-counter', {
  state: {
    count: 0,
    label: 'Counter',
  } as CounterState,

  template: (el) => html`
    <div>
      <p>${el.state.label}: ${el.state.count}</p>
      <button>+</button>
    </div>
  `,
});

// Type-safe access
const counter = document.createElement('typed-counter') as WebComponent<HTMLElement, CounterState>;
counter.state.count = 10; // ✅ Type-safe
counter.state.unknown = 'value'; // ❌ TypeScript error
```

### Performance Tips

1. **Use Event Delegation**

```ts
// ✅ Good - works for dynamic elements
el.on('.item', 'click', handler);

// ❌ Bad - must re-bind after state changes
el.findAll('.item').forEach((item) => {
  item.addEventListener('click', handler);
});
```

2. **Batch State Updates**

```ts
// ✅ Good - single re-render
await el.set({ name: 'Alice', age: 30, email: 'alice@example.com' });

// ❌ Bad - three re-renders
el.state.name = 'Alice';
el.state.age = 30;
el.state.email = 'alice@example.com';
```

3. **Use Private State**

```ts
// Properties starting with _ don't trigger re-renders
state: {
  count: 0,
  _cache: {}, // Won't trigger re-renders
}
```

4. **Optimize Templates**

```ts
// ✅ Good - pure template
template: (el) => html`<div>${el.state.count}</div>`;

// ❌ Bad - side effects in template
template: (el) => {
  console.log('Rendering'); // Side effect!
  return html`<div>${el.state.count}</div>`;
};
```

---

## Migration Guide

### From Vanilla Custom Elements

**Before (Vanilla):**

```ts
class MyCounter extends HTMLElement {
  #count = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.render();
  }

  connectedCallback() {
    this.shadowRoot!.querySelector('button')?.addEventListener('click', () => {
      this.#count++;
      this.render();
    });
  }

  render() {
    this.shadowRoot!.innerHTML = `<div>${this.#count}</div><button>+</button>`;
  }
}
```

**After (Craftit):**

```ts
defineElement('my-counter', {
  state: { count: 0 },
  template: (el) =>
    html`<div>${el.state.count}</div>
      <button>+</button>`,
  onConnected(el) {
    el.on('button', 'click', () => el.state.count++);
  },
});
```

### From Lit

**Before (Lit):**

```ts
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';

class MyCounter extends LitElement {
  @property({ type: Number }) count = 0;

  render() {
    return html`<div>${this.count}</div>
      <button @click=${this._increment}>+</button>`;
  }

  _increment() {
    this.count++;
  }
}
```

**After (Craftit):**

```ts
defineElement('my-counter', {
  state: { count: 0 },
  template: (el) =>
    html`<div>${el.state.count}</div>
      <button>+</button>`,
  onConnected(el) {
    el.on('button', 'click', () => el.state.count++);
  },
});
```
