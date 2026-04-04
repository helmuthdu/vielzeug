# @vielzeug/craftit

> Functional web components with signals, typed props, and template bindings

[![npm version](https://img.shields.io/npm/v/@vielzeug/craftit)](https://www.npmjs.com/package/@vielzeug/craftit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Craftit** provides a compact API for authoring custom elements with fine-grained reactivity. It builds on `@vielzeug/stateit` (re-exported from the main entry) and adds component lifecycle, templating, typed props, typed emits, setup-context slots, form-associated helpers, and observer utilities.

## Installation

```sh
pnpm add @vielzeug/craftit
# npm install @vielzeug/craftit
# yarn add @vielzeug/craftit
```

## Quick Start

```ts
import { computed, define, html, signal } from '@vielzeug/craftit';

define('my-counter', {
  setup() {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    return html`
      <button @click=${() => count.value++}>Count: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
  },
});
```

## Features

- ✅ **Component authoring** — `define(tag, { props, setup, ... })`
- ✅ **Signals included** — all `@vielzeug/stateit` exports are re-exported
- ✅ **Reactive templates** — `html` tagged template with text/attr/prop/event/ref bindings
- ✅ **Lifecycle helpers** — `onMount`, `onCleanup`, `onError`, `handle`, `watch`, `effect`, `fire.*`
- ✅ **Typed component APIs** — `define`, `prop`, `typed`, setup-context `emit` and `slots`
- ✅ **Context / DI** — `createContext`, `provide`, `inject`, `syncContextProps`
- ✅ **Form-associated controls** — `defineField` with `ElementInternals`
- ✅ **Observer utilities (observers)** — `resizeObserver`, `intersectionObserver`, and `mediaObserver`
- ✅ **Directive subpath** — `@vielzeug/craftit/directives`
- ✅ **Test subpath** — `@vielzeug/craftit/testing`

## Entry Points

- `@vielzeug/craftit` — Main API with component authoring and stateit re-exports.
- `@vielzeug/craftit/controls` — Stable composables for controls and overlays.
- `@vielzeug/craftit/observers` — Stable browser observer composables.
- `@vielzeug/craftit/directives` — Directive helpers like `attrs`, `bind`, `choose`, `each`, `when`, and `until`.
- `@vielzeug/craftit/testing` — Mount, query, and event testing utilities.

## Usage Highlights

### Typed props + emits

```ts
import { define, html } from '@vielzeug/craftit';

define<{ disabled: boolean; label: string }, { change: string }>('name-input', {
  props: {
    disabled: false,
    label: 'Name',
  },
  setup({ emit, props }) {
    return html`
      <label>${props.label}</label>
      <input :disabled=${props.disabled} @input=${(e: Event) => emit('change', (e.target as HTMLInputElement).value)} />
    `;
  },
});
```

### Directives subpath

```ts
import { define, html, signal } from '@vielzeug/craftit';
import { each, when } from '@vielzeug/craftit/directives';

define('todo-list', {
  setup() {
    const todos = signal([{ id: 1, text: 'Write docs', done: false }]);

    return html`
      ${when({
        condition: () => todos.value.length > 0,
        else: () => html`<p>No todos</p>`,
        then: () =>
          html`<ul>${each(todos, { key: (todo) => todo.id, render: (todo) => html`<li>${todo.text}</li>` })}</ul>`,
      })}
    `;
  },
});
```

### Setup-context slots

```ts
import { define, effect, html } from '@vielzeug/craftit';
import { when } from '@vielzeug/craftit/directives';

define('slot-panel', {
  setup({ slots }) {
    effect(() => {
      console.log('default elements:', slots.elements().value.length);
    });

    return html`
      ${when({
        condition: () => slots.has('header').value,
        else: () => html`<h2>Fallback header</h2>`,
        then: () => html`<slot name="header"></slot>`,
      })}
      ${when({
        condition: () => slots.has().value,
        else: () => html`<p>No content yet</p>`,
        then: () => html`<slot></slot>`,
      })}
    `;
  },
});
```

Use `slots.has(name?)` for presence checks and `slots.elements(name?)` when you need flattened assigned elements.

### Form-associated field

```ts
import { define, defineField, html, signal } from '@vielzeug/craftit';

define('email-field', {
  formAssociated: true,
  setup() {
    const value = signal('');
    const field = defineField({ value });

    return html`
      <input
        type="email"
        :value=${value}
        @input=${(e: Event) => {
          value.value = (e.target as HTMLInputElement).value;
          field.setCustomValidity(value.value.includes('@') ? '' : 'Invalid email');
        }}
      />
    `;
  },
});
```

## API Summary

- Components: `define`, `ComponentOptions`, `ComponentSetupContext`
- Runtime: `onMount`, `onCleanup`, `onError`, `handle`, `aria`, `effect`, `watch`, `fire`
- Props: `prop`, `typed`, `PropOptions`, `PropDef`, `InferPropsSignals`
- Slots / emits: setup-context `slots`, setup-context `emit`, `EmitFn`
- Context: `createContext`, `provide`, `inject`, `syncContextProps`, `InjectionKey`
- Form: `defineField`, `FormFieldOptions`, `FormFieldCallbacks`, `FormFieldHandle`
- Observers: `resizeObserver`, `intersectionObserver`, `mediaObserver`
- Controls: `createFieldIds`
- Utilities: `html`, `css`, `createId`
- Re-exported from stateit: `signal`, `computed`, `batch`, `untrack`, `readonly`, and more

## Documentation

Full docs at **[vielzeug.dev/craftit](https://vielzeug.dev/craftit)**

- [Overview](https://vielzeug.dev/craftit/) — Install and architecture overview
- [Usage Guide](https://vielzeug.dev/craftit/usage) — Practical patterns and subpath usage
- [API Reference](https://vielzeug.dev/craftit/api) — Complete signatures and types
- [Examples](https://vielzeug.dev/craftit/examples) — End-to-end component examples

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
