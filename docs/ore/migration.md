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

## Replace removed testing conveniences

Use the underlying operation directly:

| Removed | Replacement |
| --- | --- |
| `debugFlush()` | `flush({ logger: console.debug })` |
| `mountComponent(tag, definition, options)` | `define(tag, definition)` followed by `mount(tag, options)`, or inline `mount(setup, options)` |
| `mock(tag, template)` | `customElements.define()` with a minimal test element |
| `resetOreForTests()` | `cleanup()` or `install(afterEach)` |
| `walkFlatTree()` | Native DOM and slot traversal in the test that needs it |

## Account for keyed-list recovery

`each()` now keeps numeric and string keys distinct. A duplicate-key update reports `ore:error` and leaves the last valid DOM in place instead of clearing the list.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the current contracts.
