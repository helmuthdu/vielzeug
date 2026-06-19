---
title: 'Flux Examples — Ripple Signal Integration'
description: 'Ripple signal integration example for @vielzeug/flux.'
---

## Ripple Signal Integration

### Problem

You have a Ripple reactive signal and want to apply stream operators to it — debouncing, filtering, combining with other streams — then write the result back to a signal consumed by the UI.

### Solution

Use `fromSignal()` to turn a signal into a `Flux`, compose operators in a pipeline, then use `toSignal()` to write the result back to a new signal.

```ts
import { fromSignal, toSignal, debounce, map, distinctUntilChanged } from '@vielzeug/flux';
import { signal, effect } from '@vielzeug/ripple';

const rawQuery = signal('');

// Turn the signal into a stream and apply operators
const query$ = fromSignal(rawQuery).pipe(
  debounce(300),
  map((q) => q.trim().toLowerCase()),
  distinctUntilChanged(),
);

// Write the processed stream back to a signal
const debouncedQuery = toSignal(query$, { initial: '' });

// Ripple's effect re-runs whenever debouncedQuery.value changes
effect(() => {
  console.log('Fetch:', debouncedQuery.value);
});

rawQuery.value = 'Hello';
rawQuery.value = 'Hello ';
rawQuery.value = 'Hello World';
// After 300ms: "Fetch: hello world"

// Cleanup
debouncedQuery.dispose();
```

#### Bridging signal lifetime with AbortController

When a component unmounts, pass `opts.signal` to stop the flux subscription independently of the signal:

```ts
const ac = new AbortController();

const liveQuery = toSignal(query$, {
  initial: '',
  signal: ac.signal,  // subscription stops when aborted
});

// On component unmount:
ac.abort();
// liveQuery.value freezes at last received value; liveQuery itself is unaffected
```

#### Combining a signal with a user action stream

```ts
import { createSubject, combineLatest, fromSignal } from '@vielzeug/flux';
import { signal } from '@vielzeug/ripple';

const filters = signal({ category: 'all' });
const reload$ = createSubject<void>();

// Re-fetch whenever filters change OR user clicks reload
combineLatest(fromSignal(filters), reload$).subscribe(([f]) => {
  console.log('Reload with filter:', f.category);
});

reload$.emit(); // first emit from both sources needed before combineLatest fires
```

### Pitfalls

- `fromSignal()` emits the current value **synchronously** on subscribe before any future changes. Operators like `debounce` will delay that first emission by `ms`; use `startWith` if you need the initial value immediately alongside the debounced stream.
- `toSignal()` returns a `Signal` whose `dispose()` both stops the flux subscription and marks the signal as disposed. After disposal, the signal's `value` freezes at the last received value but further reads are valid.
- If `opts.signal` is already aborted when `toSignal()` is called, the flux subscription is immediately cancelled and the signal starts in its `initial` state.

### Related

- [API: `fromSignal()`](../api.md#fromsignal-ripple)
- [API: `toSignal()`](../api.md#tosignal-ripple)
- [Combining Streams with combineLatest](./combine-streams.md)
