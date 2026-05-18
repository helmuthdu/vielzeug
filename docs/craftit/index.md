---
title: Craftit — Web component authoring with signals
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.
package: craftit
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [stateit, buildit, floatit]
exports: [define, html, css, signal, computed, effect, props, propsOf, on, ref, host, provide, inject]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="craftit" />

<img src="/logo-craftit.svg" alt="Craftit logo" width="156" class="logo-highlight"/>

# Craftit

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/craftit` &nbsp;·&nbsp; **Category:** Ui Primitives

**Key exports:** `define`, `html`, `css`, `signal`, `computed`, `effect`, `props`, `propsOf`, `on`, `ref`, `host`, `provide`, `inject`

**When to use:** Framework-agnostic UI components powered by reactive signals. Ideal when you need custom elements without a full UI framework.

**Related:** [Stateit](/stateit/) · [Buildit](/buildit/) · [Floatit](/floatit/)

</details>

Craftit is a custom-element authoring library built on `@vielzeug/stateit`.


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

    return () => html`
      <button @click=${() => (count.value += props.step.value)}>${props.label}: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
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

## Why Craftit?

Craftit keeps custom elements functional and signal-driven while still giving you direct control over templates, lifecycle hooks, host bindings, and form-associated behavior.

| Feature                    | Craftit                                       | Lit                           | Stencil           |
| -------------------------- | --------------------------------------------- | ----------------------------- | ----------------- |
| Bundle size                | <PackageInfo package="craftit" type="size" /> | ~12 kB                        | ~60 kB+ toolchain |
| Signal-first runtime       | ✅                                            | ❌ (separate signals package) | ❌                |
| Functional component setup | ✅                                            | Partial                       | ❌                |
| Typed prop helpers         | ✅                                            | Partial                       | ✅                |
| Host binding helpers       | ✅                                            | Partial                       | Partial           |
| Form-associated helpers    | ✅                                            | Manual                        | Partial           |
| Headless controls package  | ✅                                            | ❌                            | ❌                |
| Zero dependencies          | ✅                                            | ✅                            | ❌                |

**Use Craftit when** you want typed, signal-driven custom elements with minimal runtime overhead and no framework lock-in.

**Consider Lit or Stencil when** you need their ecosystem-specific tooling, decorators, or compiler-first workflows.

## Features

- Signal-first runtime with `signal`, `computed`, `watch`, `batch`, and related stateit APIs
- Functional component authoring via `define(tag, { props, setup, styles, formAssociated })`
- Props via `prop.*` helpers or raw `PropDef` objects; shared bundles can type against `PropsDef<...>`
- Setup returns a template function: `return () => html\`...\``
- Lifecycle hooks: `onMounted()`, `onCleanup()`, `onElement()`, `effect()`
- Directives: `each`, `classMap`, `styleMap`, `guard`, `when`, `live`, `until`, `raw`
- Host bindings: `host.attr`, `host.class`, `host.style`, `host.prop`, `host.on`, `host.bind`
- Form-associated helpers with `defineField()`
- Headless controls (`@vielzeug/craftit/controls`)
- Observers (`@vielzeug/craftit/observers`)
- Testing utilities (`@vielzeug/craftit/testing`)

### Package Entry Points

| Import                        | Purpose                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `@vielzeug/craftit`           | Core component API, directives, utilities, and stateit re-exports                |
| `@vielzeug/craftit/controls`  | Headless controls for fields, navigation, overlays, press, sliders, and spinners |
| `@vielzeug/craftit/observers` | `resizeObserver`, `intersectionObserver`, `mediaObserver`                        |
| `@vielzeug/craftit/testing`   | `mount`, `fire`, `user`, `waitFor`, `cleanup`, and helpers                       |

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
- [Examples](./examples.md)

## See Also

- [Buildit](../buildit/index.md) for prebuilt accessible components powered by Craftit.
- [Stateit](../stateit/index.md) for reactive state used inside Craftit components.
- [Formit](../formit/index.md) for typed form state that integrates with Craftit controls.

<!-- markdownlint-enable MD025 MD033 MD060 -->
