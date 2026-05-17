---
title: Craftit — API Reference
description: Entry points and public API reference for @vielzeug/craftit, @vielzeug/craftit/controls, @vielzeug/craftit/observers, and @vielzeug/craftit/testing.
---

[[toc]]

## API At a Glance

| Symbol             | Purpose                                        | Execution mode | Common gotcha                                         |
| ------------------ | ---------------------------------------------- | -------------- | ----------------------------------------------------- |
| `define()`         | Register a custom element with reactive setup  | Sync           | Tag must contain a hyphen; call before first use      |
| `html`             | Tagged template literal that returns HTMLResult | Sync           | Expressions must be signals, functions, or primitives |
| `effect()`         | Component-scoped reactive side effect          | Sync           | Runs inside component lifetime — auto-cleaned up      |
| `onMounted()`      | DOM-ready callback after template mounts       | Sync           | DOM queries inside setup() run before mount           |
| `onCleanup()`      | Register teardown for component disconnect     | Sync           | Must be called synchronously during setup             |
| `onElement()`      | Run callback when a ref resolves to an element | Sync           | Re-runs when the element reference changes            |
| `prop.*`           | Typed prop helpers (string, bool, number, …)   | Sync           | Prop values are signals — read `.value`               |
| `provide/inject`   | Context API for parent-to-descendant sharing   | Sync           | Call `provide()` during setup, not in onMounted       |
| `ref()`            | Reactive reference to a DOM element            | Sync           | Value is null until after first mount                 |
| `createContext()`  | Create a typed injection key                   | Sync           | Context is scoped to the component tree               |

## Package Entry Points

| Import                        | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `@vielzeug/craftit`           | Core authoring/runtime API plus stateit re-exports |
| `@vielzeug/craftit/controls`  | Headless interaction controls                      |
| `@vielzeug/craftit/observers` | Resize, intersection, and media-query observers    |
| `@vielzeug/craftit/testing`   | DOM-oriented test helpers                          |

## Core Component API

### `define(tag, definition)`

```ts
define<Props, Events>(tag: string, definition: ComponentDefinition<Props, Events>): string;
```

`setup()` receives:

```ts
type SetupContextBag<Events> = {
  emit: EmitFn<Events>;
  host: ComponentHost;
  slots: ComponentSlots;
};
```

`setup()` returns a template function:

```ts
type ComponentTemplate = () => HTMLResult;
```

```ts
define('observed-box', {
  setup() {
    const boxRef = ref<HTMLDivElement>();
    const size = signal({ width: 0, height: 0 });

    onMounted(() => {
      if (!boxRef.value) return;
      const observer = resizeObserver(boxRef.value);

      effect(() => {
        size.value = observer.value || { width: 0, height: 0 };
      });
    });

    return () => html`<div ref=${boxRef}>${size.value.width}x${size.value.height}</div>`;
  },
});
```

## Runtime Helpers

### `effect(fn, options?)`

Component-aware wrapper around stateit's `effect()`. Cleanups registered inside the effect are tied to the current Craftit runtime.

### `onMounted(fn)`

```ts
onMounted(fn: () => void | CleanupFn): void;
```

Registers work that runs after the component template is mounted. Multiple calls are supported and run in registration order.

### `handle(target, event, listener, options?)`

Adds an event listener and automatically removes it on cleanup when called inside component setup or another Craftit runtime scope.

If you call it outside a runtime scope, Craftit returns a manual cleanup function and emits a one-time warning in development.

### `onCleanup(fn)`

```ts
onCleanup(fn: CleanupFn): void;
```

Registers a cleanup function to be called when the component disconnects. Must be called synchronously during component `setup()` or inside `scope.run()`. Cleanup functions run in **LIFO order**.

```ts
define('my-el', {
  setup() {
    const ws = new WebSocket('wss://...');
    onCleanup(() => ws.close()); // runs on disconnect

    return () => html`...`;
  },
});
```

### `scope()`

```ts
scope(): Scope;
```

Re-exported from `@vielzeug/stateit`. Creates an isolated cleanup context. Use inside component `setup()` to manage sub-scoped teardown independently from the component lifetime.

```ts
define('my-el', {
  setup() {
    const sub = scope();
    onCleanup(() => sub.dispose()); // tie sub-scope to component lifetime

    onMounted(() => {
      sub.run(() => {
        const id = setInterval(tick, 200);
        onCleanup(() => clearInterval(id));
      });
    });

    return () => html`...`;
  },
});
```

Registers teardown for the current component/runtime scope.

### `onElement(ref, callback, options?)`

Runs `callback` when a `ref()` resolves to an element and re-runs when that element changes.

## Props API

Craftit does not expose `defineProps()`. Define props directly in `props` using `prop.*` helpers or raw `PropDef` objects.

Shared prop bundles should type against `PropsDef<T>`.

| Helper                              | Signature          | Notes                                     |
| ----------------------------------- | ------------------ | ----------------------------------------- |
| `prop.string(defaultValue)`         | `PropDef<string>`  | Reflects by default                       |
| `prop.bool(defaultValue?)`          | `PropDef<boolean>` | Empty string and `'true'` parse as `true` |
| `prop.number(defaultValue?)`        | `PropDef<number>`  | Uses `Number(...)` parsing                |
| `prop.oneOf(allowed, defaultValue)` | `PropDef<T>`       | Restricts to provided string union        |

When you need custom parsing or `reflect: false`, use a raw `PropDef` object:

```ts
props: {
  label: { default: 'Save', reflect: false },
  count: { default: 0, parse: (value) => (value == null ? 0 : Number(value)) },
}
```

## Template and Directives

- `html(strings, ...values): HTMLResult`
- `css`
- `each(source, options)`
- `classMap(record)`
- `styleMap(record)`
- `guard(deps, render)`
- `when(condition, truthy, falsy?)`
- `live(signal)`
- `until(promise, placeholder?, onError?)`
- `raw(value)`

`live(signal)` is intended for form-control bindings such as `:value` or `:checked` when you want to avoid clobbering user edits with stale app-state writes.

## Host and Slots

Host API from setup context:

- `host.el`
- `host.attr(name, value)`
- `host.class(record)`
- `host.style(record)`
- `host.prop(name, descriptor)`
- `host.on(event, listener)`
- `host.bind({ attr, class, style, prop, on })`

Other helpers:

- `syncAria(target, config)`
- `slots.has(name?)`
- `slots.elements(name?)`

## Utilities

- `ref<T>()`
- `refs<T>()`
- `createId(prefix?)`

## Context API

- `createContext<T>(description?)`
- `provide(key, value)`
- `inject(key)`
- `inject(key, fallback)`
- `injectStrict(key)`

## Form-Associated API

- `defineField(options): FormFieldHandle`
- `type FormFieldOptions<T>`
- `type FormFieldHandle`

## Controls APIs

Import from `@vielzeug/craftit/controls`.

- `createTextField(options)`
- `createChoiceField(options)`
- `createCheckableFieldControl(options)`
- `createListControl(options)`
- `createPressControl(options)`
- `createSwipeControl(options)`
- `createOverlayControl(options)`
- `createPopupListControl(options)`
- `createSliderControl(options)`
- `createSpinnerControl(options)`

## Observer APIs

Import from `@vielzeug/craftit/observers`.

- `resizeObserver(element)`
- `intersectionObserver(element, options?)`
- `mediaObserver(query)`

## Testing APIs

Import from `@vielzeug/craftit/testing`.

- `install(afterEachHook)`
- `cleanup()`
- `flush()`
- `mount(...)`
- `within(element)`
- `mock(tagName, template?)`
- `fire.*`
- `user.*`
- `waitFor(callback, options?)`
- `waitForEvent(element, name, timeout?)`

## Stateit Re-exports

Craftit re-exports these from `@vielzeug/stateit`:

- `signal`, `computed`, `effect`, `watch`, `batch`, `untrack`
- `isSignal`, `type Signal`, `type ReadonlySignal`, `type WatchOptions`
