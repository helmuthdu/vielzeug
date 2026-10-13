---
title: Ore 3.0 Migration
---

# Ore 3.0 Migration

Ore 3.0 reduces overlapping component, ID, binding, and testing APIs. It also makes context identity and keyed-list failures explicit.

## Register components with define()

`createComponent()` has been removed. Keep registration in the module or browser bootstrap that owns the tag.

```ts
// Before
const MyCard = createComponent({ setup: () => html`<slot></slot>` });
customElements.define('my-card', MyCard);

// After
define('my-card', { setup: () => html`<slot></slot>` });
```

## Use createId()

`createStableId()` and `resetStableIdCounter()` have been removed. `createId()` now provides the collision-resistant behavior.

```ts
// Before
const labelId = createStableId('label');

// After
const labelId = createId('label');
```

Test isolation resets Ore's internal ID counter through `cleanup()` or `install(afterEach)`. Application code cannot reset IDs.

## Bind explicit ARIA attributes

The separate `aria` binding map has been removed. Put complete `aria-*` names in `attr`.

```ts
// Before
bind({ aria: { expanded: isOpen, controls: panelId } }, { target: trigger });

// After
bind({ attr: { 'aria-expanded': isOpen, 'aria-controls': panelId } }, { target: trigger });
```

## Update host binding types

`ReflectConfig` is now `AttributeBindings`. Replace `HostBindFn` with `typeof bind` when a callable type is needed.

## Treat context descriptions as labels

`createContext(description)` now requires a description and returns a unique key on every call. Reuse the exported key object; do not recreate a context from its description.

```ts
// context.ts
export const ThemeContext = createContext<Theme>('Theme');

// provider.ts and consumer.ts
import { ThemeContext } from './context';
```

## Use the active host for useField()

`FormFieldOptions.el` has been removed. Call `useField()` during the form-associated component's setup; it always attaches internals to the active host.

```ts
useField({ value, disabled });
```

## Pass one validity signal to useField()

The split `validity` + `validationMessage` options are replaced by a single `validity: Readable<FormFieldValidity | null>` where `FormFieldValidity = { flags, message }`. The platform's `setValidity()` contract couples flags and message (flags without a non-empty message throw); one input makes a desynced pair unrepresentable.

```ts
// Before
useField({
  validationMessage: computed(() => (isBlank() ? 'Required.' : '')),
  validity: computed(() => (isBlank() ? { valueMissing: true } : null)),
  value,
});

// After
useField({
  validity: computed(() => (isBlank() ? { flags: { valueMissing: true }, message: 'Required.' } : null)),
  value,
});
```

## Install the form-internals polyfill from assay

The jsdom `ElementInternals`/`FormData`/`<form>.reset()` polyfill moved out of `@vielzeug/ore/testing` into `@vielzeug/assay`, and `install()` lost its options object. Suites that test form-associated components install it directly:

```ts
// Before
install(afterEach, { formInternals: true });

// After
import { installFormInternalsPolyfill } from '@vielzeug/assay';

install(afterEach);
installFormInternalsPolyfill();
```

## Type union props with prop.oneOf()

`prop.string()` and `prop.number()` no longer accept a type parameter: a generic on a runtime parser was a claim the attribute path could not keep (a raw attribute value could violate any union). Union-valued props use `prop.oneOf(allowed, defaultValue?)`, which enforces the set at runtime (`parse` falls back to the default outside the set) and accepts string or number members.

```ts
// Before
size: prop.string<'sm' | 'md' | 'lg'>(),
elevation: prop.number<0 | 1 | 2>(),

// After
const SIZES = ['sm', 'md', 'lg'] as const;
const ELEVATIONS = [0, 1, 2] as const;

size: prop.oneOf(SIZES),
elevation: prop.oneOf(ELEVATIONS),
```

`prop.oneOf()`'s default is now optional: omit it for an optional prop that resolves to `undefined` when the attribute is absent.

## Prefer model() for controlled inputs

`model(signal)` is the two-way form binding: it replaces the `live()` + manual `@input`/`@change` write-back pair. `live()` remains for one-way bindings that only need the stale-write guard. `model()` can only drive a plain `value`/`checked` attribute binding; the boolean (`?checked=`) form throws.

```ts
// Before
<input value=${live(query)} @input=${(e) => (query.value = e.target.value)} />

// After
<input value=${model(query)} />
```

## New template syntax

- `.prop=${value}` binds an element property explicitly (structured values: arrays, objects, callbacks). Prototype-polluting names (`__proto__`, `constructor`, `prototype`) throw at compile time.
- Event modifiers `@event.stop`, `.prevent`, `.once`, `.capture` replace manual `stopPropagation()`/`preventDefault()` boilerplate and listener options. An unknown modifier throws at compile time.
- `indeterminate=${signal}` on a checkbox binds the property-only `indeterminate` state (no attribute exists, so none is written).
- `each()` reconciliation is transactional: when a render throws, entries created during the failed pass are rolled back and the last good list stays on screen (reported via `ore:error`, phase `'each-reconcile'`).

## Replace removed testing conveniences

Use the underlying operation directly:

| Removed | Replacement |
| --- | --- |
| `debugFlush()` | `flush({ logger: console.debug })` |
| `mountComponent(tag, definition, options)` | `define(tag, definition)` followed by `mount(tag, options)`, or inline `mount(setup, options)` |
| `mock(tag, template)` | `customElements.define()` with a minimal test element |
| `resetOreForTests()` | `cleanup()` or `install(afterEach)` |
| `walkFlatTree()` | `walkFlatTree()` from `@vielzeug/assay` |

## Account for keyed-list recovery

`each()` now keeps numeric and string keys distinct. A duplicate-key update reports `ore:error` and leaves the last valid DOM in place instead of clearing the list.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the current contracts.
