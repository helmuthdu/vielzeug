---
title: 'Flux Examples — Debounced Search Input'
description: 'Debounced search input example for @vielzeug/flux.'
---

## Debounced Search Input

### Problem

Triggering a fetch on every keystroke floods the server and makes the UI feel unresponsive. You need to wait until the user pauses typing before firing the search, and cancel any in-flight request if a new one starts.

### Solution

Use `fromEvent()` to capture input events, `debounce()` to suppress rapid keystrokes, and `switchMap()` to cancel previous in-flight fetches.

```ts
import { fromEvent, debounce, switchMap, map, from } from '@vielzeug/flux';

const input = document.querySelector<HTMLInputElement>('#search')!;
const results = document.querySelector<HTMLUListElement>('#results')!;

async function fetchResults(query: string): Promise<string[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  return res.json() as Promise<string[]>;
}

const unsub = fromEvent<InputEvent>(input, 'input')
  .pipe(
    map((e) => (e.target as HTMLInputElement).value.trim()),
    debounce(300),                          // wait 300ms after last keystroke
    switchMap((query) => from(fetchResults(query))), // cancel previous fetch
  )
  .subscribe({
    next(items) {
      results.innerHTML = items.map((i) => `<li>${i}</li>`).join('');
    },
    error(err) {
      console.error('search failed', err);
    },
  });

// Call unsub() to tear down when the component unmounts
```

#### With minimum query length

```ts
import { filter } from '@vielzeug/flux';

fromEvent<InputEvent>(input, 'input')
  .pipe(
    map((e) => (e.target as HTMLInputElement).value.trim()),
    filter((q) => q.length >= 2), // skip very short queries
    debounce(300),
    switchMap((q) => from(fetchResults(q))),
  )
  .subscribe({ next: renderResults, error: console.error });
```

### Pitfalls

- `debounce` drops the pending value when the source completes — wrap in `takeUntil` if you need to flush on unmount.
- `switchMap` cancels the previous `from(fetch(...))` subscription, but the underlying `fetch()` Promise itself is not aborted. Pass an `AbortSignal` into `fetch` and wire it to `takeUntil` inside the inner stream if you need true request cancellation.
- Mapping the event to its `value` **before** `debounce` ensures you read the current input value, not a stale captured event object.

### Related

- [Combining Streams with combineLatest](./combine-streams.md)
- [API: `debounce()`](../api.md#debounce)
- [API: `switchMap()`](../api.md#switchmap)
