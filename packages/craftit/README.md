# @vielzeug/craftit
> Modern, lightweight web components with signals-based reactivity
**Craftit** is a tiny, powerful library for building web components with fine-grained reactivity. It combines the simplicity of vanilla web components with the developer experience of modern frameworks.
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
- **⚡ Zero Dependencies** – Tiny bundle size (~9 KB gzipped)
- **🔥 Modern DX** – Tagged templates, event handlers, automatic reactivity
- **📦 Web Standards** – Built on native Custom Elements and Shadow DOM
- **🎨 Scoped Styles** – CSS with CSP support and theming helpers
- **🔍 TypeScript First** – Full type safety with excellent inference
- **🧪 Testing Ready** – Comprehensive testing utilities included
- **🪝 Lifecycle Hooks** – Familiar `onMount`, `onUnmount`, `onUpdated`
- **🎭 Advanced Features** – Error boundaries, lazy loading, context/dependency injection
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
      <input 
        type="text" 
        :value=${name}
        @input=${(e) => name.value = e.target.value}
      />
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
    }
    button:hover {
      background: #0051cc;
    }
  `;
  return {
    template: html`
      <button @click=${() => count.value++}>
        Clicked ${count} times
      </button>
    `,
    styles: [styles.content]
  };
});
```
### Props and Attributes
```ts
import { define, prop, html } from '@vielzeug/craftit';
define('user-card', () => {
  const name = prop('name', '');
  const age = prop('age', 0, {
    parse: Number,
    reflect: true
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
import { signal, computed, effect } from '@vielzeug/craftit';
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
```
### Template System
```ts
import { html, signal } from '@vielzeug/craftit';
const name = signal('Alice');
const isActive = signal(true);
html`
  <!-- Text interpolation -->
  <p>Hello, ${name}!</p>
  <!-- Properties -->
  <input .value=${name} />
  <!-- Attributes -->
  <div class=${isActive.value ? 'active' : ''}>...</div>
  <!-- Event handlers -->
  <button @click=${() => console.log('Clicked!')}>Click</button>
  <!-- Boolean attributes -->
  <button ?disabled=${isActive}>Submit</button>
`;
```
### Conditional Rendering
```ts
import { html } from '@vielzeug/craftit';
const isLoggedIn = signal(false);
// Simple conditional
html`
  ${html.when(isLoggedIn, () => html`
    <p>Welcome back!</p>
  `)}
`;
// With else branch
html`
  ${html.when(isLoggedIn, {
    then: () => html`<p>Welcome back!</p>`,
    else: () => html`<p>Please log in</p>`
  })}
`;
```
### List Rendering
```ts
import { html, signal } from '@vielzeug/craftit';
const todos = signal([
  { id: 1, text: 'Learn Craftit', done: false },
  { id: 2, text: 'Build components', done: false }
]);
html`
  <ul>
    ${html.each(
      todos,
      todo => todo.id,
      (todo, index) => html`
        <li>${index + 1}. ${todo.text}</li>
      `
    )}
  </ul>
`;
// With fallback for empty lists
html`
  ${html.each(
    todos,
    todo => todo.id,
    (todo) => html`<li>${todo.text}</li>`,
    () => html`<p>No todos yet!</p>`
  )}
`;
```
### Lifecycle Hooks
```ts
import { define, onMount, onUnmount, onUpdated, html } from '@vielzeug/craftit';
define('lifecycle-demo', () => {
  onMount(() => {
    console.log('Component mounted!');
    // Return cleanup function
    return () => {
      console.log('Cleanup before unmount');
    };
  });
  onUnmount(() => {
    console.log('Component unmounted!');
  });
  onUpdated(() => {
    console.log('Component updated!');
  });
  return html`<div>Hello!</div>`;
});
```
### Context (Dependency Injection)
```ts
import { define, provide, inject, signal, html } from '@vielzeug/craftit';
// Create an injection key
const ThemeKey = Symbol('theme');
// Parent provides value
define('app-root', () => {
  const theme = signal('dark');
  provide(ThemeKey, theme);
  return html`
    <theme-toggle></theme-toggle>
    <themed-button></themed-button>
  `;
});
// Child injects value
define('themed-button', () => {
  const theme = inject(ThemeKey, signal('light')); // with default
  return html`
    <button class="theme-${theme.value}">
      Click me
    </button>
  `;
});
```
## 🎨 Styling
### Basic CSS
```ts
import { define, html, css } from '@vielzeug/craftit';
define('my-component', () => {
  const styles = css`
    :host {
      display: block;
      padding: 16px;
    }
    .title {
      color: #333;
      font-size: 24px;
    }
  `;
  return {
    template: html`<h1 class="title">Hello</h1>`,
    styles: [styles.content]
  };
});
```
### Theming with CSS Variables
```ts
import { css } from '@vielzeug/craftit';
const theme = css.theme(
  // Light theme
  {
    bgColor: '#ffffff',
    textColor: '#000000',
    primary: '#0070f3'
  },
  // Dark theme
  {
    bgColor: '#000000',
    textColor: '#ffffff',
    primary: '#0090ff'
  }
);
const styles = css`
  :host {
    background: ${theme.bgColor};
    color: ${theme.textColor};
  }
  button {
    background: ${theme.primary};
  }
  ${theme} /* Injects theme CSS */
`;
```
### Dynamic Styles
```ts
import { html } from '@vielzeug/craftit';
const isActive = signal(true);
const size = signal(16);
html`
  <div 
    class=${html.classes({
      active: isActive.value,
      disabled: !isActive.value
    })}
    style=${html.style({
      fontSize: size.value, // Auto-adds 'px'
      color: 'red',
      fontWeight: 'bold'
    })}
  >
    Styled element
  </div>
`;
```
## 🧪 Testing
```ts
import { mount, fireEvent, waitFor } from '@vielzeug/craftit/test';
import { describe, it, expect } from 'vitest';
describe('counter-app', () => {
  it('increments count on button click', async () => {
    const { element, query } = await mount('counter-app');
    const button = query('button');
    const display = query('p');
    expect(display.textContent).toBe('Count: 0');
    fireEvent.click(button);
    await waitFor(() => {
      expect(display.textContent).toBe('Count: 1');
    });
  });
});
```
## 🚀 Advanced Features
### Error Boundaries
```ts
import { define, errorBoundary, html } from '@vielzeug/craftit';
define('safe-component', () => {
  return errorBoundary(
    () => html`<div>${riskyOperation()}</div>`,
    {
      fallback: (error) => html`
        <div class="error">
          <h2>Something went wrong</h2>
          <p>${error.message}</p>
        </div>
      `,
      onError: (error) => console.error('Caught:', error)
    }
  );
});
```
### Lazy Loading
```ts
import { define, lazy, html } from '@vielzeug/craftit';
define('app-root', () => {
  const HeavyComponent = lazy(
    () => import('./HeavyComponent'),
    { fallback: () => html`<div>Loading...</div>` }
  );
  return html`
    <div>
      <h1>My App</h1>
      ${HeavyComponent()}
    </div>
  `;
});
```
### Element References
```ts
import { define, ref, onMount, html } from '@vielzeug/craftit';
define('auto-focus', () => {
  const inputRef = ref<HTMLInputElement>();
  onMount(() => {
    inputRef.value?.focus();
  });
  return html`<input ref=${inputRef} type="text" />`;
});
```
### Batched Updates
```ts
import { signal, batch } from '@vielzeug/craftit';
const count = signal(0);
const name = signal('Alice');
// Multiple updates trigger one re-render
batch(() => {
  count.value = 10;
  name.value = 'Bob';
  count.value = 20;
});
```
## 📚 API Reference
### Core
- `define(tagName, setup)` - Define a custom element
- `signal(value)` - Create a reactive signal
- `computed(fn)` - Create a derived signal
- `effect(fn)` - Run side effects
- `watch(source, callback)` - Watch for changes
- `batch(fn)` - Batch multiple updates
- `readonly(signal)` - Create readonly signal
- `untrack(fn)` - Run without tracking dependencies
### Template
- `html` - Tagged template for HTML
- `html.when(condition, template)` - Conditional rendering
- `html.each(items, keyFn, template)` - List rendering
- `html.classes(classes)` - Generate class string
- `html.style(styles)` - Generate style string
### Lifecycle
- `onMount(callback)` - Called when component mounts
- `onUnmount(callback)` - Called when component unmounts
- `onUpdated(callback)` - Called after each update
### Composables
- `prop(name, defaultValue, options)` - Create reactive prop
- `ref()` - Create element reference
- `provide(key, value)` - Provide value to descendants
- `inject(key, defaultValue)` - Inject provided value
- `onCleanup(fn)` - Register cleanup function
### Styling
- `css` - Tagged template for CSS
- `css.theme(light, dark)` - Create theme with CSS variables
- `createStyleElement(css)` - Create style element
### Advanced
- `lazy(factory, options)` - Lazy load component
- `errorBoundary(component, options)` - Error boundary
- `createErrorBoundary(component, options)` - Error boundary with retry
- `setGlobalErrorHandler(handler)` - Global error handler
### Testing
- `mount(tagName, options)` - Mount component for testing
- `fireEvent` - Fire DOM events
- `userEvent` - Simulate user interactions
- `waitFor(callback)` - Wait for condition
- `waitForElement(selector)` - Wait for element
- `waitForSignal(signal, value)` - Wait for signal value
- `cleanup()` - Clean up after tests
## 📖 Examples
### Todo List
```ts
import { define, signal, html } from '@vielzeug/craftit';
interface Todo {
  id: number;
  text: string;
  done: boolean;
}
define('todo-list', () => {
  const todos = signal<Todo[]>([]);
  const input = signal('');
  const addTodo = () => {
    if (!input.value.trim()) return;
    todos.value = [
      ...todos.value,
      { id: Date.now(), text: input.value, done: false }
    ];
    input.value = '';
  };
  const toggleTodo = (id: number) => {
    todos.value = todos.value.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
  };
  return html`
    <div class="todo-list">
      <input 
        type="text" 
        .value=${input}
        @input=${(e) => input.value = e.target.value}
        @keydown=${(e) => e.key === 'Enter' && addTodo()}
        placeholder="Add todo..."
      />
      <button @click=${addTodo}>Add</button>
      <ul>
        ${html.each(
          todos,
          todo => todo.id,
          (todo) => html`
            <li 
              class=${html.classes({ done: todo.done })}
              @click=${() => toggleTodo(todo.id)}
            >
              ${todo.text}
            </li>
          `,
          () => html`<p>No todos yet!</p>`
        )}
      </ul>
    </div>
  `;
});
```
### Form Component
```ts
import { define, signal, prop, html } from '@vielzeug/craftit';
define('user-form', () => {
  const name = signal('');
  const email = signal('');
  const onSubmit = prop('onSubmit', () => {});
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    onSubmit.value({ name: name.value, email: email.value });
  };
  return html`
    <form @submit=${handleSubmit}>
      <label>
        Name:
        <input 
          type="text" 
          .value=${name}
          @input=${(e) => name.value = e.target.value}
        />
      </label>
      <label>
        Email:
        <input 
          type="email" 
          .value=${email}
          @input=${(e) => email.value = e.target.value}
        />
      </label>
      <button type="submit">Submit</button>
    </form>
  `;
});
```
## 📄 License
MIT © [Vielzeug](https://github.com/vielzeug)
---
**Built with ❤️ by the Vielzeug team**
