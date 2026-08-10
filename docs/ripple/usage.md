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

const ripple = createRipple({
  onError(error, context) {
    console.log(context.kind, error);
  },
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

## Watch Selected Values

Use `watch()` for one selected output. Use `effect()` when every reactive read in the callback should be a dependency.

```ts
const stopWatch = ripple.watch(
  () => `${first.value} ${last.value}`,
  (value, previous) => console.log({ previous, value }),
  { immediate: true },
);

stopWatch.dispose();
```

## Async Data

`resource()` captures source dependencies synchronously and passes a cancellation signal to the loader.

```ts
const userId = ripple.signal('42');
const user = ripple.resource(
  () => userId.value,
  async (id, { signal }) => {
    const response = await fetch(`/users/${id}`, { signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    return response.json() as Promise<{ id: string; name: string }>;
  },
);

if (user.value.status === 'success') console.log(user.value.value.name);
if (user.value.status === 'error') console.error(user.value.error);
user.dispose();
```

## Object State

`createStore()` holds one value and exposes `set()` and `update()`. Return replacement objects from `update()` when object consumers depend on immutable updates.

```ts
const cart = ripple.createStore({ items: 0, label: 'empty' });
const items = ripple.computed(() => cart.value.items);

cart.update((state) => ({ ...state, items: state.items + 1 }));
cart.set({ items: 3, label: 'ready' });

console.log(items.value);
```

## Testing

Create an isolated graph per test. Disposal prevents effects and resource work from leaking into later tests.

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

## Best Practices

- Create one graph per ownership boundary.
- Keep computed callbacks pure.
- Return cleanup from effects.
- Dispose request, test, and feature graphs.
- Batch related synchronous writes.
- Use `watch()` only for selected source transitions.
- Read dependencies in a resource source, not its loader.
- Use `onError` for runtime callback, cleanup, listener, and observer failures; handle resource source and loader failures through `resource.value.status === 'error'`.
