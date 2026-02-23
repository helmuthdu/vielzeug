# @vielzeug/craftit

Lightweight, type-safe web component creation library

## What is Craftit?

**Craftit** is a modern, minimal library for creating web components with a reactive state, automatic rendering, and excellent TypeScript support. Build custom elements with the ergonomics of modern frameworks but with native browser APIs.

### The Problem

Creating web components with vanilla Custom Elements API is verbose and error-prone:

```ts
// Vanilla Custom Elements – verbose and manual
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
// Craftit – reactive and automatic
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

- **🔥 Reactive State** – Automatic re-renders on state changes with Proxy-based reactivity
- **⚡ Efficient Updates** – Smart DOM reconciliation, only updates what changed
- **🎯 Event Delegation** – Built-in support for dynamic element event handling
- **📝 Form Support** – Full ElementInternals integration for form participation
- **🎨 Shadow DOM** – Encapsulated styles with CSSStyleSheet support
- **🎭 CSS Variables** – Built-in theming support with `css.theme()`
- **🔍 Type-Safe** – Complete TypeScript support with full type inference
- **📦 Tiny Bundle** – Only **~5 KB gzipped** with zero dependencies
- **🧪 Testable** – Comprehensive testing utilities via `@vielzeug/craftit/testing`
- **🪝 Lifecycle Hooks** – Full control with `onConnected`, `onDisconnected`, `onUpdated`
- **🌐 Framework Agnostic** – Use with React, Vue, Svelte, or vanilla JS

## 🆚 Comparison with Alternatives

| Feature          | Craftit   | Lit      | Stencil   |
| ---------------- | --------- | -------- | --------- |
| Bundle Size      | **~6 KB** | ~15 KB   | ~10 KB    |
| Dependencies     | 0         | 0        | Many      |
| TypeScript       | Native    | Good     | Excellent |
| Reactive State   | Built-in  | External | Built-in  |
| Event Delegation | ✅        | ❌       | ❌        |
| Form Integration | ✅        | ⚠️       | ✅        |
| Learning Curve   | Low       | Medium   | High      |

## 📦 Installation

```bash
# pnpm
pnpm add @vielzeug/craftit
# npm
npm install @vielzeug/craftit
# yarn
yarn add @vielzeug/craftit
```

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
    // Type-safe event delegation
    el.on('.increment', 'click', (e, target) => {
      el.state.count++;
    });

    el.on('.decrement', 'click', (e, target) => {
      el.state.count--;
    });

    el.on('.reset', 'click', (e, target) => {
      el.state.count = 0;
    });
  },
});
```

### With Batch Updates

```ts
defineElement('user-profile', {
  state: {
    name: '',
    email: '',
    age: 0,
  },

  template: (el) => html`
    <form>
      <input class="name" placeholder="Name" />
      <input class="email" placeholder="Email" />
      <input class="age" type="number" placeholder="Age" />
      <button type="submit">Save</button>
    </form>
  `,

  onConnected(el) {
    el.on('form', 'submit', (e) => {
      e.preventDefault();

      // Batch multiple state updates into single render
      el.batch((state) => {
        state.name = el.query<HTMLInputElement>('.name')!.value;
        state.email = el.query<HTMLInputElement>('.email')!.value;
        state.age = +el.query<HTMLInputElement>('.age')!.value;
      });
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
    // Direct element binding with el.on()
    const input = el.queryRequired<HTMLInputElement>('input');
    
    el.on(input, 'input', (e) => {
      const target = e.target as HTMLInputElement;
      el.state.value = target.value;
      el.form?.value(target.value);
    });
  },
});

// Use in forms
// <form>
//   <custom-input name="username"></custom-input>
//   <button type="submit">Submit</button>
// </form>
```

## 🎓 Core Concepts

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

**💡 State vs Signals:**
- **State** (default) - Full component re-render on change. Use for most cases.
- **Signals** (optional) - Surgical DOM updates only. Use for high-frequency updates (60+ FPS).

See [STATE-VS-SIGNALS.md](./STATE-VS-SIGNALS.md) for detailed comparison and when to use each.

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

### Template Helpers

Craftit provides powerful template helpers with minimal boilerplate:

#### `html.repeat()` - List Rendering

Simple list rendering - no wrapping function needed:

```ts
defineElement('user-list', {
  state: {
    users: [
      { id: 1, name: 'Alice', role: 'Admin' },
      { id: 2, name: 'Bob', role: 'User' },
    ],
  },

  template: (el) => html`
    <ul>
      ${html.repeat(el.state.users, (user, index) => html`
        <li>${index + 1}. ${user.name} (${user.role})</li>
      `)}
    </ul>
  `,
});
```

With key function for efficient updates:

```ts
${html.repeat(
  el.state.users,
  (user) => user.id, // Key function
  (user) => html`<li>${user.name}</li>`
)}
```

#### `html.when()` - Conditional Rendering

**No wrapping functions needed!** Just pass values directly:

```ts
template: (el) => html`
  <div>
    ${html.when(
      el.state.isAdmin,
      html`<button class="delete">Delete</button>`,
      html`<span class="label">View Only</span>`
    )}
  </div>
`
```

Still supports functions for lazy evaluation when needed:

```ts
${html.when(
  expensive.check(),
  () => html`<button>Delete</button>` // Only called if true
)}
```

#### `html.classes()` - Conditional Classes

Multiple syntaxes for maximum flexibility:

```ts
template: (el) => html`
  <!-- Object syntax (conditional) -->
  <div class="${html.classes({
    'btn': true,
    'btn-primary': el.state.isPrimary,
    'btn-disabled': el.state.isDisabled,
  })}">Button</div>

  <!-- Array syntax (mix static + conditional) -->
  <div class="${html.classes([
    'btn',
    'btn-primary',
    el.state.isActive && 'active',
    { loading: el.state.isLoading, disabled: el.state.isDisabled }
  ])}">Button</div>

  <!-- Static classes (no helper needed) -->
  <div class="btn btn-primary active">Button</div>
`
```

#### `html.styles()` - Dynamic Styles

Object syntax with camelCase support:

```ts
template: (el) => html`
  <div style="${html.styles({
    backgroundColor: el.state.bgColor,
    fontSize: `${el.state.size}px`,
    display: el.state.visible ? 'block' : undefined, // Auto-filtered
  })}">
    Styled content
  </div>

  <!-- Static styles (no helper needed) -->
  <div style="color: red; font-size: 16px">Content</div>
`
```

#### `html.until()` - Async Content

Load async content with automatic loading states:

```ts
defineElement('user-profile', {
  state: {
    userId: '123'
  },

  template: (el) => html`
    <div class="profile">
      ${html.until(
        // Promise that resolves to content
        fetch(`/api/users/${el.state.userId}`)
          .then(res => res.json())
          .then(user => html`
            <div class="user-card">
              <h3>${user.name}</h3>
              <p>${user.email}</p>
            </div>
          `),
        // Loading fallback (shown immediately)
        html`<div class="loading">⏳ Loading user...</div>`
      )}
    </div>
  `,
});
```

**How it works:**
1. Returns fallback content immediately
2. Wraps it in a placeholder with unique ID
3. When promise resolves, replaces placeholder with actual content
4. Handles errors gracefully

**Multiple async sections:**

```ts
template: (el) => html`
  <div>
    <section>
      ${html.until(fetchPosts(), html`<div>Loading posts...</div>`)}
    </section>
    <section>
      ${html.until(fetchComments(), html`<div>Loading comments...</div>`)}
    </section>
  </div>
`
```

#### Complete Example

```ts
defineElement('todo-item', {
  state: {
    items: [
      { id: 1, text: 'Learn Craftit', done: false },
      { id: 2, text: 'Build app', done: true },
    ],
    theme: 'dark',
  },

  template: (el) => html`
    <ul class="${html.classes(['todo-list', `theme-${el.state.theme}`])}">
      ${html.repeat(
        el.state.items,
        (item) => item.id,
        (item) => html`
          <li class="${html.classes({
            'todo-item': true,
            'done': item.done,
          })}">
            ${item.text}
            ${html.when(item.done, html`<span>✓</span>`)}
          </li>
        `
      )}
    </ul>
  `,
});
```

### Computed Properties

Derive values from state with automatic caching:

```ts
defineElement('shopping-cart', {
  state: {
    items: [
      { price: 10, quantity: 2 },
      { price: 20, quantity: 1 }
    ]
  },

  computed: {
    subtotal: (state) => state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    tax: (state) => {
      const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return subtotal * 0.1;
    },
    total: (state) => {
      const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return subtotal * 1.1;
    }
  },

  template: (el) => html`
    <div>
      <p>Subtotal: $${el.computed.subtotal.toFixed(2)}</p>
      <p>Tax: $${el.computed.tax.toFixed(2)}</p>
      <p>Total: $${el.computed.total.toFixed(2)}</p>
    </div>
  `
});
```

**Benefits:**
- ✅ **Auto-cached** - Only recompute when state changes
- ✅ **Clean templates** - No complex logic in templates
- ✅ **DRY** - Reuse computed values across template
- ✅ **Type-safe** - Full TypeScript support

### Actions

Define reusable methods bound to your component:

```ts
defineElement('counter', {
  state: { count: 0 },

  actions: {
    increment(el) {
      el.state.count++;
    },
    decrement(el) {
      el.state.count--;
    },
    add(el, amount: number) {
      el.state.count += amount;
    },
    reset(el) {
      el.state.count = 0;
    }
  },

  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button class="inc">+</button>
      <button class="dec">-</button>
      <button class="reset">Reset</button>
    </div>
  `,

  onConnected(el) {
    el.on('.inc', 'click', () => el.actions.increment());
    el.on('.dec', 'click', () => el.actions.decrement());
    el.on('.reset', 'click', () => el.actions.reset());
  }
});
```

**Benefits:**
- ✅ **Organized** - All logic in one place
- ✅ **Reusable** - Call actions from anywhere
- ✅ **Testable** - Easy to test action logic
- ✅ **Clean** - No inline arrow functions

### Refs (Element References)

Direct access to elements without querySelector:

```ts
defineElement('search-form', {
  state: { query: '' },

  actions: {
    search(el) {
      const input = el.refs.searchInput as HTMLInputElement;
      el.state.query = input.value;
      // Perform search...
    },
    clear(el) {
      const input = el.refs.searchInput as HTMLInputElement;
      input.value = '';
      input.focus(); // Direct DOM access!
    }
  },

  template: () => html`
    <input ref="searchInput" type="text" />
    <button class="search">Search</button>
    <button class="clear">Clear</button>
  `,

  onConnected(el) {
    el.on('.search', 'click', () => el.actions.search());
    el.on('.clear', 'click', () => el.actions.clear());
  }
});
```

**How it works:**
1. Add `ref="name"` attribute to any element
2. Access via `el.refs.name`
3. Automatically updated after each render
4. Type-safe with proper casting

**Before (verbose):**
```ts
const input = el.query<HTMLInputElement>('input');
if (input) {
  input.focus();
}
```

**After (clean):**
```ts
(el.refs.searchInput as HTMLInputElement).focus();
```

### Portal (Render Elsewhere)

Render content outside the component (e.g., modals, tooltips):

```ts
defineElement('modal-demo', {
  state: { showModal: false },

  template: (el) => html`
    <button class="open">Open Modal</button>
    
    ${html.when(el.state.showModal, html`
      ${html.portal(html`
        <div class="modal-backdrop">
          <div class="modal-content">
            <h3>Modal Title</h3>
            <p>This is rendered in document.body!</p>
            <button class="close">Close</button>
          </div>
        </div>
      `, document.body)}
    `)}
  `,

  onConnected(el) {
    el.on('.open', 'click', () => el.state.showModal = true);
    // Close button works from portaled content
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('close')) {
        el.state.showModal = false;
      }
    });
  }
});
```

**Common use cases:**
- 🎭 Modals → `html.portal(content, document.body)`
- 💬 Tooltips → `html.portal(content, '#tooltip-root')`
- 📢 Notifications → `html.portal(content, '#notification-root')`
- 🎨 Overlays → `html.portal(content, '#overlay-container')`

**Benefits:**
- ✅ **No z-index issues** - Render at document root
- ✅ **Flexible positioning** - Escape shadow DOM boundaries
- ✅ **Clean markup** - No wrapper divs needed

### Context (Provide/Inject)

Share data across component tree without prop drilling:

**Provider Component:**
```ts
defineElement('theme-provider', {
  provide: {
    theme: {
      mode: 'dark',
      primary: '#3b82f6',
      spacing: '1rem'
    },
    apiUrl: 'https://api.example.com'
  },

  template: () => html`
    <div class="app">
      <slot></slot>
    </div>
  `
});
```

**Consumer Component:**
```ts
defineElement('themed-button', {
  inject: ['theme'],

  template: (el) => html`
    <button style="
      background: ${el.context.theme.primary};
      padding: ${el.context.theme.spacing};
    ">
      Themed Button
    </button>
  `
});
```

**Usage:**
```html
<theme-provider>
  <div>
    <themed-button></themed-button>
    <!-- Button automatically gets theme from provider -->
  </div>
</theme-provider>
```

**Features:**
- ✅ **No prop drilling** - Skip intermediate components
- ✅ **Multi-level** - Works across any depth
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Shadow DOM aware** - Traverses shadow boundaries
- ✅ **Nearest wins** - Uses closest provider in tree

**Advanced Example:**
```ts
// API Provider
defineElement('api-provider', {
  provide: {
    api: {
      baseUrl: 'https://api.example.com',
      async fetch(endpoint: string) {
        return fetch(`${this.baseUrl}${endpoint}`);
      }
    }
  },
  template: () => html`<slot></slot>`
});

// Data Consumer
defineElement('user-list', {
  state: { users: [], loading: true },
  inject: ['api'],

  async onConnected(el) {
    const response = await el.context.api.fetch('/users');
    el.state.users = await response.json();
    el.state.loading = false;
  },

  template: (el) => html`
    ${html.when(el.state.loading,
      html`<div>Loading...</div>`,
      html`
        <ul>
          ${html.repeat(el.state.users, user => html`
            <li>${user.name}</li>
          `)}
        </ul>
      `
    )}
  `
});
```

**Common Patterns:**
- 🎨 Theme systems
- 🌐 API clients
- 👤 User authentication
- 🌍 i18n translations
- ⚙️ App configuration

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
        background: ${theme.primaryColor}; /* var(--primary-color) */
        color: ${theme.textColor}; /* var(--text-color) */
        padding: ${theme.spacing}; /* var(--spacing) */
        border: none;
        border-radius: 8px;
      }
    `,
  ],
});
```

**Benefits:**

- ✅ **Autocomplete** – Type `theme.` and see all variables
- ✅ **Type-safe** – Typos caught at compile time
- ✅ **Refactoring** – Rename properties safely

### Typed Event Handling

**Single unified method with TypeScript overloads:**

```ts
defineElement('my-component', {
  template: html`
    <button class="save">Save</button>
    <input class="email" type="email" />
  `,

  onConnected(el) {
    // Host element events - 2 params
    el.on('click', (e) => {
      // e is MouseEvent
      console.log('Host clicked at', e.clientX, e.clientY);
    });

    // Shadow DOM delegation - 3 params with selector string
    el.on('button', 'click', (e, target) => {
      // e is MouseEvent, target is the matched button
      console.log('Button clicked:', target.textContent);
    });

    // Direct element binding - 3 params with element
    const input = el.query<HTMLInputElement>('.email');
    if (input) {
      el.on(input, 'input', (e) => {
        // e is Event, automatically typed
        console.log('Input changed');
      });
    }

    // Query shortcuts
    const btn = el.query<HTMLButtonElement>('.save');         // undefined if not found
    const inputs = el.queryAll<HTMLInputElement>('input');    // always returns array
    const required = el.queryRequired<HTMLInputElement>('.email'); // throws if not found
  },
});
```

### Batch State Updates

Optimize rendering with batch updates:

```ts
defineElement('todo-list', {
  state: {
    todos: [],
    filter: 'all',
    sortBy: 'date',
  },

  onConnected(el) {
    // Without batch - renders 3 times!
    el.state.todos = newTodos;
    el.state.filter = 'active';
    el.state.sortBy = 'priority';

    // With batch - renders only once!
    el.batch((state) => {
      state.todos = newTodos;
      state.filter = 'active';
      state.sortBy = 'priority';
    });
  },
});
```


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

### Testing Components

Craftit provides comprehensive testing utilities via `@vielzeug/craftit/testing`:

```ts
import { defineElement, html } from '@vielzeug/craftit';
import { createFixture, queryShadow } from '@vielzeug/craftit/testing';

// Define your component
defineElement('my-button', {
  state: { count: 0 },
  template: (el) => html`
    <button>Count: ${el.state.count}</button>
  `,
  onConnected(el) {
    el.on('button', 'click', () => el.state.count++);
  },
});

// Test it
describe('my-button', () => {
  it('should increment count on click', async () => {
    const fixture = await createFixture('my-button');
    const button = fixture.query<HTMLButtonElement>('button');
    
    expect(button?.textContent).toBe('Count: 0');
    
    button?.click();
    await fixture.update();
    
    expect(button?.textContent).toBe('Count: 1');
    
    fixture.destroy();
  });
});
```

**Available utilities:**

- `createFixture()` - Create component with lifecycle management
- `createComponent()` - Create and attach component to DOM
- `createTestContainer()` - Create test container with cleanup
- `queryShadow()` - Query elements in shadow DOM
- `waitForRender()` - Wait for component re-renders
- `userEvent` - Simulate user interactions (click, keyboard, hover, etc.)
- And more...

**See [TESTING.md](./TESTING.md) for complete documentation.**

### Basic Testing (attach/destroy)

For simple tests, use the built-in helpers:

```ts
import { attach, destroy } from '@vielzeug/craftit';

const el = document.createElement('my-component');
await attach(el); // Mounts and waits for render

// Test assertions
expect(el.find('.count')?.textContent).toBe('0');

destroy(el); // Clean removal
```

## 📖 Documentation

- [**Full Documentation**](https://helmuthdu.github.io/vielzeug/craftit)
- [**Usage Guide**](https://helmuthdu.github.io/vielzeug/craftit/usage)
- [**API Reference**](https://helmuthdu.github.io/vielzeug/craftit/api)
- [**Examples**](https://helmuthdu.github.io/vielzeug/craftit/examples)

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🤝 Contributing

Contributions are welcome! Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 🔗 Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://helmuthdu.github.io/vielzeug/deposit)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/deposit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem – A collection of type-safe utilities for modern web development.
