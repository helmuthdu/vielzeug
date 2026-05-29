---
title: Craft — API Reference
description: Complete API reference for @vielzeug/craft, @vielzeug/craft/observers, and @vielzeug/craft/testing.
---

[[toc]]

## API At a Glance

| Symbol             | Purpose                                        | Execution mode | Common gotcha                                         |
| ------------------ | ---------------------------------------------- | -------------- | ----------------------------------------------------- |
| `define()`         | Register a custom element with reactive setup  | Sync           | Tag must contain a hyphen; call before first use      |
| `html`             | Tagged template literal returning HTMLResult    | Sync           | Expressions must be signals, functions, or primitives |
| `effect()`         | Component-scoped reactive side effect          | Sync           | Auto-cleaned up on disconnect                         |
| `onMounted()`      | DOM-ready callback after template mounts       | Sync           | DOM queries inside setup() run before mount           |
| `onCleanup()`      | Register teardown for component disconnect     | Sync           | Must be called synchronously during setup             |
| `onElement()`      | Run callback when a ref resolves to an element | Sync           | Re-runs when the element reference changes            |
| `onEvent()`        | Scoped event listener with auto-cleanup        | Sync           | Must be called during setup or scope.run()            |
| `listen()`         | Manual event listener (returns cleanup fn)     | Sync           | Does not auto-cleanup — call the returned function    |
| `prop.*`           | Typed prop helpers (string, bool, number, …)   | Sync           | Prop values are signals — read `.value`               |
| `provide/inject`   | Context API for parent-to-descendant sharing   | Sync           | Call `provide()` during setup, not in onMounted       |
| `ref()`            | Reactive reference to a DOM element            | Sync           | Value is null until after first mount                 |
| `createContext()`  | Create a typed injection key                   | Sync           | Context is scoped to the component tree               |
| `suspend()`        | Async rendering with pending/error states      | Async          | Re-runs when reactive deps inside asyncFn change      |
| `memo()`           | Memoized derived value with explicit deps      | Sync           | Signals inside fn do not invalidate the memo          |
| `syncedSignal()`   | Locally-writable signal synced to source       | Sync           | Call stop() to unsubscribe from source                |

## Package Entry Points

| Import                        | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `@vielzeug/craft`           | Core authoring/runtime API plus ripple re-exports |
| `@vielzeug/craft/observers` | Resize, intersection, mutation, and media observers |
| `@vielzeug/craft/testing`   | DOM-oriented test helpers                          |

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
  props?: PropsDef<Props>;
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult;
  shadow?: Partial<ShadowRootInit>;
  slots?: readonly SlotNames[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};
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

Adds an event listener and automatically removes it on cleanup. Must be called during setup or `scope.run()`.

### `listen(target, event, listener, options?)`

Adds an event listener and returns a manual cleanup function. Unlike `onEvent()`, does not require a runtime scope — cleanup must be managed by the caller.

### `onCleanup(fn)`

```ts
onCleanup(fn: CleanupFn): void;
```

Registers a cleanup function to be called when the component disconnects. Must be called synchronously during `setup()` or inside `scope.run()`.

### `onElement(ref, callback)`

Runs `callback` when a `ref()` resolves to an element and re-runs when that element changes. Returns a subscription.

### `memo(deps, fn)`

```ts
memo<T>(deps: () => readonly unknown[], fn: () => T): ReadonlySignal<T>;
```

Creates a memoized derived value. `fn` is re-evaluated only when the `deps` array changes (compared with `Object.is`). Signals read inside `fn` do not invalidate the memo.

### `syncedSignal(source, transform?)`

```ts
syncedSignal<TIn, TOut>(source: ReadonlySignal<TIn>, transform?: (v: TIn) => TOut): [Signal<TOut>, () => void];
```

Creates a locally-writable signal that stays in sync with an external source. Returns `[signal, stop]`.

### `suspend(asyncFn, options)`

```ts
suspend<T>(asyncFn: () => Promise<T>, options: SuspendOptions<T>): ReadonlySignal<HTMLResult>;
```

Runs an async function and returns a signal that transitions through pending → resolved states. Options: `fallback`, `error`, `render`.

## Props API

| Helper                              | Signature          | Notes                                     |
| ----------------------------------- | ------------------ | ----------------------------------------- |
| `prop.string(defaultValue?)`        | `PropDef<string>`  | Reflects by default                       |
| `prop.bool(defaultValue?)`          | `PropDef<boolean>` | Empty string and `'true'` parse as `true` |
| `prop.number(defaultValue?)`        | `PropDef<number>`  | Uses `Number(...)` parsing                |
| `prop.oneOf(allowed, defaultValue)` | `PropDef<T>`       | Restricts to provided string union        |
| `prop.json(defaultValue)`           | `PropDef<T>`       | JSON.parse; `reflect: false` by default   |

When you need custom parsing or `reflect: false`, use a raw `PropDef` object:

```ts
props: {
  data: { default: '', parse: (v) => v ?? '', reflect: false },
}
```

## Template and Directives

### `html`

Tagged template literal that returns an `HTMLResult`. Supports text interpolation, attributes (`:attr`), boolean attributes (`?attr`), events (`@event`), refs (`ref=`), and nested templates.

### `css`

Tagged template literal that returns a `CSSResult` for use in `styles`.

### Directives

| Directive                         | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `each(source, key, render, fallback?)` | Keyed list rendering with DOM diffing    |
| `when(condition, truthy, falsy?)` | Conditional rendering                         |
| `classMap(record)`                | Reactive class string from object map          |
| `styleMap(record)`                | Reactive inline style string from object map   |
| `live(signal)`                    | Live form binding — skips stale writes         |
| `raw(value)`                      | Trusted HTML rendering (XSS risk without sanitizer) |

### Event Modifiers

Event bindings support dot-separated modifiers: `@click.prevent.stop=${handler}`

| Modifier   | Effect                        |
| ---------- | ----------------------------- |
| `prevent`  | Calls `e.preventDefault()`    |
| `stop`     | Calls `e.stopPropagation()`   |
| `self`     | Only fires if target matches  |
| `capture`  | Uses capture phase            |
| `once`     | Fires once then removes       |
| `passive`  | Sets passive listener option  |

## Host Bindings

The setup context provides `bind: HostBindFn`:

```ts
bind({
  attr: { role: 'button', 'aria-expanded': () => String(open.value) },
  class: { 'is-open': open },
  style: { '--height': () => height.value + 'px' },
  prop: { value: { get: () => count.value, set: (v) => (count.value = v) } },
  on: { click: handleClick },
});
```

For standalone use outside setup, use `createBind(element)`.

### `syncAria(target, config)`

Reactively syncs ARIA attributes to a target element. Static values are set once; getter functions are tracked as effects.

```ts
syncAria(element, {
  role: 'button',
  expanded: () => isOpen.value,
  disabled: () => isDisabled.value,
});
```

## Slots

- `slots.has(name?)` — `ReadonlySignal<boolean>` — whether the slot has content
- `slots.elements(name?)` — `ReadonlySignal<Element[]>` — assigned elements

When `slots` is declared as a `const` array on the definition, TypeScript narrows slot name arguments.

## Context API

- `createContext<T>(description?)` — Create a typed injection key
- `provide(key, value)` — Provide a value to descendants
- `inject(key)` — Resolve from nearest ancestor (returns `undefined` if not found)
- `inject(key, fallback)` — Resolve with fallback
- `injectStrict(key)` — Resolve or throw

Context correctly resolves `undefined` as a provided value (uses presence check, not value comparison).

## Utilities

- `ref<T>()` — Create a signal-based element reference
- `refs<T>()` — Create an array-based element reference collector
- `createId(prefix?)` — Generate a unique ID string

## Form-Associated API

- `defineField(options): FormFieldHandle` — Wire a form-associated element with internals
- `createForm(options): FormContextValue` — Create form coordination context
- `provideFormContext(ctx)` / `useFormContext()` — Provide/inject form context

## Observer APIs

Import from `@vielzeug/craft/observers`.

- `resizeObserver(element)` — Returns `ReadonlySignal<ResizeObserverEntry>`
- `intersectionObserver(element, options?)` — Returns `ReadonlySignal<IntersectionObserverEntry>`
- `mutationObserver(element, options?)` — Returns `ReadonlySignal<MutationRecord[]>`
- `mediaObserver(query)` — Returns `ReadonlySignal<boolean>`

## Testing APIs

Import from `@vielzeug/craft/testing`.

| API                    | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| `mount(setup, options?)` | Mount a component and return a fixture    |
| `cleanup()`            | Remove all mounted elements                 |
| `flush(options?)`      | Drain reactive updates and animation frames |
| `install(afterEach)`   | Auto-register cleanup with test runner      |
| `mock(tag, template?)` | Register a stub custom element              |
| `fire.*`               | Synchronous event dispatchers               |
| `user.*`               | Async interaction helpers (type, click, etc) |
| `waitFor(fn, options?)` | Poll until assertion passes                |
| `waitForEvent(el, name)` | Wait for a specific event                |
| `within(element)`      | Scoped query helpers                        |

## Ripple Re-exports

Craft re-exports these from `@vielzeug/ripple`:

- `signal`, `computed`, `batch`, `untrack`, `watch`, `isSignal`, `scope`
- `type Signal`, `type ReadonlySignal`, `type Scope`, `type WatchOptions`

## Lifecycle Events

| Event              | When                                    |
| ------------------ | --------------------------------------- |
| `craft:connect`    | After every `connectedCallback`         |
| `craft:disconnect` | After `disconnectedCallback` (phase=UNMOUNTED, before reset) |
| `craft:error`      | When setup throws (bubbles, composed)   |

## Types

```ts
type CleanupFn = () => void;

type HTMLResult = { __brand: 'HTMLResult' };

type CSSResult = { __brand: 'CSSResult' };

type InjectionKey<T> = symbol & { __type?: T };

type Ref<T extends Element = Element> = Signal<T | null>;

type Refs<T extends Element = Element> = Signal<T[]>;

type RefCallback<T extends Element = Element> = (el: T | null) => void;

type PropDef<T> = {
  default: T;
  parse?: (value: string | null) => T;
  reflect?: boolean;
};

type PropsDef<P> = { [K in keyof P]: PropDef<P[K]> };

type PropInputDefs = Record<string, PropDef<unknown>>;

type InferPropsFromDefs<D> = { [K in keyof D]: D[K] extends PropDef<infer T> ? T : never };

type InferPropsSignals<P> = { [K in keyof P]: Signal<P[K]> };

type HostBindConfig = {
  attr?: Record<string, string | (() => string) | ReadonlySignal<string>>;
  class?: Record<string, boolean | (() => boolean) | ReadonlySignal<boolean>>;
  on?: Record<string, (e: Event) => void>;
  prop?: Record<string, HostPropDescriptor>;
  style?: Record<string, string | (() => string) | ReadonlySignal<string>>;
};

type HostPropDescriptor = {
  get: () => unknown;
  set: (v: unknown) => void;
};

type HostBindFn = (config: HostBindConfig) => void;

type ComponentSlots<S extends string = string> = {
  elements(name?: S): ReadonlySignal<Element[]>;
  has(name?: S): ReadonlySignal<boolean>;
};

type SetupContextBag<Emits = Record<string, unknown>, SlotNames extends string = string> = {
  bind: HostBindFn;
  el: HTMLElement;
  emit: EmitFn<Emits>;
  slots: ComponentSlots<SlotNames>;
};

type ComponentDefinition<Props = {}, Emits = {}, SlotNames extends string = string> = {
  formAssociated?: boolean;
  props?: PropsDef<Props>;
  setup: (props: InferPropsSignals<Props>, ctx: SetupContextBag<Emits, SlotNames>) => HTMLResult;
  shadow?: Partial<ShadowRootInit>;
  slots?: readonly SlotNames[];
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

type SuspendOptions<T> = {
  error?: (e: unknown) => HTMLResult;
  fallback?: () => HTMLResult;
  render: (data: T) => HTMLResult;
};

type SyncAriaOptions = Record<string, string | (() => string)>;

type FormFieldHandle = {
  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;
  setValidity(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement | null): void;
};

type FormFieldOptions<T> = {
  disabled?: ReadonlySignal<boolean> | Signal<boolean>;
  toFormValue?: (v: T) => string | FormData | File | null;
  value: Signal<T> | ReadonlySignal<T>;
};

type FormContextValue = {
  register(handle: FormFieldHandle): void;
  submit(e?: Event): Promise<void>;
  unregister(handle: FormFieldHandle): void;
};

type LifecycleEventName = 'craft:connect' | 'craft:disconnect' | 'craft:error';

type CraftitErrorKind = 'setup' | 'effect' | 'mount-callback' | 'cleanup';

type CraftitRuntimeError = {
  element: HTMLElement;
  error: unknown;
  kind: CraftitErrorKind;
};
```

## Errors

| Error                    | Trigger                                          |
| ------------------------ | ------------------------------------------------ |
| `CraftitRuntimeError`    | Thrown by `reportRuntimeError()` when setup, effect, mount-callback, or cleanup fails. Dispatched as `craft:error` event on the host element. |
| `createRuntimeError()`   | Factory to create a structured `CraftitRuntimeError`. |
| `reportRuntimeError()`   | Reports an error to the host element via `craft:error` event and console. |
