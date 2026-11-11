---
title: 'Ripple: Usage Guide'
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

const ripple = createRipple({
  onError: (error, context) => console.log(context.kind, error),
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

A synchronous write marks everything downstream stale before any effect runs. Each flush pass runs effects queued at its
start before direct `subscribe()` listeners queued at its start. Work queued by either runs in a later pass.
Effects coalesce writes made inside the same synchronous flush: a `batch()` (or any writes during a flush) produces a single effect run.
Each `subscribe()` registration fires once per flush, even when several subscriptions share one callback function.

```ts
const count = ripple.signal(0);
const log: string[] = [];

ripple.effect(() => log.push(`effect: ${count.value}`));
count.subscribe(() => log.push(`listener: ${count.value}`));

log.length = 0; // Ignore synchronous creation runs.
ripple.batch(() => {
  count.value = 1;
  count.value = 2;
});
console.log(log); // ['effect: 2', 'listener: 2']
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

Effects and computeds created directly during an effect run belong to that run and are disposed before rerun. `onCleanup(fn)` registers on that same owner: inside an effect it runs before the next run, and inside `scope.run()` it runs when the scope is disposed, after the scope's effects. Explicit scopes intentionally attach to the enclosing scope and survive effect reruns; create them outside rerunning effects or retain and dispose each scope yourself. A call with no scope or effect active registers on the graph root.

Cleanups run with their disposed owner still active, so an `onCleanup()`, `effect()`, or `computed()` called from inside a cleanup is torn down immediately instead of leaking to the parent.

Disposed owned nodes detach from their parent immediately, so long-lived graphs do not retain released effects or scopes.

## Watch Selected Values

Use `watch()` for one selected output. Reactive reads made only inside its callback are untracked. For one-shot observation, dispose the returned handle from inside the callback; with `immediate: true` the callback runs before the handle exists, so do the first invocation at the call site. Use `effect()` when every callback read should be a dependency.

```ts
const stopWatch = ripple.watch(
  () => `${first.value} ${last.value}`,
  (value, previous) => console.log({ previous, value }),
  { immediate: true },
);

stopWatch.dispose();
```

## Error Handling

Failures inside effect callbacks, computed derivations, cleanups, and listeners never corrupt the graph: the failing node is reported and siblings keep updating. The `onError` option decides what reporting means. By default failures rethrow asynchronously (via `queueMicrotask`), surfacing as unhandled errors; pass a handler to route them to a logger or error boundary instead:

```ts
const ripple = createRipple({
  onError: (error, context) => {
    // context.kind: 'cleanup' | 'effect' | 'flush' | 'listener'
    console.error(`${context.kind}:`, error);
  },
});
```

`onError` is the only runtime option. Effect options accept only a `name`; effects do not have a
microtask scheduler. Use `batch()` to coalesce related writes.

A computed caches a derivation error like a value: every read rethrows it until a source changes.
The failure therefore reaches `onError` through whatever reads it (context kind `effect` for an
effect, `listener` for a subscription), and a direct read throws it to the caller. The exported
hierarchy is `RippleError`, `RippleCycleError`, and `RippleDisposedError`; callback failures retain
their original values.

A runaway effect (one that keeps re-triggering itself) is caught by the flush iteration limit and reported with context kind `flush`; the flush is abandoned and the graph stays usable for later writes.

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

`resource()` starts immediately, tracks its source reads, and aborts the previous loader whenever the source changes or `reload()` is called. It preserves the last successful value (including `undefined`) as `previous` while newer work is pending or fails.

```ts
const userId = ripple.signal('42');
const user = ripple.resource(
  () => userId.value,
  (id, { signal }) => fetch(`/users/${id}`, { signal }).then((response) => response.json()),
  { name: 'user' },
);

const stop = ripple.effect(() => {
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

### `subscribe()` is change-only

`Readable.subscribe(listener)` never calls the listener on subscribe: it fires only after a tracked source changes. Read the current value at the call site when you need an initial state.

### `subscribe()` evaluates a computed once

Subscribing to a computed derives it immediately so the computed knows its sources, even if no one reads `.value`. A derivation error is cached, not thrown from `subscribe()`. After that, the listener fires only when the derived value actually changes under its `equals`. Avoid subscribing to expensive computeds unless you need their value.

### Computeds are lazy and glitch-free

A write only marks downstream computeds stale; nothing re-derives until something reads it. When an effect or subscription might be affected, the flush first re-derives the computeds it depends on, in the order they were read, and reruns it only if one of them actually changed. In a diamond (`a → b, c → d`), one write to `a` derives `b`, `c`, and `d` once each, and `d` never sees a fresh `b` next to a stale `c`. Inside `batch()`, a computed derives at most once however many of its sources were written. A computed no one reads costs nothing after a write.

### Computed failures are recoverable

If a computed's `derive` throws (e.g., a source is `null`), the computed keeps the sources it read before the throw and caches the error. When one of those sources changes, the next read derives again; effects that read the failing computed report the error through `onError` and rerun once it recovers.

## Best Practices

- Create one graph per ownership boundary.
- Keep computed callbacks pure.
- Return cleanup from effects.
- Dispose test and feature graphs.
- Batch related synchronous writes.
- Use `watch()` only for selected source transitions; callback-only reads are untracked.
- Dispose external-source bridges when their owner ends.
- Route runtime failures with `onError` and observe async failures through resource state.
