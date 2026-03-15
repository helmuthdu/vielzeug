---
title: Craftit — Web component framework for TypeScript
description: Signals-based, functional web component library with fine-grained reactivity, template literals, lifecycle hooks. Built on @vielzeug/stateit for reactive primitives.
---

<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit Logo" width="156" class="logo-highlight"/>

# Craftit

**Craftit** is a signals-based, functional framework for building web components with fine-grained reactivity, template literals, and lifecycle hooks. Built on top of [@vielzeug/stateit](/stateit/) for reactive primitives.

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
import { define, signal, html, css } from '@vielzeug/craftit';

define('my-counter', ({ host }) => {
  const count = signal(0);
  const styles = css`
    button {
      padding: 8px 16px;
      font-size: 1rem;
    }
  `;

  return {
    template: html`<button @click=${() => count.value++}>Count: ${count}</button>`,
    styles: [styles],
  };
});
```

```html
<!-- Use anywhere HTML is valid -->
<my-counter></my-counter>
```

## Features

- **Fine-grained reactivity** — Re-exports all signals from [@vielzeug/stateit](/stateit/): `signal()`, `computed()`, `effect()`, `watch()`, `batch()`, `untrack()`, and more
- **Template literals** — `html\`...\``tagged template for declarative, reactive DOM updates with`:attr`, `?bool`, `@event`, `ref=`, and `.prop` bindings
- **CSS-in-JS** — `css\`...\``with shadow DOM scoping;`css.theme()` for design-token-based light/dark theming
- **Lifecycle hooks** — `onMount()`, `onUnmount()`, `onRendered()`, `onCleanup()`, `onError()` for full component lifecycle control
- **Props** — `prop()` and `defineProps()` for reactive attribute bindings with auto type-coercion, reflection, and validation
- **Slots & Emits** — `defineSlots()` (reactive slot presence), `onSlotChange()`, and `defineEmits()` for composable component APIs
- **Refs** — `ref<T>()` and `refs<T>()` for DOM element references
- **Form-associated** — `defineField()` for custom form controls with native `ElementInternals` validation
- **Context / DI** — `provide()`, `inject()`, `createContext()`, and `syncContextProps()` for dependency injection across component trees
- **Accessibility** — `aria()` for reactive ARIA attributes, `createId()`, `createFormIds()`, `useFocusTrap()`
- **Observers** — `observeResize()`, `observeIntersection()`, `observeMedia()` return reactive signals
- **Async rendering** — `suspense()` manages loading/error/retry for async data fetching
- **Multi-branch conditionals** — `match()` replaces nested `html.when()` chains
- **Framework-agnostic** — Pure web components that work in any framework or vanilla HTML
- **Lightweight** — <PackageInfo package="craftit" type="size" /> gzipped

## Next Steps

|                           |                                                    |
| ------------------------- | -------------------------------------------------- |
| [Usage Guide](./usage.md) | Signals, templates, lifecycle, props, and patterns |
| [API Reference](./api.md) | Complete type signatures and API documentation     |
| [Examples](./examples.md) | Real-world component recipes                       |
