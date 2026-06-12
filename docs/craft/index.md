---
title: Craft — Web component authoring with signals
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.
package: craft
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [ripple, sigil, orbit]
exports:
  [
    define,
    html,
    css,
    prop,
    ref,
    signal,
    computed,
    effect,
    onCleanup,
    onMounted,
    onElement,
    onEvent,
    each,
    when,
    classMap,
    styleMap,
    model,
    live,
    raw,
    provide,
    inject,
    injectStrict,
    createContext,
    syncAria,
    createBind,
    createSlots,
    defineField,
    createFormContext,
    useFormContext,
    intersectionObserver,
    mediaObserver,
    mutationObserver,
    resizeObserver,
    CraftitError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="craft" />



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
    this.shadowRoot!.querySelector('button')!.onclick = () => {
      this.#count++;
      this.#render();
    };
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
| -------------------------- | ------------------------------------------- | ----------------------------- | ----------------- |
| Bundle size                | <PackageInfo package="craft" type="size" /> | ~12 kB                        | ~60 kB+ toolchain |
| Signal-first runtime       | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="x" size="16"></sg-icon> (separate signals package) | <sg-icon name="x" size="16"></sg-icon>                |
| Functional component setup | <sg-icon name="check" size="16"></sg-icon>                                          | Partial                       | <sg-icon name="x" size="16"></sg-icon>                |
| Typed prop helpers         | <sg-icon name="check" size="16"></sg-icon>                                          | Partial                       | <sg-icon name="check" size="16"></sg-icon>                |
| Host binding helpers       | <sg-icon name="check" size="16"></sg-icon>                                          | Partial                       | Partial           |
| Form-associated helpers    | <sg-icon name="check" size="16"></sg-icon>                                          | Manual                        | Partial           |
| Zero dependencies          | <sg-icon name="check" size="16"></sg-icon>                                          | <sg-icon name="check" size="16"></sg-icon>                            | <sg-icon name="x" size="16"></sg-icon>                |

<div class="decision-callout">

**Use Craft when** you want typed, signal-driven custom elements with minimal runtime overhead and no framework lock-in.

**Consider Lit when** you need a mature ecosystem with wide community adoption and don't need signal-based reactivity.

</div>

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
      :host {
        display: inline-grid;
        gap: 0.5rem;
      }
    `,
  ],
  setup(props, { bind }) {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    bind({ class: { 'is-positive': () => count.value > 0 } });

    return html`
      <button @click=${() => (count.value += props.step.value)}>${props.label}: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
  },
});
```

## Features

<div class="features-grid">

- Signal-first runtime with `signal`, `computed`, `watch`, `batch`, and related ripple APIs
- Functional component authoring via `define(tag, { props, setup, styles, formAssociated })`
- Props via `prop.*` helpers (`prop.string`, `prop.number`, `prop.bool`, `prop.oneOf`, `prop.json`, `prop.ref`) or raw `PropDef` objects
- Setup returns an `HTMLResult` directly: `return html\`...\``
- Lifecycle hooks: `onMounted()`, `onCleanup()`, `onElement()`, `effect()`
- Directives: `each`, `classMap`, `styleMap`, `when`, `live`, `raw`
- Host bindings via `bind({ attr, class, style, prop, on })` from setup context
- Form-associated helpers with `defineField()` and `createFormContext()` (with reactive `error` signal for submit errors)
- Observers (`@vielzeug/craft/observers`)
- Testing utilities (`@vielzeug/craft/testing`) — `mount`, `renderHook`, `fire`, `user`, `waitFor`, `cleanup`
- Debug utilities (`@vielzeug/craft/devtools`) — `debugFlush()` for diagnosing update timing

</div>


## Package Entry Points

| Import                      | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `@vielzeug/craft`           | Core component API, directives, utilities, ripple re-exports                  |
| `@vielzeug/craft/devtools`  | `debugFlush` — verbose flush for timing diagnostics (dev only)                |
| `@vielzeug/craft/observers` | `resizeObserver`, `intersectionObserver`, `mediaObserver`, `mutationObserver` |
| `@vielzeug/craft/testing`   | `mount`, `fire`, `user`, `waitFor`, `cleanup`, and helpers                    |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Lifecycle Best Practices](./lifecycle-best-practices.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Sigil](../sigil/index.md) for prebuilt accessible components powered by Craft.
- [Ripple](../ripple/index.md) for reactive state used inside Craft components.
- [Forge](../forge/index.md) for typed form state that integrates with Craft.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
