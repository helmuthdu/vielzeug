---
title: Flux — Explicit push streams for TypeScript
description: Reusable push streams with subscription-owned cancellation, bounded buffering, and optional ecosystem adapters.
package: flux
category: reactive
keywords: [streams, reactive, operators, cancellation, buffering, channels]
related: [ripple, herald, pulse, courier]
exports: [stream, pipe, of, from, fromEvent, interval, timer, map, filter, scan, switchMap, mergeMap, concatMap, take, takeUntil, debounce, timeout, merge, concat, combineLatest, retry, toArray, first, last, toAsyncIterable]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="flux" />

## Why Flux?

Use Flux when an API pushes many values over time and consumers need independent cancellation. Streams describe reusable work; subscriptions own cleanup. Explicit queue capacity keeps async iteration from silently growing memory.

```ts
// Before
const controller = new AbortController();
const render = (value: string) => console.log(value);
const handler = (event: Event) => render((event.target as HTMLInputElement).value);
input.addEventListener('input', handler);
setTimeout(() => controller.abort(), 5_000);

// After
import { fromEvent, map, pipe, takeUntil } from '@vielzeug/flux';

const updates = pipe(
  fromEvent<InputEvent>(input, 'input'),
  map((event) => (event.target as HTMLInputElement).value),
  takeUntil(controller.signal),
);

updates.subscribe({ error: console.error, next: render });
```

| Feature | Flux | RxJS | TC39 Observable |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="flux" type="size" /> | Varies by imported operators | Native proposal / polyfill |
| Runtime dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Subscription-owned cancellation | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Explicit async queue policy | <ore-icon name="check" size="16"></ore-icon> | Operator-dependent | No standard policy |
| Vielzeug adapters | Ripple, Courier, Herald, Pulse | Manual adapters | Manual adapters |

<div class="decision-callout">

**Use Flux when** you need a small TypeScript stream primitive, explicit cancellation, and first-party Vielzeug adapters.

**Consider RxJS when** you need its larger operator catalog or third-party Observable integrations.

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
import { toArray, interval, map, pipe, take } from '@vielzeug/flux';

const firstThree = pipe(
  interval({ every: 100 }),
  map((value) => value * 2),
  take(3),
);

try {
  console.log(await toArray(firstThree, { maxItems: 3 })); // [0, 2, 4]
} catch (reason) {
  console.error('Stream failed', reason);
}
```

## Features

<div class="features-grid">

- `stream()` — define cold reusable work with one teardown function
- `pipe()` — compose any number of typed operators
- `Subscription` — own cancellation through `unsubscribe()` or `AbortSignal`
- `createChannel()` — mutable multicast state with bounded replay
- `toAsyncIterable()` — explicit capacity and overflow policy for pull consumers
- `retry()` — retry failures with optional backoff
- `fromSignal()` / `toSignal()` — bridge Ripple signals
- `fromQuery()` — adapt Courier query state

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — adapt reactive signal state through `@vielzeug/flux/ripple`.
- [Courier](/courier/) — adapt query snapshots and SSE events through `@vielzeug/flux/courier`.
- [Herald](/herald/) — adapt typed bus events through `@vielzeug/flux/herald`.
- [Pulse](/pulse/) — adapt connection and presence events through `@vielzeug/flux/pulse`.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
