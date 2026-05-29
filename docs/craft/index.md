---
title: Craft — Web component authoring with signals
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.
package: craft
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [ripple, block, orbit]
exports: [define, html, css, signal, computed, effect, props, propsOf, on, ref, host, provide, inject]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="craft" />

<img src="/logo-craft.svg" alt="Craft logo" width="156" class="logo-highlight"/>

# Craft

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/craft` &nbsp;·&nbsp; **Category:** Ui Primitives

**Key exports:** `define`, `html`, `css`, `signal`, `computed`, `effect`, `props`, `propsOf`, `on`, `ref`, `host`, `provide`, `inject`

**When to use:** Framework-agnostic UI components powered by reactive signals. Ideal when you need custom elements without a full UI framework.

**Related:** [Ripple](/ripple/) · [Block](/block/) · [Orbit](/orbit/)

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

## Why Craft?

Craft keeps custom elements functional and signal-driven while still giving you direct control over templates, lifecycle hooks, host bindings, and form-associated behavior.

| Feature                    | Craft                                       | Lit                           | Stencil           |
| -------------------------- | --------------------------------------------- | ----------------------------- | ----------------- |
| Bundle size                | <PackageInfo package="craft" type="size" /> | ~12 kB                        | ~60 kB+ toolchain |
| Signal-first runtime       | ✅                                            | ❌ (separate signals package) | ❌                |
| Functional component setup | ✅                                            | Partial                       | ❌                |
| Typed prop helpers         | ✅                                            | Partial                       | ✅                |
| Host binding helpers       | ✅                                            | Partial                       | Partial           |
| Form-associated helpers    | ✅                                            | Manual                        | Partial           |
| Headless controls package  | ✅                                            | ❌                            | ❌                |
| Zero dependencies          | ✅                                            | ✅                            | ❌                |

**Use Craft when** you want typed, signal-driven custom elements with minimal runtime overhead and no framework lock-in.

**Consider Lit or Stencil when** you need their ecosystem-specific tooling, decorators, or compiler-first workflows.

## Features

- Signal-first runtime with `signal`, `computed`, `watch`, `batch`, and related ripple APIs
- Functional component authoring via `define(tag, { props, setup, styles, formAssociated })`
- Props via `prop.*` helpers or raw `PropDef` objects; shared bundles can type against `PropsDef<...>`
- Setup returns a template function: `return () => html\`...\``
- Lifecycle hooks: `onMounted()`, `onCleanup()`, `onElement()`, `effect()`
- Directives: `each`, `classMap`, `styleMap`, `guard`, `when`, `live`, `until`, `raw`
- Host bindings: `host.attr`, `host.class`, `host.style`, `host.prop`, `host.on`, `host.bind`
- Form-associated helpers with `defineField()`
- Headless controls (`@vielzeug/craft/controls`)
- Observers (`@vielzeug/craft/observers`)
- Testing utilities (`@vielzeug/craft/testing`)

### Package Entry Points

| Import                        | Purpose                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `@vielzeug/craft`           | Core component API, directives, utilities, and ripple re-exports                |
| `@vielzeug/craft/controls`  | Headless controls for fields, navigation, overlays, press, sliders, and spinners |
| `@vielzeug/craft/observers` | `resizeObserver`, `intersectionObserver`, `mediaObserver`                        |
| `@vielzeug/craft/testing`   | `mount`, `fire`, `user`, `waitFor`, `cleanup`, and helpers                       |

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

- [Block](../block/index.md) for prebuilt accessible components powered by Craft.
- [Ripple](../ripple/index.md) for reactive state used inside Craft components.
- [Forge](../forge/index.md) for typed form state that integrates with Craft controls.

<!-- markdownlint-enable MD025 MD033 MD060 -->
