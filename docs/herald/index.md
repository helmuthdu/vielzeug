---
title: Herald — Typed event bus for TypeScript
description: Typed temporal event delivery with sync subscriptions, async waiting, streams, pipes, and AbortSignal lifecycle.
package: herald
category: events
keywords: [event-bus, typed-events, pub-sub, async-streams, abort-signal]
related: [ripple, wayfinder, familiar]
exports: [createBus, pipeEvents, combineSignals, BusDisposedError, HeraldConfigError]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="herald" />

## Why Herald?

Raw event emitters lose payload inference and leave waiting, streaming, cancellation, and teardown to every caller. Herald keeps events temporal: use [Ripple](/ripple/) when you need retained state.

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

| Feature | Herald | mitt | EventEmitter3 |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="herald" type="size" /> | ~200 B | ~1.5 kB |
| Typed payloads | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> |
| Async wait and streams | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| AbortSignal lifecycle | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Typed event pipes | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
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
- `wait()` / `waitAny()` — one-shot async coordination
- `events()` — bounded async event streams
- `pipeEvents()` — compatible cross-bus forwarding
- `AbortSignal` — cancellation and disposal ownership
- `createTestBus()` — emitted-payload recording for tests
- `debugBus()` — development logging from `/devtools`

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
