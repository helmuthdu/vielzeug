---
title: Flux — Usage Guide
description: Create streams, compose operators, consume values safely, and bridge Vielzeug primitives.
---

[[toc]]

## Basic Usage

Define one cold stream. Return teardown work from producer. Every subscription runs producer independently.

```ts
import { stream } from '@vielzeug/flux';

const clock = stream<number>((sink) => {
  let value = 0;
  const id = setInterval(() => sink.next(value++), 1_000);

  return () => clearInterval(id);
});

const subscription = clock.subscribe({
  error: console.error,
  next: console.log,
});

subscription.unsubscribe();
```

Pass `AbortSignal` when another owner controls lifetime.

```ts
const controller = new AbortController();
clock.subscribe(console.log, { signal: controller.signal });
controller.abort();
```

## Compose Streams

Pass source first to `pipe()`. Operators retain inferred value types across chains.

```ts
import { filter, fromEvent, map, pipe, take } from '@vielzeug/flux';

const clicks = pipe(
  fromEvent<MouseEvent>(document, 'click'),
  filter((event) => event.button === 0),
  map((event) => ({ x: event.clientX, y: event.clientY })),
  take(10),
);

clicks.subscribe({
  complete: () => console.log('done'),
  error: console.error,
  next: console.log,
});
```

Use `switchMap()` for latest-only work, `mergeMap()` for concurrent work, and `concatMap()` for ordered work with bounded queue capacity.

```ts
import { from, pipe, retry, switchMap } from '@vielzeug/flux';

const results = pipe(
  queries,
  switchMap((query) => from(fetch(`/api/search?q=${encodeURIComponent(query)}`).then((response) => response.json()))),
  retry({ attempts: 2, delay: (attempt) => 250 * (attempt + 1) }),
);
```

## Consume Values

Use bounded array conversion for finite streams. `toArray()` rejects once source exceeds `maxItems`.

```ts
import { toArray, of } from '@vielzeug/flux';

try {
  const values = await toArray(of(1, 2, 3), { maxItems: 3 });
  console.log(values);
} catch (reason) {
  console.error('Collection failed', reason);
}
```

Use `first()` for first emission and `last()` for last value before completion. Pass `{ signal }` to cancel waiting; cancellation rejects with `AbortError`.

## Channels

Use channels only at imperative boundaries. Expose `channel.stream` to consumers; keep `send()` near event producer.

```ts
import { createChannel } from '@vielzeug/flux/subjects';

const status = createChannel({ initial: 'starting', replay: 1 });
status.stream.subscribe({ error: console.error, next: console.log });
status.send('ready');
status.dispose();
```

Disposal completes active and future subscribers. Replay retains only configured latest values.

## Async Iteration and Bounds

Convert push stream only when pull syntax is required. Capacity and overflow policy are mandatory.

```ts
import { interval, toAsyncIterable } from '@vielzeug/flux';

const values = toAsyncIterable(interval({ every: 100 }), {
  capacity: 32,
  overflow: 'error',
});

for await (const value of values) {
  console.log(value);
  if (value === 2) break;
}
```

`return()` from loop permanently completes iterator. Use `drop-oldest` or `drop-newest` only when loss is acceptable.

## Testing

Use fake timers for time operators. Test producer cleanup through returned subscription.

```ts
import { expect, it, vi } from 'vitest';
import { first, pipe, stream, timeout } from '@vielzeug/flux';

it('fails after inactivity', async () => {
  vi.useFakeTimers();
  const result = first(pipe(stream(() => {}), timeout({ after: 500 })));
  const expectation = expect(result).rejects.toThrow('Timeout after 500ms');

  await vi.advanceTimersByTimeAsync(500);
  await expectation;
  vi.useRealTimers();
});
```

## Framework Integration

::: code-group

```tsx [React]
import { useEffect, useState } from 'react';
import type { Stream } from '@vielzeug/flux';

export function useStream<T>(source: Stream<T>, initial: T): T {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const subscription = source.subscribe({ error: console.error, next: setValue });
    return () => subscription.unsubscribe();
  }, [source]);

  return value;
}
```

```ts [Vue 3]
import { onUnmounted, ref } from 'vue';
import type { Stream } from '@vielzeug/flux';

export function useStream<T>(source: Stream<T>, initial: T) {
  const value = ref(initial);
  const subscription = source.subscribe({ error: console.error, next: (next) => (value.value = next) });

  onUnmounted(() => subscription.unsubscribe());

  return value;
}
```

```ts [Svelte]
import type { Stream } from '@vielzeug/flux';

export function streamStore<T>(source: Stream<T>, initial: T) {
  return {
    subscribe(run: (value: T) => void) {
      run(initial);
      const subscription = source.subscribe({ error: console.error, next: run });
      return () => subscription.unsubscribe();
    },
  };
}
```

:::

## Working with Other Vielzeug Libraries

Import adapters from dedicated subpaths. Core Flux does not require adapter peers.

```ts
import { fromQuery } from '@vielzeug/flux/courier';
import { fromBus } from '@vielzeug/flux/herald';
import { fromPresence } from '@vielzeug/flux/pulse';
import { fromSignal, toSignal } from '@vielzeug/flux/ripple';
```

`toSignal()` preserves final source value, then disposes binding when source completes, errors, or external signal aborts.

## Best Practices

- Return one idempotent producer teardown function.
- Pass `{ signal }` from component, request, or task owner.
- Provide `error` when subscription can recover locally.
- Use `pipe(source, ...)`; never mutate stream definitions.
- Bound `concatMap()` queue capacity.
- Bound `toArray()` with realistic `maxItems`.
- Choose async iterator overflow policy deliberately.
- Keep `Channel.send()` at integration boundaries.
