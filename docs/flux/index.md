---
title: Flux — Composable reactive streams for TypeScript
description: Cold-by-default, disposable reactive streams with a full operator library and ecosystem adapters for Ripple, Herald, Pulse, and Courier.
package: flux
category: reactive
keywords: [streams, observables, reactive, operators, cold, hot, subjects, adapters]
related: [ripple, herald, pulse, courier]
exports:
  [
    flux,
    createSubject,
    createBehaviorSubject,
    of,
    from,
    fromEvent,
    interval,
    timer,
    empty,
    never,
    throwError,
    map,
    filter,
    scan,
    switchMap,
    flatMap,
    concatMap,
    distinctUntilChanged,
    startWith,
    bufferCount,
    pairwise,
    take,
    skip,
    first,
    last,
    takeWhile,
    takeUntil,
    debounce,
    throttle,
    sample,
    merge,
    concat,
    combineLatest,
    withLatestFrom,
    race,
    zip,
    forkJoin,
    share,
    shareReplay,
    tap,
    delay,
    timeout,
    catchError,
    retry,
    finalize,
    toPromise,
    toArray,
    fromSignal,
    toSignal,
    fromBus,
    toBus,
    fromPulse,
    fromPresence,
    fromSse,
    fromReadable,
    fromQuery,
    FluxError,
    FluxDisposedError,
    FluxTimeoutError,
    FluxBufferOverflowError,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="flux" />

## Why Flux?

Callback chains and `Promise`-only pipelines break down when you need multi-value, cancellable, composable data flows. Flux gives you a small, typesafe stream primitive with a complete operator library — no heavyweight runtime, no magic.

```ts
// Before — nested callbacks, no cancellation
function search(query: string, cb: (results: string[]) => void) {
  const id = setTimeout(() => fetchResults(query).then(cb), 300);
  return () => clearTimeout(id); // manual cleanup
}

// After — composable, self-cleaning pipeline
import { flux, fromEvent, debounce, switchMap, from } from '@vielzeug/flux';

const results$ = fromEvent<InputEvent>(input, 'input').pipe(
  debounce(300),
  switchMap((e) => from(fetchResults((e.target as HTMLInputElement).value))),
);
const unsub = results$.subscribe(renderResults);
// unsub() cancels everything, including in-flight fetches
```

| Feature                       | Flux                                                        | RxJS                                                         | Observable (TC39)                                      |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| Bundle size                   | <PackageInfo package="flux" type="size" />                  | ~50 KB                                                       | Native (no bundle)                                     |
| Zero dependencies             | <sg-icon name="check" size="16"></sg-icon>                  | <sg-icon name="check" size="16"></sg-icon>                   | <sg-icon name="check" size="16"></sg-icon>             |
| Cold by default               | <sg-icon name="check" size="16"></sg-icon>                  | <sg-icon name="check" size="16"></sg-icon>                   | <sg-icon name="check" size="16"></sg-icon>             |
| Disposable (not just teardown)| <sg-icon name="check" size="16"></sg-icon>                  | <sg-icon name="triangle-alert" size="16"></sg-icon> Partial  | <sg-icon name="x" size="16"></sg-icon>                 |
| Ripple signal adapters        | <sg-icon name="check" size="16"></sg-icon> Native           | <sg-icon name="x" size="16"></sg-icon>                       | <sg-icon name="x" size="16"></sg-icon>                 |
| Operator library              | <sg-icon name="check" size="16"></sg-icon> 40+ operators    | <sg-icon name="check" size="16"></sg-icon> 100+              | <sg-icon name="triangle-alert" size="16"></sg-icon> WIP|

<div class="decision-callout">

**Use Flux when** you need multi-value composable pipelines with cancellation, especially in a Vielzeug project that already uses Ripple, Herald, or Pulse.

**Consider RxJS when** you need the full RxJS operator catalogue, rely on RxJS-aware third-party libraries, or are migrating an existing codebase.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/flux
```

```sh [npm]
npm install @vielzeug/flux
```

```sh [yarn]
yarn add @vielzeug/flux
```

:::

## Quick Start

```ts
import { flux, map, take, toArray } from '@vielzeug/flux';

// Create a cold stream — producer runs per subscriber
const integers$ = flux<number>((observer) => {
  let i = 0;
  const id = setInterval(() => observer.next(i++), 100);
  return () => clearInterval(id); // cleanup on unsubscribe
});

// Compose operators via .pipe()
const first5$ = integers$.pipe(
  map((n) => n * 2),
  take(5),
);

// Collect to an array (returns a Promise)
const result = await toArray(first5$);
console.log(result); // [0, 2, 4, 6, 8]

// Or subscribe directly
const unsub = integers$.pipe(take(3)).subscribe({
  next(v) { console.log(v); },
  complete() { console.log('done'); },
  error(err) { console.error(err); },
});
// unsub() to cancel early
```

## Features

<div class="features-grid">

- `flux()` — Cold stream factory; producer runs once per subscriber
- `createSubject()` — Hot multicasting subject with `emit()` / `complete()` / `error()`
- `createBehaviorSubject()` — Subject that replays the latest value to new subscribers
- **40+ operators** — Creation, transformation, filtering, combination, utility
- `pipe()` — Chainable, type-safe operator composition
- `dispose()` — First-class lifecycle; shuts down the stream and all subscriptions
- `AbortSignal` support — `takeUntil(signal)` integrates with standard cancellation
- **Ripple adapters** — `fromSignal()` / `toSignal()` bridge signals and streams
- **Herald adapters** — `fromBus()` / `toBus()` bridge typed event buses
- **Pulse adapters** — `fromPulse()` / `fromPresence()` for real-time channels
- **Courier adapters** — `fromSse()` / `fromReadable()` / `fromQuery()` for HTTP sources
- `toPromise()` / `toArray()` — Collect stream output into standard async primitives

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — Reactive signals and effects; `fromSignal()`/`toSignal()` connect Flux streams to Ripple's signal graph
- [Herald](/herald/) — Typed event bus; `fromBus()`/`toBus()` wrap bus events as Flux streams
- [Pulse](/pulse/) — Real-time WebSocket channels; `fromPulse()`/`fromPresence()` expose channel data as streams
- [Courier](/courier/) — HTTP client; `fromSse()`/`fromReadable()`/`fromQuery()` wrap Courier sources as streams

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
