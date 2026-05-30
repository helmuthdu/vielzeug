---
title: Herald — Typed event bus for TypeScript
description: Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, bus piping, and test helpers.
package: herald
category: events
keywords: [event-bus, typed-events, pub-sub, reactive, decoupled, async-streams]
related: [ripple, wayfinder, familiar]
exports: [createBus, pipeEvents, createTestBus]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="herald" />

<img src="/logo-herald.svg" alt="Herald logo" width="156" class="logo-highlight"/>

# Herald

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/herald` &nbsp;·&nbsp; **Category:** Events

**Key exports:** `createBus`, `pipeEvents`, `createTestBus`

**When to use:** Decoupled inter-module communication via a typed event bus. Supports subscribe/emit, one-time await, async iteration, event piping, and AbortSignal lifecycle management.

**Related:** [Ripple](/ripple/) · [Wayfinder](/wayfinder/) · [Familiar](/familiar/)

</details>

`@vielzeug/herald` is a zero-dependency typed event bus. Define your event map once and get type-safe `emit`, `on`, `once`, `wait`, `waitAny`, and `events` APIs with payload inference.


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
import { BusDisposedError, createBus, pipeEvents } from '@vielzeug/herald';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>();

bus.on('user:login', ({ userId }) => {
  console.log('Logged in:', userId);
});

bus.emit('user:login', { email: 'alice@example.com', userId: '42' });
bus.emit('user:logout');

const nextLogin = await bus.wait('user:login');
const nextSessionChange = await bus.waitAny(['user:login', 'user:logout']);

if (nextSessionChange.event === 'user:login') {
  console.log(nextSessionChange.payload.userId);
}

for await (const payload of bus.events('user:login', { signal: AbortSignal.timeout(5_000) })) {
  console.log(payload.email);
}

// Forward selected events to another bus
const auditBus = createBus<AppEvents>();
const unpipe = pipeEvents(bus, auditBus, ['user:login', 'user:logout']);

// Disposal signal — use as an AbortSignal for external cleanup
otherBus.on('count', handler, bus.disposalSignal);

try {
  await bus.wait('user:login', AbortSignal.timeout(500));
} catch (err) {
  if (err instanceof BusDisposedError) {
    console.log('Bus was disposed');
  }
}
```

## Why Herald?

Manual event emitters lack TypeScript inference across event names and payloads, and offer no async patterns — `await`ing an event or streaming all future emits requires bespoke wiring.

```ts
// Before — manual typed event bus
type Handlers = { 'user:login': (p: { userId: string }) => void };
const listeners = new Map<keyof Handlers, Set<Function>>();
function on<K extends keyof Handlers>(event: K, fn: Handlers[K]) {
  /* ... */
}
function emit<K extends keyof Handlers>(event: K, payload: Parameters<Handlers[K]>[0]) {
  /* ... */
}
// No await, no stream, no AbortSignal, no error isolation

// After — Herald
import { createBus } from '@vielzeug/herald';
const bus = createBus<AppEvents>();
bus.on('user:login', ({ userId }) => loadProfile(userId));
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
const session = await bus.wait('user:login'); // async one-shot
for await (const event of bus.events('cart:updated')) {
} // async stream
```

| Feature              | Herald                                      | mitt     | EventEmitter3 |
| -------------------- | --------------------------------------------- | -------- | ------------- |
| Bundle size          | <PackageInfo package="herald" type="size" /> | ~200 B   | ~1.5 kB       |
| TypeScript inference | ✅ Full                                       | ⚠️ Basic | ⚠️ Basic      |
| Async/await (`wait`) | ✅                                            | ❌       | ❌            |
| Async streaming      | ✅                                            | ❌       | ❌            |
| AbortSignal          | ✅                                            | ❌       | ❌            |
| Event piping         | ✅                                            | ❌       | ❌            |
| Wildcard (`onAny`)   | ✅                                            | ✅       | ❌            |
| Disposal signal      | ✅                                            | ❌       | ❌            |
| Error isolation      | ✅                                            | ❌       | ❌            |
| Zero dependencies    | ✅                                            | ✅       | ✅            |

**Use Herald when** you need a fully-typed event bus with async patterns (`wait`, `events` generator) and AbortSignal-based lifecycle management.

**Consider mitt when** you only need a bare-minimum synchronous pub/sub with the smallest possible footprint.

## Features

- **Typed event maps** for strict event/payload correctness
- **Persistent + one-shot listeners** with `on` and `once` — each registration is independent, including duplicate handlers
- **Wildcard listeners** with `onAny` — subscribe to all events for cross-cutting concerns like logging and analytics
- **Listener management APIs** with unsubscribe handles, `removeAllListeners`, and `eventNames`
- **Async event coordination** with `wait`
- **First-event racing** with `waitAny`
- **Async streaming** with `events` — eager subscription buffers events from the moment `events()` is called
- **Event piping** with `pipeEvents` — forward events across buses with optional renaming and automatic teardown
- **Disposal signal** via `bus.disposalSignal` — use as an `AbortSignal` to tie external lifecycles to the bus
- **Leak detection** via `maxListeners` — warn when a single event accumulates too many listeners
- **Debug mode** via `createBus({ debug: true })` — logs subscribe/emit/dispose activity to `console.debug`
- **Abort-aware APIs** for lifecycle-safe teardown
- **`onDispatch` and `onError` hooks** for logging and resilience
- **`dispose` and `[Symbol.dispose]`** for deterministic cleanup
- **Testing helper** via `@vielzeug/herald/test`
- **Zero dependencies** — <PackageInfo package="herald" type="size" /> gzipped, <PackageInfo package="herald" type="dependencies" /> dependencies

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/) — reactive signals and computed state that pair naturally with event-driven update patterns
- [Wayfinder](/wayfinder/) — client-side router whose navigation lifecycle hooks integrate with bus-dispatched events
- [Familiar](/familiar/) — Web Worker pool that can use a bus to stream task progress and completion events

<!-- markdownlint-enable MD025 MD033 MD060 -->
