---
title: 'Stateit Examples — Signals'
description: 'Signals examples for stateit.'
---

## Signals

## Problem

Implement signals in a production-friendly way with `@vielzeug/stateit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/stateit` installed.

### Counter with `computed` and `effect`

A self-contained reactive counter — no framework required:

```ts
import { signal, computed, effect, watch } from '@vielzeug/stateit';

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

### `signal.update()` — Derive Next Value in Place

```ts
import { signal } from '@vielzeug/stateit';

const count = signal(0);
count.update((n) => n + 1); // 1
count.update((n) => n * 2); // 2

const tags = signal(['ts', 'js']);
tags.update((arr) => [...arr, 'tsx']); // ['ts', 'js', 'tsx']
```

---

### Async Loading State with Signals

Manage loading, data, and error state reactively:

```ts
import { signal, computed, batch } from '@vielzeug/stateit';

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

### One-Time Watch with `once`

Subscribe to the first change only, then auto-unsubscribe:

```ts
import { signal, watch } from '@vielzeug/stateit';

const authToken = signal<string | null>(null);

watch(
  authToken,
  (token) => {
    console.log('First login:', token);
    // subscription is already disposed automatically
  },
  { once: true },
);
```

---

### `using` Declarations — Automatic Disposal

With the TC39 explicit resource management proposal (`using`), disposables are cleaned up automatically when their block exits:

```ts
import { signal, effect, computed } from '@vielzeug/stateit';

const count = signal(0);

{
  using sub = effect(() => console.log('count:', count.value));
  using doubled = computed(() => count.value * 2);

  count.value = 5; // both reactive
  // ← block exits; sub and doubled are automatically disposed
}
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
- [Pattern: Async Workflows with watch](./pattern-nextvalue-in-async-workflows.md)
