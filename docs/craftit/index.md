<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit Logo" width="156" class="logo-highlight"/>

# Craftit

**Craftit** is a lightweight, type-safe library for creating web components with reactive state, automatic rendering, and excellent developer experience. Build custom elements with the ergonomics of modern frameworks using native browser APIs.

## What Problem Does Craftit Solve?

Creating web components with the vanilla Custom Elements API is verbose, error-prone, and lacks reactivity. Managing state, re-rendering, event listeners, and cleanup requires significant boilerplate code.

**Traditional Approach**:

```ts
class MyCounter extends HTMLElement {
  #count = 0;
  #shadow: ShadowRoot;
  #button: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.render();
  }

  connectedCallback() {
    this.#button = this.#shadow.querySelector('button');
    this.#button?.addEventListener('click', this.handleClick);
  }

  disconnectedCallback() {
    this.#button?.removeEventListener('click', this.handleClick);
  }

  handleClick = () => {
    this.#count++;
    this.render(); // Manual re-render
  };

  render() {
    // Loses all event listeners!
    this.#shadow.innerHTML = `
      <div>
        <p>Count: ${this.#count}</p>
        <button>Increment</button>
      </div>
    `;
  }
}

customElements.define('my-counter', MyCounter);
```

**With Craftit**:

```ts
import { defineElement, html } from '@vielzeug/craftit';

defineElement('my-counter', {
  state: { count: 0 },

  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button>Increment</button>
    </div>
  `,

  onConnected(el) {
    el.on('button', 'click', () => {
      el.state.count++; // Automatic re-render!
    });
  },
});
```

### Comparison with Alternatives

| Feature            | Craftit                                               | Lit      | Stencil   | Vanilla CE |
| ------------------ | ----------------------------------------------------- | -------- | --------- | ---------- |
| Bundle Size        | **<PackageInfo package="craftit" type="size" />**     | ~15 KB   | ~10 KB    | 0          |
| Dependencies       | <PackageInfo package="craftit" type="dependencies" /> | 0        | Many      | 0          |
| TypeScript         | Native                                                | Good     | Excellent | Manual     |
| Reactive State     | Built-in                                              | External | Built-in  | Manual     |
| Event Delegation   | ✅                                                    | ❌       | ❌        | Manual     |
| Form Integration   | ✅                                                    | ⚠️       | ✅        | Manual     |
| DOM Reconciliation | ✅                                                    | ✅       | ✅        | ❌         |
| Learning Curve     | Low                                                   | Medium   | High      | Low        |
| Testing Utilities  | ✅                                                    | ⚠️       | ✅        | ❌         |

## When to Use Craftit

✅ **Use Craftit when you need:**

- Type-safe web component development
- Reactive state management without a framework
- Automatic DOM updates and reconciliation
- Event delegation for dynamic content
- Form-associated custom elements
- Minimal bundle size
- Framework-agnostic components

❌ **Don't use Craftit when:**

- You need server-side rendering (use Lit SSR or Stencil)
- You want a full component framework (use React/Vue/Svelte)
- You need IE11 support (Craftit requires modern browsers)

## 🚀 Key Features

- **🔥 Reactive State**: Automatic re-renders on state changes with [Proxy-based reactivity](./usage.md#reactive-state).
- **⚡ Efficient Updates**: Smart [DOM reconciliation](./usage.md#rendering) – only updates what changed.
- **🎯 Event Delegation**: Built-in support for [dynamic element event handling](./usage.md#event-delegation).
- **📝 Form Support**: Full [ElementInternals integration](./usage.md#form-associated-elements) for form participation.
- **🎨 Shadow DOM**: Encapsulated [styles with CSSStyleSheet](./usage.md#styling) support.
- **🎭 CSS Variables**: Built-in [theming with CSS variables](./usage.md#css-variables-custom-properties) (`css.var()`, `css.theme()`).
- **🔍 Type-Safe**: Complete TypeScript support with [full type inference](./usage.md#type-safety).
- **📦 Tiny Bundle**: Only **<PackageInfo package="craftit" type="size" /> gzipped** with zero dependencies.
- **🧪 Testable**: Built-in [testing utilities](./usage.md#testing) (`attach`, `destroy`, `flush`).
- **🪝 Lifecycle Hooks**: Full control with [lifecycle callbacks](./usage.md#lifecycle-hooks).
- **🎭 Framework Agnostic**: Use with [React, Vue, Svelte, or vanilla JS](./examples.md#framework-integration).

## 🏁 Quick Start

### Installation

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

### With State and Interactivity

```ts
defineElement('click-counter', {
  state: {
    count: 0,
  },

  template: (el) => html`
    <div class="counter">
      <p>Count: ${el.state.count}</p>
      <button class="increment">+</button>
      <button class="decrement">-</button>
      <button class="reset">Reset</button>
    </div>
  `,

  styles: [
    css`
      .counter {
        padding: 1rem;
      }
      button {
        margin: 0.5rem;
      }
    `,
  ],

  onConnected(el) {
    el.on('.increment', 'click', () => el.state.count++);
    el.on('.decrement', 'click', () => el.state.count--);
    el.on('.reset', 'click', () => (el.state.count = 0));
  },
});
```

### Form Integration

```ts
defineElement('custom-input', {
  state: { value: '' },

  template: (el) => html`
    <label>
      <span>Username</span>
      <input type="text" value="${el.state.value}" />
    </label>
  `,

  formAssociated: true,
  observedAttributes: ['value'] as const,

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

## 📘 Core Concepts

### Reactive State

State changes automatically trigger efficient re-renders:

```ts
defineElement('todo-app', {
  state: {
    todos: ['Learn Craftit', 'Build components'],
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

    // Nested objects are also reactive
    el.state.filter = 'completed'; // ✅ Automatic re-render
  },
});
```

### Event Delegation

Handle events on dynamic elements without re-binding:

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
          <button class="delete" data-index="${i}">×</button>
        </li>
      `,
        )
        .join('')}
    </ul>
    <button class="add">Add Todo</button>
  `,

  onConnected(el) {
    // Delegation works for dynamically added elements!
    el.on('.delete', 'click', (e) => {
      const index = +(e.currentTarget as HTMLElement).dataset.index!;
      el.state.todos.splice(index, 1);
    });

    el.on('.add', 'click', () => {
      el.state.todos.push(`Item ${el.state.todos.length + 1}`);
    });
  },
});
```

### Smart DOM Updates

Only changed elements are updated:

```ts
defineElement('efficient-list', {
  state: { items: ['A', 'B', 'C'] },

  template: (el) => html`
    <ul>
      ${el.state.items.map((item) => `<li>${item}</li>`).join('')}
    </ul>
  `,

  onConnected(el) {
    // Changing one item only updates that <li>
    el.state.items[0] = 'Updated A';
  },
});
```

## 📚 Documentation

- **[Usage Guide](./usage.md)** – Detailed feature explanations
- **[API Reference](./api.md)** – Complete API documentation
- **[Examples](./examples.md)** – Real-world usage examples

## ❓ FAQ

**Q: How does Craftit compare to Lit?**  
A: Craftit is simpler and smaller (~5 KB vs ~15 KB). Lit has more features like directives and SSR support. Choose Craftit for simplicity, Lit for advanced features.

**Q: Can I use Craftit with React/Vue/Svelte?**  
A: Yes! Craftit creates standard web components that work anywhere. See [Framework Integration](./examples.md#framework-integration).

**Q: Does Craftit support TypeScript?**  
A: Absolutely! Craftit is written in TypeScript with full type inference and type safety.

**Q: What about browser support?**  
A: Craftit requires modern browsers (Chrome 77+, Firefox 93+, Safari 16.4+) for features like ElementInternals and Shadow DOM.

**Q: Can I use Craftit in production?**  
A: Yes! Craftit is stable, tested, and used in production applications.

## 🐛 Troubleshooting

### Component Not Rendering

```ts
// ❌ Wrong – missing template
defineElement('my-el', {
  state: { count: 0 },
});

// ✅ Correct – template required
defineElement('my-el', {
  state: { count: 0 },
  template: html`<div>Count: ${el.state.count}</div>`,
});
```

### Events Not Working

```ts
// ❌ Wrong – binding before element exists
defineElement('my-el', {
  template: html`<button>Click</button>`,
  onConnected(el) {
    // This is correct timing ✅
    el.on('button', 'click', () => console.log('clicked'));
  },
});
```

### State Not Updating

```ts
// ❌ Wrong – replacing state object
el.state = { count: 10 }; // This won't work!

// ✅ Correct – mutate existing state
el.state.count = 10;

// ✅ Or use set()
el.set({ count: 10 });
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md).

## 📄 License

MIT © [vielzeug](https://github.com/saatkhel/vielzeug)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/saatkhel/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/craftit)
- [Issue Tracker](https://github.com/saatkhel/vielzeug/issues)
- [Changelog](https://github.com/saatkhel/vielzeug/blob/main/packages/craftit/CHANGELOG.md)
