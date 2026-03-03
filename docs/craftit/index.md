---
title: Craftit — Web component framework for TypeScript
description: Signals-based, functional web component library with fine-grained reactivity, template literals, lifecycle hooks, and zero dependencies.
---

<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit Logo" width="156" class="logo-highlight"/>

# Craftit

**Craftit** is a signals-based, functional framework for building web components with fine-grained reactivity, template literals, and lifecycle hooks. Zero dependencies.

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

define('my-counter', () => {
  const count = signal(0);
  const styles = css`button { padding: 8px 16px; font-size: 1rem; }`;

  return {
    template: html`
      <button @click=${() => count.value++}>
        Count: ${count}
      </button>
    `,
    styles: [styles],
  };
});
```

```html
<!-- Use anywhere HTML is valid -->
<my-counter></my-counter>
```

## Features

- **Fine-grained reactivity** — `signal()`, `computed()`, `effect()`, `watch()` with automatic dependency tracking
- **Template literals** — `html\`...\`` tagged template for declarative DOM updates
- **CSS-in-JS** — `css\`...\`` with automatic shadow DOM scoping
- **Lifecycle hooks** — `onMount`, `onUnmount`, `onUpdated`, `onCleanup`
- **Props** — `prop()` and `defineProps()` for reactive attribute bindings
- **Slots & Emits** — `defineSlots()` and `defineEmits()` for component APIs
- **Form-associated** — `field()` for custom form elements with native validation
- **Zero dependencies** — <PackageInfo package="craftit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Signals, templates, lifecycle, props, and patterns |
| [API Reference](./api.md) | Complete type signatures and API documentation |
| [Examples](./examples.md) | Real-world component recipes |
