---
title: Flux — Usage Guide
description: How to create streams, compose operators, manage subscriptions, and integrate Flux with other Vielzeug packages.
---

[[toc]]

## Basic Usage

```ts
import { flux, map, take } from '@vielzeug/flux';

const double$ = flux<number>((observer) => {
  observer.next(1);
  observer.next(2);
  observer.next(3);
  observer.complete?.();
}).pipe(
  map((n) => n * 2),
  take(2),
);

double$.subscribe({
  next(v) { console.log(v); },   // 2, 4
  complete() { console.log('done'); },
});
```

## Creating Streams

### From static values

```ts
import { of, from, empty, never, throwError } from '@vielzeug/flux';

of(1, 2, 3).subscribe(console.log);                   // 1 2 3
from([10, 20]).subscribe(console.log);                // 10 20
from(Promise.resolve('hello')).subscribe(console.log); // hello
empty().subscribe({ complete: () => console.log('done') });
```

### From time

```ts
import { interval, timer } from '@vielzeug/flux';

// Emits 0, 1, 2, ... every 500ms
const tick$ = interval(500);

// Emits 0 after 1 second, then completes
const oneShot$ = timer(1000);
```

### From DOM events

```ts
import { fromEvent, debounce } from '@vielzeug/flux';

const clicks$ = fromEvent<MouseEvent>(document, 'click');
const keyups$ = fromEvent<KeyboardEvent>(input, 'keyup').pipe(debounce(300));
```

## Subjects

A `Subject` is a hot stream — it multicasts to all current subscribers. Use it as the imperative entry point into a pipeline.

```ts
import { createSubject, createBehaviorSubject } from '@vielzeug/flux';

const events$ = createSubject<string>();

events$.subscribe((v) => console.log('A:', v));
events$.subscribe((v) => console.log('B:', v));

events$.emit('hello'); // A: hello  B: hello
events$.fail(new Error('oops')); // errors all subscribers and disposes
// events$.complete() ends all subscriptions cleanly and disposes
```

`createBehaviorSubject` replays the latest value to every new subscriber:

```ts
const count$ = createBehaviorSubject(0);

count$.emit(1);
count$.emit(2);

// Late subscriber immediately receives 2
count$.subscribe((v) => console.log(v)); // 2
```

## Subscribing

`subscribe` accepts either a function or an observer object:

```ts
// Function shorthand — only receives values
const unsub = source$.subscribe((v) => console.log(v));

// Full observer
const unsub = source$.subscribe({
  next(v) { /* ... */ },
  complete() { /* ... */ },
  error(err) { /* ... */ },
});

// Tie the subscription to an AbortSignal — aborted = auto-unsubscribe
const ac = new AbortController();
const unsub = source$.subscribe((v) => console.log(v), ac.signal);
ac.abort(); // unsubscribes immediately

// Cancel at any time
unsub();
```

## Composing Operators

All operators are used via `.pipe()`:

```ts
import { filter, map, take, debounce } from '@vielzeug/flux';

const result$ = source$.pipe(
  filter((v) => v > 0),
  map((v) => v * 10),
  take(5),
);
```

### Transformation

```ts
import { map, scan, switchMap, flatMap, concatMap, startWith, bufferCount, pairwise } from '@vielzeug/flux';

// Accumulate running total
of(1, 2, 3).pipe(scan((acc, n) => acc + n, 0)); // 1, 3, 6

// Prepend static values
of(3, 4).pipe(startWith(1, 2)); // 1, 2, 3, 4

// Emit pairs of consecutive values
of(1, 2, 3).pipe(pairwise()); // [1,2], [2,3]

// Collect into fixed-size arrays
of(1, 2, 3, 4).pipe(bufferCount(2)); // [1,2], [3,4]

// Cancel previous inner stream on each new outer emission
search$.pipe(switchMap((q) => from(fetch(`/api?q=${q}`))));
```

### Filtering

```ts
import { take, skip, first, last, takeWhile, takeUntil, debounce, throttle, sample } from '@vielzeug/flux';

source$.pipe(take(3));               // first 3 values
source$.pipe(skip(2));               // skip first 2
source$.pipe(takeWhile((n) => n < 5)); // until predicate is false
source$.pipe(debounce(300));         // last value after 300ms silence
source$.pipe(throttle(200));         // at most one value per 200ms
```

### Cancellation with `AbortSignal`

```ts
import { takeUntil } from '@vielzeug/flux';
import { createSubject } from '@vielzeug/flux';

const ac = new AbortController();
source$.pipe(takeUntil(ac.signal)).subscribe(console.log);
ac.abort(); // stops the subscription
```

You can also pass a `Flux` as the notifier:

```ts
const stop$ = createSubject<void>();
source$.pipe(takeUntil(stop$)).subscribe(console.log);
stop$.emit(); // stops the subscription
```

### Combination

```ts
import { merge, concat, combineLatest, withLatestFrom, zip, forkJoin } from '@vielzeug/flux';

// Merge two streams — emit as values arrive
merge(stream1$, stream2$);

// Sequential — exhaust stream1$ before subscribing to stream2$
concat(stream1$, stream2$);

// Emit tuple when all sources have at least one value
combineLatest(a$, b$);

// Each a$ emission paired with the latest b$ value
a$.pipe(withLatestFrom(b$));

// Pair by index — [a1, b1], [a2, b2]
zip(a$, b$);

// Wait for all to complete; emit tuple of last values
forkJoin(a$, b$);
```

## Error Handling

```ts
import { catchError, retry, of } from '@vielzeug/flux';

// Recover with a fallback stream
source$.pipe(catchError(() => of('fallback')));

// Retry up to 3 times before propagating
source$.pipe(retry(3));

// Retry with 500ms delay between attempts
source$.pipe(retry(3, 500));
```

## Multicasting

```ts
import { share, shareReplay } from '@vielzeug/flux';

// Share one execution among all subscribers (unsubscribes when last subscriber leaves)
const shared$ = expensiveSource$.pipe(share());

// Replay last N values to late subscribers
const replayed$ = source$.pipe(shareReplay(2));
```

## Converting to Promises / Arrays

```ts
import { toPromise, toArray } from '@vielzeug/flux';

const last = await toPromise(of(1, 2, 3));  // 3
const all  = await toArray(of(1, 2, 3));    // [1, 2, 3]
```

Both accept an optional `AbortSignal` to stop waiting on a source that never completes (e.g. cancel when a component unmounts). `toPromise` rejects on abort; `toArray` resolves with whatever it collected so far:

```ts
const ac = new AbortController();

const pending = toArray(longLivedStream$, ac.signal);
ac.abort(); // resolves `pending` with the values collected up to this point
```

## Disposal

`dispose()` terminates a stream permanently. All active subscribers receive a `complete` notification, then no further values are accepted:

```ts
const subject = createSubject<number>();
subject.subscribe({ next: console.log, complete: () => console.log('done') });
subject.dispose(); // logs 'done'; no further values accepted
```

For the `flux()` factory, each subscription is cancelled by the `Unsubscribe` function returned by `subscribe()`. The stream itself does not need to be explicitly disposed.

## Framework Integration

::: code-group

```ts [React]
import { useEffect, useState } from 'react';
import type { Flux } from '@vielzeug/flux';

function useFlux<T>(source: Flux<T>, initial: T): T {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const unsub = source.subscribe((v) => setValue(v));
    return unsub; // React calls this on cleanup
  }, [source]);

  return value;
}
```

```ts [Vue 3]
import { onUnmounted, ref } from 'vue';
import type { Flux } from '@vielzeug/flux';

function useFlux<T>(source: Flux<T>, initial: T) {
  const value = ref<T>(initial);
  const unsub = source.subscribe((v) => { value.value = v as T; });
  onUnmounted(unsub);
  return value;
}
```

```ts [Svelte]
import type { Flux } from '@vielzeug/flux';
import type { Readable } from 'svelte/store';

function fromFlux<T>(source: Flux<T>, initial: T): Readable<T> {
  return {
    subscribe(run) {
      run(initial);
      return source.subscribe(run);
    },
  };
}
// Use in template: {$myStore}
```

:::

## Working with Other Vielzeug Libraries

### Ripple signals

```ts
import { fromSignal, toSignal } from '@vielzeug/flux';
import { signal } from '@vielzeug/ripple';

const count = signal(0);

// Ripple signal → Flux stream (emits current value immediately)
const count$ = fromSignal(count);
count$.subscribe(console.log); // 0, then on every change

// Flux stream → Ripple signal binding
const latest = toSignal(count$, { initial: 0 });
// latest.value is reactive (reads track in ripple effects)
// latest.dispose() ends tracking; value freezes at last received
```

### Herald event bus

```ts
import { fromBus, toBus } from '@vielzeug/flux';
import { createBus } from '@vielzeug/herald';

type Events = { 'user:login': { id: string } };
const bus = createBus<Events>();

// Bus event → Flux stream
fromBus(bus, 'user:login').subscribe(({ id }) => console.log(id));

// Flux stream → bus emissions (values also pass through)
source$.pipe(toBus(bus, 'user:login')).subscribe();
```

## Best Practices

- Unsubscribe or dispose when a stream is no longer needed to avoid memory leaks
- Pass an `AbortSignal` as the second arg to `subscribe()` for automatic cleanup tied to component lifecycles
- Prefer `switchMap` over `flatMap` for request–response patterns where only the latest matters
- Use `shareReplay(1)` when multiple components need the same latest value
- Use `createBehaviorSubject` rather than `createSubject` when late subscribers need the current state
- Use `fail()` instead of `complete()` on a `Subject` when the stream terminates due to an error
- Use `toArray()` or `toPromise()` in tests — they wrap the stream in a `Promise` that resolves when the stream completes
