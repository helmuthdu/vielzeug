---
title: Craftit — API Reference
description: Entry points and public API reference for @vielzeug/craftit, @vielzeug/craftit/controls, @vielzeug/craftit/observers, and @vielzeug/craftit/testing.
---

[[toc]]

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/craftit` | Core authoring/runtime API plus stateit re-exports |
| `@vielzeug/craftit/controls` | Headless interaction controls |
| `@vielzeug/craftit/observers` | Resize, intersection, and media-query observers |
| `@vielzeug/craftit/testing` | DOM-oriented test helpers |

## Core Component API

### `define(tag, definition)`

```ts
define<Props, Events>(tag: string, definition: ComponentDefinition<Props, Events>): string;
```

Registers a custom element and returns the tag name.

`definition` supports:

- `props?: PropsDef<Props>`
- `setup(props, ctx)`
- `styles?: (string | CSSStyleSheet | CSSResult)[]`
- `shadow?: Omit<ShadowRootInit, 'mode'>`
- `formAssociated?: boolean`

`setup()` receives:

```ts
type SetupContextBag<Events> = {
  emit: EmitFn<Events>;
  host: ComponentHost;
  slots: ComponentSlots;
};
```

It must return a `ComponentInstance` with at least `render(): HTMLResult`.

## Runtime Helpers

### `effect(fn, options?)`

Component-aware wrapper around stateit's `effect()`. Cleanups registered inside the effect are tied to the current Craftit runtime.

### `handle(target, event, listener, options?)`

```ts
handle<K extends keyof HTMLElementEventMap>(
  target: EventTarget | null | undefined,
  event: K,
  listener: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void;
```

Adds an event listener and automatically removes it on cleanup.

### `onCleanup(fn)`

Registers cleanup for the current component/runtime scope.

### `onElement(ref, callback, options?)`

Runs `callback` when a `ref()` resolves to an element and re-runs if that element changes.

## Props API

Craftit does not expose `defineProps()`. Define props directly in the `props` object.

### `prop` helpers

| Helper | Signature | Notes |
| --- | --- | --- |
| `prop.string(defaultValue)` | `PropDef<string>` | Reflects by default |
| `prop.bool(defaultValue?)` | `PropDef<boolean>` | Empty string and `'true'` parse as `true` |
| `prop.number(defaultValue?)` | `PropDef<number>` | Uses `Number(...)` parsing |
| `prop.oneOf(allowed, defaultValue)` | `PropDef<T>` | Restricts to the provided string union |

### Prop definitions

```ts
define('status-pill', {
  props: {
    label: prop.string('Ready'),
    disabled: prop.bool(false),
    retries: prop.number(0),
    tone: prop.oneOf(['neutral', 'success', 'danger'] as const, 'neutral'),
    internalValue: {
      default: '',
      reflect: false,
      parse: (value) => value ?? '',
    },
  },
  setup(props) {
    return { render: () => html`${props.label}` };
  },
});
```

Prop values arrive in `setup()` as writable signals.

Key exported types:

- `type PropDef<T>`
- `type PropOptions<T>`
- `type PropsDef<T>`
- `type PropsInput<T>`
- `type InferPropsSignals<T>`

## Template and Directives

### `html`

```ts
html(strings: TemplateStringsArray, ...values: unknown[]): HTMLResult;
```

Supported binding styles include:

- text interpolation: `${count}`
- attribute binding: `:aria-label=${label}`
- boolean attributes: `?disabled=${disabled}`
- property binding: `.value=${value}`
- event binding: `@click=${onClick}`
- event modifiers: `@keydown.stop.prevent=${onKeydown}`
- refs: `ref=${inputRef}`

### `css`

Tagged template helper for component styles.

### `each(source, options)`

List-rendering directive. For reactive sources, always provide a stable `key`.

### `classMap(record)`

Builds a class string from booleans, signals, and getters.

### `raw(value)`

Injects already-trusted HTML into the rendered output. Use only with sanitized content.

## Host and Slots

### Host bindings

Setup context `host` exposes:

- `host.attr(name, value)`
- `host.class(record)`
- `host.style(record)`
- `host.prop(name, descriptor)`
- `host.on(event, listener)`
- `host.bind({ attr, class, style, prop, on })`

Binding values may be signals, getter functions, or primitives.

### `syncAria(target, config)`

Reactively applies ARIA attributes to any element.

### Slots API

```ts
type ComponentSlots = {
  elements: (name?: string) => ReadonlySignal<Element[]>;
  has: (name?: string) => ReadonlySignal<boolean>;
};
```

Use `slots.has(name?)` for presence checks and `slots.elements(name?)` when you need the actual assigned elements.

### Typed emits

`emit()` is typed from the second `define<Props, Events>()` generic.

```ts
type Events = {
  close: void;
  select: { value: string };
};
```

Then:

```ts
emit('close');
emit('select', { value: 'alpha' });
```

## Context API

- `createContext<T>(description?)`
- `provide(key, value)`
- `inject(key)`
- `inject(key, fallback)`
- `injectStrict(key)`

Key exported type:

- `type InjectionKey<T>`

`injectStrict()` throws when no value can be resolved through the composed/shadow DOM parent chain.

## Form-Associated API

### `defineField(options)`

```ts
defineField<T>(options: FormFieldOptions<T>): FormFieldHandle;
```

Works only inside a component declared with `formAssociated: true`.

`FormFieldOptions<T>`:

- `value: Signal<T> | ReadonlySignal<T>`
- `disabled?: ReadonlySignal<boolean>`
- `toFormValue?: (value: T) => string | File | FormData | null`

`FormFieldHandle`:

- `internals`
- `checkValidity()`
- `reportValidity()`
- `setCustomValidity(message)`
- `setValidity(...)`

## Controls APIs

Import from `@vielzeug/craftit/controls`.

### Field authoring controls

- `createTextField(options)` — string value field wiring with ids, assistive state, validation triggering, and optional element lifecycle binding
- `createChoiceField(options)` — select-like field wiring for single or multiple selections
- `createCheckableFieldControl(options)` — checkbox/radio/switch control composition

### Interaction controls

- `createListControl(options)` — enabled-item navigation plus `handleKeydown()`
- `createPressControl(options)` — click/keyboard press abstraction
- `createOverlayControl(options)` — open/close/toggle orchestration with reasons
- `createPopupListControl(options)` — list navigation + overlay + ARIA sync for popup widgets
- `createSliderControl(options)` — min/max/step snapping and keyboard math
- `createSpinnerControl(options)` — numeric increment/decrement and keyboard step behavior

Exported types:

- `type CheckableChangePayload`
- `type OverlayOpenReason`
- `type OverlayCloseReason`
- `type OverlayOpenDetail`
- `type OverlayCloseDetail`

## Observer APIs

Import from `@vielzeug/craftit/observers`.

- `resizeObserver(element)` — returns a signal with `{ width, height }`
- `intersectionObserver(element, options?)` — returns a signal with the latest `IntersectionObserverEntry | null`
- `mediaObserver(query)` — returns a signal of whether the query matches

These helpers must be called in `mount()` or another runtime where the observed DOM target already exists.

## Testing APIs

Import from `@vielzeug/craftit/testing`.

### Core helpers

- `mount(...)`
- `flush()`
- `cleanup()`
- `install(afterEachHook)`
- `within(element)`
- `mock(tagName, template?)`

### Event helpers

- `fire.click(...)`, `fire.keyDown(...)`, `fire.input(...)`, `fire.custom(...)`, and related low-level DOM event helpers
- `user.click(...)`, `user.type(...)`, `user.fill(...)`, `user.press(...)`, `user.select(...)`, and related async higher-level helpers

### Waiting helpers

- `waitFor(fn, options?)`
- `waitForEvent(element, name, timeout?)`

## Stateit Re-exports

Craftit re-exports the following directly from `@vielzeug/stateit`:

- `batch`
- `computed`
- `isSignal`
- `peek`
- `readonly`
- `signal`
- `toValue`
- `untrack`
- `unwrapSignal`
- `watch`
- `writable`
- `type ReadonlySignal`
- `type Signal`
- `type WatchOptions`
