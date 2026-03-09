---
title: Craftit — API Reference
description: Complete API reference for Craftit web component framework.
---

## Craftit API Reference

[[toc]]

## Core Functions

### `define(name, setup, options?)`

Define and register a custom element with a setup function.
**Parameters:**

- `name: string` – Element tag name (must contain a hyphen, e.g., 'my-component')
- `setup: (ctx: SetupContext) => SetupResult` – Setup function called with `{ host }` context; returns template or configuration
- `options?: DefineOptions` – Optional configuration

**DefineOptions:**

- `formAssociated?: boolean` – Enable form-associated custom element (required for `defineField()`)
- `target?: string | HTMLElement` – Render the shadow root into this selector or element (portal)

**Returns:** `string` (the registered element tag name)
**Example:**

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('my-button', () => {
  const count = signal(0);
  return html` <button @click=${() => count.value++}>Clicked ${count} times</button> `;
});
```

**With Form Association:**

```ts
import { define, signal, html, defineField } from '@vielzeug/craftit';

// Must set formAssociated: true to use defineField()
define(
  'custom-input',
  () => {
    const value = signal('');

    // Register as form field
    const formField = defineField({ value });

    return html` <input type="text" :value=${value} @input=${(e) => (value.value = e.target.value)} /> `;
  },
  { formAssociated: true },
); // ← Required for defineField()
```

**With Styles:**

```ts
define('styled-button', () => {
  const styles = css`
    button {
      background: #0070f3;
      color: white;
    }
  `;
  return {
    template: html`<button>Click Me</button>`,
    styles: [styles.content],
  };
});
```

## Signals

### `signal(initialValue, options?)`

Create a reactive signal.
**Parameters:**

- `initialValue: T` – Initial value of the signal
- `options?: { name?: string }` – Optional options; `name` sets `debugName` for debugging
  **Returns:** `Signal<T>`
  **Example:**

```ts
const count = signal(0);
const name = signal('Alice');
const user = signal({ name: 'Bob', age: 30 });
// Read value
console.log(count.value); // 0
// Update value
count.value = 10;
// Update with function
count.update((current) => current + 1);
```

**Signal Methods:**

- `.value` – Get or set the signal value
- `.peek()` – Read value without tracking dependencies
- `.update(fn)` – Update value using a function
- `.assign(partial)` – Shallow-merge a Partial into an object signal
- `.derive(fn)` – Shorthand for `computed(() => fn(signal.value))`
- `.map(fn)` – Transform array signals (TypeScript-checked)
- `.subscribe(cb)` – Watch for changes; returns a cleanup fn

---

### `computed(compute)`

Create a read-only computed signal that derives from other signals.
**Parameters:**

- `compute: () => T` – Function that computes the derived value
  **Returns:** `Signal<T>`
  **Example:**

```ts
const firstName = signal('John');
const lastName = signal('Doe');
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
console.log(fullName.value); // "John Doe"
firstName.value = 'Jane';
console.log(fullName.value); // "Jane Doe"
```

---

### `effect(fn)`

Run side effects when dependencies change.
**Parameters:**

- `fn: () => CleanupFn | void` – Effect function, optionally returns cleanup
  **Returns:** `CleanupFn`
  **Example:**

```ts
const count = signal(0);
// Runs immediately and on changes
effect(() => {
  console.log('Count:', count.value);
});
// With cleanup
const cleanup = effect(() => {
  const timer = setInterval(() => {
    console.log('Count:', count.value);
  }, 1000);
  return () => clearInterval(timer);
});
// Stop the effect
cleanup();
```

---

### `watch(source, callback, options?)`

Watch signals for changes with explicit callback.
**Signatures:**

```ts
// Watch single signal — callback receives (newValue, prevValue)
function watch<T>(source: Signal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
// Watch multiple signals — callback takes no arguments; read .value inside
function watch(
  sources: ReadonlyArray<ReadonlySignal<unknown>>,
  cb: () => void,
  options?: WatchOptions,
): CleanupFn;
```

**Parameters:**

- `source` – Signal or array of signals to watch
- `cb` – Callback function
- `options.immediate?: boolean` – Run immediately
  **Returns:** `CleanupFn`
  **Example:**

```ts
const count = signal(0);
// Watch single
watch(count, (newValue, oldValue) => {
  console.log(`Changed from ${oldValue} to ${newValue}`);
});
// Watch multiple — read .value inside callback; no values are passed
const name = signal('Alice');
watch([count, name], () => {
  console.log(`Count: ${count.value}, Name: ${name.value}`);
});
// With immediate
watch(
  count,
  (value) => {
    console.log(value);
  },
  { immediate: true },
);
```

---

### `writable(get, set)`

Create a bi-directional computed signal: reads track `get` reactively; writes call `set`.
**Parameters:**

- `get: () => T` – Getter function (reactive)
- `set: (value: T) => void` – Setter function
  **Returns:** `Signal<T>`
  **Example:**

```ts
const celsius = signal(0);
const fahrenheit = writable(
  () => (celsius.value * 9) / 5 + 32,
  (f) => (celsius.value = ((f - 32) * 5) / 9),
);
fahrenheit.value = 212; // celsius.value → 100
```

---

### `isSignal(value)`

Type guard — returns `true` if `value` is a `Signal`.
**Parameters:**

- `value: unknown` – Value to check
  **Returns:** `boolean`
  **Example:**

```ts
console.log(isSignal(signal(0))); // true
console.log(isSignal(42)); // false
```

---

### `toValue(v)`

Unwrap a `Signal<T>` or return a plain value as-is.
**Parameters:**

- `v: T | Signal<T>` – Value or signal
  **Returns:** `T`
  **Example:**

```ts
const s = signal(42);
console.log(toValue(s)); // 42
console.log(toValue(10)); // 10
```

---

### `batch(fn)`

Batch multiple signal updates into a single re-render.
**Parameters:**

- `fn: () => T` – Function containing updates
  **Returns:** `T` (the return value of `fn`)
  **Example:**

```ts
const count = signal(0);
const name = signal('Alice');
batch(() => {
  count.value = 10;
  name.value = 'Bob';
  count.value = 20;
}); // Only re-renders once
```

---

### `untrack(fn)`

Read signals without creating dependencies.
**Parameters:**

- `fn: () => T` – Function to run untracked
  **Returns:** `T`
  **Example:**

```ts
const count = signal(0);
const multiplier = signal(2);
const result = computed(() => {
  const c = count.value; // Tracked
  const m = untrack(() => multiplier.value); // Not tracked
  return c * m;
});
multiplier.value = 3; // Doesn't trigger update
count.value = 5; // Triggers update
```

---

### `readonly(signal)`

Create a read-only view of a signal.
**Parameters:**

- `signal: Signal<T>` – Signal to make readonly
  **Returns:** `{ readonly value: T }`
  **Example:**

```ts
const count = signal(0);
const readonlyCount = readonly(count);
console.log(readonlyCount.value); // 0
// readonlyCount.value = 10; // Error!
count.value = 10; // OK
```

## Template System

### `html`

Tagged template function for creating HTML with bindings.
**Signature:**

```ts
function html(strings: TemplateStringsArray, ...values: unknown[]): HTMLResult | string;
```

**Returns:** `HTMLResult | string`
**Example:**

```ts
const name = signal('Alice');
html`
  <div>
    <h1>Hello, ${name}!</h1>
    <button @click=${() => console.log('Clicked')}>Click Me</button>
  </div>
`;
```

**Binding Syntax:**

- Text: `${value}`
- Property: `:prop=${value}`
- Attribute: `:attr=${value}`
- Boolean Attribute: `?attr=${value}`
- Event: `@event=${handler}`
- Ref: `ref=${refObject}`

---

### `html.when(condition, then, else?)`

Conditional rendering — inserts/removes DOM based on truthiness.
**Signatures:**

```ts
// Two-branch form
html.when(condition, then: () => V, else?: () => V): V | (() => V);
// Multi-branch else-if chain
html.when([cond, fn], ...[cond, fn], fallback?: () => V): V | (() => V);
```

**Returns:** `V | (() => V)` (reactive when `condition` is a Signal or function)
**Example:**

```ts
const isLoggedIn = signal(false);
// Simple
html`${html.when(isLoggedIn, () => html`<p>Welcome!</p>`)}`;
// With else
html`
  ${html.when(
    isLoggedIn,
    () => html`<p>Welcome!</p>`,
    () => html`<p>Please log in</p>`,
  )}
`;
// Multi-branch
const role = signal('guest');
html`
  ${html.when(
    [() => role.value === 'admin', () => html`<admin-panel />`],
    [() => role.value === 'editor', () => html`<editor-panel />`],
    () => html`<guest-panel />`,
  )}
`;
```

---

### `html.show(condition, template)`

Toggle **visibility** (`display:none`) without unmounting. Prefer over `html.when` when the child has expensive setup or stateful input.
**Parameters:**

- `condition: unknown | Signal<unknown>` – When falsy the element is hidden
- `template: () => string | HTMLResult` – Content (mounted once, never destroyed)
  **Returns:** `string | HTMLResult`
  **Example:**

```ts
const open = signal(false);
html`${html.show(open, () => html`<heavy-chart></heavy-chart>`)}`;
```

---

### `html.bind(signal)`

Two-way input binding — attaches `:value` + `input`/`change` listener in one step.
**Parameters:**

- `signal: Signal<T>` – Signal to bind
  **Returns:** binding descriptor (`{ __model: Signal<T> }`)
  **Example:**

```ts
const name = signal('');
html`<input ${html.bind(name)} />`; // equivalent to :value + @input
```

---

### `html.each(source, ...)`

Efficient keyed list rendering. Three call signatures:

```ts
// Three-arg keyed (recommended for mutable lists)
html.each(source, keyFn, templateFn, emptyFn?);
// Simple (index as key)
html.each(source, templateFn);
```

**Parameters:**

- `source` – `T[] | Signal<T[]> | (() => T[])` – The list (signal or function for reactivity)
- `keyFn` – `(item: T) => Key` – Stable identity key
- `templateFn` – `(item: T, index: number) => V` – Per-item template
- `emptyFn?` – `() => V` – Rendered when list is empty
  **Returns:** `V | (() => V)`
  **Example:**

```ts
const todos = signal([{ id: 1, text: 'Learn Craftit' }]);
html`
  ${html.each(
    todos,
    (todo) => todo.id,
    (todo, i) => html`<li>${i + 1}. ${todo.text}</li>`,
    () => html`<p>No todos</p>`,
  )}
`;
// Simple form
html`${html.each(todos, (todo) => html`<li>${todo.text}</li>`)}`;
```

---

### `suspense(asyncFn, options)`

Standalone function (not attached to `html`) — handles async data loading with fallback, template, and error/retry.
**Parameters:**

- `asyncFn: (signal: AbortSignal) => Promise<T>` – Async function (receives an `AbortSignal`)
- `options: { fallback, template, error? }` – Rendering callbacks
  **Returns:** `() => string | HTMLResult` (call it inside a template)
  **Example:**

```ts
import { suspense } from '@vielzeug/craftit';
const loadUser = suspense(
  async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  },
  {
    fallback: () => html`<p>Loading…</p>`,
    template: (user) => html`<p>Hello, ${user.name}!</p>`,
    error: (err, retry) => html`
      <p>${err.message}</p>
      <button @click=${retry}>Retry</button>
    `,
  },
);
html`${loadUser()}`;
```

---

### `raw` / `rawHtml()`

`raw` is a tagged template that skips escaping entirely. `rawHtml()` bypasses escaping for a single interpolated value inside an `html` template.
**Example:**

```ts
const trusted = '<strong>Bold</strong>';
raw`<div>${trusted}</div>`; // raw tag
html`<div>${rawHtml(trusted)}</div>`; // only this value unescaped
```

---

### Portals (Component Target)

Render components to different DOM locations using the `target` option.
**Example:**

```ts
define(
  'modal-dialog',
  () => {
    const isOpen = prop('open', false, { parse: (v) => v === '' || v === 'true' });
    return html`
      ${html.when(
        isOpen,
        () => html`
          <div class="modal">
            <button
              @click=${() => {
                isOpen.value = false;
              }}>
              Close
            </button>
          </div>
        `,
      )}
    `;
  },
  { target: 'body' },
);

// Usage:
const showModal = signal(false);
html`
  <button @click=${() => (showModal.value = true)}>Open Modal</button>
  <modal-dialog ?open=${showModal}></modal-dialog>
`;
```

---

### `html.style(styles)`

Generate dynamic inline styles.
**Parameters:**

- `styles: Partial<CSSStyleDeclaration> | Record<string, string | number>` – Style object
  **Returns:** `string`
  **Example:**

```ts
const fontSize = signal(16);
html`
  <div
    style=${html.style({
      fontSize: fontSize.value, // Auto-adds 'px'
      color: 'red',
      padding: '1rem',
      fontWeight: 'bold',
    })}>
    Styled
  </div>
`;
```

---

### `html.classes(classes)`

Generate dynamic class strings.
**Parameters:**

- `classes: Record<string, boolean | Signal<boolean> | (() => boolean) | undefined>` – Object map of class names to conditions (reactive signals and getter functions supported)
  **Returns:** `string | ReadonlySignal<string>` (signal when any condition is reactive)
  **Example:**

````ts
const isActive = signal(true);
// Wrap in arrow function for reactivity
html`
  <div
    class=${() =>
      html.classes({
        active: isActive.value,
        disabled: false,
        'btn-primary': true,
      })}></div>
`;
```

## Styling

### `css`

Tagged template function for CSS.
**Signature:**

```ts
function css(strings: TemplateStringsArray, ...values: unknown[]): CSSResult;
```

**Returns:** `CSSResult`
**Example:**

```ts
const primaryColor = '#0070f3';
const styles = css`
  button {
    background: ${primaryColor};
    color: white;
  }
`;
// Use in component
return {
  template: html`<button>Click</button>`,
  styles: [styles.content],
};
```

---

### `css.theme(light, dark?, options?)`

Create theme variables with light and dark modes.
**Parameters:**

- `light: Record<string, string | number>` – Light theme values
- `dark?: Record<string, string | number>` – Dark theme values (optional)
- `options?: { selector?: string; attribute?: string }` – Configuration
  **Returns:** `ThemeVars<T>`
  **Example:**

```ts
const theme = css.theme(
  {
    primaryColor: '#0070f3',
    textColor: '#333',
    bgColor: '#fff',
  },
  {
    primaryColor: '#4dabf7',
    textColor: '#fff',
    bgColor: '#222',
  },
  {
    selector: ':host',
    attribute: 'data-theme',
  },
);
const styles = css`
  :host {
    color: ${theme.textColor};
    background: ${theme.bgColor};
  }
  ${theme}/* Inject theme CSS */
`;
```

## Lifecycle Hooks

### `onMount(fn)`

Register a function to run after component mounts.
**Parameters:**

- `fn: () => CleanupFn | void` – Mount callback, optionally returns cleanup
  **Returns:** `void`
  **Example:**

```ts
define('my-component', () => {
  onMount(() => {
    console.log('Mounted!');
    const timer = setInterval(() => {}, 1000);
    return () => clearInterval(timer);
  });
  return html`<div>Content</div>`;
});
```

---

### `onUnmount(fn)`

Register a function to run before component unmounts.
**Parameters:**

- `fn: CleanupFn` – Unmount callback
  **Returns:** `void`
  **Example:**

```ts
onUnmount(() => {
  console.log('Unmounting...');
});
```

---

### `onUpdated(fn)`

Register a function to run after each component update.
**Parameters:**

- `fn: () => void` – Update callback
  **Returns:** `void`
  **Example:**

```ts
onUpdated(() => {
  console.log('Component updated!');
});
```

---

### `onCleanup(fn)`

Register a cleanup function.
**Parameters:**

- `fn: CleanupFn` – Cleanup callback
  **Returns:** `void`
  **Example:**

```ts
onCleanup(() => {
  console.log('Cleaning up...');
});
```

---

### `handle(target, event, listener, options?)`

Registers an event listener and **automatically removes it** via `onCleanup` on unmount. Must be called within an active lifecycle context — typically inside `onMount`.

**Parameters:**

- `target: EventTarget` – The element to listen on
- `event: K` – Event name (keyof `HTMLElementEventMap`)
- `listener: (e: HTMLElementEventMap[K]) => void` – Typed event handler
- `options?: AddEventListenerOptions` – Optional listener options

**Returns:** `void`

**Example:**

```ts
define('toggle-button', () => {
  onMount(() => {
    const host = /* ... */;
    handle(host, 'click', onClick);
    handle(host, 'keydown', onKeydown);
    // no return/cleanup needed
  });
  return html`<slot></slot>`;
});
```

---

### `onError(fn)`

Scoped error handler — catches render and lifecycle errors within the current component.
**Parameters:**

- `fn: (error: Error, info?: { componentStack?: string }) => void` – Error callback
  **Returns:** `void`
  **Example:**

```ts
define('safe-component', () => {
  onError((error, info) => {
    console.error('Component error:', error.message);
    // send to error tracker
  });
  return html`<risky-child></risky-child>`;
});
```

---

### `aria(attrs)`

Reactively sets ARIA attributes on the host element. Pass getter functions to make individual attributes reactive — they will be tracked as signal dependencies. Plain primitive values are set once. `null` / `undefined` / `false` removes the attribute.

Must be called synchronously during component setup.

**Parameters:**

- `attrs: Record<string, AriaAttrValue>` – Map of ARIA attribute names (without the `aria-` prefix) to values or reactive getters

**`AriaAttrValue`:**

```ts
type AriaAttrValue =
  | (() => string | boolean | number | null | undefined) // reactive getter
  | string
  | boolean
  | number
  | null
  | undefined; // static value
```

**Returns:** `void`

**Example:**

```ts
define('custom-checkbox', () => {
  const checked = signal(false);
  aria({
    role: 'checkbox',
    checked: () => checked.value, // reactive — updates on signal change
    label: 'Toggle option', // static — set once
  });
  return html`<div @click=${() => (checked.value = !checked.value)}></div>`;
});
```

## Props & Context

### `defineField(options)`

Create a form-associated custom element using ElementInternals API.

::: warning Important
The component must be defined with `{ formAssociated: true }` option to use `defineField()`.
:::

**Parameters:**

- `options: FormFieldOptions<T>` – Configuration object

**FormFieldOptions:**

- `value: Signal<T>` – Signal containing the form value (required)
- `disabled?: Signal<boolean>` – Optional signal for disabled state
- `toFormValue?: (value: T) => File | FormData | string | null` – Custom form value transformation

**Returns:** `FormFieldHandle`

**FormFieldHandle:**

- `internals: ElementInternals | null` – ElementInternals instance (null if not supported)
- `setValidity: ElementInternals['setValidity']` – Set validation state
- `reportValidity: () => boolean` – Report validity to user

**Example:**

```ts
define(
  'custom-input',
  () => {
    const value = signal('');

    // Basic usage
    const formField = field({ value });

    return html` <input :value=${value} @input=${(e) => (value.value = e.target.value)} /> `;
  },
  { formAssociated: true },
); // ← Required!
```

**With Validation:**

```ts
define(
  'email-input',
  () => {
    const value = signal('');
    const formField = field({ value });

    const isValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.value));

    watch(value, () => {
      if (!isValid.value && value.value) {
        formField.setValidity({ typeMismatch: true }, 'Please enter a valid email');
      } else {
        formField.setValidity({}, '');
      }
    });

    return html`<input type="email" :value=${value} />`;
  },
  { formAssociated: true },
);
```

**With Custom Form Value:**

```ts
define(
  'rating-input',
  () => {
    const rating = signal(0);

    const formField = field({
      value: rating,
      toFormValue: (v) => String(v), // Convert number to string
    });

    return html`
      <div>${[1, 2, 3, 4, 5].map((n) => html` <button @click=${() => (rating.value = n)}>★</button> `)}</div>
    `;
  },
  { formAssociated: true },
);
```

**With Disabled State:**

```ts
define(
  'toggle-input',
  () => {
    const value = signal('');
    const disabled = signal(false);

    const formField = field({
      value,
      disabled, // Syncs with internals.states
    });

    return html` <input :value=${value} ?disabled=${disabled} /> `;
  },
  { formAssociated: true },
);
```

---

### `defineProps(defs)`

Declare multiple props at once. Keys are converted to kebab-case attribute names automatically.
**Parameters:**

- `defs: Record<string, PropDef<T>>` – Object of `{ default, ...PropOptions }` per prop
  **Returns:** `InferPropsSignals<T>` (typed object of `Signal<T>` per key)
  **Example:**

```ts
define('product-card', () => {
  const props = defineProps({
    title: { default: '' },
    price: { default: 0, type: Number },
    inStock: { default: true, type: Boolean, reflect: true },
  });
  // props.title   → Signal<string>  (attribute: "title")
  // props.price   → Signal<number>  (attribute: "price")
  // props.inStock → Signal<boolean> (attribute: "in-stock", reflected)
  return html`<h2>${props.title} - $${props.price}</h2>`;
});
```

---

### `prop(name, defaultValue, options?)`

Define a reactive prop that syncs with HTML attributes.
**Parameters:**

- `name: string` – Prop/attribute name
- `defaultValue: T` – Default value
- `options?: PropOptions<T>` – Configuration
  **PropOptions:**
- `parse?: (value: string | null) => T` – Custom parser (overrides auto-inference)
- `reflect?: boolean` – Reflect changes back to attribute
- `required?: boolean` – Warn at runtime when the attribute is absent

**Auto-inference from default value type** (no `parse` required):
| Default type | Behavior |
|---|---|
| `boolean` | HTML attribute-presence: absent = `false`, present = `true` |
| `number` | `Number(v)` |
| `string` | raw attribute string, or `defaultValue` when absent |

**Returns:** `Signal<T>`
**Example:**

```ts
define('user-card', () => {
  const name = prop('name', 'Guest');
  const count = prop('count', 0); // auto: Number(v)
  const disabled = prop('disabled', false); // auto: v !== null
  return html`<div>${name}</div>`;
});
```

---

### `ref()`

Create an element reference.
**Returns:** `Ref<T>`
**Example:**

```ts
define('focus-input', () => {
  const inputRef = ref<HTMLInputElement>();
  onMount(() => {
    inputRef.value?.focus();
  });
  return html` <input ref=${inputRef} type="text" /> `;
});
```

---

### `refs()`

Create a list of element references for multiple elements. `values` is a live, deduped `ReadonlyArray<T>`.
**Returns:** `RefList<T>`
**Example:**

```ts
define('item-list', () => {
  const itemRefs = refs<HTMLLIElement>();
  onMount(() => {
    console.log('Mounted items:', itemRefs.values.length); // .values not .value
  });
  return html`
    <ul>
      <li ref=${itemRefs}>Item 1</li>
      <li ref=${itemRefs}>Item 2</li>
      <li ref=${itemRefs}>Item 3</li>
    </ul>
  `;
});
```

---

### `createContext<T>()`

Create a typed injection key (preferred over `Symbol()`).
**Returns:** `InjectionKey<T>`
**Example:**

```ts
const ThemeKey = createContext<{ mode: Signal<'light' | 'dark'> }>();
provide(ThemeKey, { mode: signal('light') });
const theme = inject(ThemeKey); // typed: { mode: Signal<'light' | 'dark'> } | undefined
```

---

### `provide(key, value)`

Provide a value to descendant components.
**Parameters:**

- `key: InjectionKey<T> | string | symbol` – Injection key
- `value: T` – Value to provide
  **Returns:** `void`
  **Example:**

```ts
const ThemeKey: InjectionKey<{ mode: Signal<string> }> = Symbol('theme');
define('app-root', () => {
  const mode = signal('light');
  provide(ThemeKey, { mode });
  return html`<slot></slot>`;
});
```

---

### `inject(key, fallback?)`

Inject a value from an ancestor component.
**Parameters:**

- `key: InjectionKey<T> | string | symbol` – Injection key
- `fallback?: T` – Fallback value if not found
  **Returns:** `T | undefined`
  **Example:**

```ts
define('themed-button', () => {
  const theme = inject(ThemeKey);
  return html` <button class=${theme?.mode.value}>Button</button> `;
});
```

## Advanced Features

## Utilities

### `createId(prefix?)`

Creates a unique, stable ID string — suitable for `aria-labelledby`, `aria-describedby`, and similar accessibility linkages. Call once per component instance (at setup time or inside `onMount`).

**Parameters:**

- `prefix?: string` – Optional prefix for the generated ID

**Returns:** `string`

**Example:**

```ts
define('labeled-input', () => {
  const inputRef = ref<HTMLInputElement>();
  onMount(() => {
    const host = inputRef.value?.getRootNode()?.host as HTMLElement;
    const labelId = createId('input-label');
    // labelId → 'input-label-1' (stable, unique per instance)
    host.setAttribute('aria-labelledby', labelId);
  });
  return html`<input ref=${inputRef} />`;
});
```

---

### `guard(condition, handler)`

Wraps an event handler with a condition. The handler is only invoked when `condition()` returns `true`. Use for disabled checks, readonly guards, or any runtime condition.

**Parameters:**

- `condition: () => boolean` – Guard predicate evaluated at call time
- `handler: (e: E) => void` – Handler to invoke when condition passes

**Returns:** `(e: E) => void`

**Example:**

```ts
define('guarded-button', () => {
  const props = defineProps({ disabled: { default: false } });
  onMount(() => {
    const host = /* ... */;
    const handleClick = guard(() => !props.disabled.value, (e) => {
      e.preventDefault();
      doSomething();
    });
    // Multi-condition guard:
    const handleInput = guard(
      () => !props.disabled.value && !props.readonly.value,
      (e: InputEvent) => process(e),
    );
    handle(host, 'click', handleClick);
  });
  return html`<slot></slot>`;
});
```

---

### `defineSlots()`

Access slotted content from the host element. Must be called inside a `define` setup function.
**Returns:** `SlotsAPI<T>`

**SlotsAPI methods:**

- `has(name): boolean` – Returns `true` if the named slot has assigned nodes

Slot content is rendered using `<slot>` HTML elements in the template. `defineSlots()` is primarily used with `has()` to conditionally render slot wrappers.

**Example:**

```ts
define('card-component', () => {
  const s = defineSlots<{ default: unknown; footer: unknown }>();
  return html`
    <div class="card">
      <div class="body"><slot></slot></div>
      ${s.has('footer') ? html`<footer><slot name="footer"></slot></footer>` : ''}
    </div>
  `;
});

// Usage:
html`
  <card-component>
    <p>Main content goes here</p>
    <p slot="footer">Footer content</p>
  </card-component>
`;
```

---

### `defineEmits()`

Dispatch typed custom events from a component. Must be called inside a `define` setup function.
**Returns:** `EmitFn<T>` where `T` is a `Record<EventName, EventDetail>`
**Example:**

```ts
type ButtonEvents = { clicked: { count: number }; reset: void };
define('counter-button', () => {
  const count = signal(0);
  const fire = defineEmits<ButtonEvents>();
  return html`
    <button
      @click=${() => {
        count.value++;
        fire('clicked', { count: count.value });
      }}>
      Clicked ${count} times
    </button>
  `;
});
// Consumer:
html`<counter-button @clicked=${(e: CustomEvent) => console.log(e.detail.count)}></counter-button>`;
```

---

### Form Lifecycle Callbacks

These must be called inside a `define` setup for components with `{ formAssociated: true }`:

| Function                 | Fires when                            |
| ------------------------ | ------------------------------------- |
| `onFormAssociated(fn)`   | Element is inserted into a form       |
| `onFormDisabled(fn)`     | Form's `disabled` state changes       |
| `onFormReset(fn)`        | The associated form is reset          |
| `onFormStateRestore(fn)` | Browser restores submitted-form state |

```ts
define(
  'custom-input',
  () => {
    const value = signal('');
    const formField = field({ value });

    onFormReset(() => {
      value.value = '';
    });
    onFormDisabled((isDisabled) => console.log('disabled:', isDisabled));

    return html`<input :value=${value} @input=${(e) => (value.value = e.target.value)} />`;
  },
  { formAssociated: true },
);
```

## Testing Utilities

Import from `@vielzeug/craftit/test`:

```ts
import { mount, fire, user, waitFor, within, flush, install } from '@vielzeug/craftit/test';
```

### Setup

Register auto-cleanup in your test setup file so mounted components are removed after each test:

```ts
// vitest.setup.ts
import { afterEach } from 'vitest';
import { install } from '@vielzeug/craftit/test';
install(afterEach);
```

---

### `mount(tagOrSetup, options?)`

Mount a component into the DOM, flush reactive updates, and return a `Fixture`.

**Parameters:**

- `tagOrSetup: string | SetupFn` – Registered tag name **or** an inline setup function (no `define()` ceremony needed)
- `options?: MountOptions` – Mount options
  - `props?: Record<string, unknown>` – Properties set directly on the element
  - `attrs?: Record<string, string | number | boolean>` – HTML attributes
  - `html?: string` – Inner HTML for slot content
  - `container?: HTMLElement` – Parent container (default: `document.body`)

**Returns:** `Promise<Fixture<T>>`

**Fixture members:**

- `query<E>(selector): E | null` – Query inside shadow root
- `queryAll<E>(selector): E[]` – Query all inside shadow root
- `queryByText<E>(text, selector?): E | null` – Find by trimmed text content
- `queryByTestId<E>(testId): E | null` – Find by `data-testid`
- `act(fn): Promise<void>` – Run callback then flush updates
- `attr(name, value): Promise<void>` – Set attribute then flush
- `attrs(record): Promise<void>` – Set multiple attributes then flush
- `flush(): Promise<void>` – Wait for all reactive updates
- `destroy(): void` – Remove the component from the DOM
- `element: T` – The component element
- `shadow: ShadowRoot` – The component's shadow root

**Example:**

```ts
// Inline setup (recommended — no define() or tag name needed)
const { query, act } = await mount(() => {
  const count = signal(0);
  return html`<button @click=${() => count.value++}>${count}</button>`;
});

const button = query('button')!;
await act(() => fire.click(button));
expect(button.textContent?.trim()).toBe('1');

// Registered tag name
const fixture = await mount('my-counter');
```

---

### `fire`

Synchronous low-level DOM event helpers.

**Methods:**

- `fire.click(element, options?)`
- `fire.input(element, options?)`
- `fire.change(element, options?)`
- `fire.keyDown(element, options?)`
- `fire.keyUp(element, options?)`
- `fire.focus(element, options?)`
- `fire.blur(element, options?)`
- `fire.submit(element, options?)`
- `fire.mouseEnter(element, options?)`
- `fire.mouseLeave(element, options?)`
- `fire.custom(element, eventName, detail?, options?)`

**Example:**

```ts
fire.click(button);
fire.input(input);
fire.keyDown(input, { key: 'Enter' });
fire.custom(element, 'value-change', { value: 42 });
```

---

### `user`

Async higher-level user interactions that mirror real browser behavior.

**Methods:**

- `user.click(element, options?): Promise<void>`
- `user.type(element, text): Promise<void>` – Types character-by-character (appends)
- `user.fill(element, text): Promise<void>` – Clears then types
- `user.clear(element): Promise<void>`
- `user.select(element, value | value[]): Promise<void>`
- `user.press(element, key, options?): Promise<void>`
- `user.hover(element): Promise<void>`
- `user.unhover(element): Promise<void>`
- `user.dblClick(element): Promise<void>`

**Example:**

```ts
await user.click(button);
await user.type(input, 'Hello');
await user.fill(input, 'replacement');
await user.select(select, 'option1');
```

---

### `waitFor(fn, options?)`

Poll until a callback returns truthy or completes without throwing. Supports both boolean conditions and `expect()` assertions.

**Parameters:**

- `fn: () => unknown` – Assertion or boolean condition
- `options?.timeout?: number` – Max wait in ms (default: `1000`)
- `options?.interval?: number` – Poll interval in ms (default: `50`)
- `options?.message?: string` – Custom error message on timeout

**Example:**

```ts
await waitFor(() => query('.status')?.textContent === 'loaded');
await waitFor(() => expect(count).toBe(3));
```

---

### `within(element)`

Create query helpers scoped to any element — useful for slotted/light DOM content.

**Returns:** `QueryScope` (`query`, `queryAll`, `queryByText`, `queryAllByText`, `queryByTestId`, `queryAllByTestId`)

**Example:**

```ts
const panel = fixture.query('.panel')!;
const { query } = within(panel);
expect(query('.title')?.textContent).toBe('Hello');
```

---

### `flush()`

Flush all pending reactive updates and one animation frame.

**Returns:** `Promise<void>`

---

### `install(afterEachHook)`

Register automatic cleanup as an `afterEach` hook. Call once in your test setup file.

**Parameters:**

- `afterEachHook: (fn: () => void) => void` – The `afterEach` from your test runner

**Example:**

```ts
import { afterEach } from 'vitest';
import { install } from '@vielzeug/craftit/test';
install(afterEach);
```

## TypeScript Types

### Signal Types

```ts
class Signal<T> {
  value: T;
  peek(): T;
  update(fn: (current: T) => T): void;
  assign(partial: Partial<T>): void;
  derive<U>(fn: (value: T) => U): Signal<U>;
  map<U>(fn: (item: T extends (infer I)[] ? I : never, index: number) => U): Signal<U[]>;
  subscribe(cb: (value: T, prev: T) => void): CleanupFn;
  debugName?: string;
}
// `computed()` and `writable()` return Signal<T> — there is no separate ComputedSignal type.
type ReadonlySignal<T> = Omit<Signal<T>, 'update' | 'assign'> & { readonly value: T };
type CleanupFn = () => void;
type EffectFn = () => CleanupFn | void;
```

### Template Types

```ts
interface HTMLResult {
  __html: string;
  __bindings: Binding[];
  toString(): string;
}
interface CSSResult {
  content: string;
  toString(): string;
}
```

### Component Types

```ts
interface Ref<T extends Element = Element> {
  value: T | null;
}
interface RefList<T extends Element = Element> {
  readonly values: ReadonlyArray<T>;
  add(el: T | null): void;
  clear(): void;
}
// Preferred over raw Symbol() for injection keys
type InjectionKey<T> = symbol & { readonly __craftit_injection_key?: T };
type SetupResult =
  | string
  | HTMLResult
  | {
      template: string | HTMLResult;
      styles?: (string | CSSStyleSheet | CSSResult)[];
    };

type DefineOptions = {
  formAssociated?: boolean;
  /** Render the element's shadow root into this selector or element instead of itself */
  target?: string | HTMLElement;
};
```

### Form Integration Types

```ts
interface FormFieldOptions<T> {
  value: Signal<T>;
  disabled?: Signal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
}

interface FormFieldHandle {
  readonly internals: ElementInternals | null;
  setValidity: ElementInternals['setValidity'];
  reportValidity: () => boolean;
}
```

## Next Steps

- See [Usage Guide](./usage.md) for detailed patterns
- Check [Examples](./examples.md) for real-world code
- Visit [GitHub](https://github.com/saatkhel/vielzeug) for source code
