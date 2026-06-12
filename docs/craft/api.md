---
title: Craft — API Reference
description: Complete API reference for @vielzeug/craft, @vielzeug/craft/observers, and @vielzeug/craft/testing.
---

[[toc]]

## API At a Glance

| Symbol                | Purpose                                        | Execution mode | Common gotcha                                                 |
| --------------------- | ---------------------------------------------- | -------------- | ------------------------------------------------------------- |
| `define()`            | Register a custom element with reactive setup  | Sync           | Tag must contain a hyphen; call before first use              |
| `html`                | Tagged template literal returning HTMLResult   | Sync           | Expressions must be signals, functions, or primitives         |
| `effect()`            | Component-scoped reactive side effect          | Sync           | Auto-cleaned up on disconnect                                 |
| `onMounted()`         | DOM-ready callback after template mounts       | Sync           | DOM queries inside setup() run before mount                   |
| `onCleanup()`         | Register teardown for component disconnect     | Sync           | Must be called synchronously during setup                     |
| `onElement()`         | Run callback when a ref resolves to an element | Sync           | Re-runs when the element reference changes                    |
| `onEvent()`           | Scoped event listener with auto-cleanup        | Sync           | No-ops silently when target is `null`/`undefined`             |
| `prop.*`              | Typed prop helpers (string, bool, number, …)   | Sync           | Prop values are signals — read `.value`                       |
| `provide/inject`      | Context API for parent-to-descendant sharing   | Sync           | `inject()` throws if called outside setup                     |
| `ref()`               | Reactive reference to a DOM element            | Sync           | Value is null until after first mount                         |
| `createContext()`     | Create a typed injection key                   | Sync           | Context is scoped to the component tree                       |
| `syncAria()`          | Reactively sync ARIA attributes to an element  | Sync           | Effects leak if called without a setup context and no cleanup |
| `each()`              | Keyed list rendering with DOM diffing          | Sync           | Every item must have a unique key at all times                |
| `when()`              | Conditional branch rendering                   | Sync           | Static boolean fast-path skips reactive subscription          |
| `createFormContext()` | Coordinate form state across child fields      | Sync           | Submit errors are captured in `error` signal, not thrown      |
| `defineField()`       | Wire a form-associated element to internals    | Sync           | Requires `formAssociated: true`; call once per component      |
| `resetIdCounter()`    | Reset `createStableId` counter to 1            | Sync           | Use in `beforeEach` for deterministic test IDs                |

## Package Entry Points

| Import                      | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `@vielzeug/craft`           | Core authoring/runtime API plus ripple re-exports   |
| `@vielzeug/craft/devtools`  | `debugFlush` — verbose flush for timing diagnostics |
| `@vielzeug/craft/observers` | Resize, intersection, mutation, and media observers |
| `@vielzeug/craft/testing`   | DOM-oriented test helpers                           |

## Core Component API

### `define(tag, definition)`

```ts
define<Props, Emits, SlotNames>(tag: string, definition: ComponentDefinition<Props, Emits, SlotNames>): string;
```

The `setup()` function receives typed prop signals and a context bag:

```ts
type SetupContextBag<Emits, SlotNames> = {
  bind: HostBindFn;
  el: HTMLElement;
  emit: EmitFn<Emits>;
  slots: ComponentSlots<SlotNames>;
};
```

`setup()` returns an `HTMLResult` directly (not a function):

```ts
setup(props, ctx) {
  return html`<div>${props.label}</div>`;
}
```

### ComponentDefinition

```ts
type ComponentDefinition<Props, Emits, SlotNames> = {
  formAssociated?: boolean;
  loading?: () => HTMLResult; // Template shown while async setup is pending
  onError?: (error: CraftitError, element: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult | Promise<HTMLResult>;
  shadow?: Partial<ShadowRootInit> | false; // false = light DOM (no shadow root)
  slots?: readonly SlotNames[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
```

#### Async setup

When `setup()` returns a `Promise<HTMLResult>`, `loading()` is rendered immediately. The real template replaces it once the promise resolves.

```ts
define('user-profile', {
  props: { userId: prop.string('') },
  loading: () => html`<p>Loading…</p>`,
  onError: (_err, el) => html`<p>Failed to load ${el.getAttribute('user-id')}</p>`,
  async setup(props) {
    const user = await fetchUser(props.userId.value);
    return html`<p>${user.name}</p>`;
  },
});
```

## Runtime Helpers

### `effect(fn)`

Component-aware wrapper around ripple's `effect()`. Auto-registers cleanup on the current scope.

### `onMounted(fn)`

```ts
onMounted(fn: () => void | CleanupFn): void;
```

Registers work that runs after the component template is mounted. Multiple calls are supported and run in registration order. Each callback is error-isolated — one failure does not prevent others from running.

### `onEvent(target, event, listener, options?)`

Adds an event listener and automatically removes it on cleanup. Must be called during setup or `scope.run()`. Silently no-ops when `target` is `null` or `undefined`, making it safe to use with reactive refs that may not yet be resolved.

### `onCleanup(fn)`

```ts
onCleanup(fn: CleanupFn): void;
```

Registers a cleanup function to be called when the component disconnects. Must be called synchronously during `setup()` or inside `scope.run()`.

### `onElement(ref, callback)`

Runs `callback` when a `ref()` resolves to an element and re-runs when that element changes. Returns a subscription.

## Props API

| Helper                              | Signature          | Notes                                                                                                        |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `prop.string(defaultValue?)`        | `PropDef<string>`  | Reflects by default                                                                                          |
| `prop.bool(defaultValue?)`          | `PropDef<boolean>` | Any non-null attribute value other than `"false"` parses as `true`; `"false"` or absent attribute is `false` |
| `prop.number(defaultValue?)`        | `PropDef<number>`  | Uses `Number(...)` parsing                                                                                   |
| `prop.oneOf(allowed, defaultValue)` | `PropDef<T>`       | Restricts to provided string union                                                                           |
| `prop.json(defaultValue)`           | `PropDef<T>`       | JSON.parse; `reflect: false` by default                                                                      |
| `prop.ref<T>(defaultValue?)`        | `PropDef<T>`       | JS-only property — never reads/writes an attribute; use for functions, arrays, or non-serialisable objects   |

When you need custom parsing or `reflect: false`, use a raw `PropDef` object:

```ts
props: {
  data: { default: '', parse: (v) => v ?? '', reflect: false },
}
```

Use `prop.ref<T>()` for props that hold JS-only values (functions, rich objects) that cannot be serialised through an HTML attribute:

```ts
define('data-grid', {
  props: {
    getRowKey: prop.ref<(row: unknown) => string>(),
    columns:   prop.ref<DataGridColumn[]>([]),
    onSort:    prop.ref<(key: string) => void>(),
  },
  setup(props) {
    // Set from JS: grid.getRowKey = (row) => row.id
    return html`...`;
  },
});
```

## Template and Directives

### `html`

Tagged template literal that returns an `HTMLResult`. Supports text interpolation, attributes (`:attr`), boolean attributes (`?attr`), events (`@event`), refs (`ref=`), and nested templates.

### `css`

Tagged template literal that returns a `CSSResult` for use in `styles`.

### Directives

| Directive                              | Purpose                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `each(source, key, render, fallback?)` | Keyed list rendering with DOM diffing                                                     |
| `when(condition, truthy, falsy?)`      | Conditional rendering                                                                     |
| `classMap(record)`                     | Reactive class string from object map                                                     |
| `styleMap(record)`                     | Reactive inline style string from object map                                              |
| `live(signal)`                         | Live form binding — skips stale writes to in-focus inputs                                 |
| `model(signal)`                        | Two-way value binding for `input`, `select` (single), `textarea`; writes on `input` event |
| `raw(value)`                           | Trusted HTML rendering (XSS risk without sanitizer)                                       |

### Event Modifiers

Event bindings support dot-separated modifiers: `@click.prevent.stop=${handler}`

| Modifier  | Effect                       |
| --------- | ---------------------------- |
| `prevent` | Calls `e.preventDefault()`   |
| `stop`    | Calls `e.stopPropagation()`  |
| `self`    | Only fires if target matches |
| `capture` | Uses capture phase           |
| `once`    | Fires once then removes      |
| `passive` | Sets passive listener option |

## Host Bindings

The setup context provides `bind: HostBindFn`:

```ts
bind({
  attr: { role: 'button', 'aria-expanded': () => String(open.value) },
  class: { 'is-open': open },
  style: { '--height': () => height.value + 'px' },
  on: { click: handleClick },
});
```

`bind()` returns a cleanup function. For standalone use outside setup, use `createBind(element)`.

### `syncAria(target, config)`

Reactively syncs ARIA attributes to a target element. Static values are set once; getter functions are tracked as effects.

```ts
syncAria(element, {
  role: 'button',
  expanded: () => isOpen.value,
  disabled: () => isDisabled.value,
});
```

When `autoCleanup: true` is passed and `syncAria` is called outside a component setup context (e.g., in a standalone module), a `console.warn` is logged because no cleanup can be registered automatically.

## Slots

- `slots.has(name?)` — `ReadonlySignal<boolean>` — whether the named (or default) slot has assigned content
- `slots.elements(name?)` — `ReadonlySignal<Element[]>` — the assigned elements for the slot

Slot signals update reactively when assigned content changes, including when slots are inserted dynamically (via `when()` or `each()`) after mount. When `slots` is declared as a `const` array on the definition, TypeScript narrows the accepted slot name arguments.

## Context API

- `createContext<T>(description?)` — Create a typed injection key
- `provide(key, value)` — Provide a value to descendants (must be called during `setup()`)
- `inject(key)` — Resolve from nearest ancestor; returns `undefined` if not found
- `inject(key, fallback)` — Resolve with a fallback value
- `injectStrict(key)` — Resolve or throw if absent

Both `provide()` and `inject()` must be called synchronously during `setup()`. Calling them outside a setup context throws `'Lifecycle hooks must be called synchronously during component setup'`. Context resolution walks the ancestor chain including shadow DOM boundaries.

## Utilities

- `ref<T>()` — Create a `Signal<T | null>` element reference. Set to the element via `ref=` in templates.
- `createId(prefix?)` — Generate an auto-incrementing unique ID string (e.g. `cft-1`).
- `createStableId(prefix?)` — Generate a stable unique ID with a short random tag (e.g. `field-a3k21`). The tag is fixed per page load, so IDs are stable across renders.
- `resetIdCounter()` — Reset the `createStableId` counter to 1. Useful in test `beforeEach` blocks to ensure deterministic IDs.

## Form-Associated API

### `defineField(options)`

Wire a form-associated element to `ElementInternals`. Requires `formAssociated: true` on the component definition.

```ts
type FormFieldOptions<T> = {
  disabled?: ReadonlySignal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T> | ReadonlySignal<T>;
};

type FormFieldHandle = {
  checkValidity(): boolean;
  readonly internals: ElementInternals;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  setValidity: ElementInternals['setValidity'];
};
```

### Form Context

Coordinate form state across child field components:

- `createFormContext(options?)` — Create a `FormContextValue`
- `useFormContext()` — Inject from nearest ancestor; returns `undefined` if no context is provided

To provide a form context to descendants, call `provide(FORM_CONTEXT_KEY, ctx)` during setup.

```ts
type FormContextValue = {
  readonly dirty: ReadonlySignal<boolean>;
  readonly error: ReadonlySignal<unknown>; // Last submit error; null if last submit succeeded
  markDirty(): void; // Call from input/change handlers
  registerField(validity: ReadonlySignal<boolean>): () => void;
  reset(): void; // Resets dirty + error to false/null; calls onReset
  submit(e?: Event): Promise<void>;
  readonly submitting: ReadonlySignal<boolean>;
  readonly valid: ReadonlySignal<boolean>; // true when all registered fields are valid
};
```

## Observer APIs

Import from `@vielzeug/craft/observers`.

- `resizeObserver(element)` — Returns `ReadonlySignal<ResizeObserverEntry>`
- `intersectionObserver(element, options?)` — Returns `ReadonlySignal<IntersectionObserverEntry>`
- `mutationObserver(element, options?)` — Returns `ReadonlySignal<MutationRecord[]>`
- `mediaObserver(query)` — Returns `ReadonlySignal<boolean>`

## Testing APIs

Import from `@vielzeug/craft/testing`.

| API                      | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `mount(setup, options?)` | Mount a component and return a test fixture               |
| `cleanup()`              | Remove all mounted elements and reset test state          |
| `install(afterEach)`     | _(removed)_ Use `cleanup()` manually in `afterEach`       |
| `flush(options?)`        | Drain reactive updates and animation frames               |
| `FLUSH_DEEP`             | Pre-built options for deep async chains (`maxTurns: 12`)  |
| `mock(tag, template?)`   | Register a no-op stub custom element                      |
| `renderHook(setup)`      | Run lifecycle hooks in isolation without a full component |
| `fire.*`                 | Synchronous DOM event dispatchers                         |
| `user.*`                 | Async user interactions (type, fill, click, press, …)     |
| `waitFor(fn, options?)`  | Poll until an assertion passes or a condition is truthy   |
| `waitForEvent(el, name)` | Resolve when the target element emits the named event     |
| `within(element)`        | Scoped query helpers (`query`, `queryAll`, …)             |

> **Test isolation:** `cleanup()` also resets internal `live()` signal tracking and the raw HTML sanitizer. Call it in `afterEach` to prevent state leaking between tests.

#### `Fixture` interface

```ts
interface Fixture<T extends HTMLElement = HTMLElement> {
  element: T;
  readonly shadow: ShadowRoot | null;
  query<E extends Element>(selector: string): E | null;
  queryAll<E extends Element>(selector: string): E[];
  queryByText<E extends Element>(text: string, selector?: string): E | null;
  queryByTestId<E extends Element>(testId: string): E | null;
  attr(name: string, value: string | number | boolean): Promise<void>;
  attrs(record: Record<string, string | number | boolean>): Promise<void>;
  flush(options?: FlushOptions): Promise<void>;
  act(fn: () => unknown): Promise<void>;
  destroy(): void;
}
```

#### `renderHook`

Useful for testing composable lifecycle hooks (`onMounted`, `effect`, `inject`, etc.) without a template:

```ts
const { result, flush, destroy } = await renderHook(() => {
  const count = signal(0);
  onMounted(() => {
    count.value = 1;
  });
  return count;
});
expect(result.value).toBe(1);
```

## Ripple Re-exports

Craft re-exports these from `@vielzeug/ripple`:

- `signal`, `computed`, `batch`, `untrack`, `watch`, `isSignal`, `scope`
- `type Signal`, `type ReadonlySignal`, `type Scope`, `type WatchOptions`

## Lifecycle Events

| Event              | When                                                            |
| ------------------ | --------------------------------------------------------------- |
| `craft:connect`    | After every `connectedCallback` (including reconnects)          |
| `craft:disconnect` | After `disconnectedCallback`, before component state is reset   |
| `craft:error`      | When setup throws — bubbles, composed; detail is `CraftitError` |

## Types

```ts
type PropDef<T> = {
  default: T;
  parse: (value: string | null) => T;
  reflect?: boolean;
};

type SetupContextBag<
  Emits extends Record<string, unknown> = Record<string, unknown>,
  SlotNames extends string = string,
> = {
  bind: HostBindFn; // Apply reactive bindings to the host element
  el: HTMLElement; // The host element
  emit: EmitFn<Emits>; // Dispatch typed custom events
  slots: ComponentSlots<SlotNames>; // Reactive slot signals
};

type ComponentDefinition<Props, Emits, SlotNames extends string> = {
  formAssociated?: boolean;
  loading?: () => HTMLResult; // Shown while async setup is pending
  onError?: (error: CraftitError, el: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult | Promise<HTMLResult>;
  shadow?: Partial<ShadowRootInit> | false; // false = light DOM
  slots?: readonly SlotNames[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type HostBindConfig = {
  attr?: Record<string, HostBindingValue>;
  class?: (() => Record<string, boolean>) | Record<string, boolean | (() => boolean) | ReadonlySignal<boolean>>;
  on?: Record<string, (event: Event) => void>;
  style?: Record<string, HostBindingValue>;
};

type ComponentSlots<S extends string = string> = {
  elements(name?: S): ReadonlySignal<Element[]>;
  has(name?: S): ReadonlySignal<boolean>;
};

type Ref<T extends Element> = Signal<T | null>;

type RefCallback<T extends Element> = (el: T | null) => void;

type InjectionKey<T> = symbol & { readonly __craftit_injection_key?: T };

type LifecycleEventName = 'craft:connect' | 'craft:disconnect';
```

## Errors

`CraftitError` is thrown when component setup fails. It extends `Error` with:

- `component: string` — the element's local name
- `phase: ComponentPhase` — the lifecycle phase when the error occurred
- `cause: Error` — the original error

`reportRuntimeError(error, element)` dispatches `craft:error` on the host element (bubbles, composed) and logs to `console.error`.

If `onError(error, element)` is defined on the component definition and returns an `HTMLResult`, it replaces the failed template instead of throwing.
