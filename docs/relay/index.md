---
title: Relay — Typed event bus for TypeScript
description: Zero-dependency typed event bus with subscribe/emit, wait(), async streams, AbortSignal support, and test helpers.
package: relay
category: events
keywords: [event-bus, typed-events, pub-sub, reactive, decoupled, async-streams]
related: [ripple, route, worker]
exports: [createBus, createTestBus]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="relay" />

<img src="/logo-relay.svg" alt="Relay logo" width="156" class="logo-highlight"/>

# Relay

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/relay` &nbsp;·&nbsp; **Category:** Events

**Key exports:** `createBus`, `createTestBus`

**When to use:** Decoupled inter-module communication via a typed event bus. Supports subscribe/emit, one-time await, async iteration, and AbortSignal.

**Related:** [Ripple](/ripple/) · [Route](/route/) · [Worker](/worker/)

</details>

`@vielzeug/relay` is a zero-dependency typed event bus. Define your event map once and get type-safe `emit`, `on`, `once`, `wait`, `waitAny`, and `events` APIs with payload inference.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/relay
```

```sh [npm]
npm install @vielzeug/relay
```

```sh [yarn]
yarn add @vielzeug/relay
```

:::

## Quick Start

```ts
import { BusDisposedError, createBus } from '@vielzeug/relay';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
};

const bus = createBus<AppEvents>();

bus.on('user:login', ({ userId }) => {
  console.log('Logged in:', userId);
});

bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout');

const nextLogin = await bus.wait('user:login');
const nextSessionChange = await bus.waitAny(['user:login', 'user:logout'] as const);

if (nextSessionChange.event === 'user:login') {
  console.log(nextSessionChange.payload.userId);
}

for await (const payload of bus.events('user:login', { signal: AbortSignal.timeout(5_000) })) {
  console.log(payload.email);
}

try {
  await bus.wait('user:login', AbortSignal.timeout(500));
} catch (err) {
  if (err instanceof BusDisposedError) {
    console.log('Bus was disposed');
  }
}
```

## Why Relay?

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

// After — Relay
import { createBus } from '@vielzeug/relay';
const bus = createBus<AppEvents>();
bus.on('user:login', ({ userId }) => loadProfile(userId));
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
const session = await bus.wait('user:login'); // async one-shot
for await (const event of bus.events('cart:updated')) {
} // async stream
```

| Feature              | Relay                                       | mitt     | EventEmitter3 |
| -------------------- | --------------------------------------------- | -------- | ------------- |
| Bundle size          | <PackageInfo package="relay" type="size" /> | ~200 B   | ~1.5 kB       |
| TypeScript inference | ✅ Full                                       | ⚠️ Basic | ⚠️ Basic      |
| Async/await (`wait`) | ✅                                            | ❌       | ❌            |
| Async streaming      | ✅                                            | ❌       | ❌            |
| AbortSignal          | ✅                                            | ❌       | ❌            |
| Error isolation      | ✅                                            | ❌       | ❌            |
| Zero dependencies    | ✅                                            | ✅       | ✅            |

**Use Relay when** you need a fully-typed event bus with async patterns (`wait`, `events` generator) and AbortSignal-based lifecycle management.

**Consider mitt** if you only need a bare-minimum synchronous pub/sub with the smallest possible footprint.

## Features

- **Typed event maps** for strict event/payload correctness
- **Persistent + one-shot listeners** with `on` and `once`
- **Listener management APIs** with unsubscribe handles, `removeAllListeners`, and `eventNames`
- **Async event coordination** with `wait`
- **First-event racing** with `waitAny`
- **Async streaming** with `events`
- **Abort-aware APIs** for lifecycle-safe teardown
- **`onDispatch` and `onError` hooks** for logging and resilience
- **`dispose` and `[Symbol.dispose]`** for deterministic cleanup
- **Testing helper** via `@vielzeug/relay/test`
- **Zero dependencies** — <PackageInfo package="relay" type="size" /> gzipped, <PackageInfo package="relay" type="dependencies" /> dependencies

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

- [Ripple](/ripple/)
- [Route](/route/)
- [Worker](/worker/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
