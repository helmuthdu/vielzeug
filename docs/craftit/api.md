---
title: Craftit — API Reference
description: API reference for Craftit main exports, directives, and testing utilities.
---

[[toc]]

## Package Entry Points

- `@vielzeug/craftit` — core API (stable)
- `@vielzeug/craftit/controls` — headless interaction APIs
- `@vielzeug/craftit/observers` — browser observer APIs
- `@vielzeug/craftit/directives` — template directives
- `@vielzeug/craftit/testing` — testing helpers

## API At a Glance

- `define()` — registers a component definition under a custom-element tag.
- `html` — creates reactive templates; avoid building templates with string concatenation.
- `onMount()` — runs setup logic tied to component lifecycle; return cleanup when you attach listeners.

## Core Component API

### `define(tag, definition)`

```ts
define<Props, Events>(tag: string, definition: ComponentDefinition<Props, Events>): string;
```

Registers a custom element and returns the tag name.

If the tag already exists, Craftit keeps the existing registration and returns the tag.

## Field Authoring Controls

From `@vielzeug/craftit/controls`:

- `createTextFieldControl(options)` — text field state, ids, assistive state, attrs, and lifecycle wiring.
- `mountTextFieldLifecycle(options)` — input/change/blur wiring + validation trigger bridge.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('my-counter', {
  setup() {
    const count = signal(0);

    return html`<button @click=${() => count.value++}>${count}</button>`;
  },
});
```

Access host/shadow via `currentRuntime()` inside `setup()` when needed.

```ts
const { el: host, shadowRoot: shadow } = currentRuntime();
```

For host attributes, classes, and host listeners, use `host.bind(...)` from the setup context.

## Runtime Helpers

### Lifecycle

- `onMount(fn)` — run logic after mount.
- `onCleanup(fn)` — register cleanup.
- `onError(fn)` — component-scoped error handler.
- `createCleanupSignal()` — manage replaceable cleanup functions and dispose on unmount.
- `onElement(ref, fn, options?)` — element-scoped effect for nullable refs.
`onCleanup()` is component-aware: inside component setup/mount it runs on unmount; outside component context it delegates to stateit's effect cleanup behavior.

### Reactivity Wrappers

- `effect(fn, options?)` — component-aware wrapper around stateit `effect`.
- `watch(source, cb, options?)` — component-aware watcher.

Signatures:

- `watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription`
- `watch(sources: ReadonlyArray<ReadonlySignal<unknown>>, cb: () => void, options?: WatchOptions<unknown>): Subscription`

### DOM/Event Utilities

- `handle(target, event, listener, options?)` — listener with auto-cleanup.
- `fire.custom(target, type, options?)` — dispatches a `CustomEvent`.
- `fire.mouse(target, type, options?)` — dispatches a `MouseEvent`.
- `fire.keyboard(target, type, options?)` — dispatches a `KeyboardEvent`.
- `fire.focus(target, type, options?)` — dispatches a `FocusEvent`.
- `fire.touch(target, type, options?)` — dispatches a `TouchEvent` when available, otherwise `CustomEvent`.
- `fire.event(target, event)` — dispatches a prebuilt event instance.
- `aria(attrs)` or `aria(target, attrs)` — reactive ARIA attributes (`false`, `null`, and `undefined` remove the attribute).
- `host.bind({ attr: ... })`, `host.bind({ class: ... })`, `host.bind({ on: ... })` — host attribute/class/listener wiring from setup context.

Prefer template `@event` bindings for inner DOM nodes; use `host.bind({ on: ... })` or `handle()` for host-level interactions.

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

### `define<Props>(tag, { props })`

Declare component props directly in `define` using plain defaults. The `Props` generic defines the setup signal types.

```ts
type ButtonProps = {
  count?: number;
  disabled?: boolean;
  label?: string;
  variant?: 'primary' | 'secondary';
};

define<ButtonProps>('my-button', {
  props: {
    count: 0,
    disabled: false,
    label: 'Button',
    variant: 'primary',
  },
  setup({ props }) {
    return html`
      <button ?disabled=${props.disabled}>
        ${props.label}
        <span class=${`variant-${props.variant}`}>${props.count}</span>
      </button>
    `;
  },
});
```

Optional props use `undefined` defaults:

```ts
type ButtonProps = {
  description?: string;
  size?: 'sm' | 'md' | 'lg';
};

define<ButtonProps>('my-button', {
  props: {
    description: undefined,
    size: undefined,
  },
  setup({ props }) {
    return html`${props.description}`;
  },
});
```

When you need custom parsing or reflection control, use a `PropDef` object inline:

```ts
define<{ count?: number; error?: string }>('my-counter', {
  props: {
    count: { default: undefined, type: Number },
    error: { default: '', omit: true },
  },
  setup({ props }) {
    return html`${props.count}`;
  },
});
```

### `prop(name, defaultValue, options?)`

Low-level API for reactive property bindings. Typically use inline `component<Props>({ props })` defaults instead.

```ts
prop<T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T>;
```

`PropOptions<T>`:

- `parse?: (value: string | null) => T` — custom attribute parsing
- `reflect?: boolean` — reflect property to attribute (default: `true`)
- `omit?: boolean` — remove attribute instead of setting to `""` for empty strings
- `type?: StringConstructor | NumberConstructor | BooleanConstructor | ArrayConstructor | ObjectConstructor`

### Event typing with `define<Props, Events>()`

Declare component event payloads with the second `define` generic. This keeps `setup({ emit })` fully typed without a separate `emits` schema.

```ts
type Events = {
  select: { value: string };
  close: void;
};

define<{ value?: string }, Events>('my-example', {
  props: {
    value: undefined,
  },
  setup({ emit, props }) {
    emit('select', { value: props.value.value ?? 'alpha' });
    emit('close');

    return html``;
  },
});
```

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

`setup({ slots })` receives first-class slot signals.

```ts
setup({ slots }) {
  slots.has().value;
  slots.has('header').value;
  slots.elements('trigger').value;
  slots.elements().value;
}
```

- `slots.has(name?)` — whether the given slot currently has assigned elements
- `slots.elements(name?)` — flattened assigned elements for a slot name

Omit the name to address the default slot.

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

Requires `define('tag-name', { formAssociated: true, ... }))`; otherwise Craftit throws an explicit runtime error.

Types:

- `FormFieldOptions<T>`
  - `value: Signal<T> | ReadonlySignal<T>`
  - `toFormValue?: (value: T) => string | File | FormData | null`
  - `disabled?: Signal<boolean> | ReadonlySignal<boolean> | ComputedSignal<boolean>`
- `FormFieldCallbacks`
  - `onAssociated?`, `onDisabled?`, `onReset?`, `onStateRestore?`
- `FormFieldHandle`
  - `internals`, `setValidity`, `setCustomValidity`, `checkValidity`, `reportValidity`

## Controls APIs

Import from `@vielzeug/craftit/controls`:

- `createListControl(options)`
  - returns result-based navigation (`ListControlResult` with `reason`, `moved`, `wrapped`, `index`)
- `createOverlayControl(options)`
  - reason-aware overlay transitions via `setOpen(next, { reason })`, `onOpen(reason)`, and `onClose(reason)`
- `createTextFieldControl(options)`
  - text-field controller with stable ids, validation hooks, and integrated assistive state
- `createChoiceFieldControl(options)`
  - single/multi choice controller for select, combobox, and grouped checkboxes
- `createCheckableFieldControl(options)`
  - checkbox/radio/switch helper that bundles checkable state, a11y wiring, and press handling
- `createA11yControl(host, config)`
  - low-level DOM ARIA/label/helper wiring for advanced custom widgets

### Controls contract notes

- `aria(...)` semantics apply broadly: `false`, `null`, and `undefined` remove ARIA attributes.
- `createOverlayControl` close/open reasons are part of the public contract and intended for typed event payloads.

Observer APIs are exported from `@vielzeug/craftit/observers`:

- `resizeObserver(el): ReadonlySignal<{ width: number; height: number }>`
- `intersectionObserver(el, options?): ReadonlySignal<IntersectionObserverEntry | null>`
- `mediaObserver(query): ReadonlySignal<boolean>`

## Utility APIs

- `createId(prefix?)`

Also exported:

- `ref`, `refs`
- internal types including `HTMLResult`, `Directive`, `Ref`, `Refs`, `RefCallback`

## Directive APIs

### `each(source, options)`

- `options.render` renders each item.
- Static array source: `options.key` optional.
- Reactive source (`Signal<T[]>` or `() => T[]`): `options.key` required.
- `options.fallback` renders when the list is empty.
- `options.select` filters items before rendering.

For dynamic lists with interactions, prefer event delegation on a stable parent element.

Exports:

- `attrs`
- `bind`
- `choose`
- `classes`
- `each`
- `memo`
- `on`
- `raw`
- `spread`
- `style`
- `until`
- `when`

Common signatures:

```ts
when({ condition, then, else })
until(promise, pendingFn?, onError?)
each(source, { render, key, fallback, select })
choose({ value, cases, fallback })
bind({ value, as, event, parse })
memo({ deps, render })
```

`until(...)` renders `Error: <reason>` by default when the promise rejects and `onError` is omitted.

- `attrs(map)` — shorthand for batching DOM property bindings in spread position.
  Despite the name, entries map to `.property` bindings internally.
- `bind({ value })` — two-way shorthand built on the same property-binding path used by
  `attrs(...)`, `spread({ '.value': ... })`, and template `.value` / `.checked` bindings.

## Testing APIs

Import from `@vielzeug/craftit/testing`.

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
- an inline `component`-style options object without `tag`

## Stateit Re-Exports

Craftit re-exports `@vielzeug/stateit` from its main entrypoint. Use Craftit imports directly when building components, or import from `@vielzeug/stateit` for state-only modules.

```ts
import { signal, computed, batch, untrack, readonly } from '@vielzeug/craftit';
```
