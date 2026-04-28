---
title: Craftit — Web component authoring with signals
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.
---

<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit logo" width="156" class="logo-highlight"/>

# Craftit

**Craftit** is Vielzeug's custom-element authoring library. It combines `@vielzeug/stateit` signals with a DOM-first component model: typed prop signals, reactive template bindings, setup-context emits and slots, host bindings, form-associated helpers, headless controls, observer composables, and testing utilities.

<!-- Search keywords: custom elements framework, reactive templates, form associated custom elements, headless controls. -->

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
import { computed, css, define, html, prop, signal } from '@vielzeug/craftit';

define('my-counter', {
  props: {
    label: prop.string('Count'),
    step: prop.number(1),
  },
  setup(props, { host }) {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    host.class({ 'is-positive': () => count.value > 0 });

    return {
      render: () => html`
        <button @click=${() => (count.value += props.step.value)}>
          ${props.label}: ${count}
        </button>
        <p>Doubled: ${doubled}</p>
      `,
    };
  },
  styles: [
    css`
      :host {
        display: inline-grid;
        gap: 0.5rem;
      }
    `,
  ],
});
```

```html
<my-counter label="Clicks" step="2"></my-counter>
```

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/craftit` | Core component API, directives, utilities, and `@vielzeug/stateit` re-exports |
| `@vielzeug/craftit/controls` | Headless controls for field authoring, navigation, overlays, press, spinner, slider, and popup lists |
| `@vielzeug/craftit/observers` | `resizeObserver`, `intersectionObserver`, `mediaObserver` |
| `@vielzeug/craftit/testing` | DOM testing helpers such as `mount`, `user`, `fire`, `waitFor`, and `cleanup` |

## Why Craftit?

Vanilla custom elements give you platform primitives, but not the authoring ergonomics most components need: state, cleanup, typed props, typed custom events, slot inspection, or reusable controller logic.

```ts
// Vanilla custom element
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

// Craftit
define('my-counter', {
  setup() {
    const count = signal(0);

    return {
      render: () => html`<button @click=${() => count.value++}>${count}</button>`,
    };
  },
});
```

| Feature | Craftit | Lit | Stencil |
| --- | --- | --- | --- |
| Runtime model | Signals + functions | Reactive templates | Compiler + decorators |
| Compiler step | ❌ | ❌ | ✅ |
| Typed prop signals | ✅ | ⚠️ manual state wiring | ⚠️ decorator-driven |
| Form-associated helpers | ✅ built in | ⚠️ manual | ⚠️ manual |
| Headless controls | ✅ published subpath | ❌ | ❌ |
| DOM testing helpers | ✅ published subpath | ⚠️ third-party | ⚠️ third-party |

**Use Craftit when** you want platform-native custom elements with signal-based reactivity and a small, explicit API surface.

**Consider Lit or Stencil** if your team prefers their ecosystems, SSR story, or compiler-oriented authoring model.

## Features

- **Signal-first runtime** — re-exports `signal`, `computed`, `watch`, `batch`, `untrack`, `readonly`, `writable`, and related `@vielzeug/stateit` APIs
- **Functional component authoring** — `define(tag, { props, setup, styles, formAssociated })`
- **Reactive template bindings** — `html` supports text bindings, `:attr`, `?boolean`, `.prop`, `@event.modifier`, and `ref`
- **Directives** — `each`, `classMap`, and `raw`
- **Host bindings** — `host.attr`, `host.class`, `host.style`, `host.prop`, `host.on`, `host.bind`, and `syncAria`
- **Typed setup context** — `emit`, `host`, and `slots`
- **Form-associated custom elements** — `defineField()` built on `ElementInternals`
- **Reusable interaction controllers** — `@vielzeug/craftit/controls`
- **DOM observers** — `@vielzeug/craftit/observers`
- **Testing utilities** — `@vielzeug/craftit/testing`

## Compatibility

| Environment | Support |
| --- | --- |
| Browser | ✅ |
| Node.js | ❌ (DOM-only runtime) |
| SSR | ❌ (client-only execution) |
| Deno | ❌ |

## Prerequisites

- Browser runtime with Custom Elements and Shadow DOM support.
- Client-side rendering environment.
- Familiarity with DOM events and signal-style state updates.
- A test environment like jsdom or happy-dom when using `@vielzeug/craftit/testing`.

## See Also

- [Buildit](/buildit/)
- [Stateit](/stateit/)
- [Floatit](/floatit/)
