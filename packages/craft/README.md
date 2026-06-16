---
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.
package: craft
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [ripple, sigil, orbit]
exports: [define, html, css, prop, ref, signal, computed, watch, each, when, classMap, styleMap, model, live, raw, provide, inject, injectStrict, createContext, defineField, createFormContext, useFormContext, withAria, createStableId, createId, resetIdCounter, CraftitError]
---

# @vielzeug/craft

> Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.

[![npm version](https://img.shields.io/npm/v/@vielzeug/craft)](https://www.npmjs.com/package/@vielzeug/craft) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/craft` &nbsp;·&nbsp; **Category:** UI Primitives

**Key exports:** `define`, `html`, `css`, `prop`, `ref`, `signal`, `computed`, `watch`, `each`, `when`, `model`, `live`, `provide`, `inject`, `defineField`, `withAria`

**When to use:** Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/sigil](https://vielzeug.dev/sigil/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/)

</details>

`@vielzeug/craft` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/craft
npm install @vielzeug/craft
yarn add @vielzeug/craft
```

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
  setup(props, { bind, onMounted }) {
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

## Documentation

- [Overview](https://vielzeug.dev/craft/)
- [Usage Guide](https://vielzeug.dev/craft/usage)
- [API Reference](https://vielzeug.dev/craft/api)
- [Examples](https://vielzeug.dev/craft/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
