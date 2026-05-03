# @vielzeug/craftit

> Functional web components with signals, typed props, lifecycle hooks, and headless controls.

[![npm version](https://img.shields.io/npm/v/@vielzeug/craftit)](https://www.npmjs.com/package/@vielzeug/craftit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Craftit is Vielzeug's custom-element authoring library built on `@vielzeug/stateit`.

## Installation

```sh
pnpm add @vielzeug/craftit
# npm install @vielzeug/craftit
# yarn add @vielzeug/craftit
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

## Authoring Model

- `setup(props, ctx)` returns a template function: `() => html\`...\``
- Use `onMounted()` for post-mount DOM initialization
- Use `onCleanup()` for teardown
- Use `onElement(ref, cb)` for ref-driven effects

```ts
import { define, html, onCleanup, onMounted, signal } from '@vielzeug/craftit';

define('auto-save-field', {
  setup() {
    const value = signal('');

    onMounted(() => {
      console.log('ready for DOM interactions');
    });

    onCleanup(() => {
      console.log('saving', value.value);
    });

    return () => html`
      <textarea
        @input=${(e: Event) => {
          value.value = (e.target as HTMLTextAreaElement).value;
        }}
      ></textarea>
    `;
  },
});
```

## Features

- Signals included: `signal`, `computed`, `watch`, `batch`, `untrack`, `readonly`, `writable`, and related primitives
- Component authoring: `define(tag, { props, setup, styles, formAssociated })`
- Lifecycle hooks: `onMounted`, `onCleanup`, `onElement`, `effect`, `handle`
- Directives: `each`, `classMap`, `raw`
- Host/slot APIs: `host.bind`, `syncAria`, `slots.has`, `slots.elements`
- Form-associated elements: `defineField()`
- Published subpaths: `@vielzeug/craftit/controls`, `@vielzeug/craftit/observers`, `@vielzeug/craftit/testing`

## API Summary

| Area | Exports |
| --- | --- |
| Component authoring | `define`, `prop`, `type ComponentDefinition`, `type SetupContextBag` |
| Runtime | `onMounted`, `effect`, `handle`, `onCleanup`, `onElement` |
| Templates and directives | `html`, `css`, `each`, `classMap`, `raw` |
| Element references | `ref`, `refs`, `createId` |
| Context and slots | `createContext`, `provide`, `inject`, `injectStrict`, `syncAria` |
| Form | `defineField`, `type FormFieldOptions`, `type FormFieldHandle` |

## Documentation

Full docs at **[vielzeug.dev/craftit](https://vielzeug.dev/craftit)**

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
