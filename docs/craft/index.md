---
title: Craft — Web component authoring with signals
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.
package: craft
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [ripple, sigil, orbit]
exports: [define, html, css, signal, computed, effect, prop, ref, provide, inject, each, when, syncAria, defineField, createFormContext]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="craft" />

<img src="/logo-craft.svg" alt="Craft logo" width="156" class="logo-highlight"/>

# Craft

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/craft` &nbsp;·&nbsp; **Category:** UI Primitives

**Key exports:** `define`, `html`, `css`, `signal`, `computed`, `effect`, `prop`, `ref`, `provide`, `inject`, `each`, `when`

**When to use:** Framework-agnostic UI components powered by reactive signals. Ideal when you need custom elements without a full UI framework.

**Related:** [Ripple](/ripple/) · [Sigil](/sigil/) · [Orbit](/orbit/)

</details>

Craft is a custom-element authoring library built on `@vielzeug/ripple`.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/craft
```

```sh [npm]
npm install @vielzeug/craft
```

```sh [yarn]
yarn add @vielzeug/craft
```

:::

## Quick Start

```ts
import { computed, css, define, html, prop, signal } from '@vielzeug/craft';

define('my-counter', {
  props: {
    label: prop.string('Count'),
    step: prop.number(1),
  },
  styles: [
    css`
      :host { display: inline-grid; gap: 0.5rem; }
    `,
  ],
  setup(props, { bind }) {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    bind({ class: { 'is-positive': () => count.value > 0 } });

    return html`
      <button @click=${() => (count.value += props.step.value)}>
        ${props.label}: ${count}
      </button>
      <p>Doubled: ${doubled}</p>
    `;
  },
});
```

## Why Craft?

Craft keeps custom elements functional and signal-driven while giving you direct control over templates, lifecycle hooks, host bindings, and form-associated behavior.

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
    this.shadowRoot!.querySelector('button')!.onclick = () => { this.#count++; this.#render(); };
  }
}
customElements.define('my-counter', MyCounter);

// After — Craft
import { define, html, signal } from '@vielzeug/craft';

define('my-counter', {
  setup() {
    const count = signal(0);
    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

| Feature                    | Craft                                       | Lit                           | Stencil           |
| -------------------------- | --------------------------------------------- | ----------------------------- | ----------------- |
| Bundle size                | <PackageInfo package="craft" type="size" /> | ~12 kB                        | ~60 kB+ toolchain |
| Signal-first runtime       | ✅                                            | ❌ (separate signals package) | ❌                |
| Functional component setup | ✅                                            | Partial                       | ❌                |
| Typed prop helpers         | ✅                                            | Partial                       | ✅                |
| Host binding helpers       | ✅                                            | Partial                       | Partial           |
| Form-associated helpers    | ✅                                            | Manual                        | Partial           |
| Zero dependencies          | ✅                                            | ✅                            | ❌                |

**Use Craft when** you want typed, signal-driven custom elements with minimal runtime overhead and no framework lock-in.

**Consider Lit when** you need a mature ecosystem with wide community adoption and don't need signal-based reactivity.

## Features

- Signal-first runtime with `signal`, `computed`, `watch`, `batch`, and related ripple APIs
- Functional component authoring via `define(tag, { props, setup, styles, formAssociated })`
- Props via `prop.*` helpers or raw `PropDef` objects
- Setup returns an `HTMLResult` directly: `return html\`...\``
- Lifecycle hooks: `onMounted()`, `onCleanup()`, `onElement()`, `effect()`
- Directives: `each`, `classMap`, `styleMap`, `when`, `live`, `raw`
- Host bindings via `bind({ attr, class, style, prop, on })` from setup context
- Form-associated helpers with `defineField()` and `createFormContext()` (with reactive `error` signal for submit errors)
- Observers (`@vielzeug/craft/observers`)
- Testing utilities (`@vielzeug/craft/testing`) — `mount`, `renderHook`, `fire`, `user`, `waitFor`, `cleanup`
- Debug utilities (`@vielzeug/craft/debug`) — `debugFlush()` for diagnosing update timing

## Package Entry Points

| Import                        | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `@vielzeug/craft`           | Core component API, directives, utilities, ripple re-exports |
| `@vielzeug/craft/debug`     | `debugFlush` — verbose flush for timing diagnostics (dev only) |
| `@vielzeug/craft/observers` | `resizeObserver`, `intersectionObserver`, `mediaObserver`, `mutationObserver` |
| `@vielzeug/craft/testing`   | `mount`, `fire`, `user`, `waitFor`, `cleanup`, and helpers |

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Lifecycle Best Practices](./lifecycle-best-practices.md)
- [Examples](./examples.md)

## See Also

- [Sigil](../sigil/index.md) for prebuilt accessible components powered by Craft.
- [Ripple](../ripple/index.md) for reactive state used inside Craft components.
- [Forge](../forge/index.md) for typed form state that integrates with Craft.

<!-- markdownlint-enable MD025 MD033 MD060 -->
