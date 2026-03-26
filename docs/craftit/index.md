---
title: Craftit — Web component framework for TypeScript
description: Functional web component library with signals, typed props, template bindings, and lifecycle helpers.
---

<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit logo" width="156" class="logo-highlight"/>

# Craftit

**Craftit** is a functional web component library built on top of `@vielzeug/stateit`. It combines signal-based reactivity with component-focused APIs for templates, lifecycle, props, typed emits, setup-context slots, context, form association, and observers.

<!-- Search keywords: custom elements framework, reactive templates, web component authoring. -->

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

## Quick Start

```ts
import { component, define, signal, computed, html, css } from '@vielzeug/craftit';

define('my-counter', component({
  setup() {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    return html`
      <button @click=${() => count.value++}>Count: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
  },
  styles: [
    css`
      button {
        padding: 8px 16px;
        font-size: 1rem;
      }
    `,
  ],
}));
```

```html
<!-- Use anywhere HTML is valid -->
<my-counter></my-counter>
```

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
define('my-counter', component({
  setup() {
    const count = signal(0);
    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
}));
```

| Feature            | Craftit                                        | Lit          | Stencil           |
| ------------------ | ---------------------------------------------- | ------------ | ----------------- |
| Bundle size        | <PackageInfo package="craftit" type="size" /> | ~7 kB        | ~50 kB (compiler) |
| Signals            | ✅ Built-in                                    | ✅ @lit-labs | ❌                |
| SSR                | ❌                                             | ✅           | ✅                |
| Form-associated    | ✅ Built-in                                    | ⚠️ Manual    | ⚠️ Limited        |
| Context / DI       | ✅ Built-in                                    | ✅ @lit-labs | ✅ @stencil       |
| Reactive observers | ✅ Core + Controls                             | ❌           | ❌                |

**Use Craftit when** you want signals-based web components with stable core APIs and headless controls for interaction-heavy widgets — without decorators or a compiler step.

**Consider Lit** if you need SSR, a larger community ecosystem, or React/Vue-style architecture with decorator-based components.

**Consider Stencil** if you need a compiler-optimised output targeting multiple framework outputs (React wrappers, Angular wrappers) from a single codebase.

## Features

- **Fine-grained reactivity** — Re-exports all signals from `@vielzeug/stateit`: `signal()`, `computed()`, `effect()`, `watch()`, `batch()`, `untrack()`, and more
- **Template literals** — `html\`...\`` for declarative, reactive DOM updates with `:attr`, `@event`, `ref=`, and `.prop` bindings
- **Styling helper** — `css\`...\`` for component styles used via `component({ styles })`
- **Lifecycle hooks** — `onMount()`, `onCleanup()`, `onError()`, `handle()`, `watch()`, `onElement()`, and `useOnce()` for component lifecycle control
- **Props** — top-level `component({ props })`, plus `prop()` for low-level reactive attribute bindings
- **Slots & Emits** — setup-context `slots` and setup-context `emit` with typed event schemas
- **Refs** — `ref<T>()` and `refs<T>()` for DOM element references
- **Form-associated** — `defineField()` for custom form controls with native `ElementInternals` validation
- **Context / DI** — `provide()`, `inject()`, `createContext()`, and `syncContextProps()` for dependency injection across component trees
- **Accessibility** — `aria()` for reactive ARIA attributes plus stable ID helpers such as `createId()` from core
- **Observers** — `resizeObserver()`, `intersectionObserver()`, and `mediaObserver()` from `@vielzeug/craftit/observers`
- **Directive subpath** — `@vielzeug/craftit/directives` for `when`, `each`, `choose`, `until`, `bind`, `attrs`, and more
- **Testing subpath** — `@vielzeug/craftit/testing` for `mount`, `fire`, `user`, `waitFor`, and cleanup helpers
- **Focused entrypoints** — use `@vielzeug/craftit` for stable APIs and focused subpaths (`/controls`, `/observers`, `/directives`, `/testing`) when you want narrower imports
- **Framework-agnostic** — Pure web components that work in any framework or vanilla HTML
- **Lightweight** — <PackageInfo package="craftit" type="size" /> gzipped

## Compatibility

| Environment | Support       |
| ----------- | ------------- |
| Browser     | ✅            |
| Node.js     | ❌ (DOM only) |
| SSR         | ❌ (DOM only) |
| Deno        | ❌            |

## Prerequisites

- Browser runtime with Custom Elements and Shadow DOM support.
- Client-side rendering environment (Craftit components do not run during SSR).
- Basic familiarity with signals from `@vielzeug/stateit` for reactive component logic.

## See Also

- [Buildit](/buildit/)
- [Stateit](/stateit/)
- [Dragit](/dragit/)
