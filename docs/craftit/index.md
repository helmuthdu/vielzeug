<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit Logo" width="156" class="logo-highlight"/>

# Craftit

**Craftit** is a lightweight, type-safe library for creating web components with signals-based reactivity and excellent developer experience. Build custom elements with the ergonomics of modern frameworks using native browser APIs and fine-grained reactivity.

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
import { define, signal, html } from '@vielzeug/craftit';

define('my-counter', () => {
  const count = signal(0);

  return html`
    <div>
      <p>Count: ${count}</p>
      <button @click=${() => count.value++}>Increment</button>
    </div>
  `;
});
```

### Comparison with Alternatives

| Feature              | Craftit                                               | Lit               | Stencil        | Vanilla CE |
| -------------------- | ----------------------------------------------------- | ----------------- | -------------- | ---------- |
| Bundle Size          | **<PackageInfo package="craftit" type="size" />**     | ~7 KB             | ~30 KB         | 0          |
| Dependencies         | <PackageInfo package="craftit" type="dependencies" /> | 0                 | Many           | 0          |
| Reactivity Model     | ✅ Signals                                            | ⚠️ Reactive props | ✅ Decorators  | ❌         |
| Fine-grained Updates | ✅ Yes                                                | ⚠️ Partial        | ⚠️ Partial     | ❌         |
| Template Syntax      | ✅ Tagged templates                                   | ✅ lit-html       | ✅ JSX         | ❌         |
| Event Handlers       | ✅ @-syntax                                           | ✅ @-syntax       | ✅ Built-in    | ⚠️ Manual  |
| Learning Curve       | Low                                                   | Medium            | High           | Low        |
| Testing Utilities    | ✅ Yes                                                | ⚠️ Limited        | ✅ Yes         | ❌         |
| TypeScript           | ✅ First-class                                        | ✅ Good           | ✅ First-class | ⚠️ Manual  |

## When to Use Craftit

✅ **Use Craftit when you need:**

- Type-safe web component development
- Signals-based reactive state management
- Fine-grained automatic DOM updates
- Tagged template syntax with event handlers
- Minimal bundle size with zero dependencies
- Minimal bundle size
- Framework-agnostic components

❌ **Don't use Craftit when:**

- You need server-side rendering (use Lit SSR or Stencil)
- You want a full component framework (use React/Vue/Svelte)
- You need IE11 support (Craftit requires modern browsers)

## 🚀 Key Features

- **🎯 Signals-Based Reactivity**: Fine-grained [automatic dependency tracking](./usage.md#signals) with signals, computed, and effects.
- **⚡ Efficient Updates**: [Only updates changed DOM nodes](./usage.md#reactivity) – no virtual DOM diffing needed.
- **📝 Template Syntax**: Powerful [tagged template syntax](./usage.md#template-system) with event handlers, props, and bindings.
- **🎨 Scoped Styles**: Encapsulated [Shadow DOM styling](./usage.md#styling) with CSS theming support.
- **🪝 Lifecycle Hooks**: Full control with [onMount, onUnmount, onUpdated](./usage.md#lifecycle-hooks).
- **🔍 Type-Safe**: Complete TypeScript support with [full type inference](./usage.md#typescript).
- **📦 Tiny Bundle**: Only **<PackageInfo package="craftit" type="size" /> gzipped** with zero dependencies.
- **🧪 Testable**: Built-in [testing utilities](./usage.md#testing) for component testing.
- **📋 Form Integration**: Native [ElementInternals support](./usage.md#form-integration) for custom form controls.
- **🎭 Advanced Features**: [Error boundaries](./usage.md#error-boundaries), [lazy loading](./usage.md#lazy-loading), and [context](./usage.md#context).
- **🎯 Props & Refs**: Built-in [prop system](./usage.md#props) and [element references](./usage.md#refs).

## 🏁 Quick Start

```ts
import { define, signal, html } from '@vielzeug/craftit';

define('click-counter', () => {
  const count = signal(0);

  return html`
    <div>
      <p>Count: ${count}</p>
      <button @click=${() => count.value++}>Increment</button>
    </div>
  `;
});
```

Use in HTML:

```html
<click-counter></click-counter>
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for complete API and patterns
- Check [Examples](./examples.md) for framework integrations (React, Vue, Svelte)
- Read [API Reference](./api.md) for detailed documentation
  :::

## 📘 Core Concepts

### Signals-Based Reactivity

Signals automatically track dependencies and trigger fine-grained updates:

```ts
import { define, signal, computed, html } from '@vielzeug/craftit';

define('todo-app', () => {
  const todos = signal(['Learn Craftit', 'Build components']);
  const filter = signal('all');

  // Computed values automatically update
  const filteredTodos = computed(() => {
    return filter.value === 'all'
      ? todos.value
      : todos.value.filter(todo => /* filter logic */);
  });

  return html`
    <ul>
      ${filteredTodos.value.map(todo => html`<li>${todo}</li>`)}
    </ul>
  `;
});
```

### Event Handlers

Handle events directly in templates with @ syntax:

```ts
define('todo-list', () => {
  const todos = signal(['Item 1', 'Item 2']);

  const deleteTodo = (index: number) => {
    todos.update((list) => {
      list.splice(index, 1);
      return [...list];
    });
  };

  const addTodo = () => {
    todos.update((list) => [...list, `Item ${list.length + 1}`]);
  };

  return html`
    <ul>
      ${todos.value.map(
        (todo, i) => html`
          <li>
            ${todo}
            <button @click=${() => deleteTodo(i)}>×</button>
          </li>
        `,
      )}
    </ul>
    <button @click=${addTodo}>Add Todo</button>
  `;
});
```

### Fine-Grained Updates

Only changed values trigger re-renders:

```ts
define('efficient-list', () => {
  const items = signal(['A', 'B', 'C']);

  return html`
    <ul>
      ${items.value.map((item) => html`<li>${item}</li>`)}
    </ul>
    <button
      @click=${() => {
        // Only the specific item updates
        items.update((list) => {
          list[0] = 'Updated A';
          return [...list];
        });
      }}>
      Update First
    </button>
  `;
});
```

## ❓ FAQ

### How does Craftit compare to Lit?

Craftit uses signals-based reactivity for fine-grained updates, while Lit uses a reactive properties model. Craftit is simpler and smaller (<PackageInfo package="craftit" type="size" /> vs ~7 KB). Choose Craftit for signals and simplicity, Lit for directives and SSR support.

### Can I use Craftit with React/Vue/Svelte?

Yes! Craftit creates standard web components that work anywhere. See [Framework Integration](./examples.md#framework-integration).

### Does Craftit support TypeScript?

Absolutely! Craftit is written in TypeScript with full type inference and type safety.

### What about browser support?

Craftit requires modern browsers (Chrome 77+, Firefox 93+, Safari 16.4+) for features like Custom Elements and Shadow DOM.

### Can I use Craftit in production?

Yes! Craftit is stable, tested, and used in production applications.

## 🐛 Troubleshooting

### Component Not Rendering

::: danger Problem
Component is defined but doesn't render anything.
:::

::: tip Solution
Ensure you return a template from your setup function:

```ts
// ❌ Wrong – not returning anything
define('my-el', () => {
  const count = signal(0);
});

// ✅ Correct – return html template
define('my-el', () => {
  const count = signal(0);
  return html`<div>Count: ${count}</div>`;
});
```

:::

### Events Not Working

::: danger Problem
Event listeners not firing on elements.
:::

::: tip Solution
Use @ syntax in templates for event binding:

```ts
// ✅ Correct – @ syntax for events
define('my-el', () => {
  const count = signal(0);

  return html` <button @click=${() => count.value++}>Increment</button> `;
});
```

:::

### State Not Updating

::: danger Problem
Signal changes don't trigger re-renders.
:::

::: tip Solution
Update signal values using `.value` or `.update()`:

```ts
// ❌ Wrong – reassigning signal
let count = signal(10); // This won't work!

// ✅ Correct – updating signal value
const count = signal(0);
count.value = 10; // This triggers updates

// ✅ Or use update method
count.update((current) => current + 1);
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
