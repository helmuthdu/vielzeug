---
title: 'Stateit Examples — Stores'
description: 'Stores examples for stateit.'
---

## Stores

## Problem

Implement stores in a production-friendly way with `@vielzeug/stateit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/stateit` installed.

### Basic Store

```ts
import { store, watch, batch } from '@vielzeug/stateit';

const cart = store({ items: [] as string[], total: 0 });

// Partial patch
cart.patch({ total: 42 });

// Updater function
cart.update((s) => ({ ...s, items: [...s.items, 'apple'] }));

// Watch a derived slice via select()
const totalSignal = cart.select((s) => s.total);
watch(totalSignal, (total) => console.log('total:', total));

// Batch
batch(() => {
  cart.patch({ total: 0 });
  cart.update((s) => ({ ...s, items: [] }));
});

cart.reset();
cart.freeze();
```

---

### Slice Watch via `store.select()`

```ts
import { store, watch } from '@vielzeug/stateit';

const user = store({ id: 1, name: 'Alice', role: 'admin' });

// Only fires when `name` changes — unrelated updates are ignored
const nameSignal = user.select((s) => s.name);
const sub = watch(nameSignal, (name, prev) => {
  console.log('name:', prev, '→', name);
});

user.patch({ role: 'editor' }); // ← does NOT fire (name unchanged)
user.patch({ name: 'Bob' }); // → "name: Alice → Bob"

sub.dispose();
```

---

### Resetting to Initial State

`reset()` restores the state passed to `store()` and protects it from external mutation:

```ts
const s = store({ count: 0, label: 'default' });
s.patch({ count: 10, label: 'modified' });
console.log(s.value); // { count: 10, label: 'modified' }

s.reset();
console.log(s.value); // { count: 0, label: 'default' }
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Framework Integration](./framework-integration.md)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: `nextValue` in Async Workflows](./pattern-nextvalue-in-async-workflows.md)
