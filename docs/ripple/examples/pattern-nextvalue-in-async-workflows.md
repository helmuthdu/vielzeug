---
title: 'Ripple Examples — Pattern: Async Workflows with watch'
description: 'Pattern: Bridging reactive state into async code using watch() in ripple.'
---

## Pattern: Async Workflows with `watch`

### Problem

Implement an async workflow that waits for a reactive value to reach a specific state — for example, waiting for a modal result before continuing.

### Solution

Use `watch` with a `Promise` wrapper to bridge reactive state into async code.

`watch()` accepts a `Readable` — pass the signal directly or wrap a derived expression in `computed()`:

```ts
import { store, computed, watch } from '@vielzeug/ripple';
import type { Readable } from '@vielzeug/ripple';

function waitFor<T>(source: Readable<T>, predicate: (v: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const current = source.peek();

    if (predicate(current)) {
      resolve(current);
      return;
    }

    const stop = watch(source, (next) => {
      if (predicate(next)) {
        stop.dispose();
        resolve(next);
      }
    });
  });
}

const modalStore = store({ open: false, result: null as string | null });

export async function openModal(): Promise<string | null> {
  modalStore.patch({ open: true, result: null });

  // Use computed() to derive the slice, then wait on that signal
  const resultSignal = computed(() => modalStore.value.result);
  const result = await waitFor(resultSignal, (v) => v !== null);
  resultSignal.dispose();

  modalStore.patch({ open: false });
  return result;
}
```

For a single next-change with no predicate, stop the subscription after the first callback:

```ts
import { signal, watch } from '@vielzeug/ripple';

const status = signal<'idle' | 'loading' | 'done'>('idle');

function onNextChange(cb: (value: 'idle' | 'loading' | 'done') => void) {
  const stop = watch(status, (value) => {
    cb(value);
    stop.dispose();
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
