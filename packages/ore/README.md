# @vielzeug/ore

> Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.

[![npm version](https://img.shields.io/npm/v/@vielzeug/ore)](https://www.npmjs.com/package/@vielzeug/ore) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/ore` &nbsp;·&nbsp; **Category:** UI Primitives

**Key exports:** `define`, `html`, `css`, `prop`, `ref`, `onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect`, `bind`, `provide`, `inject`, `useEmit`, `useSlots`, `getHost`, `each`, `when`, `live`, `unsafeHtml`, `useField`

**When to use:** Functional custom-element authoring with typed props, reactive templates, lifecycle helpers, observers, and testing utilities.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/refine](https://vielzeug.dev/refine/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/)

</details>

`@vielzeug/ore` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output. Install
`@vielzeug/ripple` alongside it: Ore uses the application's Ripple runtime as a peer dependency.

## Installation

```sh
pnpm add @vielzeug/ore @vielzeug/ripple
npm install @vielzeug/ore @vielzeug/ripple
yarn add @vielzeug/ore @vielzeug/ripple
```

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

`setup()` takes only `props`. Everything else — lifecycle hooks (`onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect`), host bindings (`bind`), context (`inject`/`injectStrict`/`provide`), and per-instance factories (`useEmit<Emits>()`, `useSlots<SlotNames>()`) — is imported from `@vielzeug/ore` and resolved while `setup()` (or a composable it calls) is running. Setup state is connection-scoped: disconnect disposes it and reconnect runs setup again.

## Testing

`@vielzeug/ore/testing` mounts real custom elements into jsdom/happy-dom and gives you `act`/query/dispose in one fixture — no separate render + flush + query steps to remember:

```ts
import { mount } from '@vielzeug/ore/testing';

const { element, query, act, dispose } = await mount('my-counter');

expect(query('button')?.textContent).toContain('Count: 0');

await act(() => query('button')?.click());

expect(query('button')?.textContent).toContain('Count: 1');

dispose(); // or: use the fixture as `using fixture = await mount(...)`
```

Register `cleanup` once so mounted elements don't leak between tests:

```ts
// vitest.setup.ts
import { afterEach } from 'vitest';
import { install } from '@vielzeug/ore/testing';

install(afterEach); // add { formInternals: true } when testing form-associated (useField) components
```

Also available from `@vielzeug/ore/testing`: `renderHook` (test a composable in isolation, without a full template),
`flush`, and form-internals support. Import generic DOM interactions, queries, and waiting helpers from
`@vielzeug/assay`. See the [Usage Guide](https://vielzeug.dev/ore/usage) for the full API.

## Documentation

- [Overview](https://vielzeug.dev/ore/)
- [Usage Guide](https://vielzeug.dev/ore/usage)
- [API Reference](https://vielzeug.dev/ore/api)
- [Examples](https://vielzeug.dev/ore/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
