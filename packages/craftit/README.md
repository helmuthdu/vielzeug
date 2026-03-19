# @vielzeug/craftit

> Functional web components with signals, typed props, and template bindings

[![npm version](https://img.shields.io/npm/v/@vielzeug/craftit)](https://www.npmjs.com/package/@vielzeug/craftit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Craftit** provides a compact API for authoring custom elements with fine-grained reactivity. It builds on `@vielzeug/stateit` (re-exported from the main entry) and adds component lifecycle, templating, typed props, context, slots/emits, form-associated helpers, and observer utilities.

## Installation

```sh
pnpm add @vielzeug/craftit
# npm install @vielzeug/craftit
# yarn add @vielzeug/craftit
```

## Quick Start

```ts
import { defineComponent, signal, computed, html } from '@vielzeug/craftit';

defineComponent({
  setup() {
    const count = signal(0);
    const doubled = computed(() => count.value * 2);

    return html`
      <button @click=${() => count.value++}>Count: ${count}</button>
      <p>Doubled: ${doubled}</p>
    `;
  },
  tag: 'my-counter',
});
```

## Features

- ✅ **Component authoring** — `defineComponent({ tag, props, setup, ... })`
- ✅ **Signals included** — all `@vielzeug/stateit` exports are re-exported
- ✅ **Reactive templates** — `html` tagged template with text/attr/prop/event/ref bindings
- ✅ **Lifecycle helpers** — `onMount`, `onCleanup`, `onError`, `handle`, `watch`, `effect`, `fire`
- ✅ **Typed component APIs** — `defineComponent`, `prop`, `typed`, setup-context `emit` and `slots`
- ✅ **Context / DI** — `createContext`, `provide`, `inject`, `syncContextProps`
- ✅ **Form-associated controls** — `defineField` with `ElementInternals`
- ✅ **Observer utilities** — `observeResize`, `observeIntersection`, `observeMedia`
- ✅ **Directive subpath** — `@vielzeug/craftit/directives`
- ✅ **Test subpath** — `@vielzeug/craftit/test`

## Entry Points

| Entry | Purpose |
|---|---|
| `@vielzeug/craftit` | Main API (components + stateit re-exports) |
| `@vielzeug/craftit/directives` | Directive helpers like `each`, `when`, `bind`, `match`, `until` |
| `@vielzeug/craftit/test` | Mount/query/event testing utilities |
| `@vielzeug/craftit/core` | Standalone bundle export |

## Usage Highlights

### Typed props + emits

```ts
import { defineComponent, html } from '@vielzeug/craftit';

defineComponent<
  { disabled: boolean; label: string },
  { change: string }
>({
  props: {
    disabled: { default: false },
    label: { default: 'Name' },
  },
  setup({ emit, props }) {
    return html`
      <label>${props.label}</label>
      <input
        :disabled=${props.disabled}
        @input=${(e: Event) => emit('change', (e.target as HTMLInputElement).value)}
      />
    `;
  },
  tag: 'name-input',
});
```

### Directives subpath

```ts
import { defineComponent, signal, html } from '@vielzeug/craftit';
import { each, when } from '@vielzeug/craftit/directives';

defineComponent({
  setup() {
    const todos = signal([{ id: 1, text: 'Write docs', done: false }]);

    return html`
      ${when(
        () => todos.value.length > 0,
        () => html`<ul>${each(todos, (todo) => html`<li>${todo.text}</li>`, () => html``, { key: (t) => t.id })}</ul>`,
        () => html`<p>No todos</p>`,
      )}
    `;
  },
  tag: 'todo-list',
});
```

### Form-associated field

```ts
import { defineComponent, defineField, signal, html } from '@vielzeug/craftit';

defineComponent({
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
  tag: 'email-field',
});
```

## API Summary

| Group | Main exports |
|---|---|
| Components | `defineComponent`, `DefineComponentOptions`, `DefineComponentSetupContext`, `BuildPropSchema` |
| Runtime | `onMount`, `onCleanup`, `onError`, `handle`, `aria`, `effect`, `watch`, `fire` |
| Props | `prop`, `typed`, `PropOptions`, `PropDef`, `InferPropsSignals` |
| Slots / emits | setup-context `slots`, setup-context `emit`, `onSlotChange`, `Slots`, `EmitFn` |
| Context | `createContext`, `provide`, `inject`, `syncContextProps`, `InjectionKey` |
| Form | `defineField`, `FormFieldOptions`, `FormFieldCallbacks`, `FormFieldHandle` |
| Observers | `observeResize`, `observeIntersection`, `observeMedia` |
| Utilities | `html`, `css`, `createId`, `createFormIds`, `guard`, `escapeHtml`, `toKebab` |
| Re-exported from stateit | `signal`, `computed`, `batch`, `untrack`, `readonly`, and more |

## Documentation

Full docs at **[vielzeug.dev/craftit](https://vielzeug.dev/craftit)**

| | |
|---|---|
| [Overview](https://vielzeug.dev/craftit/) | Install and architecture overview |
| [Usage Guide](https://vielzeug.dev/craftit/usage) | Practical patterns and subpath usage |
| [API Reference](https://vielzeug.dev/craftit/api) | Complete signatures and types |
| [Examples](https://vielzeug.dev/craftit/examples) | End-to-end component examples |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
