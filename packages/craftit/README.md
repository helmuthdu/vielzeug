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
  const doubled = computed(() => count.value * 2);

  return html`
    <div>
      <p>Count: ${count}</p>
      <p>Doubled: ${doubled}</p>
      <button @click=${() => count.value++}>Increment</button>
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
const label = computed(() => `Count: ${count.value}`);

effect(() => {
  console.log(label.value); // runs when label changes
});

watch(count, (next, prev) => {
  console.log('count changed:', prev, '->', next);
});

count.value = 1;

// Batch multiple writes into one update
batch(() => {
  count.value = 10;
  // other signals...
});
```

### Defining a Component

```typescript
import { define, prop, effect, html, ref } from '@vielzeug/craftit';

define('user-card', () => {
  const name = prop('name', 'Guest');
  const containerRef = ref<HTMLDivElement>();

  effect(() => console.log('name is:', name.value));

  return html`
    <div ref=${containerRef}>
      <h2>${name}</h2>
      <button @click=${() => (name.value = 'Clicked!')}>Click me</button>
    </div>
  `;
});
```

### Props, Slots, and Emits

```typescript
define('my-input', () => {
  const props = defineProps({
    label: { default: '' },
    disabled: { default: false },
  });
  const emit = defineEmits<{ change: string }>();

  return html`
    <label>${props.label}</label>
    <input
      ?disabled=${props.disabled}
      @input=${(e: Event) => emit('change', (e.target as HTMLInputElement).value)}
    />
    <slot></slot>
  `;
});
```

### Signal Utilities

```typescript
import { readonly, writable, isSignal, toValue } from '@vielzeug/craftit';

const count  = signal(0);
const ro     = readonly(count);      // read-only view
const custom = writable(
  () => count.value,
  (v) => (count.value = v * 2),
);

isSignal(count);   // true
toValue(count);    // 0
toValue(42);       // 42 (plain values pass through)
```

## API

**Components**

| Export | Description |
|---|---|
| `define(name, setup, options?)` | Register a custom element |
| `prop(name, default, options?)` | Declare a single reactive prop (syncs with HTML attribute) |
| `defineProps(defs)` | Declare multiple props at once from an object literal |
| `defineEmits<T>()` | Emit typed custom events |
| `defineSlots()` | Check whether named slots have content |
| `provide(key, value)` | Provide a context value to descendant components |
| `inject(key, fallback?)` | Inject a context value from an ancestor component |
| `createContext<T>()` | Create a typed injection key |
| `field(options)` | Form-associated element via ElementInternals |

**Signals** (re-exported from `@vielzeug/stateit`)

| Export | Description |
|---|---|
| `signal(initial)` | Create a reactive signal |
| `computed(fn)` | Create a memoized derived signal |
| `effect(fn)` | Run a side-effect when dependencies change |
| `watch(source, callback)` | Watch a signal (or array of signals) for changes |
| `batch(fn)` | Group mutations into a single update |
| `untrack(fn)` | Read signals without creating dependencies |
| `readonly(signal)` | Read-only signal wrapper |
| `writable(get, set)` | Bi-directional computed signal |
| `isSignal(v)` | Type guard for signals |
| `toValue(v)` | Unwrap signal or return plain value |

**Templates**

| Export | Description |
|---|---|
| `html` | Tagged template for reactive DOM rendering |
| `html.when(cond, then, else?)` | Conditional rendering (mounts/unmounts) |
| `html.show(cond, template)` | Conditional visibility (keeps DOM mounted) |
| `html.each(source, keyFn, templateFn)` | Keyed list rendering |
| `html.bind(signal)` | Two-way input binding shorthand |
| `html.classes(obj)` | Build dynamic class strings |
| `html.style(obj)` | Build dynamic inline style strings |
| `raw` | Tagged template — no HTML escaping |
| `rawHtml(content)` | Mark a string as trusted raw HTML |
| `escapeHtml(value)` | Escape HTML entities |
| `suspense(asyncFn, opts)` | Async data with loading/error/retry |

**Styling**

| Export | Description |
|---|---|
| `css` | Tagged template for scoped shadow DOM styles |
| `css.theme(light, dark?, opts?)` | CSS custom properties for light/dark theming |

**Lifecycle**

| Export | Description |
|---|---|
| `onMount(fn)` | Run after component connects to the DOM |
| `onUnmount(fn)` | Run before component disconnects |
| `onUpdated(fn)` | Run after each reactive update |
| `onCleanup(fn)` | Register a cleanup function (runs on unmount) |
| `onError(fn)` | Scoped error boundary for render/lifecycle errors |
| `handle(target, event, fn)` | Add event listener with automatic cleanup |
| `aria(attrs)` | Reactive ARIA attribute bindings on the host element |

**Utilities**

| Export | Description |
|---|---|
| `ref<T>()` | Single DOM element reference |
| `refs<T>()` | Multiple DOM element references (live `ReadonlyArray`) |
| `guard(condition, handler)` | Conditional event handler wrapper |
| `createId(prefix?)` | Generate unique stable IDs for accessibility |

## Documentation

Full docs at **[vielzeug.dev/craftit](https://vielzeug.dev/craftit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/craftit/usage) | Components, signals, templates |
| [API Reference](https://vielzeug.dev/craftit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/craftit/examples) | Real-world component patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
