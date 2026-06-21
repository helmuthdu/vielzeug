---
title: Craft — API Reference
description: Complete API reference for @vielzeug/craft, @vielzeug/craft/observers, and @vielzeug/craft/testing.
---

[[toc]]

## API Overview

| Symbol                     | Purpose                                              | Execution mode | Common gotcha                                                          |
| -------------------------- | ---------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `define()`                 | Register a custom element with reactive setup        | Sync           | Tag must contain a hyphen; call before first use                       |
| `html`                     | Tagged template literal returning HTMLResult         | Sync           | Expressions must be signals, functions, or primitives                  |
| `prop.*`                   | Typed prop helpers (string, bool, number, …)         | Sync           | Prop values are signals — read `.value`                                |
| `ctx.provide/inject`       | Context API for parent-to-descendant sharing         | Setup only     | Must be called synchronously during `setup()`                          |
| `ref()`                    | Reactive reference to a DOM element                  | Sync           | Value is null until after first mount                                  |
| `createContext()`          | Create a typed injection key                         | Sync           | Context is scoped to the component tree                                |
| `each()`                   | Keyed list rendering with DOM diffing                | Sync           | Duplicate keys warn in dev; plain `T[]` treated as one-time static render |
| `when()`                   | Conditional branch rendering                         | Sync           | Getter-fn computed disposed on cleanup; static bool skips subscription |
| `model(signal)`            | Two-way binding for input/select/textarea            | Sync           | `<select multiple>` uses `Signal<string[]>`; `select` uses `change`    |
| `live(signal)`             | One-way binding that skips stale writes during input | Sync           | Use for controlled inputs alongside a manual `@input` handler          |
| `ctx.onMounted(fn)`        | DOM-ready callback                                   | Setup only     | Must be called synchronously during `setup()`                          |
| `ctx.onCleanup(fn)`        | Register teardown                                    | Setup only     | Called on component disconnect                                         |
| `ctx.onEvent(target, …)`   | Scoped event listener with auto-cleanup              | Setup only     | No-ops on null target; removed on disconnect                           |
| `useField(options)`        | Wire signal to form `ElementInternals`               | Setup only     | Requires `formAssociated: true` on the component definition            |
| `ctx.aria(target, config)` | Reactively sync ARIA attributes to any element       | Setup only     | Static values applied once; getter functions tracked as effects; auto-cleanup on disconnect |

## Package Entry Points

| Import                       | Purpose                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| `@vielzeug/craft`            | Core authoring/runtime API                                         |
| `@vielzeug/craft/devtools`   | `debugFlush` — verbose flush for timing diagnostics                |
| `@vielzeug/craft/directives` | Standalone directive imports (`each`, `when`, `classMap`, …)       |
| `@vielzeug/craft/observers`  | Resize, intersection, mutation, and media observers                |
| `@vielzeug/craft/testing`    | DOM-oriented test helpers                                          |

## Core Component API

### `define(tag, definition)`

```ts
define<Props, Emits, SlotNames>(tag: string, definition: ComponentDefinition<Props, Emits, SlotNames>): void;
```

The `setup()` function receives typed prop signals and a context bag:

```ts
type SetupContextBag<Emits, SlotNames> = {
  aria: (target: Element, config: AriaConfig) => () => void; // Reactive ARIA attr sync; auto-cleanup on disconnect
  bind: HostBindFn; // Apply reactive bindings to the host or any target element
  el: HTMLElement; // The host element
  emit: EmitFn<Emits>; // Dispatch typed custom events
  inject: <T>(key: InjectionKey<T>, fallback?: T) => T | undefined; // Resolve context from nearest ancestor
  onCleanup: (fn: CleanupFn) => void; // Register teardown; called on disconnect
  onElement: <T extends HTMLElement>(ref, cb) => void; // Run callback when a ref resolves to an element
  onEvent: (target, event, listener, options?) => void; // Scoped event listener; auto-removed on disconnect
  onMounted: (fn: OnMountedCallback) => void; // DOM-ready callback
  provide: <T>(key: InjectionKey<T>, value: T) => void; // Register context on the host element
  slots: ComponentSlots<SlotNames>; // Reactive slot signals
  watch: (fn: EffectCallback) => () => void; // Scoped reactive effect; auto-cleaned on disconnect
};
```

Lifecycle hooks (`onMounted`, `onCleanup`, `onEvent`, `onElement`, `watch`) are accessed exclusively through the setup context bag. They must be called synchronously during `setup()`.

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
  onError?: (error: CraftError, element: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (
    props: InferProps<PropsDef<Props>>,
    ctx: SetupContextBag<Emits, SlotNames>,
  ) => HTMLResult | Promise<HTMLResult>;
  shadow?: Partial<ShadowRootInit> | false; // false = light DOM (no shadow root)
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
```

Pass `SlotNames` as a type parameter to `define()` to get typed `ctx.slots` access:

```ts
define<Record<never, never>, Record<never, never>, 'header' | 'footer'>('my-card', {
  setup(_props, { slots }) {
    const hasHeader = slots.has('header'); // typed ✓
    return html`...`;
  },
});
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

`onMounted`, `onCleanup`, `onEvent`, `onElement`, and `watch` are available on the setup context bag. Destructure them from the second argument to `setup()`.

```ts
setup(props, { onMounted, onCleanup, onEvent, onElement, watch }) {
  onMounted(() => {
    // DOM is ready; return a function for mount-scoped cleanup
    return () => { /* cleanup on unmount */ };
  });

  onCleanup(() => { /* called on disconnect */ });

  onEvent(window, 'keydown', (e) => { /* auto-removed on disconnect */ });

  return html`...`;
}
```

When writing composable helpers called from inside `setup()`, thread the hooks explicitly via function parameters rather than relying on a shared context:

```ts
type MyHelperOptions = {
  onCleanup: (fn: () => void) => void;
};

function useMyHelper(options: MyHelperOptions) {
  options.onCleanup(() => { /* teardown */ });
}

// In setup:
setup(_props, { onCleanup }) {
  useMyHelper({ onCleanup });
  return html`...`;
}
```

## Props API

| Helper                              | Signature          | Notes                                                                                                        |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `prop.string(defaultValue?)`        | `PropDef<string>`  | Reflects by default                                                                                          |
| `prop.bool(defaultValue?)`          | `PropDef<boolean>` | Any non-null attribute value other than `"false"` parses as `true`; `"false"` or absent attribute is `false` |
| `prop.number(defaultValue?)`        | `PropDef<number>`  | Returns default (not NaN) and warns in dev when attribute is not a valid number                              |
| `prop.oneOf(allowed, defaultValue)` | `PropDef<T>`       | Restricts to provided string union                                                                           |
| `prop.json(defaultValue)`           | `PropDef<T>`       | JSON.parse from attribute; `reflect: false`                                                                  |
| `prop.data<T>(defaultValue?)`       | `PropDef<T>`       | JS-only — never reads/writes an attribute; use for objects, arrays, callbacks, or any non-serialisable value |

> **Choosing the right prop helper:**
>
> - **`prop.json`** — value can be declared in HTML (`<my-el config='{"x":1}'>`); attribute string is `JSON.parse`d.
> - **`prop.data`** — value is always set from JavaScript (objects, arrays, callbacks, class instances); the attribute is never read. Use this for both data and function props.

When you need custom parsing or `reflect: false`, use a raw `PropDef` object:

```ts
props: {
  items: { default: [], parse: () => [], reflect: false },
}
```

Use `prop.data` for props that hold JS-only values (including callbacks) that cannot be serialised through an HTML attribute:

```ts
define('data-grid', {
  props: {
    getRowKey: prop.data<(row: unknown) => string>(),
    columns: prop.data<DataGridColumn[]>([]),
    onSort: prop.data<(key: string) => void>(),
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

| Directive                              | Purpose                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `each(source, key, render, fallback?)` | Keyed reactive list; render receives `Readable<T>` and `Readable<number>`; plain `T[]` is a one-time static snapshot |
| `when(condition, truthy, falsy?)`      | Conditional rendering                                                                                 |
| `classMap(record)`                     | Reactive class string from object map                                                                 |
| `styleMap(record)`                     | Reactive inline style string from object map                                                          |
| `live(signal)`                         | One-way binding that skips stale writes during active user input; use with `@input` handler           |
| `model(signal)`                        | Two-way value binding for `input`, `select`, `textarea`; `<select multiple>` uses `Signal<string[]>`; `select` uses `change` event |
| `raw(value)`                           | Trusted HTML rendering (XSS risk without sanitizer)                                                   |

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

`bind()` auto-registers cleanup with the component scope — no manual `onCleanup` needed. Returns a cleanup function for early teardown.

### Off-host bindings

Pass `{ target: el }` as a second argument to bind to any element other than the host:

```ts
bind(
  { attr: { 'aria-expanded': () => String(isOpen.value) } },
  { target: triggerEl },
);
```

Event listener options (`once`, `capture`, `passive`) are also accepted in the second argument. Cleanup is auto-registered with the component scope when called during setup.

### ctx.aria()

For reactive ARIA attribute syncing, use `ctx.aria(target, config)`. Shorthand keys are normalised to `aria-*` automatically (`expanded` → `aria-expanded`; `role` is passed verbatim):

```ts
// Inside setup — cleanup auto-registered
aria(triggerEl, {
  expanded: () => isOpen.value,
  controls: panelId,
  haspopup: 'listbox',
});

// Manage cleanup manually — aria() always returns a cleanup fn
const stopAria = aria(triggerEl, { expanded: () => isOpen.value });
// Call stopAria() when the trigger is swapped out
```

Static values (strings, numbers, booleans) are applied once. Getter functions and signals create reactive effects. Setting a value to `null`, `undefined`, or `false` removes the attribute.

## Slots

- `slots.has(name?)` — `Reactive<boolean>` — whether the named (or default) slot has assigned content
- `slots.elements(name?)` — `Reactive<Element[]>` — the assigned elements for the slot

Slot signals update reactively when assigned content changes, including when slots are inserted dynamically (via `when()` or `each()`) after mount.

## Context API

- `createContext<T>(description?)` — Create a typed injection key
- `ctx.provide(key, value)` — Provide a value to descendants; called via the setup context bag
- `inject(key)` — Resolve from nearest ancestor; returns `undefined` if not found
- `inject(key, fallback)` — Resolve with a fallback value
- `injectStrict(key)` — Resolve or throw if absent

`ctx.provide()` and `inject()` must be called synchronously during `setup()`. Calling them outside a setup context throws `'Lifecycle hooks must be called synchronously during component setup'`. Context resolution walks the ancestor chain including shadow DOM boundaries.

## Utilities

- `ref<T>()` — Create a `Signal<T | null>` element reference. Set to the element via `ref=` in templates.
- `createId()` — Generate a unique incremental string ID (e.g. `'craft-1'`).
- `createStableId(key)` — Return the same ID for the same string key within a component's lifetime; useful for stable ARIA label associations.
- `resetIdCounter()` — Reset the ID counter to 0. Call in test `beforeEach` for deterministic IDs.

## Form-Associated API

### `useField(options)`

Wire a form-associated element to `ElementInternals`. Requires `formAssociated: true` on the component definition. The `disabled` state tracking via `internals.states` (CustomStateSet) is skipped with a dev warning if the API is unavailable in the current environment.

```ts
type FormFieldOptions<T> = {
  disabled?: Reactive<boolean>;
  /**
   * When true, a null/undefined value is submitted as '' instead of null,
   * keeping the field's key present in FormData even when the value is absent.
   * Only applies to the default toFormValue; ignored if toFormValue is provided.
   * @default false
   */
  emptyStringForNull?: boolean;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T> | Reactive<T>;
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

- `createFormContext(options?)` — Create a `FormController`; call `ctx.provide(FORM_CONTEXT_KEY, ctrl)` to make it available to descendants
- `FORM_CONTEXT_KEY` — the `InjectionKey` used to provide/inject the form context

```ts
type FormController = {
  clearStatus(): void; // Clears dirty + error signals; calls onReset callback
  readonly dirty: Reactive<boolean>;
  readonly error: Reactive<unknown>; // Last submit error; null if last submit succeeded
  markDirty(): void; // Call from input/change handlers
  registerField(validity: Reactive<boolean>): () => void;
  submit(e?: Event): Promise<void>; // Resets dirty to false on success; preserves dirty on failure
  readonly submitting: Reactive<boolean>;
  readonly valid: Reactive<boolean>; // true when all registered fields are valid
};
```

## Observer APIs

Import from `@vielzeug/craft/observers`.

- `resizeObserver(element)` — Returns `Reactive<ResizeObserverEntry>`
- `intersectionObserver(element, options?)` — Returns `Reactive<IntersectionObserverEntry>`
- `mutationObserver(element, options?)` — Returns `Reactive<MutationRecord[]>`
- `mediaObserver(query)` — Returns `Reactive<boolean>`

## Testing APIs

Import from `@vielzeug/craft/testing`.

| API                      | Purpose                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `mount(setup, options?)` | Mount a component and return a test fixture                                                |
| `cleanup()`              | Remove all mounted elements and reset test state                                           |
| `install(afterEach)`     | Register auto-cleanup; pass `afterEach` from your test framework                           |
| `flush(options?)`        | Drain reactive updates and animation frames                                                |
| `FLUSH_DEEP`             | Pre-built options for deep async chains (`maxTurns: 12`)                                   |
| `mock(tag, template?)`   | Register a no-op stub custom element                                                       |
| `renderHook(setup)`      | Run lifecycle hooks in isolation; overload accepts `propDefs` as first arg for typed props |
| `fire.*`                 | Synchronous DOM event dispatchers                                                          |
| `user.*`                 | Async user interactions (type, fill, click, press, …)                                      |
| `waitFor(fn, options?)`  | Poll until an assertion passes or a condition is truthy                                    |
| `waitForEvent(el, name)` | Resolve when the target element emits the named event                                      |
| `within(element)`        | Scoped query helpers (`query`, `queryAll`, …)                                              |

> **Test isolation:** `cleanup()` resets mounted elements, `live()` signal tracking, and the raw HTML sanitizer. Call it in `afterEach` to prevent state leaking between tests.

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
// Without props
const { result, flush, destroy } = await renderHook((_props, { onMounted }) => {
  const count = signal(0);
  onMounted(() => {
    count.value = 1;
  });
  return count;
});
expect(result.value).toBe(1);

// With typed props (prop-defs overload)
const { result } = await renderHook({ label: prop.string('hello'), count: prop.number(0) }, (props) => props.label);
expect(result.value).toBe('hello');
```

## Ripple Primitives

Craft does **not** re-export reactive primitives. Import them directly from `@vielzeug/ripple`:

```ts
import { batch, computed, signal, watch } from '@vielzeug/ripple';
```

See the [Ripple documentation](/ripple/) for the full API.

## Lifecycle Events

| Event              | When                                                          |
| ------------------ | ------------------------------------------------------------- |
| `craft:connect`    | After every `connectedCallback` (including reconnects)        |
| `craft:disconnect` | After `disconnectedCallback`, before component state is reset |
| `craft:error`      | When setup throws — bubbles, composed; detail is `CraftError` |

## Types

```ts
type PropDef<T> = {
  default: T;
  parse: (value: string | null) => T;
  reflect?: boolean;
};

/**
 * Infer reactive props type from a PropInputDefs map.
 * Each entry becomes Reactive<T> keyed by prop name.
 */
type InferProps<D extends PropInputDefs> = {
  readonly [K in keyof D]-?: Reactive<InferPropValue<D[K]>>;
};

type SetupContextBag<
  Emits extends Record<string, unknown> = Record<string, never>,
  SlotNames extends string = string,
> = {
  aria: (target: Element, config: AriaConfig) => () => void; // Reactive ARIA attr sync; auto-cleanup on disconnect
  bind: (config: HostBindConfig, options?: BindOptions) => () => void; // Bindings for host or any target element
  el: HTMLElement; // The host element
  emit: EmitFn<Emits>; // Dispatch typed custom events
  inject: {
    <T>(key: InjectionKey<T>): T | undefined;
    <T>(key: InjectionKey<T>, fallback: T): T;
  };
  onCleanup: (fn: CleanupFn) => void; // Register teardown; called on disconnect
  onElement: <T extends HTMLElement>(ref: Readable<T | null>, cb: (el: T) => CleanupFn | void) => () => void;
  onEvent: {
    <K extends keyof HTMLElementEventMap>(
      target: EventTarget | null | undefined,
      event: K,
      listener: (e: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): void;
    (
      target: EventTarget | null | undefined,
      event: string,
      listener: EventListener,
      options?: AddEventListenerOptions,
    ): void;
  };
  onMounted: (fn: OnMountedCallback) => void; // DOM-ready callback; runs after first render
  provide: <T>(key: InjectionKey<T>, value: T) => void; // Register a context value on the host element
  slots: ComponentSlots<SlotNames>; // Reactive slot signals
  watch: (fn: EffectCallback) => () => void; // Scoped reactive effect; auto-cleaned on disconnect
};

type ComponentDefinition<Props, Emits, SlotNames extends string> = {
  formAssociated?: boolean;
  loading?: () => HTMLResult; // Shown while async setup is pending
  onError?: (error: CraftError, el: HTMLElement) => HTMLResult | void;
  props?: PropsDef<Props>;
  setup: (
    props: InferProps<PropsDef<Props>>,
    ctx: SetupContextBag<Emits, SlotNames>,
  ) => HTMLResult | Promise<HTMLResult>;
  shadow?: Partial<ShadowRootInit> | false; // false = light DOM
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type HostBindConfig = {
  attr?: Record<string, HostBindingValue>;
  class?: (() => Record<string, boolean>) | Record<string, boolean | (() => boolean) | Reactive<boolean>>;
  on?: Record<string, (event: Event) => void>;
  style?: Record<string, HostBindingValue>;
};

type ComponentSlots<S extends string = string> = {
  elements(name?: S): Reactive<Element[]>;
  has(name?: S): Reactive<boolean>;
};

type Ref<T extends Element> = Signal<T | null>;

type RefCallback<T extends Element> = (el: T | null) => void;

type InjectionKey<T> = symbol & { readonly __craftit_injection_key?: T };

/** Phase in which a CraftError occurred. */
type CraftErrorPhase = 'async-setup' | 'mounted' | 'setup';
```

## Errors

`CraftError` is thrown when component setup fails. It extends `Error` with:

- `component: string` — the element's local name
- `phase: CraftErrorPhase` — `'setup'` | `'async-setup'` | `'mounted'`
- `cause: Error` — the original error

`CraftError.is(err)` — static type-guard, equivalent to `err instanceof CraftError`.

If `onError(error, element)` is defined on the component definition and returns an `HTMLResult`, it replaces the failed template instead of throwing. This applies to both synchronous and async `setup()`. If `onError` returns `void` (no recovery), a subsequent reconnect can retry setup.
