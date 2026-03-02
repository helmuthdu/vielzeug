# Craftit Usage Guide

Complete guide to using Craftit for creating type-safe, reactive web components with signals.
::: tip 💡 Quick Reference
This guide covers detailed usage patterns. For complete examples, see [Examples](./examples.md). For API documentation, see [API Reference](./api.md).
:::

## Table of Contents

[[toc]]

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/craftit
```

```sh [npm]
npm install @vielzeug/craftit
```

```sh [yarn]
yarn add @vielzeug/craftit
```

:::

## Import

```ts
import {
  define,
  signal,
  computed,
  effect,
  watch,
  batch,
  untrack,
  readonly,
  html,
  css,
  onMount,
  onUnmount,
  onUpdated,
  onCleanup,
  prop,
  ref,
  provide,
  inject,
  field,
} from '@vielzeug/craftit';
// Optional: Import types
import type { Signal, ComputedSignal, Ref, InjectionKey, HTMLResult, CSSResult, FormFieldHandle } from '@vielzeug/craftit';
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

### Element References (ref)

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

### Arrays and Lists

```ts
const items = signal(['Apple', 'Banana', 'Cherry']);
html`
  <ul>
    ${items.value.map((item) => html`<li>${item}</li>`)}
  </ul>
`;
```

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

### Conditional Rendering (html.when)

```ts
const isLoggedIn = signal(false);
// Simple conditional
html` ${html.when(isLoggedIn, () => html` <p>Welcome back!</p> `)} `;
// With else branch
html`
  ${html.when(isLoggedIn, {
    then: () => html`<p>Welcome!</p>`,
    else: () => html`<p>Please log in</p>`,
  })}
`;
```

### Show/Hide (html.show)

Toggles display property instead of removing from DOM:

```ts
const isVisible = signal(true);
html` ${html.show(isVisible, html` <div>I can be hidden!</div> `)} `;
```

### Lists (html.each)

Efficient list rendering with keys:

```ts
const todos = signal([
  { id: 1, text: 'Learn Craftit', done: false },
  { id: 2, text: 'Build app', done: false },
]);
html`
  ${html.each(
    todos,
    (todo) => todo.id, // key function
    (todo, index) => html`
      <li>
        ${index + 1}. ${todo.text}
        <input type="checkbox" ?checked=${todo.done} />
      </li>
    `,
    () => html`<p>No todos yet!</p>`, // empty state
  )}
`;
```

### Switch/Case (html.choose)

Pattern matching for multiple conditions:

```ts
const status = signal('loading');
html`
  ${html.choose(
    status,
    [
      ['idle', () => html`<p>Ready</p>`],
      ['loading', () => html`<p>Loading...</p>`],
      ['success', () => html`<p>Success!</p>`],
      ['error', () => html`<p>Error occurred</p>`],
    ],
    () => html`<p>Unknown status</p>`, // default
  )}
`;
```

### Suspense (html.until)

Handle async operations:

```ts
html`
  ${html.until(
    fetchData(), // Promise
    () => html`<p>Loading...</p>`, // loading state
    (data) => html`<p>${data}</p>`, // success
  )}
`;
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
  const data = signal(null);
  onMount(() => {
    console.log('Component mounted!');
    // Fetch data
    fetch('/api/data')
      .then((r) => r.json())
      .then((d) => (data.value = d));
    // Return cleanup
    return () => {
      console.log('Cleanup on unmount');
    };
  });
  return html`<div>${data.value}</div>`;
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

### File Upload Control

Custom file input with form integration:

```ts
define('file-uploader', () => {
  const files = signal<FileList | null>(null);

  const formField = field({
    value: files,
    toFormValue: (fileList) => {
      if (!fileList || fileList.length === 0) return '';

      // Return first file or FormData with all files
      if (fileList.length === 1) {
        return fileList[0];
      }

      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files[]', fileList[i]);
      }
      return formData;
    }
  });

  return html`
    <input
      type="file"
      multiple
      @change=${(e) => {
        const target = e.target as HTMLInputElement;
        files.value = target.files;
      }}
    />
    ${html.when(files, () => html`
      <p>Selected: ${files.value?.length || 0} file(s)</p>
    `)}
  `;
}, { formAssociated: true });
```

### Browser Support

The `field()` helper gracefully degrades in browsers without ElementInternals support. It returns a no-op handle that won't cause errors but won't provide form integration.

## Props and Attributes

Define reactive props that sync with HTML attributes:

```ts
import { define, prop, html } from '@vielzeug/craftit';
define('user-badge', () => {
  // Basic prop
  const name = prop('name', 'Guest');
  // With custom parser
  const count = prop('count', 0, {
    parse: (v) => Number(v) || 0,
  });
  // With reflection (syncs back to attribute)
  const status = prop('status', 'offline', {
    reflect: true,
  });
  // Boolean prop
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

## Context (Dependency Injection)

Share data between parent and child components:

```ts
import { define, provide, inject, signal, html } from '@vielzeug/craftit';
import type { InjectionKey } from '@vielzeug/craftit';
// Create typed injection key
const ThemeKey: InjectionKey<{ mode: Signal<'light' | 'dark'> }> = Symbol('theme');
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
  return html` <div class="card theme-${theme?.mode.value}">Card content</div> `;
});
```

```html
<app-root>
  <themed-card></themed-card>
</app-root>
```

## Portals

Render content to a different location in the DOM:

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('modal-component', () => {
  const isOpen = signal(false);
  return html`
    <button @click=${() => (isOpen.value = true)}>Open Modal</button>
    ${html.portal(
      html.when(
        isOpen,
        () => html`
          <div class="modal-overlay">
            <div class="modal">
              <h2>Modal Title</h2>
              <button @click=${() => (isOpen.value = false)}>Close</button>
            </div>
          </div>
        `,
      ),
      'body', // target selector or element
    )}
  `;
});
```

## Error Boundaries

Handle errors gracefully in components:

```ts
import { define, html, errorBoundary } from '@vielzeug/craftit';
define('safe-component', () => {
  return errorBoundary(() => html`<risky-component></risky-component>`, {
    fallback: (error) => html`
      <div class="error">
        <h3>Something went wrong</h3>
        <p>${error.message}</p>
      </div>
    `,
    onError: (error) => {
      console.error('Component error:', error);
      // Send to error tracking service
    },
  });
});
```

### Reusable Error Boundaries

```ts
import { createErrorBoundary } from '@vielzeug/craftit';
const SafeComponent = createErrorBoundary(() => html`<risky-component></risky-component>`, {
  fallback: (error) => html`<p>Error: ${error.message}</p>`,
});
define('app', () => html` <div>${SafeComponent()}</div> `);
```

## Lazy Loading

Lazy load components on demand:

```ts
import { define, html, lazy } from '@vielzeug/craftit';
const HeavyChart = lazy(() => import('./chart-component'), {
  fallback: () => html`<div class="loading">Loading chart...</div>`,
});
define('dashboard', () => {
  return html`
    <div class="dashboard">
      <h1>Dashboard</h1>
      ${HeavyChart()}
    </div>
  `;
});
```

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

Craftit provides excellent TypeScript support:

```ts
import type { Signal, ComputedSignal, Ref, InjectionKey } from '@vielzeug/craftit';
// Typed signals
const count: Signal<number> = signal(0);
const name: Signal<string> = signal('Alice');
const user: Signal<{ name: string; age: number }> = signal({
  name: 'Bob',
  age: 30,
});
// Typed computed
const doubled: ComputedSignal<number> = computed(() => count.value * 2);
// Typed refs
const inputRef: Ref<HTMLInputElement> = ref<HTMLInputElement>();
// Typed injection keys
interface AppTheme {
  mode: 'light' | 'dark';
  primaryColor: string;
}
const ThemeKey: InjectionKey<AppTheme> = Symbol('theme');
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
