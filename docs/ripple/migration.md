---
title: Ripple Migration
---

# Ripple 2.0 Migration

Ripple 2.0 simplifies the public API surface: one entry point, no separate Store primitive, and no dead type guards.

## Import from the root entry point

The `./async`, `./store`, and `./watch` subpaths are removed. Import all primitives from `@vielzeug/ripple`.

```ts
// Before
import { signal } from '@vielzeug/ripple';
import { watch } from '@vielzeug/ripple/watch';
import { resource } from '@vielzeug/ripple/async';
import { createStore } from '@vielzeug/ripple/store';

// After
import { signal, watch, resource } from '@vielzeug/ripple';
```

## Replace createStore with signal.update

`createStore()` is removed. `Signal<T>` now has an `update()` method that covers the same replacement-based pattern.

```ts
// Before
const cart = ripple.createStore({ items: 0 });
cart.update((state) => ({ ...state, items: 3 }));
cart.set({ items: 5 });

// After
const cart = ripple.signal({ items: 0 });
cart.update((state) => ({ ...state, items: 3 }));
cart.value = { items: 5 };
```

## Remove isSignal and isComputed

`isSignal()` and `isComputed()` are removed with no replacement. Use `isReactive()` for `Readable` identity checks.

```ts
// Before
if (isSignal(value)) { /* ... */ }
if (isComputed(value)) { /* ... */ }

// After
if (isReactive(value)) { /* ... */ }
```

## Review resource disposal signal

`Resource.disposalSignal` now returns the underlying effect's signal directly instead of a proxy controller. The signal still aborts on disposal — no consumer code change required, but the internal indirection is gone.

---

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current contracts.
