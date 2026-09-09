---
title: Ripple — Usage Guide
description: Build reactive state with one explicit graph boundary.
---

[[toc]]

## Basic Usage

Use top-level functions when one application-lifetime graph is sufficient. Read a signal inside an effect to make that read reactive.

```ts
import { computed, effect, signal } from '@vielzeug/ripple';

const count = signal(0);
const label = computed(() => `Count: ${count.value}`);
const stop = effect(() => console.log(label.value));

count.value = 1;
stop.dispose();
```

## Isolated Graphs

Use `createRipple()` for tests, SSR requests, embedded applications, or independently disposable features. Never mix reactive values from separate graphs.

```ts
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple({ errorPolicy: 'swallow' });

ripple.tap((event) => {
  if (event.type === 'error') console.log(event.context.kind, event.error);
});

const count = ripple.signal(0);
const stop = ripple.effect(() => console.log(count.value));

stop.dispose();
ripple.dispose();
```

## Derived Values and Batches

Use `computed()` for pure derivation. Use `untrack()` when a current read must not become an effect dependency. Use `batch()` for related synchronous writes.

```ts
const first = ripple.signal('Ada');
const last = ripple.signal('Lovelace');
const locale = ripple.signal('en-US');
const name = ripple.computed(() => `${first.value} ${last.value}`);

ripple.effect(() => {
  console.log({ locale: ripple.untrack(() => locale.value), name: name.value });
});

ripple.batch(() => {
  first.value = 'Grace';
  last.value = 'Hopper';
});
```

## Scheduling and Subscriptions

Ripple propagates every synchronous write before flushing effects. Each flush pass runs effects queued at its
start before direct `subscribe()` listeners queued at its start. Work queued by either runs in a later pass.
Effects using `scheduler: 'microtask'` join a later microtask and coalesce writes made before that task runs.

```ts
const count = ripple.signal(0);
const log: string[] = [];

ripple.effect(() => log.push(`effect: ${count.value}`));
count.subscribe(() => log.push(`listener: ${count.value}`));
ripple.effect(() => log.push(`deferred: ${count.value}`), { scheduler: 'microtask' });

log.length = 0; // Ignore synchronous creation runs.
count.value = 1;
console.log(log); // ['effect: 1', 'listener: 1']

await Promise.resolve();
console.log(log); // ['effect: 1', 'listener: 1', 'deferred: 1']
```

## Ownership with Scopes

Create a scope when a group of effects or derived values shares one lifetime. Dispose the scope when its feature ends.

```ts
const scope = ripple.createScope('panel');
const count = ripple.signal(0);

scope.run(() => {
  ripple.effect(() => console.log(`Panel count: ${count.value}`));
});

count.value = 1;
scope.dispose();
```

Effects and computeds created directly during an effect run belong to that run and are disposed before rerun. Explicit scopes intentionally attach to the enclosing scope and survive effect reruns; create them outside rerunning effects or retain and dispose each scope yourself.

Disposed owned nodes detach from their parent immediately, so long-lived graphs do not retain released effects or scopes.

## Watch Selected Values

Use `watch()` for one selected output. Reactive reads made only inside its callback are untracked. `{ once: true }` disposes after the first callback invocation even when that callback throws. Use `effect()` when every callback read should be a dependency.

```ts
const stopWatch = ripple.watch(
  () => `${first.value} ${last.value}`,
  (value, previous) => console.log({ previous, value }),
  { immediate: true },
);

stopWatch.dispose();
```

## Observability

`tap()` receives writes, computes, effects, disposals, and reported errors. Computed refresh failures are isolated and reported without interrupting sibling propagation. During runtime disposal, owned cleanup errors and node disposal events are emitted before the final graph disposal event; handlers remain active until that sequence completes. Tap-handler errors are swallowed.

```ts
const ripple = createRipple({ errorPolicy: 'swallow' });

ripple.tap((event) => {
  switch (event.type) {
    case 'write':
      console.log(`${event.name}: ${event.previous} → ${event.next}`);
      break;
    case 'error':
      console.error(`${event.context.kind}:`, event.error);
      break;
  }
});
```

`errorPolicy` controls whether computed refresh, effect, cleanup, and listener failures rethrow (`'throw'`, default) or are silenced (`'swallow'`). Error events are emitted through `tap()` regardless of policy.

## Bridging External Sources

`fromSubscribable()` bridges external `{ getSnapshot, subscribe }` sources into a disposable reactive readable. Use `ripple.fromSubscribable()` inside isolated graphs; the root helper uses the process-lifetime default graph. The bridge rereads after subscription to close registration races, and disposal invokes the external unsubscribe function.

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

`resource()` starts immediately, tracks its source reads, and aborts the previous loader whenever the source changes or `reload()` is called. It preserves the last successful value—including `undefined`—as `previous` while newer work is pending or fails.

```ts
const userId = ripple.signal('42');
const user = ripple.resource(
  () => userId.value,
  (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()),
  { name: 'user' },
);

const stop = ripple.effect(() => {
  const state = user.value;
  if (state.status === 'success') renderUser(state.value);
  if (state.status === 'error') renderError(state.error);
});

stop.dispose();
user.dispose();
```

Disposed resources retain readable state but reject `reload()` and new subscriptions with `RippleDisposedResourceError`. Use Sourcerer for paginated collection state and a dedicated server-state cache for shared keyed reads, retries, and invalidation.

## Object State

`signal()` with `update()` holds one value and supports immutable replacement patterns. Return replacement objects from `update()` when object consumers depend on immutable updates.

```ts
const cart = ripple.signal({ items: 0, label: 'empty' });
const items = ripple.computed(() => cart.value.items);

cart.update((state) => ({ ...state, items: state.items + 1 }));
cart.value = { items: 3, label: 'ready' };

console.log(items.value);
```

## Testing

Create an isolated graph per test. Disposal prevents effects from leaking into later tests.

```ts
import { expect, test } from 'vitest';
import { createRipple } from '@vielzeug/ripple';

test('derives a doubled count', () => {
  const ripple = createRipple();
  const count = ripple.signal(2);
  const doubled = ripple.computed(() => count.value * 2);

  expect(doubled.value).toBe(4);
  ripple.dispose();
});
```

## Framework Integration

Use signals and effects with any renderer. Dispose component-owned effects when the component unmounts.

::: code-group

```ts [React]
import { useEffect, useState } from 'react';
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);

export function Counter() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const stop = ripple.effect(() => {
      void count.value;
      rerender((revision) => revision + 1);
    });

    return () => stop.dispose();
  }, []);

  return <button onClick={() => (count.value += 1)}>{count.value}</button>;
}
```

```ts [Vue 3]
import { onUnmounted, ref } from 'vue';
import { createRipple } from '@vielzeug/ripple';

const ripple = createRipple();
const count = ripple.signal(0);
const revision = ref(0);
const stop = ripple.effect(() => {
  void count.value;
  revision.value++;
});

onUnmounted(() => stop.dispose());
```

```ts [Svelte]
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createRipple } from '@vielzeug/ripple';

  const ripple = createRipple();
  const count = ripple.signal(0);
  let revision = 0;
  const stop = ripple.effect(() => {
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
import { createRipple } from '@vielzeug/ripple';
import { defineMachine } from '@vielzeug/clockwork';

const ripple = createRipple();
const actor = defineMachine<Record<string, never>, { type: 'START' }>()({
  initial: 'idle',
  states: { active: {}, idle: { on: { START: { target: 'active' } } } },
}).createActor();

const snapshot = ripple.signal(actor.snapshot);
const stop = actor.subscribe((next) => (snapshot.value = next));
const status = ripple.computed(() => snapshot.value.state);
console.log(status.value);

stop();
actor.dispose();
ripple.dispose();
```

## Gotchas

### `subscribe()` forces computed evaluation

`Readable.subscribe()` calls `peek()` before registering the listener. For signals this is a no-op, but for computeds it forces `refresh()` — the derivation runs immediately even if no one reads `.value`. This ensures `equals` comparison works on the first dependency change. Avoid subscribing to expensive computeds unless you need their value.

### Computed first-run failure is recoverable

If a computed's `derive` throws on its first run (e.g., a source is `null`), the computed commits the partial dependencies it tracked before the throw. When a dependency changes and the derivation can succeed, the computed refreshes and notifies its dependents. Effects that read a failing computed report the error through `tap()` and re-run when the computed recovers.

## Best Practices

- Create one graph per ownership boundary.
- Keep computed callbacks pure.
- Return cleanup from effects.
- Dispose test and feature graphs.
- Batch related synchronous writes.
- Use `watch()` only for selected source transitions; callback-only reads are untracked.
- Dispose external-source bridges when their owner ends.
- Use `tap()` for runtime observability; set `errorPolicy: 'swallow'` to silence rethrow.
- Use `resource()` for focused async state and Sourcerer for paginated collection workflows.
