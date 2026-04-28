# @vielzeug/craftit

> Functional web components with signals, typed props, lifecycle helpers, and headless controls.

[![npm version](https://img.shields.io/npm/v/@vielzeug/craftit)](https://www.npmjs.com/package/@vielzeug/craftit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Craftit** is Vielzeug's custom-element authoring library. It builds on `@vielzeug/stateit` and adds component registration, reactive templates, typed prop signals, typed emits, slot inspection, host bindings, form-associated helpers, headless controls, observer composables, and DOM-focused testing utilities.

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

    return {
      render: () => html`
        <button @click=${() => (count.value += props.step.value)}>
          ${props.label}: ${count}
        </button>
        <p>Doubled: ${doubled}</p>
      `,
    };
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

```html
<my-counter label="Clicks" step="2"></my-counter>
```

## Features

- ✅ **Signals included** — re-exports `signal`, `computed`, `watch`, `batch`, `untrack`, and other `@vielzeug/stateit` primitives
- ✅ **Component authoring** — `define(tag, { props, setup, styles, formAssociated })`
- ✅ **Reactive templates** — `html` plus `each`, `classMap`, and `raw`
- ✅ **Typed prop signals** — plain defaults, `prop.*` helpers, or raw `PropDef` objects
- ✅ **Lifecycle helpers** — `effect`, `handle`, `onCleanup`, and `onElement`
- ✅ **Host and slot APIs** — host bindings, `syncAria`, `slots.has()`, and `slots.elements()`
- ✅ **Typed emits and context** — setup-context `emit`, `createContext`, `provide`, `inject`, `injectStrict`
- ✅ **Form-associated elements** — `defineField()` built on `ElementInternals`
- ✅ **Published subpaths** — `@vielzeug/craftit/controls`, `@vielzeug/craftit/observers`, `@vielzeug/craftit/testing`

## Package Structure

| Import | Purpose |
| --- | --- |
| `@vielzeug/craftit` | Core component/runtime API and stateit re-exports |
| `@vielzeug/craftit/controls` | Headless controls for fields, navigation, overlay, press, slider, spinner, and popup lists |
| `@vielzeug/craftit/observers` | `resizeObserver`, `intersectionObserver`, `mediaObserver` |
| `@vielzeug/craftit/testing` | `mount`, `fire`, `user`, `waitFor`, `waitForEvent`, `cleanup`, `within`, `mock` |

## Authoring Model

### Props

Craftit does not use a separate `defineProps()` helper. Define props directly on the component:

```ts
import { define, html, prop } from '@vielzeug/craftit';

define('status-pill', {
  props: {
    label: prop.string('Ready'),
    tone: prop.oneOf(['neutral', 'success', 'danger'] as const, 'neutral'),
    disabled: prop.bool(false),
    retries: prop.number(0),
  },
  setup(props) {
    return {
      render: () => html`
        <button ?disabled=${props.disabled} :data-tone=${props.tone}>
          ${props.label} (${props.retries})
        </button>
      `,
    };
  },
});
```

### Context and emits

```ts
import { createContext, define, html, injectStrict, provide, signal } from '@vielzeug/craftit';

const COUNT_CTX = createContext<ReturnType<typeof signal<number>>>('count');

type CounterEvents = {
  change: { value: number };
};

define<Record<string, never>, CounterEvents>('count-provider', {
  setup(_props, { emit }) {
    const count = signal(0);
    provide(COUNT_CTX, count);

    return {
      render: () => html`
        <button
          @click=${() => {
            count.value++;
            emit('change', { value: count.value });
          }}
        >
          <slot></slot>
        </button>
      `,
    };
  },
});

define('count-consumer', {
  setup() {
    const count = injectStrict(COUNT_CTX);

    return { render: () => html`<p>Count: ${count}</p>` };
  },
});
```

### Form-associated fields

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define('email-field', {
  formAssociated: true,
  setup() {
    const value = signal('');
    const field = defineField({ value });

    return {
      render: () => html`
        <input
          type="email"
          .value=${value}
          @input=${(event: Event) => {
            const next = (event.target as HTMLInputElement).value;

            value.value = next;
            field.setCustomValidity(next.includes('@') ? '' : 'Enter a valid email address');
          }}
        />
      `,
    };
  },
});
```

## Usage Notes

- `define()` setup must return a component instance with at least `render()`.
- Use `prop.*` for common reflected DOM attributes and raw `PropDef` objects when you need custom parsing or `reflect: false`.
- Use template bindings for inner DOM nodes and `host.*` / `host.bind(...)` for host element wiring.
- Observer helpers from `@vielzeug/craftit/observers` must run in `mount()` or another runtime where DOM elements already exist.
- `@vielzeug/craftit/testing` is DOM-only and intended for jsdom, happy-dom, or browser test environments.

## API Summary

| Area | Exports |
| --- | --- |
| Component authoring | `define`, `prop`, `type ComponentDefinition`, `type SetupContextBag` |
| Runtime | `effect`, `handle`, `onCleanup`, `onElement` |
| Templates and directives | `html`, `css`, `each`, `classMap`, `raw` |
| Context and slots | `createContext`, `provide`, `inject`, `injectStrict`, `syncAria` |
| Form | `defineField`, `type FormFieldOptions`, `type FormFieldHandle` |
| Utilities | `createId`, `ref`, `refs` |

## Documentation

Full docs at **[vielzeug.dev/craftit](https://vielzeug.dev/craftit)**

| | |
| --- | --- |
| [Overview](https://vielzeug.dev/craftit/) | Installation, authoring model, package surface |
| [Usage Guide](https://vielzeug.dev/craftit/usage) | Day-to-day patterns for props, templates, slots, context, forms, observers, controls, and tests |
| [Controls](https://vielzeug.dev/craftit/controls) | Headless interaction APIs from `@vielzeug/craftit/controls` |
| [API Reference](https://vielzeug.dev/craftit/api) | Entry points, symbols, and behavior notes |
| [Examples](https://vielzeug.dev/craftit/examples) | End-to-end recipes and testing patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
