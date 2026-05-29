---
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.
package: craft
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [ripple, block, orbit]
exports: [define, html, css, signal, computed, effect, props, propsOf, on, ref, host, provide, inject]
---

# /craft

> Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.

[![npm version](https://img.shields.io/npm/v//craft)](https://www.npmjs.com/package//craft) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/craft` &nbsp;·&nbsp; **Category:** Ui-primitives

**Key exports:** `define`, `html`, `css`, `signal`, `computed`, `effect`, `props`, `propsOf`, `on`, `ref`, `host`, `provide`, `inject`

**When to use:** Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/block](https://vielzeug.dev/block/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/)

</details>

`/craft` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /craft
npm install /craft
yarn add /craft
```

## Quick Start

```ts
import { computed, css, define, html, prop, signal } from '/craft';

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
      <button @click=${() => (count.value += props.step.value)}>
        ${props.label}: ${count}
      </button>
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

## Documentation

- [Overview](https://vielzeug.dev/craft/)
- [Usage Guide](https://vielzeug.dev/craft/usage)
- [API Reference](https://vielzeug.dev/craft/api)
- [Examples](https://vielzeug.dev/craft/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
