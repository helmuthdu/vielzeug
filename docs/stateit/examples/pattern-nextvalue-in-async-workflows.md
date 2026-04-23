---
title: 'Stateit Examples — Pattern: Async Workflows with watch'
description: 'Pattern: Bridging reactive state into async code using watch() in stateit.'
---

## Pattern: Async Workflows with `watch`

## Problem

Implement an async workflow that waits for a reactive value to reach a specific state — for example, waiting for a modal result before continuing.

## Runnable Example

Use `watch` with a `Promise` wrapper to bridge reactive state into async code:

```ts
import { store, computed, watch, untrack } from '@vielzeug/stateit';
import type { ReadonlySignal } from '@vielzeug/stateit';

function waitFor<T>(source: ReadonlySignal<T>, predicate: (v: T) => boolean): Promise<T> {
  return new Promise((resolve) => {
    const current = untrack(() => source.value);

    if (predicate(current)) {
      resolve(current);
      return;
    }

    const stop = watch(source, (next) => {
      if (predicate(next)) {
        stop();
        resolve(next);
      }
    });
  });
}

const modalStore = store({ open: false, result: null as string | null });
const resultSignal = computed(() => modalStore.value.result);

export async function openModal(): Promise<string | null> {
  modalStore.patch({ open: true, result: null });

  // Wait until result is set (modal closed with a value)
  const result = await waitFor(resultSignal, (v) => v !== null);

  modalStore.patch({ open: false });
  resultSignal.dispose();
  return result;
}
```

For a single next-change with no predicate, `watch` with `once: true` is sufficient:

```ts
import { signal, watch } from '@vielzeug/stateit';

const status = signal<'idle' | 'loading' | 'done'>('idle');

function onNextChange(cb: (v: string) => void) {
  watch(status, cb, { once: true });
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
- [Pattern: Shared Module Store](./pattern-shared-module-store.md)
