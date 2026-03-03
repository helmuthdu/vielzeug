---
title: Craftit — Usage Guide
description: Signals, templates, lifecycle, props, and patterns for Craftit.
---

# Craftit Usage Guide

::: tip New to Craftit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Craftit?

Vanilla Web Components (Custom Elements API) require significant boilerplate for state management, event handling, and cleanup. Craftit adds signals-based reactivity with a minimal, functional API.

```ts
// Before — vanilla Custom Elements
class MyCounter extends HTMLElement {
  #count = 0;
  connectedCallback() {
    this.innerHTML = '<button>0</button>';
    this.querySelector('button')?.addEventListener('click', () => {
      this.#count++;
      this.querySelector('button')!.textContent = String(this.#count);
    });
  }
}
customElements.define('my-counter', MyCounter);

// After — Craftit
define('my-counter', () => {
  const count = signal(0);
  return html`<button @click=${() => count.value++}>${count}</button>`;
});
```

| Feature | Craftit | Lit | Stencil |
|---|---|---|---|
| Bundle size | <PackageInfo package="craftit" type="size" /> | ~7 kB | ~50 kB (compiler) |
| Signals | ✅ Built-in | ✅ @lit-labs | ❌ |
| Decorators | ❌ | ✅ | ✅ |
| SSR | ❌ | ✅ | ✅ |
| Zero dependencies | ✅ | ✅ | ❌ |

**Use Craftit when** you want signals-based web components without decorators or a build compiler step.


## Import

```ts
import {
  define,
  signal,
  computed,
  writable,
  effect,
  watch,
  batch,
  untrack,
  readonly,
  isSignal,
  toValue,
  html,
  raw,
  rawHtml,
  css,
  suspense,
  escapeHtml,
  createId,
  guard,
  handle,
  onMount,
  onUnmount,
  onUpdated,
  onCleanup,
  onError,
  prop,
  defineProps,
  ref,
  refs,
  provide,
  inject,
  createContext,
  defineSlots,
  defineEmits,
  field,
} from '@vielzeug/craftit';
// Optional: Import types
import type { Signal, ReadonlySignal, Ref, RefList, InjectionKey, HTMLResult, CSSResult, FormFieldHandle } from '@vielzeug/craftit';
```

## Basic Usage

### Creating a Component

```ts
import { define, html } from '@vielzeug/craftit';
define('my-component', () => {
  return html`
    <div class="container">
      <h1>Hello, Craftit!</h1>
    </div>
  `;
});
```

Use in HTML:

```html
<my-component></my-component>
```

### With Signals (Reactive State)

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('user-card', () => {
  const name = signal('Alice');
  const email = signal('alice@example.com');
  const isOnline = signal(true);
  return html`
    <div class="user-card">
      <h2>${name}</h2>
      <p>${email}</p>
      <span class="status">${isOnline.value ? 'Online' : 'Offline'}</span>
    </div>
  `;
});
```

### Event Handlers

Use the `@` prefix for event handlers in templates:

```ts
define('click-counter', () => {
  const count = signal(0);
  return html`
    <div>
      <p>Count: ${count}</p>
      <button @click=${() => count.value++}>Increment</button>
      <button @click=${() => count.value--}>Decrement</button>
    </div>
  `;
});
```

## Signals

Signals are the foundation of Craftit's reactivity system. They provide fine-grained reactive state management.

### Creating Signals

```ts
import { signal } from '@vielzeug/craftit';
const count = signal(0);
const name = signal('Alice');
const items = signal([1, 2, 3]);
const user = signal({ name: 'Bob', age: 30 });
```

### Reading Signal Values

```ts
// Read with .value
console.log(count.value); // 0
// Signals automatically track dependencies in templates
html`<div>${count}</div>`; // Automatically updates when count changes
```

### Updating Signal Values

```ts
// Direct assignment
count.value = 10;
// Update with function
count.update((current) => current + 1);
// For objects and arrays, reassign to trigger updates
items.value = [...items.value, 4];
user.value = { ...user.value, age: 31 };
```

### Signal Utilities

#### subscribe() — Watch shorthand

```ts
// Shorthand for watch(signal, cb) — returns a cleanup fn
const stop = count.subscribe((value, prev) => {
  console.log(`changed ${prev} → ${value}`);
});
stop(); // unsubscribe
```

#### peek() - Read Without Tracking

```ts
// Read value without creating a dependency
const currentValue = count.peek();
```

#### update() - Functional Updates

```ts
count.update((current) => current + 1);
items.update((list) => [...list, newItem]);
```

#### map() - Transform Arrays

```ts
const numbers = signal([1, 2, 3]);
const doubled = numbers.map((n, index) => n * 2);
```

#### derive() — Shorthand computed

```ts
const doubled = count.derive((v) => v * 2); // same as computed(() => count.value * 2)
```

#### assign() — Partial object update

```ts
const user = signal({ name: 'Alice', age: 30 });
user.assign({ age: 31 }); // merges, same as user.value = { ...user.value, age: 31 }
```

## Writable (Bi-directional Computed)

`writable` creates a bi-directional signal: reads track the getter reactively, writes are forwarded to the setter:

```ts
import { signal, writable } from '@vielzeug/craftit';
const count = signal(0);
// doubled.value reads count * 2; setting doubled.value writes back to count
const doubled = writable(
  () => count.value * 2,
  (v) => (count.value = v / 2),
);
console.log(doubled.value); // 0
doubled.value = 10; // count.value → 5
console.log(count.value); // 5
```

Useful for form adapters, unit converters, and any derived state that needs to write back.

## Signal Helpers

### isSignal / toValue

```ts
import { isSignal, toValue, signal } from '@vielzeug/craftit';
const s = signal(42);
console.log(isSignal(s));    // true
console.log(isSignal(42));   // false
// toValue unwraps a Signal or returns a plain value as-is
console.log(toValue(s));     // 42
console.log(toValue(42));    // 42
```

## Computed Signals

Computed signals derive values from other signals and automatically update:

```ts
import { signal, computed } from '@vielzeug/craftit';
const firstName = signal('John');
const lastName = signal('Doe');
// Automatically updates when dependencies change
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
console.log(fullName.value); // "John Doe"
firstName.value = 'Jane';
console.log(fullName.value); // "Jane Doe"
```

### Complex Computations

```ts
const items = signal([
  { id: 1, name: 'Apple', category: 'fruit', price: 1.5 },
  { id: 2, name: 'Carrot', category: 'vegetable', price: 0.8 },
]);
const filter = signal('all');
const filteredItems = computed(() => {
  const f = filter.value;
  if (f === 'all') return items.value;
  return items.value.filter((item) => item.category === f);
});
const total = computed(() => {
  return filteredItems.value.reduce((sum, item) => sum + item.price, 0);
});
```

## Effects

Effects run side effects when their dependencies change:

```ts
import { signal, effect } from '@vielzeug/craftit';
const count = signal(0);
// Runs immediately and when count changes
effect(() => {
  console.log('Count is:', count.value);
});
// With cleanup
effect(() => {
  const timer = setInterval(() => {
    console.log('Current count:', count.value);
  }, 1000);
  // Return cleanup function
  return () => clearInterval(timer);
});
```

## Watch

Watch specific signals for changes:

```ts
import { signal, watch } from '@vielzeug/craftit';
const count = signal(0);
// Watch single signal
watch(count, (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`);
});
// Watch multiple signals
const name = signal('Alice');
watch([count, name], ([countValue, nameValue]) => {
  console.log(`Count: ${countValue}, Name: ${nameValue}`);
});
// With immediate option
watch(
  count,
  (value) => {
    console.log('Count:', value);
  },
  { immediate: true },
); // Runs immediately
```

## Batch Updates

Prevent multiple re-renders by batching updates:

```ts
import { signal, batch } from '@vielzeug/craftit';
const count = signal(0);
const name = signal('Alice');
// Multiple updates, single re-render
batch(() => {
  count.value = 10;
  name.value = 'Bob';
  count.value = 20;
}); // Only re-renders once here
```

## Untrack

Read signals without creating dependencies:

```ts
import { signal, computed, untrack } from '@vielzeug/craftit';
const count = signal(0);
const multiplier = signal(2);
const result = computed(() => {
  // This depends on count
  const c = count.value;
  // This doesn't create a dependency
  const m = untrack(() => multiplier.value);
  return c * m;
});
// Changing multiplier won't trigger recomputation
multiplier.value = 3; // No update
count.value = 5; // Updates!
```

## Readonly Signals

Create read-only views of signals:

```ts
import { signal, readonly } from '@vielzeug/craftit';
const count = signal(0);
const readonlyCount = readonly(count);
console.log(readonlyCount.value); // 0
// readonlyCount.value = 10; // Error!
// But the original signal can still be updated
count.value = 10;
console.log(readonlyCount.value); // 10
```

## Template System — Raw HTML

By default `html` auto-escapes text interpolations. Use `raw` or `rawHtml` when you trust the content:

```ts
import { html, raw, rawHtml } from '@vielzeug/craftit';
const trustedContent = '<strong>Bold</strong>';
// raw tag — no escaping for the entire template
raw`<div>${trustedContent}</div>`;
// rawHtml() — bypass escaping for a single interpolated value
html`<div>${rawHtml(trustedContent)}</div>`;
// escapeHtml() — explicit escape a value
import { escapeHtml } from '@vielzeug/craftit';
console.log(escapeHtml('<script>')); // &lt;script&gt;
```

## Template System

Craftit uses tagged template literals for HTML with powerful binding syntax.

### Text Interpolation

```ts
const name = signal('Alice');
const age = signal(30);
html`
  <div>
    <p>Name: ${name}</p>
    <p>Age: ${age}</p>
  </div>
`;
```

### Properties (: prefix)

Bind to element properties:

```ts
const value = signal('hello');
html`<input :value=${value} />`;
```

### Attributes (: prefix)

Bind to attributes:

```ts
const id = signal('my-id');
const className = signal('active');
html` <div :id=${id} :class=${className}>Content</div> `;
```

### Boolean Attributes (? prefix)

Toggle boolean attributes:

```ts
const isDisabled = signal(false);
const isChecked = signal(true);
html`
  <button ?disabled=${isDisabled}>Click</button>
  <input type="checkbox" ?checked=${isChecked} />
`;
```

### Event Handlers (@ prefix)

Bind event handlers:

```ts
const handleClick = () => console.log('Clicked!');
const handleInput = (e: Event) => {
  console.log((e.target as HTMLInputElement).value);
};
html`
  <button @click=${handleClick}>Click Me</button>
  <input @input=${handleInput} />
`;
```

### Event Modifiers

Chain event modifiers with dots:

```ts
html`
  <!-- Prevent default -->
  <form @submit.prevent=${handleSubmit}>
    <button type="submit">Submit</button>
  </form>
  <!-- Stop propagation -->
  <div @click.stop=${handleClick}>Click</div>
  <!-- Keyboard shortcuts -->
  <input @keydown.enter=${handleEnter} />
  <input @keydown.esc=${handleEscape} />
  <!-- Combine modifiers -->
  <form @submit.prevent.stop=${handleSubmit}></form>
`;
```

Available modifiers:

- `.prevent` - `preventDefault()`
- `.stop` - `stopPropagation()`
- `.self` - only if event.target is the element
- `.capture` - use capture mode
- `.once` - trigger only once
- `.passive` - passive listener
- `.enter`, `.tab`, `.esc`, `.space`, `.up`, `.down`, `.left`, `.right` - keyboard keys

## Element References

### `ref()` — single element

Get references to DOM elements:

```ts
import { define, ref, html, onMount } from '@vielzeug/craftit';
define('focus-input', () => {
  const inputRef = ref<HTMLInputElement>();
  onMount(() => {
    inputRef.value?.focus();
  });
  return html` <input ref=${inputRef} type="text" /> `;
});
```

### `refs()` — multiple elements

```ts
define('item-list', () => {
  const itemRefs = refs<HTMLLIElement>();
  onMount(() => {
    console.log('items:', itemRefs.values.length);
  });
  return html`
    <ul>
      <li ref=${itemRefs}>Item 1</li>
      <li ref=${itemRefs}>Item 2</li>
      <li ref=${itemRefs}>Item 3</li>
    </ul>
  `;
});
```

`refs().values` is a live `ReadonlyArray<T>` (no defensive copy).

### Arrays and Lists

```ts
const items = signal(['Apple', 'Banana', 'Cherry']);
html`
  <ul>
    ${items.value.map((item) => html`<li>${item}</li>`)}
  </ul>
`;
```

### Two-Way Binding (`html.bind`)

`html.bind(signal)` is a shorthand that attaches both `:value` and the `input`/`change` listener in one step:

```ts
const name = signal('');
// Long form
html`<input :value=${name} @input=${(e: Event) => name.value = (e.target as HTMLInputElement).value} />`;
// Short form — same result
html`<input ${html.bind(name)} />`;
```

Works with text inputs, textareas, selects, checkboxes, and radio buttons.

### Reactive Functions

Use arrow functions to create reactive expressions that re-evaluate when signals change:

```ts
const count = signal(0);
const name = signal('Alice');

// Reactive HTML
html` ${() => html`<p>Count: ${count.value}</p>`} `;

// Reactive text
html` <p>${() => `Hello, ${name.value}!`}</p> `;

// Reactive attributes
html` <button class=${() => count.value > 0 ? 'btn active' : 'btn'}>Click</button> `;
```

::: tip Why Arrow Functions?
Craftit is a runtime library without a compiler. When you write `count.value`, JavaScript evaluates it immediately. Wrapping in `() => ...` delays evaluation, allowing the template system to re-run it when signals change.
:::

::: warning Common Mistake
```ts
// ❌ Static - evaluated once, never updates
html`<p>${count.value}</p>`;

// ✅ Reactive - re-evaluates when count changes
html`<p>${() => count.value}</p>`;
```
:::

## Control Flow

### Conditional Rendering (`html.when`)

Removes/inserts DOM nodes based on a condition.

```ts
const isLoggedIn = signal(false);
// Simple conditional
html`${html.when(isLoggedIn, () => html`<p>Welcome back!</p>`)}`;
// With else branch
html`
  ${html.when(
    isLoggedIn,
    () => html`<p>Welcome!</p>`,
    () => html`<p>Please log in</p>`,
  )}
`;
// Multi-branch else-if chain (each arg is a [condition, fn] tuple)
const role = signal('guest');
html`
  ${html.when(
    [() => role.value === 'admin',  () => html`<admin-panel />`],
    [() => role.value === 'editor', () => html`<editor-panel />`],
    () => html`<guest-panel />`,
  )}
`;
```

### Visibility Toggle (`html.show`)

Keeps DOM **mounted**, only toggles `display`. Use this for components with expensive setup or local state (e.g. a `<video>`, a form with user input):

```ts
const panelOpen = signal(true);
html`
  ${html.show(panelOpen, () => html`
    <div class="panel">
      <heavy-chart />
    </div>
  `)}
`;
```

### Lists (`html.each`)

Efficient keyed list rendering. Three call signatures:

```ts
const todos = signal([
  { id: 1, text: 'Learn Craftit', done: false },
  { id: 2, text: 'Build app', done: false },
]);
// Three-arg form: source, keyFn, templateFn, emptyFn?
html`
  ${html.each(
    todos,
    (todo) => todo.id,
    (todo, index) => html`
      <li>${index + 1}. ${todo.text}</li>
    `,
    () => html`<p>No todos yet!</p>`,
  )}
`;
// Simple form (index as key, no empty):
html`${html.each(todos, (todo) => html`<li>${todo.text}</li>`)}`;
// Options object form:
html`
  ${html.each(todos, {
    key: (todo) => todo.id,
    template: (todo, i) => html`<li>${i + 1}. ${todo.text}</li>`,
    empty: () => html`<p>No todos</p>`,
  })}
`;
// Function source (reactive computed list):
html`${html.each(() => todos.value.filter(t => !t.done), (t) => t.id, (t) => html`<li>${t.text}</li>`)}`;
```

### Pattern Matching (`html.match`)

Switch/case style. Returns `V` for static values; returns `() => V` for `Signal`/function values (reactive):

```ts
const status = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
html`
  ${html.match(status, [
    ['idle',    () => html`<p>Ready</p>`],
    ['loading', () => html`<p>Loading…</p>`],
    ['success', () => html`<p>Done!</p>`],
    ['error',   () => html`<p>Something went wrong</p>`],
  ], () => html`<p>Unknown</p>`)}
`;
```

### Async Content (`suspense`)

Handle async data loading with fallback and retry:

```ts
import { suspense } from '@vielzeug/craftit';
const loadUser = suspense(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  {
    fallback: () => html`<p>Loading…</p>`,
    template: (user) => html`<p>Hello, ${user.name}!</p>`,
    error: (err, retry) => html`
      <p>Error: ${err.message}</p>
      <button @click=${retry}>Retry</button>
    `,
  },
);
html`${loadUser()}`;
```

## Styling

### Inline Styles with css

```ts
import { define, html, css } from '@vielzeug/craftit';
define('styled-button', () => {
  const styles = css`
    button {
      background: #0070f3;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
    }
    button:hover {
      background: #0051cc;
    }
  `;
  return {
    template: html`<button>Click Me</button>`,
    styles: [styles.content],
  };
});
```

### CSS with Interpolation

```ts
const primaryColor = '#0070f3';
const styles = css`
  button {
    background: ${primaryColor};
  }
`;
```

### Theming with css.theme

```ts
const theme = css.theme(
  // Light theme
  {
    primaryColor: '#0070f3',
    textColor: '#333',
    bgColor: '#fff',
  },
  // Dark theme
  {
    primaryColor: '#4dabf7',
    textColor: '#fff',
    bgColor: '#222',
  },
  // Options
  {
    attribute: 'data-theme',
    selector: ':host',
  },
);
const styles = css`
  :host {
    color: ${theme.textColor};
    background: ${theme.bgColor};
  }
  button {
    background: ${theme.primaryColor};
  }
  ${theme}/* Inject theme CSS */
`;
```

### Dynamic Styles (html.style)

```ts
const fontSize = signal(16);
const color = signal('red');
html`
  <div
    style=${html.style({
      fontSize: fontSize.value, // Auto-adds 'px'
      color: color.value,
      padding: '12px 24px',
      fontWeight: 'bold',
    })}>
    Styled dynamically
  </div>
`;
```

### Dynamic Classes (html.classes)

Use `html.classes()` to build dynamic class names. Wrap in an arrow function for reactivity:

```ts
const isActive = signal(true);
const isDisabled = signal(false);

// Object syntax - wrap in arrow function for reactivity
html`
  <div
    class=${() =>
      html.classes({
        active: isActive.value,
        disabled: isDisabled.value,
        'button-primary': true,
      })}>
    Styled
  </div>
`;

// Array syntax
html`
  <div class=${() => html.classes(['btn', isActive.value && 'active', { primary: true, disabled: isDisabled.value }])}>
    Styled
  </div>
`;
```

::: tip Reactivity Pattern
**Always wrap `html.classes()` in an arrow function when using signal values:**

```ts
// ✅ Reactive - updates when priority changes
class=${() => html.classes({ active: priority.value === 'high' })}

// ❌ Static - evaluated once with current value
class=${html.classes({ active: priority.value === 'high' })}
```
:::

## Lifecycle Hooks

### onMount

Runs after the component is mounted:

```ts
import { define, signal, html, onMount } from '@vielzeug/craftit';
define('my-component', () => {
  const data = signal<string | null>(null);
  onMount(() => {
    console.log('Component mounted!');
    const ctrl = new AbortController();
    fetch('/api/data', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => (data.value = d));
    // Return cleanup — runs on unmount
    return () => ctrl.abort();
  });
  return html`<div>${data}</div>`;
});
```

### onUnmount

Runs before the component is unmounted:

```ts
onUnmount(() => {
  console.log('Component unmounting...');
  // Cleanup subscriptions, timers, etc.
});
```

### onUpdated

Runs after each reactive update:

```ts
onUpdated(() => {
  console.log('Component updated!');
});
```

### onCleanup

Register cleanup functions:

```ts
onCleanup(() => {
  console.log('Cleaning up...');
});
```

### handle

Registers an event listener and **automatically removes it** on unmount — no need to return a cleanup function from `onMount`:

```ts
import { define, onMount, handle, html } from '@vielzeug/craftit';
define('my-button', () => {
  onMount(() => {
    const host = /* ... */;
    handle(host, 'click', onClick);
    handle(host, 'keydown', onKeydown);
    // no return needed — cleanup is automatic
  });
  return html`<slot></slot>`;
});
```

Equivalent to the manual `addEventListener` + `return () => removeEventListener` pattern, but shorter and impossible to forget the cleanup.

### onError

Scoped error handler — catches render and lifecycle errors within this component only. Use instead of a global try/catch:

```ts
import { define, html, onError } from '@vielzeug/craftit';
define('safe-component', () => {
  onError((error, info) => {
    console.error('Component error:', error.message);
    console.error('Stack:', info?.componentStack);
    // send to your error tracker
  });
  return html`<risky-child></risky-child>`;
});
```

## Form Integration

Craftit provides native form integration through the `field()` helper, which uses the [ElementInternals API](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) to create custom form controls that work seamlessly with native HTML forms.

::: warning Important
To use `field()`, you must define your component with the `formAssociated: true` option:

```ts
define('my-input', () => {
  // component code
}, { formAssociated: true }); // ← Required!
```
:::

### Basic Form Field

Create a custom input that participates in form submission:

```ts
import { define, signal, html, field } from '@vielzeug/craftit';

define('custom-input', () => {
  const value = signal('');

  // Register as a form field
  const formField = field({
    value: value
  });

  return html`
    <input
      type="text"
      :value=${value}
      @input=${(e) => value.value = e.target.value}
    />
  `;
}, { formAssociated: true }); // ← Must set this!
```

```html
<form>
  <custom-input name="username"></custom-input>
  <button type="submit">Submit</button>
</form>
```

### With Custom Form Value

Transform the signal value before sending to the form:

```ts
define('number-input', () => {
  const value = signal(0);

  const formField = field({
    value: value,
    toFormValue: (v) => String(v) // Convert number to string
  });

  return html`
    <input
      type="number"
      :value=${value}
      @input=${(e) => value.value = Number(e.target.value)}
    />
  `;
}, { formAssociated: true });
```

### With Validation

Use ElementInternals validation API:

```ts
import { define, signal, computed, html, field } from '@vielzeug/craftit';

define('email-input', () => {
  const value = signal('');

  const formField = field({ value });

  const isValid = computed(() =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value)
  );

  // Update validity when value changes
  watch(value, () => {
    if (!value.value) {
      formField.setValidity({}, ''); // Clear validation
    } else if (!isValid.value) {
      formField.setValidity(
        { typeMismatch: true },
        'Please enter a valid email address'
      );
    } else {
      formField.setValidity({}, ''); // Valid
    }
  }, { immediate: true });

  return html`
    <input
      type="email"
      :value=${value}
      @input=${(e) => value.value = e.target.value}
      placeholder="email@example.com"
    />
  `;
}, { formAssociated: true });
```

### With Disabled State

Sync disabled state with form internals:

```ts
define('toggle-input', () => {
  const value = signal('');
  const disabled = signal(false);

  const formField = field({
    value: value,
    disabled: disabled // Automatically syncs with internals.states
  });

  return html`
    <div>
      <input
        type="text"
        :value=${value}
        ?disabled=${disabled}
        @input=${(e) => value.value = e.target.value}
      />
      <button @click=${() => disabled.value = !disabled.value}>
        ${disabled.value ? 'Enable' : 'Disable'}
      </button>
    </div>
  `;
}, { formAssociated: true });
```

### Complex Form Control

Full-featured custom form control with validation:

```ts
define('rating-input', () => {
  const rating = signal(0);
  const required = prop('required', false, {
    parse: (v) => v !== null
  });

  const formField = field({
    value: rating,
    toFormValue: (v) => String(v)
  });

  // Validate
  watch([rating, required], () => {
    if (required.value && rating.value === 0) {
      formField.setValidity(
        { valueMissing: true },
        'Please select a rating'
      );
    } else {
      formField.setValidity({}, '');
    }
  }, { immediate: true });

  return html`
    <div class="rating">
      ${[1, 2, 3, 4, 5].map(star => html`
        <button
          type="button"
          class=${() => html.classes({ active: rating.value >= star })}
          @click=${() => rating.value = star}
        >
          ★
        </button>
      `)}
    </div>
  `;
}, { formAssociated: true });
```

```html
<form>
  <rating-input name="rating" required></rating-input>
  <button type="submit">Submit</button>
</form>
```

### Form Field Handle

The `field()` function returns a handle with useful methods:

```ts
const formField = field({ value });

// Access ElementInternals (or null if not supported)
formField.internals; // ElementInternals | null

// Set validity
formField.setValidity(
  { valueMissing: true },
  'This field is required',
  inputElement
);

// Report validity (shows validation message)
const isValid = formField.reportValidity(); // boolean
```

## File Upload Control

```ts
define('file-uploader', () => {
  const files = signal<FileList | null>(null);

  const formField = field({
    value: files,
    toFormValue: (fileList) => {
      if (!fileList?.length) return null;
      if (fileList.length === 1) return fileList[0];
      const fd = new FormData();
      for (let i = 0; i < fileList.length; i++) fd.append('files[]', fileList[i]);
      return fd;
    },
  });

  return html`
    <input type="file" multiple @change=${(e: Event) => {
      files.value = (e.target as HTMLInputElement).files;
    }} />
    ${html.when(files, () => html`<p>Selected: ${() => files.value?.length ?? 0} file(s)</p>`)}
  `;
}, { formAssociated: true });
```

### Browser Support

The `field()` helper gracefully degrades in browsers without ElementInternals support. It returns a no-op handle that won't cause errors but won't provide form integration.

## Props and Attributes

### Single prop

Define reactive props that sync with HTML attributes:

```ts
import { define, prop, html } from '@vielzeug/craftit';
define('user-badge', () => {
  // Basic prop
  const name = prop('name', 'Guest');
  // With custom parser
  const count = prop('count', 0, { parse: (v) => Number(v) || 0 });
  // With reflection (syncs back to attribute) + validator
  const status = prop('status', 'offline', {
    reflect: true,
    validator: (v) => ['online', 'offline', 'away'].includes(v),
  });
  // Boolean prop (attribute presence = true)
  const disabled = prop('disabled', false, {
    parse: (v) => v !== null,
    reflect: true,
  });
  return html`
    <div class="badge">
      <span class="name">${name}</span>
      <span class="count">${count}</span>
      <span class="status">${status}</span>
    </div>
  `;
});
```

Use in HTML:

```html
<user-badge name="Alice" count="5" status="online"></user-badge>
```

### `defineProps` — multiple props at once

Declare all props with a single call; keys are automatically converted to kebab-case attribute names:

```ts
import { define, defineProps, html } from '@vielzeug/craftit';
define('product-card', () => {
  // defineProps({ camelKey: { default, ...options } })
  const props = defineProps({
    title:    { default: '' },
    price:    { default: 0,     type: Number },
    inStock:  { default: true,  type: Boolean },
    category: { default: 'all', reflect: true },
  });
  // props.title → Signal<string>,  attribute: "title"
  // props.price → Signal<number>,  attribute: "price"
  // props.inStock → Signal<boolean>, attribute: "in-stock"
  // props.category → Signal<string>, attribute: "category" (reflected)
  return html`
    <div>
      <h2>${props.title}</h2>
      <p>$${props.price}</p>
      ${html.when(props.inStock,
        () => html`<span class="badge">In stock</span>`,
        () => html`<span class="badge out">Out of stock</span>`,
      )}
    </div>
  `;
});
```

## Slots

Render named or default slots with optional fallback content:

```ts
import { define, defineSlots, html } from '@vielzeug/craftit';
define('card-component', () => {
  const s = defineSlots<{ default: unknown; footer: unknown }>();
  return html`
    <div class="card">
      <div class="body">
        ${s.default({}, () => html`<p>No content provided</p>`)}
      </div>
      ${s.has('footer') ? html`<div class="footer">${s.render('footer')}</div>` : ''}
    </div>
  `;
});
```

## Typed Events (`defineEmits`)

Dispatch strongly-typed custom events:

```ts
import { define, signal, html, defineEmits } from '@vielzeug/craftit';

type ButtonEvents = { clicked: { count: number }; reset: void };

define('counter-button', () => {
  const count = signal(0);
  const fire = defineEmits<ButtonEvents>();

  return html`
    <button @click=${() => {
      count.value++;
      fire('clicked', { count: count.value });
    }}>Clicked ${count} times</button>
  `;
});
```

Consumer:

```ts
html`<counter-button @clicked=${(e: CustomEvent) => console.log(e.detail.count)}></counter-button>`;
```

## Context (Dependency Injection)

Share data between parent and child components:

```ts
import { define, provide, inject, signal, html } from '@vielzeug/craftit';
import type { InjectionKey } from '@vielzeug/craftit';
// Create typed injection key (preferred over raw `Symbol()`)
const ThemeKey = createContext<{ mode: Signal<'light' | 'dark'> }>();
// Parent provides
define('app-root', () => {
  const mode = signal<'light' | 'dark'>('light');
  provide(ThemeKey, { mode });
  return html`
    <div>
      <button @click=${() => (mode.value = mode.value === 'light' ? 'dark' : 'light')}>Toggle Theme</button>
      <slot></slot>
    </div>
  `;
});
// Child injects
define('themed-card', () => {
  const theme = inject(ThemeKey);
  return html` <div class=${() => `card theme-${theme?.mode.value}`}>Card content</div> `;
});
```

```html
<app-root>
  <themed-card></themed-card>
</app-root>
```

## Portals

Render components to different DOM locations using the `target` option in `define()`:

```ts
import { define, prop, html } from '@vielzeug/craftit';

// Define a modal component that renders to body
define('modal-dialog', () => {
  const isOpen = prop('open', false, {
    parse: (v) => v === '' || v === 'true',
  });

  return html`
    ${html.when(isOpen, () => html`
      <div class="modal-overlay">
        <div class="modal">
          <h2>Modal Title</h2>
          <button @click=${() => { isOpen.value = false; }}>Close</button>
        </div>
      </div>
    `)}
  `;
}, { target: 'body' }); // Component renders to body instead of parent

// Use the modal component
define('app-component', () => {
  const showModal = signal(false);
  return html`
    <button @click=${() => (showModal.value = true)}>Open Modal</button>
    <modal-dialog ?open=${showModal}></modal-dialog>
  `;
});
```

## Error Handling

Use `onError` in setup to add a scoped error handler for this component's render and lifecycle errors:

```ts
import { define, html, onError } from '@vielzeug/craftit';
define('safe-component', () => {
  onError((error, info) => {
    console.error('Component error:', error.message, info?.componentStack);
    // forward to your error-tracking service
  });
  return html`<risky-child></risky-child>`;
});
```

::: tip
`onError` only catches errors thrown during **render** and **lifecycle hooks** in the current component's subtree. It does not replace proper `try/catch` in async code.
:::

## Testing

Craftit includes testing utilities for component testing:

```ts
import { mount, fireEvent, userEvent } from '@vielzeug/craftit/trial';
import { describe, it, expect } from 'vitest';
describe('counter-app', () => {
  it('increments on click', async () => {
    const { query, waitForUpdates } = await mount('counter-app');
    const button = query('button');
    const display = query('p');
    expect(display?.textContent).toBe('Count: 0');
    fireEvent.click(button!);
    await waitForUpdates();
    expect(display?.textContent).toBe('Count: 1');
  });
});
```

### Testing API

```ts
// Mount component
const fixture = await mount('my-component');
// Query elements
const button = fixture.query('button');
const buttons = fixture.queryAll('button');
// Access internals
fixture.element; // HTMLElement
fixture.shadow; // ShadowRoot
fixture.container; // Parent container
// Wait for updates
await fixture.waitForUpdates();
// Cleanup
fixture.unmount();
```

### Fire Events

```ts
fireEvent.click(element);
fireEvent.input(element);
fireEvent.change(element);
fireEvent.keyDown(element, { key: 'Enter' });
fireEvent.submit(form);
fireEvent.custom(element, 'my-event', { detail: { value: 123 } });
```

### User Events

More realistic user interactions:

```ts
await userEvent.click(button);
await userEvent.type(input, 'Hello');
await userEvent.clear(input);
await userEvent.selectOptions(select, 'option1');
await userEvent.upload(fileInput, file);
```

## TypeScript

Craftit is built with TypeScript and provides excellent type inference:

```ts
import type { Signal, ReadonlySignal, Ref, RefList, InjectionKey } from '@vielzeug/craftit';
// Typed signals
const count: Signal<number> = signal(0);
const name: Signal<string> = signal('Alice');
// computed() returns Signal<T> (not a separate type)
const doubled: Signal<number> = computed(() => count.value * 2);
// Typed refs
const inputRef: Ref<HTMLInputElement> = ref<HTMLInputElement>();
const inputRefs: RefList<HTMLInputElement> = refs<HTMLInputElement>();
// Typed injection keys
const ThemeKey = createContext<{ mode: Signal<'light' | 'dark'> }>();
// Typed event emitter
const fire = defineEmits<{ submitted: { value: string } }>();
fire('submitted', { value: name.value });
```

## Best Practices

### 1. Use Signals for State

```ts
// ✅ Good
const count = signal(0);
// ❌ Avoid
let count = 0;
```

### 2. Computed for Derived Values

```ts
// ✅ Good
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
// ❌ Avoid
const fullName = signal(firstName.value + ' ' + lastName.value);
```

### 3. Batch Multiple Updates

```ts
// ✅ Good
batch(() => {
  count.value = 10;
  name.value = 'Alice';
});
// ❌ Avoid (triggers multiple re-renders)
count.value = 10;
name.value = 'Alice';
```

### 4. Use onCleanup for Side Effects

```ts
// ✅ Good
onMount(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
});
// Or use handle() for event listeners — cleanup is automatic:
onMount(() => {
  handle(host, 'click', handleClick);
  // no return needed
});
// ❌ Avoid (memory leak)
onMount(() => {
  setInterval(() => {}, 1000);
});
```

### 5. Prefer Small, Focused Components

```ts
// ✅ Good
define('user-name', () => {
  const name = prop('name', '');
  return html`<span>${name}</span>`;
});
define('user-card', () => {
  return html`
    <div class="card">
      <user-name name="Alice"></user-name>
    </div>
  `;
});
```

## Next Steps

- See [Examples](./examples.md) for real-world examples
- Read [API Reference](./api.md) for complete API documentation
- Check out the [GitHub repository](https://github.com/saatkhel/vielzeug) for source code
