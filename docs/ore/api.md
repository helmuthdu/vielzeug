---
title: Ore — API Reference
description: Complete API reference for @vielzeug/ore and @vielzeug/ore/testing.
---

[[toc]]

## API Overview

All browser-runtime symbols below are imported from `@vielzeug/ore`. Lifecycle/context/binding functions (`onMounted`, `onCleanup`, `onEvent`, `onElement`, `watchEffect`, `bind`, `provide`, `useEmit`, `useSlots`, `getHost`) resolve the active component through an implicit "current component" context — they work when called synchronously during `setup()`, or from any composable function `setup()` calls (transitively), but throw if called outside that window.

> `watchEffect` is not named `watch` — `@vielzeug/ripple` already exports a `watch(source, callback)` with different semantics (explicit source + old/new value pair), and the two are frequently imported in the same file.

| Symbol                | Purpose                                              | Execution mode | Common gotcha                                                             |
| ---------------------- | ----------------------------------------------------- | -------------- | -------------------------------------------------------------------------- |
| `define()`             | Register a custom element with reactive setup         | Sync           | Tag must contain a hyphen; call before first use                          |
| `html`                 | Tagged template literal returning HTMLResult          | Sync           | Expressions must be signals, functions, or primitives                     |
| `prop.*`               | Typed prop helpers (string, bool, number, …)          | Sync           | Prop values are signals — read `.value`                                   |
| `provide()`/`inject()` | Context API for parent-to-descendant sharing          | Setup only     | Must be called synchronously during `setup()`                             |
| `ref()`                | Reactive reference to a DOM element                   | Sync           | Value is null until after first mount                                     |
| `createContext()`      | Create a typed injection key                          | Sync           | Context is scoped to the component tree                                   |
| `each()`               | Keyed list rendering with DOM diffing                 | Sync           | Duplicate keys report `ore:error`; plain `T[]` is a one-time static render  |
| `when()`               | Conditional branch rendering                          | Sync           | Getter-fn computed disposed on cleanup; static bool skips subscription    |
| `live(signal)`         | One-way binding that skips stale writes during input  | Sync           | Use for controlled inputs alongside a manual `@input` handler             |
| `onMounted(fn)`        | DOM-ready callback                                    | Setup only     | Must be called synchronously during `setup()`                             |
| `onCleanup(fn)`        | Register teardown                                     | Setup only     | Called on component disconnect                                            |
| `onEvent(target, …)`   | Scoped event listener with auto-cleanup               | Setup only     | No-ops on null target; removed on disconnect                              |
| `useField(options)`    | Wire signal to form `ElementInternals`                | Setup only     | Requires `formAssociated: true` on the component definition               |
| `onFormReset(fn)`      | Run work when the ancestor `<form>` resets            | Setup only     | Fires every reset (not one-shot); only for `formAssociated: true` components |
| `useEmit<Emits>()`     | Typed `emit()` bound to the current host              | Setup only     | Call once per component; returns `dispatchEvent`'s boolean (`false` if a listener called `preventDefault()`) |
| `useSlots<SlotNames>()`| Reactive slot presence/element signals                | Setup only     | Safe to call more than once — the underlying registry is created once    |
| `getHost()`            | The current component's host element                 | Setup only     | Prefer a higher-level helper (`bind`, …) when one exists                  |

## Package Entry Points

| Import                    | Purpose                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `@vielzeug/ore`           | All browser runtime APIs, including directives, fields, and observers |
| `@vielzeug/ore/testing`   | Ore-specific mounting, lifecycle, hook, cleanup, and form test support |
| `@vielzeug/assay`         | Generic DOM events, scoped queries, and async waiting              |

## Core Component API

### `define(tag, definition)`

```ts
define<Props>(tag: string, definition: ComponentDefinition<Props>): void;
```

The `setup()` function receives only typed prop signals:

```ts
setup(props) {
  return html`<div>${props.label}</div>`;
}
```

Everything else — lifecycle hooks, host bindings, context, slots, emit — is a plain function imported from `@vielzeug/ore`, called directly from `setup()` (or a composable it calls):

```ts
import { define, html, onMounted, useEmit, useSlots } from '@vielzeug/ore';

define('my-card', {
  setup(_props) {
    const emit = useEmit<{ close: undefined }>();
    const slots = useSlots<'header' | 'footer'>();

    onMounted(() => console.log('mounted'));

    // emit() returns dispatchEvent's boolean — false if a listener called preventDefault()
    const notCancelled = emit('close');

    return html`${when(slots.has('header'), () => html`<slot name="header"></slot>`)}`;
  },
});
```

`useEmit<Emits>()` and `useSlots<SlotNames>()` are factory hooks — call them once per setup run to get a typed
`emit`/`slots` bound to the current host. `useSlots()` is safe to call more than once within that setup run.

### ComponentDefinition

```ts
type ComponentDefinition<Props> = {
  formAssociated?: boolean;
  props?: PropsDef<Props>;
  setup: (props: InferProps<PropsDef<Props>>) => HTMLResult | null;
  shadow?: Partial<ShadowRootInit> | false; // false = light DOM (no shadow root)
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
```

## Runtime Helpers

`onMounted`, `onCleanup`, `onEvent`, `onElement`, and `watchEffect` are plain functions imported from `@vielzeug/ore`. Call them directly during `setup()`.

```ts
import { html, onCleanup, onEvent, onMounted } from '@vielzeug/ore';

setup(props) {
  onMounted(() => {
    // DOM is ready; return a function for mount-scoped cleanup
    return () => { /* cleanup on unmount */ };
  });

  onCleanup(() => { /* called on disconnect */ });

  onEvent(window, 'keydown', (e) => { /* auto-removed on disconnect */ });

  return html`...`;
}
```

Because these resolve the active component through an implicit context (rather than a value threaded through parameters), composable helper functions can call them directly too — no need to pass hooks in as options:

```ts
import { onCleanup } from '@vielzeug/ore';

function useMyHelper() {
  onCleanup(() => { /* teardown */ });
}

// In setup:
setup(_props) {
  useMyHelper();
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

Tagged template literal that returns an `HTMLResult`. Supports text interpolation, ordinary attributes (`attr=`),
boolean attributes (`?attr=`), events (`@event=`), refs (`ref=`), and nested templates.

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
| `unsafeHtml(value)`                    | HTML rendering sink; sanitize untrusted values before calling                                           |

### `unsafeHtml`

`unsafeHtml()` is an explicit HTML injection sink. It has no global sanitizer: sanitize untrusted
content before passing it to the directive, so the trust boundary remains at the call site.

```ts
import { unsafeHtml } from '@vielzeug/ore';

const safeArticle = sanitize(userSuppliedArticle);

return html`<article>${unsafeHtml(safeArticle)}</article>`;
```

## Host Bindings

`bind(config, options?)` is a plain function imported from `@vielzeug/ore`:

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

### Reactive ARIA attributes

For reactive ARIA attribute syncing, use `bind({ aria: config }, { target })`. Shorthand keys are normalised to `aria-*` automatically (`expanded` → `aria-expanded`; `role` is passed verbatim):

```ts
// Inside setup — cleanup auto-registered
bind(
  {
    aria: {
      expanded: () => isOpen.value,
      controls: panelId,
      haspopup: 'listbox',
    },
  },
  { target: triggerEl },
);

// Manage cleanup manually — bind() always returns a cleanup fn
const stopAria = bind({ aria: { expanded: () => isOpen.value } }, { target: triggerEl });
// Call stopAria() when the trigger is swapped out
```

Static values (strings, numbers, booleans) are applied once. Getter functions and signals create reactive effects. Setting a value to `null`, `undefined`, or `false` removes the attribute.

## Slots

- `slots.has(name?)` — `Readable<boolean>` — whether the named (or default) slot has assigned content
- `slots.elements(name?)` — `Readable<Element[]>` — the assigned elements for the slot

Slot signals update reactively when assigned content changes, including when slots are inserted dynamically (via `when()` or `each()`) after mount.

## Context API

- `createContext<T>(description?)` — Create a typed injection key
- `provide(key, value)` — Provide a value to descendants
- `inject(key)` — Resolve from nearest ancestor; returns `undefined` if not found
- `inject(key, fallback)` — Resolve with a fallback value
- `injectStrict(key)` — Resolve or throw if absent

`provide()` and `inject()` must be called synchronously during `setup()`. Calling them outside a setup context throws
`'Lifecycle hooks must be called during component setup'`. Context resolution walks the ancestor chain including shadow
DOM boundaries. `inject()` resolves and caches its result once per consumer — provide a `Readable` (signal/computed)
rather than a raw value if descendants need to observe later changes; re-calling `provide()` with a new raw value
afterward is not seen by consumers that already resolved it (a dev-mode warning fires when a key is provided twice on
the same element).

## Utilities

- `ref<T>()` — Create a `Signal<T | null>` element reference. Set to the element via `ref=` in templates.
- `createId(prefix = 'id')` — Generate a unique incremental string ID (e.g. `'id-1'`, `'id-2'`). Each call returns a new ID — it does not deduplicate by prefix.
- `createStableId(prefix = 'id')` — Generate a unique ID that also embeds a short random tag shared across all IDs generated in the session (e.g. `'field-a3k21'`), reducing collision risk when multiple app instances run on the same page. Like `createId()`, every call returns a new ID.
- `resetStableIdCounter()` — Reset the `createStableId()` counter to 0. Call in test `beforeEach` for deterministic IDs. Scoped to `createStableId()` only — `createId()` has no public reset (it's for uniqueness, not cross-test determinism).

## Form-Associated API

Import from `@vielzeug/ore`.

### `useField(options)`

Wire a form-associated element to `ElementInternals`. Requires `formAssociated: true` on the component definition. The `disabled` state tracking via `internals.states` (CustomStateSet) is skipped with a dev warning if the API is unavailable in the current environment.

```ts
type FormFieldOptions<T> = {
  disabled?: Readable<boolean>;
  /** Defaults to the host element active during setup. */
  el?: HTMLElement;
  /**
   * When true, a null/undefined value is submitted as '' instead of null,
   * keeping the field's key present in FormData even when the value is absent.
   * Only applies to the default toFormValue; ignored if toFormValue is provided.
   * @default false
   */
  emptyStringForNull?: boolean;
  /** Called when the ancestor <form> resets (see onFormReset) — restore local field state here. */
  onReset?: () => void;
  toFormValue?: (value: T) => File | FormData | string | null;
  /** Recomputed reactively and passed straight to internals.setValidity(). null = always valid. */
  validationMessage?: Readable<string>;
  validity?: Readable<ValidityStateFlags | null>;
  value: Signal<T> | Readable<T>;
};

type FormFieldHandle = {
  checkValidity(): boolean;
  readonly internals: ElementInternals;
  reportValidity(): boolean;
  /** Set (non-empty message) or clear (empty string) a custom validity error. */
  setCustomValidity(message: string): void;
};
```

Pass `validity`/`validationMessage` to make `required`-style constraints participate in native constraint validation
through `checkValidity()` and `reportValidity()`:

```ts
const isBlank = (v: string) => v.trim() === '';

useField({
  validationMessage: computed(() => (required.value && isBlank(value.value) ? 'This field is required.' : '')),
  validity: computed(() => (required.value && isBlank(value.value) ? { valueMissing: true } : null)),
  value,
});
```

## Observer APIs

Import from `@vielzeug/ore`.

- `resizeObserver(element)` — Returns `Readable<{ height: number; width: number }>`, initialised to `{ height: 0, width: 0 }`
- `intersectionObserver(element, options?)` — Returns `Readable<IntersectionObserverEntry | null>`, initialised to `null`
- `mutationObserver(element, options?)` — Returns `Readable<{ entries: MutationRecord[]; latest: MutationRecord | null }>`, initialised to `{ entries: [], latest: null }`
- `mediaObserver(query)` — Returns `Readable<boolean>`, initialised to the query's current `matches` state

## Testing APIs

Import from `@vielzeug/ore/testing`.

| API                      | Purpose                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `mount(setup, options?)` | Mount a component and return a test fixture                                                |
| `cleanup()`              | Remove all mounted elements and reset test state                                           |
| `install(afterEach, options?)` | Register auto-cleanup; pass `{ formInternals: true }` to also install the `ElementInternals`/`FormData`/`<form>.reset()` jsdom polyfill (see below) |
| `installFormInternalsPolyfill()` | Installs the form-internals polyfill directly (returns an `uninstall()` that restores every patched global). Usually called via `install(afterEach, { formInternals: true })` |
| `walkFlatTree(root, visit)` | Walks the flat tree (expanding `<slot>` via `assignedElements()`) — for finding slotted content across a shadow boundary that `querySelectorAll()` can't cross |
| `flush(options?)`        | Drain reactive updates and animation frames                                                |
| `debugFlush()`           | Run `flush()` with `console.debug` diagnostics                                             |
| `mock(tag, template?)`   | Register a no-op stub custom element                                                       |
| `renderHook(setup)`      | Run lifecycle hooks in isolation; overload accepts `propDefs` as first arg for typed props |
| `resetOreForTests()`     | Reset styles and ID counters when mounting is managed manually                            |
| `OreTimeoutError`        | Error thrown when `flush()` cannot settle tracked Ore work                                 |

> **Test isolation:** `cleanup()` removes mounted elements and resets all cross-test Ore state (the stylesheet cache and ID counters) via `resetOreForTests()`. Call it in `afterEach` (or use `install()`) to prevent state leaking between tests.

Import `within`, named dispatchers such as `fireClick`, and waits such as `waitUntil` or `waitForEvent` from
`@vielzeug/assay`.

> **Form-associated component testing:** jsdom implements none of the `ElementInternals` form-association API — `install(afterEach, { formInternals: true })` polyfills `setFormValue`/`setValidity`/`checkValidity`/`reportValidity`/`validationMessage`/`validity`/`states`, mixes `checkValidity`/`reportValidity`/`validity`/`validationMessage` onto the host element itself (real browsers do this for any `formAssociated: true` element), makes `FormData` collect a form-associated element's set value, and makes `<form>.reset()` invoke `formResetCallback()`. Every patch is a guarded no-op when its target already exists, and `installFormInternalsPolyfill()` returns an `uninstall()` that restores every patched global. The polyfill is opt-in (`{ formInternals: true }`) because the patches are global — suites without form-associated components shouldn't carry them. A downstream package (e.g. a component library built on `ore`) should rely on this instead of hand-rolling its own copy.

#### `Fixture` interface

```ts
interface Fixture<T extends HTMLElement = HTMLElement> {
  [Symbol.dispose](): void; // Delegates to dispose() — enables `using` declarations
  element: T;
  readonly disposed: boolean; // true after dispose() has been called
  readonly shadow: ShadowRoot | null;
  get<E extends Element>(selector: string): E;
  query<E extends Element>(selector: string): E | null;
  queryAll<E extends Element>(selector: string): E[];
  getByText<E extends Element>(text: string, selector?: string): E;
  queryByText<E extends Element>(text: string, selector?: string): E | null;
  queryAllByText<E extends Element>(text: string, selector?: string): E[];
  getByTestId<E extends Element>(testId: string): E;
  queryByTestId<E extends Element>(testId: string): E | null;
  queryAllByTestId<E extends Element>(testId: string): E[];
  attr(name: string, value: string | number | boolean): Promise<void>;
  attrs(record: Record<string, string | number | boolean>): Promise<void>;
  flush(options?: FlushOptions): Promise<void>;
  act(fn: () => unknown): Promise<void>;
  dispose(): void; // Removes the component from the DOM — idempotent
}
```

#### `renderHook`

Useful for testing composable lifecycle hooks (`onMounted`, `watchEffect`, `inject`, etc.) without a template. `onMounted`/`onCleanup`/`watchEffect`/... work exactly as inside a real `setup()`, since they resolve the same implicit current-component context:

```ts
// Without props
const { result, flush, dispose } = await renderHook(() => {
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

Ore does **not** re-export reactive primitives. Import them directly from `@vielzeug/ripple`:

```ts
import { batch, computed, signal, watch } from '@vielzeug/ripple';
```

See the [Ripple documentation](/ripple/) for the full API.

## Lifecycle Events

| Event              | When                                                          |
| ------------------ | ------------------------------------------------------------- |
| `ore:connect`    | After every `connectedCallback` (including reconnects)        |
| `ore:disconnect` | After `disconnectedCallback`, before component state is reset |
| `ore:error`      | When a lifecycle callback fails — bubbles, composed; detail is `OreLifecycleError` |

## Types

```ts
type PropDef<T> = {
  readonly default: T;
  readonly parse: (value: string | null) => T;
  reflect?: boolean;
};

type PropsDef<T extends Record<string, unknown>> = {
  [K in keyof Required<T>]: PropDef<T[K & keyof T]>;
};

type PropInputDefs = Record<string, PropDef<unknown>>;

/**
 * Infer reactive props type from a PropInputDefs map.
 * Each entry becomes Readable<T> keyed by prop name.
 */
type InferProps<D extends PropInputDefs> = {
  readonly [K in keyof D]-?: Readable<InferPropValue<D[K]>>;
};

// Runtime hooks — all plain functions imported from '@vielzeug/ore', not fields on an object.
type OnMountedCallback = () => Cleanup | undefined;
type OnFormResetCallback = () => void;

declare function onMounted(fn: OnMountedCallback): void; // DOM-ready callback; runs after each connection's render
declare function onCleanup(fn: Cleanup): void; // Register teardown; called on disconnect
declare function onElement<T extends HTMLElement>(
  ref: Readable<T | null>,
  callback: (el: T) => Cleanup | undefined,
): () => void;
declare function onEvent<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
declare function onEvent(
  target: EventTarget | null | undefined,
  event: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): void;
declare function onFormReset(fn: OnFormResetCallback): void; // Runs on every ancestor <form> reset; formAssociated only
declare function watchEffect(fn: () => Cleanup | undefined): () => void; // Scoped reactive effect; auto-cleaned on disconnect
declare function bind(config: HostBindConfig, options?: BindOptions): () => void; // Bindings for host or any target element
declare function provide<T>(key: InjectionKey<T>, value: T): void; // Register a context value on the host element
declare function inject<T>(key: InjectionKey<T>): T | undefined;
declare function inject<T>(key: InjectionKey<T>, fallback: T): T;
declare function getHost(): HTMLElement; // The current component's host element
declare function useEmit<Emits extends Record<string, unknown> = Record<string, never>>(): EmitFn<Emits>;
declare function useSlots<SlotNames extends string = string>(): ComponentSlots<SlotNames>;

type ComponentDefinition<Props extends Record<string, unknown> = Record<never, never>> = {
  formAssociated?: boolean;
  props?: PropsDef<Props>;
  setup: (props: InferProps<PropsDef<Props>>) => HTMLResult | null;
  shadow?: Partial<ShadowRootInit> | false; // false = light DOM
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type HostBindingValue =
  | (() => string | number | boolean | null | undefined)
  | Readable<string | number | boolean | null | undefined>
  | string
  | number
  | boolean
  | null
  | undefined;

type ReflectConfig = Record<string, HostBindingValue>;

type HostBindConfig = {
  aria?: ReflectConfig;
  attr?: ReflectConfig;
  class?: (() => Record<string, boolean>) | Record<string, Readable<boolean> | (() => boolean) | boolean>;
  on?: Record<string, ((event: Event) => void) | undefined>;
  style?: Record<string, HostBindingValue>;
};

type BindOptions = AddEventListenerOptions & {
  target?: Element;
};

type HostBindFn = (config: HostBindConfig, options?: BindOptions) => () => void;

type ComponentSlots<S extends string = string> = {
  elements(name?: S): Readable<Element[]>;
  has(name?: S): Readable<boolean>;
};

type Ref<T extends Element> = Signal<T | null>;

type RefCallback<T extends Element> = (el: T | null) => void;

type InjectionKey<T> = symbol & { readonly __ore_injection_key?: T };

interface HTMLResult {
  mount(
    parent: ParentNode,
    anchor: Node | null,
    registerCleanup: (fn: () => void) => void,
  ): Node[];
}

type CSSResult = {
  content: string;
  toString(): string;
};

type LiveBinding<T> = { readonly source: Readable<T> };

type EmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): boolean;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): boolean;
};
// KeysWithoutDetail is an internal helper type, not exported.

type FormFieldOptions<T = unknown> = {
  disabled?: Readable<boolean>;
  el?: HTMLElement;
  emptyStringForNull?: boolean;
  onReset?: () => void;
  toFormValue?: (value: T) => File | FormData | string | null;
  validationMessage?: Readable<string>;
  validity?: Readable<ValidityStateFlags | null>;
  value: Signal<T> | Readable<T>;
};

type FormFieldHandle = {
  checkValidity: () => boolean;
  readonly internals: ElementInternals;
  reportValidity: () => boolean;
  setCustomValidity: (message: string) => void;
};

type MutationObserverValue = {
  entries: MutationRecord[];
  latest: MutationRecord | null;
};

/** Phase in which a OreError occurred. */
type OreErrorPhase = 'each-reconcile' | 'form-reset' | 'mounted' | 'setup';
```

## Errors

`OreError` is the base class for every Ore error class — `err instanceof OreError` catches all of them.
`OreError.is(err)` is the equivalent static type-guard.

- **`OreApiError`** — thrown when the `ore` API itself is misused: calling `define()` with a duplicate tag, calling a lifecycle hook (`inject`, `onMounted`, `onCleanup`, `onEvent`, …) outside of `setup()`, or passing an invalid prop definition to `define()`.
- **`OreInternalError`** — thrown when an Ore invariant fails, indicating a package bug rather than invalid application code.
- **`OreLifecycleError`** — reported in the `ore:error` event when component `setup()`, a mounted callback, a form-reset callback, or `each()` reconciliation fails. Extends `OreError` with:
  - `component: string` — the element's local name
  - `phase: OreErrorPhase` — `'setup'` | `'mounted'` | `'form-reset'` | `'each-reconcile'`
  - `cause: Error` — the original error thrown by `setup()`
- **`OreTimeoutError`** — thrown by `flush()` (from `@vielzeug/ore/testing`) when pending Ore work does not settle before its timeout.

Lifecycle failures dispatch a bubbling, composed `ore:error` event whose `detail` is the `OreLifecycleError`. Setup
failures still rethrow their original error; mounted and form-reset callback failures are reported through the same
event so their remaining callbacks can continue.
