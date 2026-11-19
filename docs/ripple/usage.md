---
title: 'Ripple: Usage Guide'
description: Build reactive state with one runtime and explicit scope lifetimes.
---

[[toc]]

## Basic Usage

Use top-level functions to create signals, derive values, and react to tracked reads. Put
short-lived derived work in a scope so it can be disposed together.

```ts
import { computed, createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope();
const count = signal(0);
scope.run(() => {
  const label = computed(() => `Count: ${count.value}`);
  effect(() => console.log(label.value));
});

count.value = 1;
scope.dispose();
```

## Scope Lifetimes

The package uses one runtime so reactive values can be tracked across scopes. Use a scope to own work that should be disposed together, such as a test, request, or feature.

```ts
import { createScope, effect, signal } from '@vielzeug/ripple';

const scope = createScope({
  name: 'feature',
  onError: (error, context) => console.log(context.kind, error),
});
const count = signal(0);
scope.run(() => effect(() => console.log(count.value)));
count.value = 1;
scope.dispose();
```

## Derived Values and Batches

Use `computed()` for pure derivation. Use `untrack()` when a current read must not become an effect dependency. Use `batch()` for related synchronous writes.

```ts
const first = signal('Ada');
const last = signal('Lovelace');
const locale = signal('en-US');
const scope = createScope();

scope.run(() => {
  const name = computed(() => `${first.value} ${last.value}`);
  effect(() => {
    console.log({ locale: untrack(() => locale.value), name: name.value });
  });
});

batch(() => {
  first.value = 'Grace';
  last.value = 'Hopper';
});
scope.dispose();
```

## Scheduling and Subscriptions

A synchronous write marks everything downstream stale before any effect runs. Each flush pass runs effects queued at its
start before direct `subscribe()` listeners queued at its start. Work queued by either runs in a later pass.
Effects coalesce writes made inside the same synchronous flush: a `batch()` (or any writes during a flush) produces a single effect run.
Each `subscribe()` registration fires once per flush, even when several subscriptions share one callback function.

```ts
const count = signal(0);
const log: string[] = [];

effect(() => log.push(`effect: ${count.value}`));
count.subscribe(() => log.push(`listener: ${count.value}`));

log.length = 0; // Ignore synchronous creation runs.
batch(() => {
  count.value = 1;
  count.value = 2;
});
console.log(log); // ['effect: 2', 'listener: 2']
```

## Ownership with Scopes

Create a scope when a group of effects or derived values shares one lifetime. Dispose the scope when its feature ends.

```ts
const scope = createScope({ name: 'panel' });
const count = signal(0);

scope.run(() => {
  effect(() => console.log(`Panel count: ${count.value}`));
  onCleanup(() => console.log('panel closed'));
});

count.value = 1;
scope.dispose();
```

Effects and computeds created directly during an effect run belong to that run and are disposed before rerun. `onCleanup(fn)` registers on that same owner: inside an effect it runs before the next run, and inside `scope.run()` it runs when the scope is disposed, after the scope's effects. Explicit scopes intentionally attach to the enclosing scope and survive effect reruns; create them outside rerunning effects or retain and dispose each scope yourself. A call with no scope or effect active registers on the permanent runtime root.

Cleanups run with their disposed owner still active, so an `onCleanup()`, `effect()`, or `computed()` called from inside a cleanup is torn down immediately instead of leaking to the parent.

Disposed owned nodes detach from their parent immediately, so long-lived graphs do not retain released effects or scopes.

## Watch Selected Values

Use `watch()` for one selected output. Reactive reads made only inside its callback are untracked. For one-shot observation, dispose the returned handle from inside the callback; with `immediate: true` the callback runs before the handle exists, so do the first invocation at the call site. Use `effect()` when every callback read should be a dependency.

```ts
const stopWatch = watch(
  () => `${first.value} ${last.value}`,
  (value, previous) => console.log({ previous, value }),
  { immediate: true },
);

stopWatch.dispose();
```

## Error Handling

Failures inside effects and cleanups are reported to the nearest `onError` handler in the owning scope tree. If no handler is found, the error is rethrown asynchronously through `queueMicrotask`. If a handler throws, its error escalates to the parent scope's handler.

```ts
const scope = createScope({
  name: 'panel',
  onError: (error, context) => {
    // Effect and cleanup failures retain their context kind.
    console.error(`${context.kind}:`, error);
  },
});
```

Effects use the scope where they were created; cleanups use their owning scope. Listener failures and flush overflow are reported at the runtime root, so scope handlers do not intercept them. Effect options accept only a `name`; effects do not have a microtask scheduler. Use `batch()` to coalesce related writes.

A computed caches a derivation error like a value: every read rethrows it until a source changes.
The failure therefore reaches the owning scope's `onError` through the effect that reads it, and
a direct read throws it to the caller. The exported
hierarchy is `RippleError`, `RippleCycleError`, and `RippleDisposedError`; callback failures retain
their original values.

A runaway effect (one that keeps re-triggering itself) is caught by the flush iteration limit and reported with context kind `flush`; the flush is abandoned and the graph stays usable for later writes.

## Bridging External Sources

`fromSubscribable()` bridges external `{ getSnapshot, subscribe }` sources into a disposable reactive readable. It uses the shared runtime, rereads after subscription to close registration races, and disposal invokes the external unsubscribe function.

```ts
import { fromSubscribable, effect } from '@vielzeug/ripple';

const routerState = fromSubscribable({
  getSnapshot: () => router.getSnapshot(),
  subscribe: (cb) => router.subscribe(cb),
});

const stop = effect(() => {
  console.log('Current route:', routerState.value);
});

stop.dispose();
routerState.dispose();
```

## Load Async Resources

`resource()` starts immediately, tracks its source reads, and aborts the previous loader whenever the source changes or `reload()` is called. It preserves the last successful value (including `undefined`) as `previous` while newer work is pending or fails.

```ts
const userId = signal('42');
const user = resource(
  () => userId.value,
  (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()),
  { name: 'user' },
);

const stop = effect(() => {
  const state = user.value;
  if (state.status === 'success') console.log(state.value);
  if (state.status === 'error') console.error(state.error);
});

stop.dispose();
user.dispose();
```

Source and loader failures become resource error state rather than `onError` reports.
`reload()` returns `void`; observe state to know when loading finishes. Disposed resources retain
readable state but throw `RippleDisposedError` from `reload()` and new subscriptions. Use Sourcerer
for paginated collection state and a dedicated server-state cache for shared keyed reads, retries,
and invalidation.

## Object State

`signal()` with `update()` holds one value and supports immutable replacement patterns. Return replacement objects from `update()` when object consumers depend on immutable updates.

```ts
const scope = createScope();
const cart = signal({ items: 0, label: 'empty' });
const items = scope.run(() => computed(() => cart.value.items));

cart.update((state) => ({ ...state, items: state.items + 1 }));
cart.value = { items: 3, label: 'ready' };

console.log(items.value);
scope.dispose();
```

## Testing

Create a scope per test. Disposing it prevents owned effects and derived values from leaking into later tests.

```ts
import { expect, test } from 'vitest';
import { computed, createScope, signal } from '@vielzeug/ripple';

test('derives a doubled count', () => {
  const scope = createScope();
  let doubled = 0;
  scope.run(() => {
    const count = signal(2);
    doubled = computed(() => count.value * 2).value;
  });

  expect(doubled).toBe(4);
  scope.dispose();
});
```

## Framework Integration

Use signals and effects with any renderer. Dispose component-owned effects when the component unmounts.

::: code-group

```ts [React]
import { useEffect, useState } from 'react';
import { createScope, effect, signal } from '@vielzeug/ripple';

const count = signal(0);

export function Counter() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const scope = createScope();
    scope.run(() => {
      effect(() => {
        void count.value;
        rerender((revision) => revision + 1);
      });
    });

    return () => scope.dispose();
  }, []);

  return <button onClick={() => (count.value += 1)}>{count.value}</button>;
}
```

```ts [Vue 3]
import { onUnmounted, ref } from 'vue';
import { effect, signal } from '@vielzeug/ripple';

const count = signal(0);
const revision = ref(0);
const stop = effect(() => {
  void count.value;
  revision.value++;
});

onUnmounted(() => stop.dispose());
```

```ts [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { effect, signal } from '@vielzeug/ripple';

  const count = signal(0);
  let revision = 0;
  const stop = effect(() => {
    void count.value;
    revision++;
  });

  onDestroy(() => stop.dispose());
</script>

<button on:click={() => (count.value += 1)}>{count.value}</button>
```

:::

## Working with Other Vielzeug Libraries

Ore uses Ripple for component reactivity. Clockwork actors expose framework-neutral snapshots; bridge actor subscriptions into a Ripple signal. Ledger adds undo/redo commands around state changes without replacing graph.

```ts
import { computed, createScope, fromSubscribable, signal } from '@vielzeug/ripple';
import { defineMachine } from '@vielzeug/clockwork';

const actor = defineMachine<Record<string, never>, { type: 'START' }>()({
  initial: 'idle',
  states: { active: {}, idle: { on: { START: { target: 'active' } } } },
}).createActor();

const scope = createScope();
const snapshot = signal(actor.snapshot);
const stop = actor.subscribe((next) => (snapshot.value = next));
const status = scope.run(() => computed(() => snapshot.value.state));
console.log(status.value);

stop();
actor.dispose();
scope.dispose();
```

## Gotchas

### `subscribe()` is change-only

`Readable.subscribe(listener)` never calls the listener on subscribe: it fires only after a tracked source changes. Read the current value at the call site when you need an initial state.

### `subscribe()` evaluates a computed once

Subscribing to a computed derives it immediately so the computed knows its sources, even if no one reads `.value`. A derivation error is cached, not thrown from `subscribe()`. After that, the listener fires only when the derived value actually changes under its `equals`. Avoid subscribing to expensive computeds unless you need their value.

### Computeds are lazy and glitch-free

A write only marks downstream computeds stale; nothing re-derives until something reads it. When an effect or subscription might be affected, the flush first re-derives the computeds it depends on, in the order they were read, and reruns it only if one of them actually changed. In a diamond (`a → b, c → d`), one write to `a` derives `b`, `c`, and `d` once each, and `d` never sees a fresh `b` next to a stale `c`. Inside `batch()`, a computed derives at most once however many of its sources were written. A computed no one reads costs nothing after a write.

### Computed failures are recoverable

If a computed's `derive` throws (e.g., a source is `null`), the computed keeps the sources it read before the throw and caches the error. When one of those sources changes, the next read derives again; effects that read the failing computed report the error through `onError` and rerun once it recovers.

## Best Practices

- Create one scope per ownership boundary.
- Keep computed callbacks pure.
- Return cleanup from effects.
- Dispose test and feature scopes.
- Batch related synchronous writes.
- Use `watch()` only for selected source transitions; callback-only reads are untracked.
- Dispose external-source bridges when their owner ends.
- Route runtime failures with `onError` and observe async failures through resource state.
