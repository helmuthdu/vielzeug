---
title: Craftit — API Reference
description: API reference for Craftit main exports, directives, and testing utilities.
---

# Craftit API Reference

[[toc]]

## Package Entry Points

- `@vielzeug/craftit` — core API (stable)
- `@vielzeug/craftit/core` — explicit core API import path
- `@vielzeug/craftit/labs` — experimental APIs
- `@vielzeug/craftit/directives` — template directives
- `@vielzeug/craftit/test` — testing helpers

## API At a Glance

| Symbol      | Purpose                                     | Execution mode | Common gotcha                                    |
| ----------- | ------------------------------------------- | -------------- | ------------------------------------------------ |
| `defineComponent()` | Define and register a custom element | Sync | Element names must include a hyphen |
| `html`      | Create reactive templates                   | Sync           | Do not build templates with string concatenation |
| `onMount()` | Run setup logic tied to component lifecycle | Sync           | Always return cleanup when registering listeners |

## Core Component API

### `defineComponent(options)`

```ts
defineComponent<Props, Events>(options: DefineComponentOptions<BuildPropSchema<Props>, Events>): string;
```

Registers a custom element and returns the tag name.

- `DefineComponentOptions`:
  - `tag: string`
  - `setup(ctx): string | HTMLResult`
  - `props?: Record<string, PropDef<any>>`
  - `styles?: (string | CSSStyleSheet | CSSResult)[]`
  - `host?: Record<string, string | boolean | number>`
  - `formAssociated?: boolean`
  - `shadow?: Omit<ShadowRootInit, 'mode'>`
- `DefineComponentSetupContext`:
  - `host: HTMLElement`
  - `shadow: ShadowRoot`
  - `props: InferPropsSignals<...>`
  - `emit: EmitFn<Events>`
  - `slots: Slots`
  - `reflect(config)`

## Runtime Helpers

### Lifecycle

- `onMount(fn)` — run logic after mount.
- `onCleanup(fn)` — register cleanup.
- `onError(fn)` — component-scoped error handler.

### Reactivity Wrappers

- `effect(fn, options?)` — component-aware wrapper around stateit `effect`.
- `watch(source, cb, options?)` — component-aware watcher.

Signatures:

- `watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription`
- `watch(sources: ReadonlyArray<ReadonlySignal<unknown>>, cb: () => void, options?: WatchOptions<unknown>): Subscription`

### DOM/Event Utilities

- `handle(target, event, listener, options?)` — listener with auto-cleanup.
- `fire(target, type, options?)` — dispatches DOM/custom events.
- `aria(attrs)` or `aria(target, attrs)` — reactive ARIA attributes.

## Template and Styling

### `html`

```ts
html(strings: TemplateStringsArray, ...values: unknown[]): HTMLResult;
```

Tagged template with reactive bindings.

### `css`

```ts
css(strings: TemplateStringsArray, ...values: unknown[]): CSSResult;
```

Returns `{ content: string; toString(): string }`.

## Props API

### `prop(name, defaultValue, options?)`

```ts
prop<T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T>;
```

`PropOptions<T>`:

- `parse?: (value: string | null) => T`
- `reflect?: boolean`
- `omit?: boolean`
- `type?: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor`

### `typed(defaultValue, options?)`

Helper for explicit generic prop typing in `defineComponent({ props })`.

## Slots and Emits

### setup-context `emit`

`setup({ emit })` receives a typed emit function.

```ts
type EmitFn<T extends Record<string, unknown>> = {
  <K extends { [P in keyof T]: T[P] extends undefined ? P : never }[keyof T]>(event: K): void;
  <K extends keyof T>(event: K, detail: T[K]): void;
};
```

### setup-context `slots`

`setup({ slots })` receives a slots helper:

```ts
slots.has(name): ReadonlySignal<boolean>
```

### `onSlotChange(slotName, callback)`

Listens for slot assignment changes (call inside `onMount`).

## Context API

- `createContext<T>(description?)`
- `provide(key, value)`
- `inject(key)` / `inject(key, fallback)`
- `syncContextProps(ctx, props, keys)`

Types:

- `InjectionKey<T>`

## Form-Associated API

### `defineField(options, callbacks?)`

```ts
defineField<T>(options: FormFieldOptions<T>, callbacks?: FormFieldCallbacks): FormFieldHandle;
```

Types:

- `FormFieldOptions<T>`
  - `value: Signal<T> | ReadonlySignal<T>`
  - `toFormValue?: (value: T) => string | File | FormData | null`
  - `disabled?: Signal<boolean> | ReadonlySignal<boolean> | ComputedSignal<boolean>`
- `FormFieldCallbacks`
  - `onAssociated?`, `onDisabled?`, `onReset?`, `onStateRestore?`
- `FormFieldHandle`
  - `internals`, `setValidity`, `setCustomValidity`, `checkValidity`, `reportValidity`

## Labs APIs

Import from `@vielzeug/craftit/labs`:

- `observeResize(el): ReadonlySignal<{ width: number; height: number }>`
- `observeIntersection(el, options?): ReadonlySignal<IntersectionObserverEntry | null>`
- `observeMedia(query): ReadonlySignal<boolean>`
- `useA11yControl(host, config)`
- `useCheckableControl(config)`

## Utility APIs

- `createId(prefix?)`
- `createFormIds(prefix, name?)`
- `guard(condition, handler)`
- `escapeHtml(value)`
- `toKebab(str)`

Also exported:

- `ref`, `refs`
- internal types including `HTMLResult`, `Directive`, `Ref`, `Refs`, `RefCallback`

## Directive APIs

Exports:

- `attr`
- `bind`
- `choose`
- `classes`
- `each`
- `match`
- `memo`
- `on`
- `raw`
- `spread`
- `style`
- `until`
- `when`

Common signatures:

```ts
when(condition, thenFn, elseFn?)
match(...branchesOrFallback)
until(promise, pendingFn?, onError?)
each(source, template, empty?, options?)
bind(sig)
```

## Testing APIs

Primary exports:

- `mount(...)`
- `flush()`
- `within(element)`
- `fire` (event helpers)
- `user` (interaction helpers)
- `waitFor(...)`
- `waitForEvent(...)`
- `mock(tagName, template?)`
- `cleanup()`
- `install(afterEachHook)`

Core test types:

- `Fixture<T extends HTMLElement>`
- `MountOptions`
- `QueryScope`
- `WaitOptions`

`mount(...)` accepts:

- a registered tag name
- an inline `setup(ctx) => template` function
- an inline `defineComponent`-style options object without `tag`

## Stateit Re-Exports

Craftit re-exports `@vielzeug/stateit` from its main entrypoint. Use Craftit imports directly when building components, or import from `@vielzeug/stateit` for state-only modules.

```ts
import { signal, computed, batch, untrack, readonly } from '@vielzeug/craftit';
```
