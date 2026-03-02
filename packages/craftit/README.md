# @vielzeug/craftit

> Modern, lightweight web components with signals-based reactivity
> **Craftit** is a tiny yet powerful library for building web components with fine-grained reactivity. It combines the simplicity of vanilla web components with the developer experience of modern frameworks.

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('counter-app', () => {
  const count = signal(0);
  return html`
    <div>
      <p>Count: ${count}</p>
      <button @click=${() => count.value++}>Increment</button>
    </div>
  `;
});
```

## ✨ Features

- **🎯 Signals-Based Reactivity** – Fine-grained updates with automatic dependency tracking
- **🔥 Modern DX** – Tagged templates, event handlers, automatic reactivity
- **📦 Web Standards** – Built on native Custom Elements and Shadow DOM
- **🎨 Scoped Styles** – CSS with CSP support and theming helpers
- **🔍 TypeScript First** – Full type safety with excellent inference
- **🪝 Lifecycle Hooks** – Familiar `onMount`, `onUnmount`, `onUpdated`
- **🎭 Advanced Features** – Error boundaries, lazy loading, context/dependency injection
- **🧪 Testing Utilities** – Built-in testing helpers for component testing

## 📦 Installation

```bash
npm install @vielzeug/craftit
```

## 🚀 Quick Start

### Basic Component

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('hello-world', () => {
  const name = signal('World');
  return html`
    <div>
      <h1>Hello, ${name}!</h1>
      <input type="text" :value=${name} @input=${(e) => (name.value = e.target.value)} />
    </div>
  `;
});
```

```html
<hello-world></hello-world>
```

### With Styles

```ts
import { define, signal, html, css } from '@vielzeug/craftit';
define('styled-button', () => {
  const count = signal(0);
  const styles = css`
    button {
      background: #0070f3;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #0051cc;
    }
  `;
  return {
    template: html` <button @click=${() => count.value++}>Clicked ${count} times</button> `,
    styles: [styles.content],
  };
});
```

### Props and Attributes

```ts
import { define, prop, html } from '@vielzeug/craftit';
define('user-card', () => {
  const name = prop('name', '', { reflect: true });
  const age = prop('age', 0, {
    parse: (v) => Number(v),
    reflect: true,
  });
  return html`
    <div class="card">
      <h2>${name}</h2>
      <p>Age: ${age}</p>
    </div>
  `;
});
```

```html
<user-card name="Alice" age="30"></user-card>
```

## 🎯 Core Concepts

### Signals

Signals are reactive primitives that automatically track dependencies and trigger updates.

```ts
import { signal, computed, effect, watch } from '@vielzeug/craftit';
// Create a signal
const count = signal(0);
// Read value
console.log(count.value); // 0
// Update value
count.value = 1;
// Computed signals (derived state)
const doubled = computed(() => count.value * 2);
console.log(doubled.value); // 2
// Effects (side effects)
effect(() => {
  console.log('Count changed:', count.value);
});
count.value = 5; // Logs: "Count changed: 5"
// Watch specific signals
watch(count, (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`);
});
// Watch multiple signals
const name = signal('Alice');
watch([count, name], ([countValue, nameValue]) => {
  console.log(`Count: ${countValue}, Name: ${nameValue}`);
});
```

#### Signal Utilities

```ts
// Read without tracking
const value = count.peek();
// Update with function
count.update((current) => current + 1);
// Map arrays
const items = signal([1, 2, 3]);
const doubled = items.map((item, index) => item * 2);
// Readonly signals
const readonlyCount = readonly(count);
// readonlyCount.value = 10; // Error!
// Batch updates (avoid multiple re-renders)
batch(() => {
  count.value = 10;
  name.value = 'Bob';
  // Only one re-render happens
});
// Untrack (prevent dependency tracking)
const result = untrack(() => count.value); // Doesn't create dependency
```

### Template System

```ts
import { html, signal } from '@vielzeug/craftit';
const name = signal('Alice');
const isActive = signal(true);
const items = signal(['a', 'b', 'c']);
html`
  <!-- Text interpolation -->
  <p>Hello, ${name}!</p>
  <!-- Properties (: prefix) -->
  <input :value=${name} />
  <!-- Attributes (: prefix) -->
  <div :class=${isActive.value ? 'active' : ''}>...</div>
  <!-- Boolean attributes (? prefix) -->
  <button ?disabled=${isActive}>Submit</button>
  <!-- Event handlers (@ prefix) -->
  <button @click=${() => console.log('Clicked!')}>Click</button>
  <!-- Event modifiers -->
  <button @click.prevent.stop=${handler}>Click</button>
  <input @keydown.enter=${submitForm} />
  <!-- Ref (element reference) -->
  <input ref=${inputRef} />
  <!-- Arrays -->
  <ul>
    ${items.value.map((item) => html`<li>${item}</li>`)}
  </ul>
  <!-- Reactive functions -->
  ${() => html`<p>Count: ${count.value}</p>`}
`;
```

#### Event Modifiers

Available event modifiers:

- `.prevent` - calls `preventDefault()`
- `.stop` - calls `stopPropagation()`
- `.self` - only trigger if event.target is the element itself
- `.capture` - use capture mode
- `.once` - trigger only once
- `.passive` - passive event listener
- `.enter`, `.tab`, `.esc`, `.space`, `.up`, `.down`, `.left`, `.right` - keyboard shortcuts

### Control Flow

```ts
import { html, signal } from '@vielzeug/craftit';
const show = signal(true);
const loading = signal(false);
const user = signal<User | null>(null);
const items = signal([1, 2, 3]);
html`
  <!-- Conditional rendering with html.when -->
  ${html.when(show, () => html`<div>Visible!</div>`)}
  <!-- With else branch -->
  ${html.when(loading, {
    then: () => html`<p>Loading...</p>`,
    else: () => html`<p>Ready!</p>`,
  })}
  <!-- Show/hide with display property -->
  ${html.show(show, html`<div>Toggle me!</div>`)}
  <!-- Lists with html.each -->
  ${html.each(
    items,
    (item) => item, // key function
    (item, index) => html`<li>${index}: ${item}</li>`,
    () => html`<p>No items</p>`, // empty state
  )}
  <!-- Switch/case with html.choose -->
  ${html.choose(
    status,
    [
      ['idle', () => html`<p>Idle</p>`],
      ['loading', () => html`<p>Loading...</p>`],
      ['success', () => html`<p>Success!</p>`],
    ],
    () => html`<p>Unknown state</p>`, // default
  )}
  <!-- Suspense-like behavior with html.until -->
  ${html.until(
    fetchData(), // Promise
    () => html`<p>Fetching...</p>`, // loading
    (data) => html`<p>${data}</p>`, // success
  )}
`;
```

### Styling

```ts
import { css, html } from '@vielzeug/craftit';
// Basic CSS
const styles = css`
  :host {
    display: block;
    padding: 1rem;
  }
  .button {
    background: var(--primary-color);
  }
`;
// With interpolation
const primaryColor = '#0070f3';
const styles2 = css`
  button {
    background: ${primaryColor};
  }
`;
// Theming
const theme = css.theme(
  {
    primaryColor: '#0070f3',
    textColor: '#333',
  },
  {
    primaryColor: '#4dabf7',
    textColor: '#fff',
  }, // dark theme
  {
    attribute: 'data-theme',
    selector: ':host',
  },
);
// Use theme variables
const themedStyles = css`
  :host {
    color: ${theme.textColor};
    background: ${theme.primaryColor};
  }
`;
// Dynamic styles
const buttonStyles = html.style({
  backgroundColor: primaryColor,
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: 16, // automatically adds 'px'
});
html`<button style="${buttonStyles}">Click</button>`;
// CSS classes
const classes = html.classes({
  active: isActive.value,
  disabled: !isEnabled.value,
});
// Or with arrays
const classes2 = html.classes(['btn', isActive.value && 'active', { primary: isPrimary.value }]);
html`<div class="${classes}">...</div>`;
```

### Lifecycle Hooks

```ts
import { define, signal, html, onMount, onUnmount, onUpdated } from '@vielzeug/craftit';
define('my-component', () => {
  const count = signal(0);
  // Run after component is mounted
  onMount(() => {
    console.log('Component mounted!');
    // Return cleanup function
    return () => {
      console.log('Cleanup on unmount');
    };
  });
  // Run before component is unmounted
  onUnmount(() => {
    console.log('Component unmounting...');
  });
  // Run after each update
  onUpdated(() => {
    console.log('Component updated!');
  });
  return html`<div>Count: ${count}</div>`;
});
```

### Props and Attributes

```ts
import { define, prop, html } from '@vielzeug/craftit';
define('form-input', () => {
  // Basic prop
  const value = prop('value', '');
  // With custom parser
  const age = prop('age', 0, {
    parse: (v) => Number(v) || 0,
  });
  // With reflection (updates attribute when prop changes)
  const label = prop('label', '', {
    reflect: true,
  });
  // Boolean prop
  const disabled = prop('disabled', false, {
    parse: (v) => v !== null,
    reflect: true,
  });
  return html`
    <label>${label}</label>
    <input :value=${value} ?disabled=${disabled} @input=${(e) => (value.value = e.target.value)} />
  `;
});
```

```html
<form-input label="Name" value="Alice" disabled></form-input>
```

### Element References

```ts
import { define, ref, html, onMount } from '@vielzeug/craftit';
define('focus-input', () => {
  const inputRef = ref<HTMLInputElement>();
  onMount(() => {
    // Access the element
    inputRef.value?.focus();
  });
  return html` <input ref=${inputRef} type="text" placeholder="I will be focused!" /> `;
});
```

### Context (Dependency Injection)

```ts
import { define, provide, inject, html, signal } from '@vielzeug/craftit';
import type { InjectionKey } from '@vielzeug/craftit';
// Create a typed injection key
const ThemeKey: InjectionKey<{ theme: Signal<'light' | 'dark'> }> = Symbol('theme');
// Parent provides value
define('theme-provider', () => {
  const theme = signal<'light' | 'dark'>('light');
  // Provide to children
  provide(ThemeKey, { theme });
  return html`
    <div>
      <button @click=${() => (theme.value = theme.value === 'light' ? 'dark' : 'light')}>Toggle Theme</button>
      <slot></slot>
    </div>
  `;
});
// Child injects value
define('themed-button', () => {
  // Inject from parent
  const context = inject(ThemeKey);
  return html` <button class=${context?.theme.value}>Themed Button</button> `;
});
```

```html
<theme-provider>
  <themed-button></themed-button>
</theme-provider>
```

### Portals

Render content to a different location in the DOM:

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('modal-trigger', () => {
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
      'body', // or document.querySelector('#modal-root')
    )}
  `;
});
```

### Error Boundaries

```ts
import { define, html, errorBoundary, createErrorBoundary } from '@vielzeug/craftit';
// Inline error boundary
define('safe-component', () => {
  return errorBoundary(
    () => {
      // Component that might throw
      return html`<risky-component></risky-component>`;
    },
    {
      fallback: (error) => html`
        <div class="error">
          <h3>Something went wrong</h3>
          <p>${error.message}</p>
        </div>
      `,
      onError: (error) => {
        console.error('Component error:', error);
      },
    },
  );
});
// Reusable error boundary
const SafeComponent = createErrorBoundary(() => html`<risky-component></risky-component>`, {
  fallback: (error) => html`<p>Error: ${error.message}</p>`,
});
define('app', () => html`<div>${SafeComponent()}</div>`);
```

### Lazy Loading

```ts
import { define, html, lazy } from '@vielzeug/craftit';
// Lazy load a component
const LazyChart = lazy(() => import('./chart-component'), {
  fallback: () => html`<div>Loading chart...</div>`,
});
define('dashboard', () => {
  return html`
    <div>
      <h1>Dashboard</h1>
      ${LazyChart()}
    </div>
  `;
});
```

## 🧪 Testing

Craftit includes a comprehensive testing utilities package.

```ts
import { mount, fireEvent, userEvent } from '@vielzeug/craftit/trial';
import { describe, it, expect } from 'vitest';
describe('counter-app', () => {
  it('increments count on button click', async () => {
    // Mount the component
    const { query, waitForUpdates } = await mount('counter-app');
    // Query elements
    const button = query('button');
    const p = query('p');
    // Initial state
    expect(p?.textContent).toBe('Count: 0');
    // Fire events
    fireEvent.click(button!);
    // Wait for updates
    await waitForUpdates();
    // Assert updated state
    expect(p?.textContent).toBe('Count: 1');
  });
  it('handles user input', async () => {
    const { query, waitForUpdates } = await mount('hello-world');
    const input = query<HTMLInputElement>('input');
    // User interactions
    await userEvent.type(input!, 'Alice');
    await waitForUpdates();
    const h1 = query('h1');
    expect(h1?.textContent).toBe('Hello, Alice!');
  });
});
```

### Testing API

```ts
// Mount component
const fixture = await mount('my-component');
// Query elements in shadow root
const button = fixture.query('button');
const buttons = fixture.queryAll('button');
// Access component element and shadow root
fixture.element; // HTMLElement
fixture.shadow; // ShadowRoot
fixture.container; // Parent container
// Wait for reactive updates
await fixture.waitForUpdates();
// Cleanup
fixture.unmount();
// Fire events
fireEvent.click(element);
fireEvent.input(element);
fireEvent.change(element);
fireEvent.keyDown(element, { key: 'Enter' });
fireEvent.custom(element, 'my-event', { detail: { value: 123 } });
// User interactions (more realistic)
await userEvent.click(element);
await userEvent.type(input, 'text');
await userEvent.clear(input);
await userEvent.selectOptions(select, 'value');
await userEvent.upload(fileInput, file);
```

## 📚 API Reference

### Core

- `define(name, setup)` - Define a custom element
- `signal(value)` - Create a reactive signal
- `computed(fn)` - Create a computed signal
- `effect(fn)` - Run side effects
- `watch(source, callback)` - Watch signals for changes
- `batch(fn)` - Batch multiple updates
- `untrack(fn)` - Read signals without tracking
- `readonly(signal)` - Create read-only signal

### Templates

- `html` - Tagged template for HTML
- `html.when(condition, then, else)` - Conditional rendering
- `html.show(condition, template)` - Toggle visibility
- `html.each(items, key, template, empty)` - List rendering
- `html.choose(value, cases, default)` - Switch/case rendering
- `html.until(...values)` - Suspense-like behavior
- `html.portal(template, target)` - Render to different location
- `html.style(styles)` - Dynamic inline styles
- `html.classes(classes)` - Dynamic class names
- `html.log(...args)` - Debug helper

### Styling

- `css` - Tagged template for CSS
- `css.theme(light, dark, options)` - Theme variables

### Lifecycle

- `onMount(fn)` - Run after mount
- `onUnmount(fn)` - Run before unmount
- `onUpdated(fn)` - Run after each update
- `onCleanup(fn)` - Register cleanup function

### Props & Context

- `prop(name, default, options)` - Define a prop
- `provide(key, value)` - Provide value to descendants
- `inject(key, fallback)` - Inject value from ancestors
- `ref()` - Create element reference

### Advanced

- `errorBoundary(component, options)` - Error handling
- `createErrorBoundary(component, options)` - Reusable error boundary
- `lazy(factory, options)` - Lazy load components
- `setGlobalErrorHandler(handler)` - Global error handler

### Testing (from '@vielzeug/craftit/trial')

- `mount(tagName, options)` - Mount component for testing
- `fireEvent` - Fire DOM events
- `userEvent` - Simulate user interactions
- `setContext(context)` - Set test context

## 🎨 Examples

### Todo List

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('todo-list', () => {
  const todos = signal<Array<{ id: number; text: string; done: boolean }>>([]);
  const input = signal('');
  let nextId = 0;
  const addTodo = () => {
    if (input.value.trim()) {
      todos.value = [
        ...todos.value,
        {
          id: nextId++,
          text: input.value,
          done: false,
        },
      ];
      input.value = '';
    }
  };
  const toggleTodo = (id: number) => {
    todos.update((list) => list.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)));
  };
  const removeTodo = (id: number) => {
    todos.update((list) => list.filter((todo) => todo.id !== id));
  };
  return html`
    <div class="todo-app">
      <input
        :value=${input}
        @input=${(e) => (input.value = e.target.value)}
        @keydown.enter=${addTodo}
        placeholder="What needs to be done?" />
      <button @click=${addTodo}>Add</button>
      <ul>
        ${html.each(
          todos,
          (todo) => todo.id,
          (todo) => html`
            <li class=${html.classes({ done: todo.done })}>
              <input type="checkbox" ?checked=${todo.done} @change=${() => toggleTodo(todo.id)} />
              <span>${todo.text}</span>
              <button @click=${() => removeTodo(todo.id)}>×</button>
            </li>
          `,
        )}
      </ul>
    </div>
  `;
});
```

### Form with Validation

```ts
import { define, signal, computed, html } from '@vielzeug/craftit';
define('signup-form', () => {
  const email = signal('');
  const password = signal('');
  const confirmPassword = signal('');
  const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value));
  const passwordValid = computed(() => password.value.length >= 8);
  const passwordsMatch = computed(() => password.value === confirmPassword.value);
  const formValid = computed(() => emailValid.value && passwordValid.value && passwordsMatch.value);
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (formValid.value) {
      console.log('Form submitted!', { email: email.value });
    }
  };
  return html`
    <form @submit=${handleSubmit}>
      <div>
        <label>Email</label>
        <input type="email" :value=${email} @input=${(e) => (email.value = e.target.value)} />
        ${html.when(!emailValid && email.value, () => html` <span class="error">Invalid email</span> `)}
      </div>
      <div>
        <label>Password</label>
        <input type="password" :value=${password} @input=${(e) => (password.value = e.target.value)} />
        ${html.when(
          !passwordValid && password.value,
          () => html` <span class="error">Password must be at least 8 characters</span> `,
        )}
      </div>
      <div>
        <label>Confirm Password</label>
        <input type="password" :value=${confirmPassword} @input=${(e) => (confirmPassword.value = e.target.value)} />
        ${html.when(
          !passwordsMatch && confirmPassword.value,
          () => html` <span class="error">Passwords don't match</span> `,
        )}
      </div>
      <button ?disabled=${!formValid}>Sign Up</button>
    </form>
  `;
});
```

## 🔧 TypeScript

Craftit is built with TypeScript and provides excellent type inference:

```ts
import type { Signal, ComputedSignal, Ref, InjectionKey } from '@vielzeug/craftit';
// Typed signals
const count: Signal<number> = signal(0);
const name: Signal<string> = signal('Alice');
// Typed computed
const doubled: ComputedSignal<number> = computed(() => count.value * 2);
// Typed refs
const inputRef: Ref<HTMLInputElement> = ref<HTMLInputElement>();
// Typed injection keys
interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
}
const ThemeKey: InjectionKey<Theme> = Symbol('theme');
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📖 Documentation

## For more detailed documentation and examples, visit the [full documentation](https://vielzeug.dev/craftit).

Made with ❤️ by the Vielzeug team
