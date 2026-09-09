---
title: Herald — Typed event bus for TypeScript
description: Typed synchronous event delivery with wildcard subscriptions, one-shot waits, tracing, and AbortSignal lifecycle.
package: herald
category: events
keywords: [event-bus, typed-events, pub-sub, async-wait, abort-signal]
related: [ripple, wayfinder, familiar]
exports: [createBus, HeraldError, BusDisposedError, HeraldConfigError]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="herald" />

## Why Herald?

Raw event emitters lose payload inference and leave one-shot waiting, cancellation, diagnostics, and teardown to every caller. Herald keeps events temporal: use [Ripple](/ripple/) when you need retained state.

```ts
// Before
const listeners = new Set<(payload: unknown) => void>();
listeners.add((payload) => loadProfile((payload as { id: string }).id));

// After
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'user:login': { id: string };
}

function loadProfile(id: string): void {
  console.log(id);
}

const bus = createBus<AppEvents>();
bus.on('user:login', ({ id }) => loadProfile(id));
```

Delivery is synchronous and temporal: events are not retained or replayed. Listener failures do not stop later listeners; `emit()` rethrows the first failure after dispatch, while `tap()` exposes every failure for diagnostics.

| Feature | Herald | mitt | EventEmitter3 |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="herald" type="size" /> | ~200 B | ~1.5 kB |
| Typed payloads | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| One-shot async wait | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| AbortSignal lifecycle | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Runtime activity tracing | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |

<div class="decision-callout">

**Use Herald when** modules need typed temporal event delivery with owned lifecycle.

**Consider Ripple when** consumers need current state and replayed values.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/herald
```

```sh [npm]
npm install @vielzeug/herald
```

```sh [yarn]
yarn add @vielzeug/herald
```

:::

## Quick Start

```ts
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'user:login': { id: string };
  'user:logout': void;
}

const bus = createBus<AppEvents>();
const stop = bus.on('user:login', ({ id }) => console.log(id));

bus.emit('user:login', { id: '42' });
stop();
bus.dispose();
```

## Features

<div class="features-grid">

- `on()` / `once()` — typed subscriptions with explicit teardown
- `onAny()` — cross-cutting event observation
- `tap()` — observe bus activity for logging and diagnostics
- `wait()` / `waitAny()` — one-shot async coordination
- `listenerCount()` / `wildcardCount()` / `eventNames()` — listener inspection
- `error` tap events — isolate listener failures without interrupting delivery
- `AbortSignal` — subscription, wait, tap, and disposal ownership
- `createTestBus()` — emitted-payload recording for tests

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

- [Ripple](/ripple/) — retained reactive state.
- [Wayfinder](/wayfinder/) — route lifecycle events.
- [Familiar](/familiar/) — worker completion events.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
