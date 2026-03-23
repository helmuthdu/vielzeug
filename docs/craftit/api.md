---
title: Craftit — API Reference
description: API reference for Craftit main exports, directives, and testing utilities.
---

# Craftit API Reference

[[toc]]

## Package Entry Points

- `@vielzeug/craftit` — core API (stable)
- `@vielzeug/craftit/labs` — experimental APIs
- `@vielzeug/craftit/directives` — template directives
- `@vielzeug/craftit/test` — testing helpers

## API At a Glance

| Symbol              | Purpose                            | Execution mode | Common gotcha                                    |
| ------------------- | ---------------------------------- | -------------- | ------------------------------------------------ |
| `defineComponent()` | Define and register a custom element | Sync         | Element names must include a hyphen              |
| `html`              | Create reactive templates          | Sync           | Do not build templates with string concatenation |
| `onMount()`         | Run setup logic tied to component lifecycle | Sync | Always return cleanup when registering listeners |

## Core Component API

### `defineComponent(options)`

```ts
defineComponent<Props, Events>(options: DefineComponentOptions<BuildPropSchema<Props>, Events>): string;
```

Registers a custom element and returns the tag name.

If the tag already exists, Craftit throws `[craftit:E9]`.

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

`onCleanup()` is component-aware: inside component setup/mount it runs on unmount; outside component context it delegates to stateit's effect cleanup behavior.

### Reactivity Wrappers

- `effect(fn, options?)` — component-aware wrapper around stateit `effect`.
- `watch(source, cb, options?)` — component-aware watcher.

Signatures:

- `watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription`
- `watch(sources: ReadonlyArray<ReadonlySignal<unknown>>, cb: () => void, options?: WatchOptions<unknown>): Subscription`

### DOM/Event Utilities

- `handle(target, event, listener, options?)` — listener with auto-cleanup.
- `fire.basic(target, type, options?)` — dispatches a plain `Event`.
- `fire.custom(target, type, options?)` — dispatches a `CustomEvent`.
- `fire.mouse(target, type, options?)` — dispatches a `MouseEvent`.
- `fire.keyboard(target, type, options?)` — dispatches a `KeyboardEvent`.
- `fire.focus(target, type, options?)` — dispatches a `FocusEvent`.
- `fire.touch(target, type, options?)` — dispatches a `TouchEvent` when available, otherwise `CustomEvent`.
- `fire.event(target, event)` — dispatches a prebuilt event instance.
- `aria(attrs)` or `aria(target, attrs)` — reactive ARIA attributes (`false`, `null`, and `undefined` remove the attribute).

## Template and Styling

### `html`

```ts
html(strings: TemplateStringsArray, ...values: unknown[]): HTMLResult;
```

Tagged template with reactive bindings.

Template event bindings support modifiers:

- `@click.stop=${handler}`
- `@submit.prevent=${handler}`
- `@click.self=${handler}`
- `@keydown.once=${handler}`
- listener options: `.capture`, `.passive`, `.once`

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
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};

type KeysWithoutDetail<T extends Record<string, unknown>> = {
  [P in keyof T]: [T[P]] extends [void | undefined | never] ? P : never;
}[keyof T];
```

Example:

```ts
type Events = { open: void; select: { value: string } };

emit('open');
emit('select', { value: 'alpha' });
```

### setup-context `slots`

`setup({ slots })` receives a slots helper:

```ts
slots.has(name): ReadonlySignal<boolean>
```

If Craftit cannot find a matching `<slot>` element for `name`, it warns once in dev tooling and returns a signal that stays `false`.

### `onSlotChange(slotName, callback)`

Listens for slot assignment changes (call inside `onMount`).

If no matching `<slot>` exists, Craftit warns once instead of failing silently.

## Context API

- `createContext<T>(description?)`
- `provide(key, value)`
- `inject(key)` / `inject(key, fallback)`
- `injectOptional(key)`
- `injectRequired(key)`
- `syncContextProps(ctx, props, keys)`

Types:

- `InjectionKey<T>`

## Form-Associated API

### `defineField(options, callbacks?)`

```ts
defineField<T>(options: FormFieldOptions<T>, callbacks?: FormFieldCallbacks): FormFieldHandle;
```

Requires `defineComponent({ formAssociated: true, ... })`; otherwise Craftit throws an explicit runtime error.

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

- `createListNavigation(options)`
  - returns result-based navigation (`ListNavigationResult` with `reason`, `moved`, `wrapped`, `index`)
- `createOverlayControl(options)`
  - reason-aware overlay transitions via `setOpen(next, { reason })`, `onOpen(reason)`, and `onClose(reason)`
- `createSelectionControl(options)`
  - key-driven selection via `keyExtractor` and `findByKey`
- `useA11yControl(host, config)`
  - explicit helper tone (`'default' | 'error'`), no text heuristics
- `createCheckableControl(config)`
- `observeResize(el): ReadonlySignal<{ width: number; height: number }>`
- `observeIntersection(el, options?): ReadonlySignal<IntersectionObserverEntry | null>`
- `observeMedia(query): ReadonlySignal<boolean>`

### Labs contract notes

- `aria(...)` semantics apply broadly: `false`, `null`, and `undefined` remove ARIA attributes.
- `createOverlayControl` close/open reasons are part of the public contract and intended for typed event payloads.
- `createSelectionControl` intentionally avoids item-shape assumptions; keys are the stable API surface.

Main API (`@vielzeug/craftit`) also exports:

- `observeResize(el): ReadonlySignal<{ width: number; height: number }>`

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

### `each(source, template, empty?, options?)`

- Static array source: `options.key` optional.
- Reactive source (`Signal<T[]>` or `() => T[]`): `options.key` required.
- `options.select` filters items before rendering.

For dynamic lists with interactions, prefer event delegation on a stable parent element.

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

`until(...)` renders `Error: <reason>` by default when the promise rejects and `onError` is omitted.

- `attr(map)` — shorthand for batching DOM property bindings in spread position.
  Despite the name, entries map to `.property` bindings internally.
- `bind(sig)` — two-way shorthand built on the same property-binding path used by
  `attr(...)`, `spread({ '.value': ... })`, and template `.value` / `.checked` bindings.

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
