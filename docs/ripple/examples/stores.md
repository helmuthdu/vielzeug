---
title: 'Ripple Examples — Stores'
description: 'Stores examples for ripple.'
---

## Stores

### Problem

You have several related signals and computed values for a single feature. Keeping them as loose module-level variables makes the boundaries unclear — grouping them into a store object organizes ownership.

### Solution

Use `store()` to group related state, `patch()` / `replace()` to mutate it, and `watch()` / `computed()` to react to changes.

#### Basic Store

```ts
import { store, watch, batch, computed } from '@vielzeug/ripple';

const cart = store({ items: [] as string[], total: 0 });

// Partial patch
cart.patch({ total: 42 });

// Updater function
cart.replace((s) => ({ ...s, items: [...s.items, 'apple'] }));

// Watch a derived slice via computed()
const totalSignal = computed(() => cart.value.total);
watch(totalSignal, (total) => console.log('total:', total));

// Batch
batch(() => {
  cart.patch({ total: 0 });
  cart.replace((s) => ({ ...s, items: [] }));
});

cart.reset();
```

---

#### Slice Watch via Lens + `watch()`

`watch()` accepts a `Readable`. Use `store.lens(path)` for a named property or `computed()` for an arbitrary derived slice:

```ts
import { store, watch, computed } from '@vielzeug/ripple';

const user = store({ id: 1, name: 'Alice', role: 'admin' });

// Preferred: lens gives a cached, fine-grained writable signal
const nameLens = user.lens('name');
const sub = watch(nameLens, (name, prev) => {
  console.log('name:', prev, '→', name);
});

user.patch({ role: 'editor' }); // ← does NOT fire (name unchanged)
user.patch({ name: 'Bob' }); // → "name: Alice → Bob"

sub.dispose();

// For arbitrary derived slices, wrap in computed() first
const fullLabel = computed(() => `${user.value.name} (${user.value.role})`);
const subLabel = watch(fullLabel, (label) => console.log('label:', label));
user.patch({ role: 'admin' }); // fires — role is part of the slice
subLabel.dispose();
fullLabel.dispose();
```

---

#### Resetting to Initial State

`reset()` restores the state passed to `store()` and protects it from external mutation:

```ts
import { store } from '@vielzeug/ripple';

const s = store({ count: 0, label: 'default' });
s.patch({ count: 10, label: 'modified' });
console.log(s.value); // { count: 10, label: 'modified' }

s.reset();
console.log(s.value); // { count: 0, label: 'default' }
```

---

#### Store Lenses — Scoped Writable Signals

Use `store.lens(path)` to get a writable `Signal` scoped to a single property or dot-path. The lens is cached and produces immutable copies on write:

```ts
import { store, watch } from '@vielzeug/ripple';

const settings = store({
  theme: 'light' as 'light' | 'dark',
  user: { name: 'Alice', address: { city: 'Berlin' } },
});

// Lens for a top-level field
const theme = settings.lens('theme'); // Signal<'light' | 'dark'>
theme.value = 'dark';
console.log(settings.value.theme); // 'dark'

// Lens for a deeply nested path
const city = settings.lens('user.address.city'); // Signal<string>
city.value = 'Hamburg';
console.log(settings.value.user.address.city); // 'Hamburg'

// Watch a single field directly
const stopWatch = watch(theme, (next, prev) => {
  console.log('theme:', prev, '→', next);
});

theme.value = 'light'; // → 'theme: dark → light'
stopWatch.dispose();
```

---

### Pitfalls

- Computed values are recalculated lazily when accessed, not eagerly when dependencies change. Reading a computed in a `setTimeout` may return a stale value if it has not been accessed since the last signal update.
- Exporting a writable store directly allows external code to mutate it and bypass your invariants. Export `readonly(store)` and explicit mutation functions instead.
- Creating a store inside a factory function called multiple times creates independent instances. This is correct for per-component stores but wrong for shared module stores — create module-level stores outside any function.

### Related

- [Signals](./signals)
- [Ore Reactivity](/ore/)

- [Usage Guide](../usage.md#framework-integration)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
