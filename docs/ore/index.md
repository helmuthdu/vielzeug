---
title: Ore — Web component authoring with signals
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.
package: ore
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [ripple, refine, orbit]
exports: [define, prop, html, css, ref, createContext, inject, injectStrict, provide, onMounted, onCleanup, useEmit, useSlots, getHost, bind, aria, createId, createStableId, resetIdCounter, setRawSanitizer, OreError, BindOptions]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="ore" />

## Why Ore?

Ore keeps custom elements functional and signal-driven while giving you direct control over templates, lifecycle hooks, host bindings, and form-associated behavior.

```ts
// Before — vanilla custom element boilerplate
class MyCounter extends HTMLElement {
  #count = 0;
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.#render();
  }
  #render() {
    this.shadowRoot!.innerHTML = `<button>${this.#count}</button>`;
    this.shadowRoot!.querySelector('button')!.onclick = () => {
      this.#count++;
      this.#render();
    };
  }
}
customElements.define('my-counter', MyCounter);

// After — Ore
import { signal } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';

define('my-counter', {
  setup() {
    const count = signal(0);
    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

| Feature                    | Ore                                       | Lit                                                               | Stencil                                    |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| Bundle size                | <PackageInfo package="ore" type="size" /> | ~12 kB                                                            | ~60 kB+ toolchain                          |
| Signal-first runtime       | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="x" size="16"></ore-icon> (separate signals package) | <ore-icon name="x" size="16"></ore-icon>     |
| Functional component setup | <ore-icon name="check" size="16"></ore-icon>  | Partial                                                           | <ore-icon name="x" size="16"></ore-icon>     |
| Typed prop helpers         | <ore-icon name="check" size="16"></ore-icon>  | Partial                                                           | <ore-icon name="check" size="16"></ore-icon> |
| Host binding helpers       | <ore-icon name="check" size="16"></ore-icon>  | Partial                                                           | Partial                                    |
| Form-associated helpers    | <ore-icon name="check" size="16"></ore-icon>  | Manual                                                            | Partial                                    |
| Zero dependencies          | <ore-icon name="check" size="16"></ore-icon>  | <ore-icon name="check" size="16"></ore-icon>                        | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Ore when** you want typed, signal-driven custom elements with minimal runtime overhead and no framework lock-in.

**Consider Lit when** you need a mature ecosystem with wide community adoption and don't need signal-based reactivity.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/ore
```

```sh [npm]
npm install @vielzeug/ore
```

```sh [yarn]
yarn add @vielzeug/ore
```

:::

## Quick Start

```ts
import { computed, signal } from '@vielzeug/ripple';
import { bind, css, define, html, onMounted, prop } from '@vielzeug/ore';

define('my-counter', {
  props: {
    label: prop.string('Count'),
    step: prop.number(1),
  },
  styles: [
    css`
      :host {
        display: inline-grid;
        gap: 0.5rem;
      }
    `,
  ],
  setup(props) {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    bind({ class: { 'is-positive': () => count.value > 0 } });

    onMounted(() => console.log('mounted'));

    return html`
      <button @click=${() => (count.value += props.step.value)}>${props.label}: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
  },
});
```

## Features

<div class="features-grid">

- Signal-first runtime with `signal`, `computed`, `watch`, `batch` from `@vielzeug/ripple` — import them directly
- Functional component authoring via `define(tag, { props, setup, styles, formAssociated })`
- Props via `prop.*` helpers (`prop.string`, `prop.number`, `prop.bool`, `prop.oneOf`, `prop.json`, `prop.data`) or raw `PropDef` objects
- `setup(props)` takes only props and returns an `HTMLResult` directly: `return html\`...\``
- Lifecycle hooks — `onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect` — plain functions imported from `@vielzeug/ore`, called directly from `setup()` or any composable it calls
- Directives: `each` (keyed reactive list rendering), `classMap`, `styleMap`, `when`, `model`, `raw`
- Host bindings via `bind({ attr, class, style, on })` — pass `{ target: el }` to bind any off-host element
- Reactive ARIA sync via `aria(target, config)` — applies `aria-*` attributes reactively to any element, auto-cleanup on disconnect
- Context via `provide(key, value)` / `inject(key)`; typed emit/slots via `useEmit<Emits>()` / `useSlots<SlotNames>()`
- Form-associated helpers (`@vielzeug/ore/forms`): `useField()`, `createFormContext()`
- Observers (`@vielzeug/ore/observers`)
- Testing utilities (`@vielzeug/ore/testing`) — `mount`, `renderHook`, `fire`, `user`, `waitFor`, `cleanup`
- Debug utilities (`@vielzeug/ore/devtools`) — `debugFlush()` for diagnosing update timing

</div>

## Package Entry Points

| Import                      | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `@vielzeug/ore`            | Core component API and utilities (`define`, `prop`, `html`, `css`, context)  |
| `@vielzeug/ore/devtools`   | `debugFlush` — verbose flush for timing diagnostics (dev only)                |
| `@vielzeug/ore/directives` | `each`, `when`, `model`, `live`, `raw`, `classMap`, `styleMap`                |
| `@vielzeug/ore/forms`      | `useField`, `createFormContext`, `FORM_CONTEXT_KEY`                          |
| `@vielzeug/ore/observers`  | `resizeObserver`, `intersectionObserver`, `mediaObserver`, `mutationObserver` |
| `@vielzeug/ore/testing`    | `mount`, `fire`, `user`, `waitFor`, `cleanup`, and helpers                    |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Refine](../refine/index.md) for prebuilt accessible components powered by Ore.
- [Ripple](../ripple/index.md) for reactive state used inside Ore components.
- [Forge](../forge/index.md) for typed form state that integrates with Ore.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
