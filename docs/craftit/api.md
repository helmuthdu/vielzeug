---
title: Craftit — API Reference
description: API reference for Craftit main exports, directives, and testing utilities.
---

[[toc]]

## Package Entry Points

- `@vielzeug/craftit` — core API (stable)
- `@vielzeug/craftit/controls` — headless interaction APIs
- `@vielzeug/craftit/observers` — browser observer APIs
- `@vielzeug/craftit/testing` — testing helpers

## API At a Glance

- `define()` — registers a component definition under a custom-element tag.
- `html` — creates reactive templates; avoid building templates with string concatenation.
- `defineProps` / `prop.*` — typed prop definition DSL.

## Core Component API

### `define(tag, definition)`

```ts
define<Props, Events>(tag: string, definition: ComponentDefinition<Props, Events>): string;
```

Registers a custom element and returns the tag name.

If the tag already exists, Craftit throws to prevent accidental duplicate registrations.

## Field Authoring Controls

From `@vielzeug/craftit/controls`:

- `createTextField(options)` — text field helper with ids, assistive state, validation wiring, and value tracking.
- `createChoiceField(options)` — choice-field helper for select-like components and grouped values.
- `createCheckableFieldControl(options)` — high-level checkable helper for checkbox, radio, and switch widgets.

```ts
import { define, html, signal } from '@vielzeug/craftit';

define('my-counter', {
  setup() {
    const count = signal(0);

    return { render: () => html`<button @click=${() => count.value++}>${count}</button>` };
  },
});
```

Use the setup context for host attribute, class, and event wiring.

```ts
import { computed, define, html, signal } from '@vielzeug/craftit';

define('example-card', {
  setup(_props, { host }) {
    const ready = signal(false);

    host.attr('ready', computed(() => ready.value));

    return { render: () => html`<slot></slot>` };
  },
});
```

For host attributes, classes, and host listeners, use `host.bind(...)`, `host.attr(...)`, `host.class(...)`, `host.style(...)`, `host.prop(...)`, and `host.on(...)` from the setup context.

## Runtime Helpers

### Lifecycle

- `onCleanup(fn)` — register cleanup.
- `onElement(ref, fn, options?)` — element-scoped effect for nullable refs.

`onCleanup()` is component-aware: inside component setup/mount it runs on unmount.

### Reactivity

- `effect(fn, options?)` — component-aware wrapper around stateit `effect`.
- `watch(source, cb, options?)` — import from `@vielzeug/craftit` (re-exported from `@vielzeug/stateit`).

`watch` is intentionally not tied to the component runtime; it can be used anywhere.

Signatures:

- `watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions<T>): Subscription`

### DOM/Event Utilities

- `handle(target, event, listener, options?)` — listener with auto-cleanup.
- `host.bind({ attr, class, on, prop, style })` — full host wiring config object.
- `host.attr(name, signal)`, `host.class(map)`, `host.style(map)`, `host.prop(name, descriptor)`, `host.on(event, listener)` — concise one-liner helpers.

Prefer template `@event` bindings for inner DOM nodes; use `host.on(...)` or `handle()` for host-level interactions.

## Template and Styling

### `html`

```ts
html(strings: TemplateStringsArray, ...values: unknown[]): HTMLResult;
```

Tagged template with reactive bindings.

For reactive attribute bindings (`:attr=${...}`), pass a signal, `computed(...)`, or getter function.

### `css`

```ts
css(strings: TemplateStringsArray, ...values: unknown[]): CSSResult;
```

Returns `{ content: string; toString(): string }`.

## Props API

### `defineProps` + `prop.*`

The recommended way to declare props. Returns typed `PropDef` objects that feed directly into `define`:

```ts
import { define, defineProps, html, prop } from '@vielzeug/craftit';

define('x-button', {
  props: defineProps({
    label: prop.string('Button'),
    disabled: prop.bool(false),
    size: prop.oneOf(['sm', 'md', 'lg'] as const, 'md'),
    count: prop.number(0),
  }),
  setup(props) {
    return {
      render: () => html`
        <button ?disabled=${props.disabled}>
          ${props.label}
          <span class=${`size-${props.size.value}`}>${props.count}</span>
        </button>
      `,
    };
  },
});
```

#### `prop` helpers

| Helper | Signature | Default reflect |
| --- | --- | --- |
| `prop.string(defaultValue)` | `PropDef<T extends string>` | `true` |
| `prop.bool(defaultValue?)` | `PropDef<boolean>` | `true` |
| `prop.number(defaultValue?)` | `PropDef<number>` | `true` |
| `prop.oneOf(allowed, defaultValue)` | `PropDef<T extends string>` | `true` |

All helpers parse from HTML attributes automatically using sensible defaults.

#### Escaping to raw `PropDef`

For advanced control (custom parsing, no reflection):

```ts
props: {
  open: {
    default: false,
    parse: (v) => v === '' || v === 'true',
    reflect: false,
  },
}
```

### Event typing with `define<Props, Events>()`

Declare component event payloads with the second `define` generic:

```ts
type Events = {
  select: { value: string };
  close: void;
};

define<Record<string, never>, Events>('my-example', {
  setup(_props, { emit }) {
    emit('select', { value: 'alpha' });
    emit('close');

    return { render: () => html`` };
  },
});
```

## Slots and Emits

### setup-context `emit`

`setup(_props, { emit })` receives a typed emit function.

```ts
type EmitFn<T extends Record<string, unknown>> = {
  <K extends KeysWithoutDetail<T>>(event: K): void;
  <K extends Exclude<keyof T, KeysWithoutDetail<T>>>(event: K, detail: T[K]): void;
};
```

Example:

```ts
type Events = { open: void; select: { value: string } };

emit('open');
emit('select', { value: 'alpha' });
```

### setup-context `slots`

`setup(_props, { slots })` receives first-class slot signals.

```ts
setup(_props, { slots }) {
  slots.has().value;
  slots.has('header').value;
  slots.elements('trigger').value;
  slots.elements().value;
}
```

- `slots.has(name?)` — whether the given slot currently has assigned elements
- `slots.elements(name?)` — flattened assigned elements for a slot name

Omit the name to address the default slot.

## Host Binding API

### `HostBindingValue`

Host bindings accept signals, getter functions, or primitive values:

```ts
// ✅ Signal
host.attr('aria-expanded', isOpenSignal);

// ✅ Primitive (static)
host.attr('role', 'button');

// ✅ Computed signal for derived reactive values
host.attr('aria-label', computed(() => `${label.value} (${count.value})`));

// ✅ Getter function
host.attr('aria-label', () => label.value);
```

### One-liner helpers

```ts
host.attr('disabled', disabledSignal);
host.class({ 'is-open': isOpenSignal });
host.style({ color: themeSignal });
host.prop('value', {
  get: () => valueSignal.value,
  set: (v) => { valueSignal.value = v; },
});
host.on('click', handleClick);
```

### `host.bind(config)` — full config object

```ts
host.bind({
  attr: { 'aria-expanded': isOpenSignal, role: 'button' },
  class: { 'is-open': isOpenSignal },
  on: { click: handleClick },
  prop: { value: { get: () => val.value, set: (v) => { val.value = v; } } },
  style: { color: themeSignal },
});
```

## Context API

- `createContext<T>(description?)`
- `provide(key, value)`
- `inject(key)` / `inject(key, fallback)`
- `injectStrict(key)`

Types:

- `InjectionKey<T>`

`injectStrict(key)` throws when no provider value is found.

## Form-Associated API

### `defineField(options)`

```ts
defineField<T>(options: FormFieldOptions<T>): FormFieldHandle;
```

Requires `define('tag-name', { formAssociated: true, ... })`; otherwise Craftit throws an explicit runtime error.

Types:

- `FormFieldOptions<T>`
  - `value: Signal<T> | ReadonlySignal<T>`
  - `toFormValue?: (value: T) => string | File | FormData | null` — defaults to `String(v)` for primitives, `null` for `null`/`undefined`
  - `disabled?: Signal<boolean> | ReadonlySignal<boolean>`
- `FormFieldHandle`
  - `internals`, `setValidity`, `setCustomValidity`, `checkValidity`, `reportValidity`

## Controls APIs

Import from `@vielzeug/craftit/controls`:

- `createListControl(options)`
- `createOverlayControl(options)`
- `createTextField(options)`
- `createChoiceField(options)`
- `createCheckableFieldControl(options)`
- `createA11yControl(host, config)`

Observer APIs are exported from `@vielzeug/craftit/observers`:

- `resizeObserver(el): ReadonlySignal<{ width: number; height: number }>`
- `intersectionObserver(el, options?): ReadonlySignal<IntersectionObserverEntry | null>`
- `mediaObserver(query): ReadonlySignal<boolean>`

## Utility APIs

- `createId(prefix?)`
- `ref`, `refs`
- Internal types: `HTMLResult`, `Directive`, `Ref`, `Refs`, `RefCallback`

## Directive APIs

### `each(source, options)`

- `options.render` renders each item.
- Source must be reactive (`Signal<T[]>` or `() => T[]`).
- `options.key` is required.
- `options.fallback` renders when the list is empty.

```ts
each(source, { render, key, fallback })
```

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

`mount(...)` accepts:

- a registered tag name
- an inline setup function
- an inline component options object

## Stateit Re-Exports

Craftit re-exports `@vielzeug/stateit` from its main entrypoint:

```ts
import { batch, computed, signal, watch, readonly, untrack } from '@vielzeug/craftit';
```
