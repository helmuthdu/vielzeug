---
description: Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.
package: craftit
category: ui-primitives
keywords: [web-components, custom-elements, reactive, templates, signals, lifecycle]
related: [stateit, buildit, floatit]
exports: [define, html, css, signal, computed, effect, props, propsOf, on, ref, host, provide, inject]
---

# @vielzeug/craftit

> Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.

[![npm version](https://img.shields.io/npm/v/@vielzeug/craftit)](https://www.npmjs.com/package/@vielzeug/craftit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/craftit` &nbsp;·&nbsp; **Category:** Ui-primitives

**Key exports:** `define`, `html`, `css`, `signal`, `computed`, `effect`, `props`, `propsOf`, `on`, `ref`, `host`, `provide`, `inject`

**When to use:** Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, controls, observers, and testing utilities.

**Related:** [@vielzeug/stateit](https://vielzeug.dev/stateit/) · [@vielzeug/buildit](https://vielzeug.dev/buildit/) · [@vielzeug/floatit](https://vielzeug.dev/floatit/)

</details>

`@vielzeug/craftit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/craftit
npm install @vielzeug/craftit
yarn add @vielzeug/craftit
```

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

- [Overview](https://vielzeug.dev/craftit/)
- [Usage Guide](https://vielzeug.dev/craftit/usage)
- [API Reference](https://vielzeug.dev/craftit/api)
- [Examples](https://vielzeug.dev/craftit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
