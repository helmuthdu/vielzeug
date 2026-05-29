---
title: 'Ripple Examples — Signals'
description: 'Signals examples for ripple.'
---

## Signals

### Problem

You want to understand the core Ripple primitive: `signal()`. This is the starting point for the reactivity model before computed values, effects, or stores.

### Solution

### Counter with `computed` and `effect`

A self-contained reactive counter — no framework required:

```ts
import { signal, computed, effect, watch } from '@vielzeug/ripple';

const count = signal(0);
const doubled = computed(() => count.value * 2);
const isEven = computed(() => count.value % 2 === 0);

// effect runs immediately and re-runs on any dependency change
const sub = effect(() => {
  console.log(`count=${count.value}, doubled=${doubled.value}, even=${isEven.value}`);
});

count.value++; // → count=1, doubled=2, even=false
count.value++; // → count=2, doubled=4, even=true

sub.dispose();
doubled.dispose();
isEven.dispose();
```

---

### Updating Signal Values

```ts
import { signal } from '@vielzeug/ripple';

const count = signal(0);
count.update((value) => value + 1); // 1
count.update((value) => value * 2); // 2

const tags = signal(['ts', 'js']);
tags.update((value) => [...value, 'tsx']); // ['ts', 'js', 'tsx']
```

---

### Async Loading State with Signals

Manage loading, data, and error state reactively:

```ts
import { signal, computed, batch } from '@vielzeug/ripple';

const loading = signal(false);
const data = signal<string[] | null>(null);
const error = signal<Error | null>(null);

const status = computed(() => {
  if (loading.value) return 'loading' as const;
  if (error.value) return 'error' as const;
  if (data.value) return 'success' as const;
  return 'idle' as const;
});

async function fetchItems() {
  batch(() => {
    loading.value = true;
    error.value = null;
  });
  try {
    const res = await fetch('/api/items');
    data.value = await res.json();
  } catch (e) {
    error.value = e as Error;
  } finally {
    loading.value = false;
  }
}
```

---

### One-Time Watch with Explicit Stop

Subscribe to the first change only, then auto-unsubscribe:

```ts
import { signal, watch } from '@vielzeug/ripple';

const authToken = signal<string | null>(null);

const stop = watch(authToken, (token) => {
  console.log('First login:', token);
  stop();
});
```

---

### `using` Declarations — Automatic Disposal

With the TC39 explicit resource management proposal (`using`), disposables are cleaned up automatically when their block exits:

```ts
import { signal, effect, computed } from '@vielzeug/ripple';

const count = signal(0);

{
  using sub = effect(() => console.log('count:', count.value));
  using doubled = computed(() => count.value * 2);

  count.value = 5; // both reactive
  // ← block exits; sub and doubled are automatically disposed
}
```


### Pitfalls

- Signal updates are reference-based. Mutating an object in place (for example, pushing into an array) does not notify subscribers — assign a new value or use `update()` to produce a new reference.
- `effect()` runs immediately on creation. If it has side effects (DOM mutations, network calls), it fires before the component is fully initialized. Use a `mounted` flag to defer.
- Creating a `computed()` inside a component render function without memoization creates a new computed instance on every render, leaking watchers. Create computeds at module scope or in the component setup phase.

### Related
- [Stores](./stores)
- [Craft Reactivity](/craft/)

- [Usage Guide](../usage.md#framework-integration)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
