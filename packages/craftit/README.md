# @vielzeug/craftit

Lightweight, type-safe web component creation library

## What is Craftit?

**Craftit** is a modern, minimal library for creating web components with reactive state, automatic rendering, and excellent TypeScript support. Build custom elements with the ergonomics of modern frameworks but with native browser APIs.

### The Problem

Creating web components with vanilla Custom Elements API is verbose and error-prone:

```ts
// Vanilla Custom Elements - verbose and manual
class MyCounter extends HTMLElement {
  #count = 0;
  #shadow: ShadowRoot;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.render();
  }

  connectedCallback() {
    this.#shadow.querySelector('button')?.addEventListener('click', () => {
      this.#count++;
      this.render(); // Manual re-render
    });
  }

  render() {
    this.#shadow.innerHTML = `
      <div>Count: ${this.#count}</div>
      <button>Increment</button>
    `; // Loses event listeners!
  }
}

customElements.define('my-counter', MyCounter);
```

### The Solution

```ts
// Craftit - reactive and automatic
import { defineElement, html } from '@vielzeug/craftit';

defineElement('my-counter', {
  state: { count: 0 },

  template: (el) => html`
    <div>Count: ${el.state.count}</div>
    <button>Increment</button>
  `,

  onConnected(el) {
    el.on('button', 'click', () => {
      el.state.count++; // Automatic re-render!
    });
  },
});
```

## ✨ Features

- **🔥 Reactive State** - Automatic re-renders on state changes with Proxy-based reactivity
- **⚡ Efficient Updates** - Smart DOM reconciliation, only updates what changed
- **🎯 Event Delegation** - Built-in support for dynamic element event handling
- **📝 Form Support** - Full ElementInternals integration for form participation
- **🎨 Shadow DOM** - Encapsulated styles with CSSStyleSheet support
- **🎭 CSS Variables** - Built-in theming support with `css.var()` and `css.theme()`
- **🔍 Type-Safe** - Complete TypeScript support with full type inference
- **📦 Tiny Bundle** - Only **~5 KB gzipped** with zero dependencies
- **🧪 Testable** - Built-in testing utilities (`attach`, `destroy`, `flush`)
- **🪝 Lifecycle Hooks** - Full control with `onConnected`, `onDisconnected`, `onUpdated`
- **🌐 Framework Agnostic** - Use with React, Vue, Svelte, or vanilla JS

## 📦 Installation

::: code-group

```sh [npm]
npm install @vielzeug/craftit
```

```sh [yarn]
yarn add @vielzeug/craftit
```

```sh [pnpm]
pnpm add @vielzeug/craftit
```

:::

## 🚀 Quick Start

### Basic Component

```ts
import { defineElement, html, css } from '@vielzeug/craftit';

defineElement('hello-world', {
  template: html`
    <div class="greeting">
      <h1>Hello, World!</h1>
      <p>Welcome to Craftit!</p>
    </div>
  `,

  styles: [
    css`
      .greeting {
        padding: 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
      }
    `,
  ],
});

// Use in HTML
// <hello-world></hello-world>
```

### With State

```ts
defineElement('user-profile', {
  state: {
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
  },

  template: (el) => html`
    <div class="profile">
      <h2>${el.state.name}</h2>
      <p>Age: ${el.state.age}</p>
      <p>Email: ${el.state.email}</p>
    </div>
  `,
});
```

### Interactive Component

```ts
defineElement('click-counter', {
  state: { count: 0 },

  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button class="increment">Increment</button>
      <button class="decrement">Decrement</button>
      <button class="reset">Reset</button>
    </div>
  `,

  onConnected(el) {
    el.on('.increment', 'click', () => {
      el.state.count++;
    });

    el.on('.decrement', 'click', () => {
      el.state.count--;
    });

    el.on('.reset', 'click', () => {
      el.state.count = 0;
    });
  },
});
```

### Form Integration

```ts
defineElement('custom-input', {
  state: { value: '' },

  template: (el) => html`<input type="text" value="${el.state.value}" />`,

  formAssociated: true,

  onConnected(el) {
    el.on('input', 'input', (e) => {
      const input = e.currentTarget as HTMLInputElement;
      el.state.value = input.value;
      el.form?.value(input.value);
    });
  },
});

// Use in forms
// <form>
//   <custom-input name="username"></custom-input>
//   <button type="submit">Submit</button>
// </form>
```

## 📚 Core Concepts

### Reactive State

State changes automatically trigger re-renders:

```ts
defineElement('todo-list', {
  state: {
    todos: ['Learn Craftit', 'Build component'],
    filter: 'all',
  },

  template: (el) => html`
    <ul>
      ${el.state.todos.map((todo) => `<li>${todo}</li>`).join('')}
    </ul>
  `,

  onConnected(el) {
    // Any state change triggers re-render
    el.state.todos.push('New todo'); // ✅ Automatic re-render

    // Nested objects also reactive
    el.state.filter = 'completed'; // ✅ Automatic re-render
  },
});
```

### Event Delegation

Handle events on dynamic elements:

```ts
defineElement('todo-list', {
  state: { todos: ['Item 1', 'Item 2'] },

  template: (el) => html`
    <ul>
      ${el.state.todos
        .map(
          (todo, i) => `
        <li>
          ${todo}
          <button class="delete" data-index="${i}">Delete</button>
        </li>
      `,
        )
        .join('')}
    </ul>
  `,

  onConnected(el) {
    // Works for dynamically added elements!
    el.on('.delete', 'click', (e) => {
      const index = +(e.currentTarget as HTMLElement).dataset.index!;
      el.state.todos.splice(index, 1);
    });
  },
});
```

### CSS Variables & Theming

Built-in CSS variable helpers with **automatic autocomplete**:

```ts
import { defineElement, html, css } from '@vielzeug/craftit';

// Create a typed theme
const theme = css.theme({
  primaryColor: '#3b82f6',
  bgColor: '#ffffff',
  textColor: '#1f2937',
  spacing: '1rem',
});

defineElement('themed-button', {
  template: html`<button>Click Me</button>`,

  styles: [
    css`
      /* Inject CSS variables */
      ${theme}

      button {
        /* ✨ Autocomplete works! Type theme. to see all properties */
        background: ${theme.primaryColor};  /* var(--primary-color) */
        color: ${theme.textColor};          /* var(--text-color) */
        padding: ${theme.spacing};          /* var(--spacing) */
        border: none;
        border-radius: 8px;
      }
    `,
  ],
});
```

**Benefits:**
- ✅ **Autocomplete** - Type `theme.` and see all variables
- ✅ **Type-safe** - Typos caught at compile time
- ✅ **Refactoring** - Rename properties safely
- ✅ **Single import** - Just `import { css }`

### Lifecycle Hooks

```ts
defineElement('lifecycle-demo', {
  template: html`<div>Component</div>`,

  onConnected(el) {
    console.log('Component added to DOM');
    // Perfect for event listeners, subscriptions
  },

  onDisconnected(el) {
    console.log('Component removed from DOM');
    // Cleanup is automatic!
  },

  onUpdated(el) {
    console.log('Component re-rendered');
  },
});
```

## 🎯 API Reference

### `defineElement(name, options)`

Define and register a custom element.

```ts
defineElement('my-component', {
  state: {}, // Initial state
  template: html`...`, // Template (string, Node, or function)
  styles: [css`...`], // CSS styles (auto-minified)
  observedAttributes: [], // Attributes to watch
  formAssociated: false, // Enable form participation
  onConnected: (el) => {}, // Lifecycle: added to DOM
  onDisconnected: (el) => {}, // Lifecycle: removed from DOM
  onUpdated: (el) => {}, // Lifecycle: after render
  onAttributeChanged: (name, oldVal, newVal, el) => {},
});
```

### Component Instance API

```ts
// State
el.state.count = 10; // Direct mutation
await el.set({ count: 10 }); // Batch update
await el.set((state) => ({ ...state, count: 10 })); // Updater

// DOM Queries
el.find('.button'); // querySelector
el.findAll('.item'); // querySelectorAll

// Events
el.on('.button', 'click', handler); // Event delegation
el.emit('custom-event', { data }); // Dispatch event

// Utilities
el.delay(() => {}, 1000); // setTimeout with cleanup
el.clear(timeoutId); // clearTimeout
await el.flush(); // Wait for render

// Watchers
const unwatch = el.watch(
  (state) => state.count,
  (val, prev) => console.log(val, prev),
);
unwatch(); // Cleanup
```

## 🔥 Advanced Features

### Async State Updates

```ts
el.on('.load', 'click', async () => {
  await el.set(async (state) => {
    const data = await fetch('/api/data').then((r) => r.json());
    return { ...state, data };
  });
});
```

### State Watchers

```ts
const unwatch = el.watch(
  (state) => state.count,
  (count, prevCount) => {
    console.log(`Count changed from ${prevCount} to ${count}`);
  },
);
```

### Testing Utilities

```ts
import { attach, destroy } from '@vielzeug/craftit';

const el = document.createElement('my-component');
await attach(el); // Mounts and waits for render

// Test assertions
expect(el.find('.count')?.textContent).toBe('0');

destroy(el); // Clean removal
```

## 📖 Documentation

- [**Full Documentation**](https://vielzeug.dev/craftit)
- [**Usage Guide**](https://vielzeug.dev/craftit/usage)
- [**API Reference**](https://vielzeug.dev/craftit/api)
- [**Examples**](https://vielzeug.dev/craftit/examples)

## 🆚 Comparison

| Feature          | Craftit    | Lit      | Stencil   |
| ---------------- | --------- | -------- | --------- |
| Bundle Size      | **~6 KB** | ~15 KB   | ~10 KB    |
| Dependencies     | 0         | 0        | Many      |
| TypeScript       | Native    | Good     | Excellent |
| Reactive State   | Built-in  | External | Built-in  |
| Event Delegation | ✅        | ❌       | ❌        |
| Form Integration | ✅        | ⚠️       | ✅        |
| Learning Curve   | Low       | Medium   | High      |

## 🤝 Contributing

Contributions are welcome! Please see the [Contributing Guide](../../CONTRIBUTING.md).

## 📄 License

MIT © [vielzeug](https://github.com/saatkhel/vielzeug)

## 🔗 Links

- [Documentation](https://vielzeug.dev)
- [GitHub](https://github.com/saatkhel/vielzeug)
- [NPM](https://www.npmjs.com/package/@vielzeug/craftit)
