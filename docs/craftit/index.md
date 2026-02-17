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
| Bundle Size        | **<PackageInfo package="craftit" type="size" />**     | ~7 KB    | ~30 KB    | 0          |
| Dependencies       | <PackageInfo package="craftit" type="dependencies" /> | 0        | Many      | 0          |
| DOM Reconciliation | ✅                                                    | ✅       | ✅        | ❌         |
| Event Delegation   | ✅                                                    | ❌       | ❌        | Manual     |
| Form Integration   | ✅                                                    | ⚠️       | ✅        | Manual     |
| Learning Curve     | Low                                                   | Medium   | High      | Low        |
| Reactive State     | Built-in                                              | External | Built-in  | Manual     |
| Testing Utilities  | ✅                                                    | ⚠️       | ✅        | ❌         |
| TypeScript         | Native                                                | Good     | Excellent | Manual     |

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

```ts
import { defineElement, html } from '@vielzeug/craftit';

defineElement('click-counter', {
  state: { count: 0 },

  template: (el) => html`
    <div>
      <p>Count: ${el.state.count}</p>
      <button>Increment</button>
    </div>
  `,

  onConnected(el) {
    el.on('button', 'click', () => el.state.count++); // Auto re-renders!
  },
});
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for complete API and patterns
- Check [Examples](./examples.md) for framework integrations (React, Vue, Svelte)
- Read [API Reference](./api.md) for detailed documentation
  :::

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

## ❓ FAQ

### How does Craftit compare to Lit?

Craftit is simpler and smaller (<PackageInfo package="craftit" type="size" /> vs ~7 KB). Lit has more features like directives and SSR support. Choose Craftit for simplicity, Lit for advanced features.

### Can I use Craftit with React/Vue/Svelte?

Yes! Craftit creates standard web components that work anywhere. See [Framework Integration](./examples.md#framework-integration).

### Does Craftit support TypeScript?

Absolutely! Craftit is written in TypeScript with full type inference and type safety.

### What about browser support?

Craftit requires modern browsers (Chrome 77+, Firefox 93+, Safari 16.4+) for features like ElementInternals and Shadow DOM.

### Can I use Craftit in production?

Yes! Craftit is stable, tested, and used in production applications.

## 🐛 Troubleshooting

### Component Not Rendering

::: danger Problem
Component is defined but doesn't render anything.
:::

::: tip Solution
Ensure you provide a `template` function:

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

:::

### Events Not Working

::: danger Problem
Event listeners not firing on elements.
:::

::: tip Solution
Bind events in `onConnected` lifecycle hook after elements exist:

```ts
// ✅ Correct – binding after element exists
defineElement('my-el', {
  template: html`<button>Click</button>`,
  onConnected(el) {
    el.on('button', 'click', () => console.log('clicked'));
  },
});
```

:::

### State Not Updating

::: danger Problem
State changes don't trigger re-renders.
:::

::: tip Solution
Mutate the state object or use `set()` method:

```ts
// ❌ Wrong – replacing state object
el.state = { count: 10 }; // This won't work!

// ✅ Correct – mutate existing state
el.state.count = 10;

// ✅ Or use set()
el.set({ count: 10 });
```

:::

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](../../CONTRIBUTING.md).

## 📄 License

MIT © [vielzeug](https://github.com/saatkhel/vielzeug)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/saatkhel/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/craftit)
- [Issue Tracker](https://github.com/saatkhel/vielzeug/issues)
- [Changelog](https://github.com/saatkhel/vielzeug/blob/main/packages/craftit/CHANGELOG.md)
