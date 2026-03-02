# Craftit API Reference

Complete API documentation for all Craftit functions, types, and interfaces.

## Table of Contents

[[toc]]

## Core Functions

### `define(name, setup)`

Define and register a custom element with a setup function.
**Parameters:**

- `name: string` – Element tag name (must contain a hyphen, e.g., 'my-component')
- `setup: () => SetupResult` – Setup function that returns template or configuration
  **Returns:** `void`
  **Example:**

```ts
import { define, signal, html } from '@vielzeug/craftit';
define('my-button', () => {
  const count = signal(0);
  return html` <button @click=${() => count.value++}>Clicked ${count} times</button> `;
});
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

---

## Signals

### `signal(initialValue)`

Create a reactive signal.
**Parameters:**

- `initialValue: T` – Initial value of the signal
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
- `.map(fn)` – Transform array signals (TypeScript-checked)

---

### `computed(compute)`

Create a computed signal that derives from other signals.
**Parameters:**

- `compute: () => T` – Function that computes the derived value
  **Returns:** `ComputedSignal<T>`
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
// Watch single signal
function watch<T>(source: Signal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
// Watch multiple signals
function watch<T extends readonly Signal<unknown>[]>(
  sources: [...T],
  cb: (values: [...T]) => void,
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
// Watch multiple
const name = signal('Alice');
watch([count, name], ([c, n]) => {
  console.log(`Count: ${c}, Name: ${n}`);
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

### `batch(fn)`

Batch multiple signal updates into a single re-render.
**Parameters:**

- `fn: () => void` – Function containing updates
  **Returns:** `void`
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

---

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

Conditional rendering helper.
**Parameters:**

- `condition: unknown | Signal<unknown>` – Condition to evaluate
- `then: string | HTMLResult | (() => string | HTMLResult) | { then, else }` – Content when true
- `else?: () => string | HTMLResult` – Content when false (optional)
  **Returns:** `WhenDirective | string | HTMLResult`
  **Example:**

```ts
const isLoggedIn = signal(false);
// Simple
html`${html.when(isLoggedIn, () => html`<p>Welcome!</p>`)}`;
// With else
html`
  ${html.when(isLoggedIn, {
    then: () => html`<p>Welcome!</p>`,
    else: () => html`<p>Please log in</p>`,
  })}
`;
```

---

### `html.show(condition, template)`

Toggle visibility with display property.
**Parameters:**

- `condition: unknown | Signal<unknown>` – Condition to evaluate
- `template: string | HTMLResult` – Content to show/hide
  **Returns:** `string | object`
  **Example:**

```ts
const isVisible = signal(true);
html` ${html.show(isVisible, html` <div>Toggle me!</div> `)} `;
```

---

### `html.each(items, keyFn, template, empty?)`

Efficient list rendering with keys.
**Parameters:**

- `items: T[] | Signal<T[]>` – Array of items
- `keyFn: (item: T) => string | number` – Key function
- `template: (item: T, index: number) => string | HTMLResult` – Item template
- `empty?: () => string | HTMLResult` – Empty state (optional)
  **Returns:** `EachDirective | object`
  **Example:**

```ts
const todos = signal([
  { id: 1, text: 'Learn Craftit' },
  { id: 2, text: 'Build app' },
]);
html`
  ${html.each(
    todos,
    (todo) => todo.id,
    (todo, i) => html`<li>${i + 1}. ${todo.text}</li>`,
    () => html`<p>No todos</p>`,
  )}
`;
```

---

### `html.choose(value, cases, default?)`

Switch/case helper for multiple conditions.
**Parameters:**

- `value: T | Signal<T>` – Value to match
- `cases: Array<[T, () => V]>` – Array of [value, template] pairs
- `default?: () => V` – Default template (optional)
  **Returns:** `V | (() => V)`
  **Example:**

```ts
const status = signal('loading');
html`
  ${html.choose(
    status,
    [
      ['idle', () => html`<p>Ready</p>`],
      ['loading', () => html`<p>Loading...</p>`],
      ['success', () => html`<p>Done!</p>`],
    ],
    () => html`<p>Unknown</p>`,
  )}
`;
```

---

### `html.until(...values)`

Suspense-like behavior for async operations.
**Parameters:**

- `...values: unknown[]` – Values in priority order (Promises, fallbacks)
  **Returns:** `() => string | HTMLResult`
  **Example:**

```ts
html`
  ${html.until(
    fetchData(), // Promise - highest priority
    () => html`<p>Loading...</p>`, // Fallback while loading
    'Error', // Final fallback
  )}
`;
```

---

### `html.portal(template, target)`

Render content to a different DOM location.
**Parameters:**

- `template: string | HTMLResult | Signal<string>` – Content to portal
- `target?: string | HTMLElement` – Target selector or element (default: 'body')
  **Returns:** `string | object`
  **Example:**

```ts
const isOpen = signal(false);
html`
  <button @click=${() => (isOpen.value = true)}>Open Modal</button>
  ${html.portal(
    html.when(
      isOpen,
      () => html`
        <div class="modal">
          <button @click=${() => (isOpen.value = false)}>Close</button>
        </div>
      `,
    ),
    'body',
  )}
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

- `classes: Record<string, boolean> | Array<...>` – Classes object or array
  **Returns:** `string`
  **Example:**

```ts
const isActive = signal(true);
// Object syntax
html`
  <div
    class=${html.classes({
      active: isActive.value,
      disabled: false,
      'btn-primary': true,
    })}></div>
`;
// Array syntax
html` <div class=${html.classes(['btn', isActive.value && 'active', { primary: true }])}></div> `;
```

---

### `html.log(...args)`

Debug helper that logs to console and returns empty string.
**Parameters:**

- `...args: unknown[]` – Values to log
  **Returns:** `string` (empty)
  **Example:**

```ts
html` <div>${html.log('Debug:', someValue)} Content</div> `;
```

---

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

---

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

## Props & Context

### `prop(name, defaultValue, options?)`

Define a reactive prop that syncs with HTML attributes.
**Parameters:**

- `name: string` – Prop/attribute name
- `defaultValue: T` – Default value
- `options?: PropOptions<T>` – Configuration
  **PropOptions:**
- `parse?: (value: string | null) => T` – Custom parser
- `reflect?: boolean` – Reflect changes back to attribute
  **Returns:** `Signal<T>`
  **Example:**

```ts
define('user-card', () => {
  const name = prop('name', 'Guest');
  const age = prop('age', 0, {
    parse: (v) => Number(v) || 0,
    reflect: true,
  });
  return html`
    <div>
      <h2>${name}</h2>
      <p>Age: ${age}</p>
    </div>
  `;
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

---

## Advanced Features

### `errorBoundary(component, options)`

Wrap a component with error handling.
**Parameters:**

- `component: () => string | HTMLResult` – Component function
- `options: ErrorBoundaryOptions` – Configuration
  **ErrorBoundaryOptions:**
- `fallback: (error: Error) => string | HTMLResult` – Error fallback
- `onError?: (error: Error) => void` – Error handler
  **Returns:** `string | HTMLResult`
  **Example:**

```ts
define('safe-component', () => {
  return errorBoundary(() => html`<risky-component></risky-component>`, {
    fallback: (error) => html`<p>Error: ${error.message}</p>`,
    onError: (error) => console.error(error),
  });
});
```

---

### `createErrorBoundary(component, options)`

Create a reusable error boundary.
**Parameters:**

- `component: () => string | HTMLResult` – Component function
- `options: ErrorBoundaryOptions` – Configuration
  **Returns:** `() => string | HTMLResult`
  **Example:**

```ts
const SafeComponent = createErrorBoundary(() => html`<risky-component></risky-component>`, {
  fallback: (error) => html`<p>Error</p>`,
});
define('app', () => html`${SafeComponent()}`);
```

---

### `lazy(factory, options?)`

Lazy load a component.
**Parameters:**

- `factory: () => Promise<{ default: () => string | HTMLResult }>` – Import function
- `options?: LazyOptions` – Configuration
  **LazyOptions:**
- `fallback?: () => string | HTMLResult` – Loading fallback
  **Returns:** `() => string | HTMLResult`
  **Example:**

```ts
const HeavyChart = lazy(() => import('./chart'), {
  fallback: () => html`<div>Loading...</div>`,
});
define(
  'dashboard',
  () => html`
    <div>
      <h1>Dashboard</h1>
      ${HeavyChart()}
    </div>
  `,
);
```

---

### `setGlobalErrorHandler(handler)`

Set a global error handler for all components.
**Parameters:**

- `handler: (error: Error) => void` – Global error handler
  **Returns:** `void`
  **Example:**

```ts
setGlobalErrorHandler((error) => {
  console.error('Global error:', error);
  // Send to error tracking service
});
```

---

## Testing Utilities

Import from `@vielzeug/craftit/trial`:

```ts
import { mount, fireEvent, userEvent } from '@vielzeug/craftit/trial';
```

### `mount(tagName, options?)`

Mount a component for testing.
**Parameters:**

- `tagName: string` – Component tag name
- `options?: object` – Mount options
  **Returns:** `Promise<ComponentFixture>`
  **ComponentFixture:**
- `element: HTMLElement` – Component element
- `shadow: ShadowRoot | null` – Shadow root
- `container: HTMLElement` – Parent container
- `query<E>(selector: string): E | null` – Query element
- `queryAll<E>(selector: string): E[]` – Query all elements
- `waitForUpdates(): Promise<void>` – Wait for reactive updates
- `unmount(): void` – Unmount component
  **Example:**

```ts
const { query, waitForUpdates } = await mount('my-component');
const button = query('button');
fireEvent.click(button!);
await waitForUpdates();
```

---

### `fireEvent`

Object with methods to fire DOM events.
**Methods:**

- `click(element, options?)`
- `input(element, options?)`
- `change(element, options?)`
- `keyDown(element, options?)`
- `keyUp(element, options?)`
- `focus(element, options?)`
- `blur(element, options?)`
- `submit(element, options?)`
- `mouseEnter(element, options?)`
- `mouseLeave(element, options?)`
- `custom(element, eventName, options?)`
  **Example:**

```ts
fireEvent.click(button);
fireEvent.input(input);
fireEvent.keyDown(input, { key: 'Enter' });
fireEvent.custom(element, 'my-event', { detail: { value: 123 } });
```

---

### `userEvent`

Object with methods for realistic user interactions.
**Methods:**

- `click(element): Promise<void>`
- `type(element, text): Promise<void>`
- `clear(element): Promise<void>`
- `selectOptions(element, value): Promise<void>`
- `upload(element, file): Promise<void>`
  **Example:**

```ts
await userEvent.click(button);
await userEvent.type(input, 'Hello');
await userEvent.clear(input);
```

---

## TypeScript Types

### Signal Types

```ts
interface Signal<T> {
  value: T;
  peek(): T;
  update(fn: (current: T) => T): void;
  map<U>(fn: (item: T[number], index: number) => U): Signal<U[]>;
}
type ComputedSignal<T> = Signal<T>;
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
interface Ref<T extends Element | null> {
  value: T | null;
}
interface InjectionKey<T> extends Symbol {
  readonly __craftit_injection_key?: T;
}
type SetupResult =
  | string
  | HTMLResult
  | {
      template: string | HTMLResult;
      styles?: (string | CSSStyleSheet)[];
    };
```

---

## Next Steps

- See [Usage Guide](./usage.md) for detailed patterns
- Check [Examples](./examples.md) for real-world code
- Visit [GitHub](https://github.com/saatkhel/vielzeug) for source code
