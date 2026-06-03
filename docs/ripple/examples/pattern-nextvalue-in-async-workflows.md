---
title: 'Ripple Examples — Pattern: Async Workflows with watch'
description: 'Pattern: Bridging reactive state into async code using watch() in ripple.'
---

## Pattern: Async Workflows with `watch`

### Problem

Implement an async workflow that waits for a reactive value to reach a specific state — for example, waiting for a modal result before continuing.

### Solution

Use `watch` with a `Promise` wrapper to bridge reactive state into async code:

```ts
import { store, watch, untrack } from '@vielzeug/ripple';

function waitFor<T>(get: () => T, predicate: (v: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const current = untrack(get);

    if (predicate(current)) {
      resolve(current);
      return;
    }

    const stop = watch(get, (next) => {
      if (predicate(next)) {
        stop();
        resolve(next);
      }
    });
  });
}

const modalStore = store({ open: false, result: null as string | null });

export async function openModal(): Promise<string | null> {
  modalStore.patch({ open: true, result: null });

  // Wait until result is set (modal closed with a value)
  const result = await waitFor(
    () => modalStore.value.result,
    (v) => v !== null,
  );

  modalStore.patch({ open: false });
  return result;
}
```

For a single next-change with no predicate, stop the subscription after the first callback:

```ts
import { signal, watch } from '@vielzeug/ripple';

const status = signal<'idle' | 'loading' | 'done'>('idle');

function onNextChange(cb: (value: 'idle' | 'loading' | 'done') => void) {
  const stop = watch(status, (value, prev) => {
    cb(value);
    if (value !== prev) stop();
  });
}
```

### Pitfalls

- `watch()` does not fire on setup by default. Use `{ immediate: true }` when you need an initial synchronous invocation.
- If the signal changes while the async callback is still running, the callback is invoked again concurrently. Use a cancel-previous pattern or a lock to prevent overlapping executions.
- Rejections inside a `watch` async callback are not propagated to the `watch` caller. Always `catch` inside the async handler to avoid silent unhandled rejection warnings.

### Related

- [Usage Guide](../usage.md#framework-integration)
- [Pattern: Batch for Complex Mutations](./pattern-batch-for-complex-mutations.md)
- [Pattern: Shared Module Store](./pattern-shared-module-store.md)
