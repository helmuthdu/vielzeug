---
title: 'Flux Examples — Debounced Search Input'
description: 'Debounce input events and retain only latest search result stream.'
---

## Debounced Search Input

### Problem

Input events can outpace remote search. Earlier responses must not replace results for later input.

### Solution

Map input events to query text, debounce them, then switch to latest request stream.

```ts
import { debounce, from, fromEvent, map, pipe, switchMap } from '@vielzeug/flux';

const input = document.querySelector<HTMLInputElement>('#search')!;

const results = pipe(
  fromEvent<InputEvent>(input, 'input'),
  map((event) => (event.target as HTMLInputElement).value.trim()),
  debounce({ for: 300 }),
  switchMap((query) => from(fetch(`/api/search?q=${encodeURIComponent(query)}`).then((response) => response.json()))),
);

const subscription = results.subscribe({
  error: console.error,
  next: console.log,
});

subscription.unsubscribe();
```

### Pitfalls

- `switchMap()` stops Flux delivery from earlier requests; `fetch()` itself needs its own `AbortSignal` for network cancellation.
- Map event values before debounce; events are transient objects.
- Handle `error` because rejected fetch promises terminate stream.

### Related

- [Combining Streams](./combine-streams.md)
- [Signal Integration](./signal-integration.md)
- [API: `switchMap()`](../api.md#switchmap)
