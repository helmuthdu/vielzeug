# @vielzeug/craftit

> Web component authoring with signals, reactive templates, and framework-agnostic custom elements

[![npm version](https://img.shields.io/npm/v/@vielzeug/craftit)](https://www.npmjs.com/package/@vielzeug/craftit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Craftit** is a declarative web component library built on fine-grained signals: define custom elements with `define()`, author reactive UIs with `signal()`, `computed()`, and `effect()`, and render with a tagged template literal.

## Installation

```sh
pnpm add @vielzeug/craftit
# npm install @vielzeug/craftit
# yarn add @vielzeug/craftit
```

## Quick Start

```typescript
import { define, signal, computed, html } from '@vielzeug/craftit';

define('my-counter', () => {
  const count = signal(0);
  const doubled = computed(() => count() * 2);

  return () => html`
    <div>
      <p>Count: ${count()}</p>
      <p>Doubled: ${doubled()}</p>
      <button @click=${() => count.set(count() + 1)}>Increment</button>
    </div>
  `;
});
```

## Features

- ✅ **Signals** — fine-grained reactive primitives: `signal()`, `computed()`, `effect()`
- ✅ **Custom elements** — `define(name, setup, options?)` registers a standard web component
- ✅ **html template tag** — efficient DOM patching with tagged template literals
- ✅ **Refs** — `ref<T>()` and `refs<T>()` for DOM element references
- ✅ **Watch** — `watch(source, callback)` for derived reactions
- ✅ **Batched updates** — `batch(fn)` to group multiple signal writes
- ✅ **Props, slots, emits** — `defineProps`, `defineSlots`, `defineEmits`
- ✅ **Framework-agnostic** — pure web components, usable anywhere

## Usage

### Signals

```typescript
import { signal, computed, effect, watch } from '@vielzeug/craftit';

const count = signal(0);
const label = computed(() => `Count: ${count()}`);

effect(() => {
  console.log(label()); // runs when label changes
});

watch(count, (next, prev) => {
  console.log('count changed:', prev, '->', next);
});

count.set(1);

// Batch multiple writes into one update
batch(() => {
  count.set(10);
  // other signals...
});
```

### Defining a Component

```typescript
import { define, signal, effect, html, ref } from '@vielzeug/craftit';

define('user-card', (props) => {
  const name = signal(props.name ?? 'Guest');
  const containerRef = ref<HTMLDivElement>();

  effect(() => console.log('name is:', name()));

  return () => html`
    <div ref=${containerRef}>
      <h2>${name()}</h2>
      <button @click=${() => name.set('Clicked!')}>Click me</button>
    </div>
  `;
});
```

### Props, Slots, and Emits

```typescript
define('my-input', () => {
  const props = defineProps<{ label: string; disabled?: boolean }>();
  const emit  = defineEmits<{ change: string }>();
  const slots = defineSlots();

  return () => html`
    <label>${props.label}</label>
    <input
      ?disabled=${props.disabled}
      @input=${(e: Event) => emit('change', (e.target as HTMLInputElement).value)}
    />
    <slot>${slots.default}</slot>
  `;
});
```

### Signal Utilities

```typescript
import { readonly, writable, isSignal, toValue } from '@vielzeug/craftit';

const count  = signal(0);
const ro     = readonly(count);      // read-only view
const custom = writable(
  () => count(),
  (v) => count.set(v * 2),
);

isSignal(count);   // true
toValue(count);    // 0
toValue(42);       // 42 (plain values pass through)
```

## API

| Export | Description |
|---|---|
| `define(name, setup, options?)` | Register a custom element |
| `signal(initial)` | Create a reactive signal |
| `computed(fn)` | Create a memoized derived signal |
| `effect(fn)` | Run a side-effect when dependencies change |
| `watch(source, callback)` | Watch a signal or getter for changes |
| `batch(fn)` | Group mutations into a single update |
| `html` | Tagged template for reactive DOM rendering |
| `ref<T>()` | Single DOM element reference |
| `refs<T>()` | Multiple DOM element references |
| `readonly(signal)` | Read-only signal wrapper |
| `writable(get, set)` | Custom get/set signal |
| `isSignal(v)` | Type guard for signals |
| `toValue(v)` | Unwrap signal or return plain value |
| `defineProps<T>()` | Access declared component props |
| `defineEmits<T>()` | Emit typed events |
| `defineSlots()` | Access component slots |

## Documentation

Full docs at **[vielzeug.dev/craftit](https://vielzeug.dev/craftit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/craftit/usage) | Components, signals, templates |
| [API Reference](https://vielzeug.dev/craftit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/craftit/examples) | Real-world component patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
