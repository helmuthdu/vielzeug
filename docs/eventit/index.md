---
title: Eventit — Typed event bus for TypeScript
description: Zero-dependency typed event bus with async/await, streaming, AbortSignal, and test utilities. Works anywhere TypeScript runs.
---

<PackageBadges package="eventit" />

<img src="/logo-eventit.svg" alt="Eventit Logo" width="156" class="logo-highlight"/>

# Eventit

**Eventit** is a zero-dependency typed event bus: define your event map once, then emit, subscribe, await, and stream events with full TypeScript inference — no magic strings, no runtime surprises.

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/eventit
```

```sh [npm]
npm install @vielzeug/eventit
```

```sh [yarn]
yarn add @vielzeug/eventit
```

:::

## Quick Start

```ts
import { createBus, BusDisposedError } from '@vielzeug/eventit';
import type { Bus, BusOptions, EventMap, EventKey, Listener, Unsubscribe } from '@vielzeug/eventit';

type AppEvents = {
  'user:login': { userId: string; email: string };
  'user:logout': void;
  'cart:updated': { items: CartItem[]; total: number };
};

const bus = createBus<AppEvents>();

// Subscribe
const unsub = bus.on('user:login', ({ userId }) => {
  loadUserProfile(userId);
});

// Emit
bus.emit('user:login', { userId: '42', email: 'alice@example.com' });
bus.emit('user:logout'); // void event — no payload

// Await the next emit
const { userId } = await bus.wait('user:login');

// Stream all future emits
for await (const { items } of bus.events('cart:updated')) {
  renderCart(items);
}

// Auto-cleanup with `using`
{
  using bus = createBus<AppEvents>();
  bus.on('user:login', handler);
} // bus.dispose() called automatically at block exit
```

## Features

- **Typed event maps** — define all events and payloads once; TypeScript enforces them everywhere
- **Void events** — emit signal events cleanly: `bus.emit('refresh')`
- **`once`** — auto-unsubscribing one-shot listeners
- **`wait`** — `await bus.wait('event')` resolves on the next emit
- **`events`** — async generator for pull-based streaming; terminates cleanly on dispose or abort
- **AbortSignal** — pass any `AbortSignal` to `on`, `once`, `wait`, or `events` for lifecycle-driven cleanup
- **`[Symbol.dispose]`** — supports the `using` keyword for automatic teardown
- **Error isolation** — optional `onError` keeps a failing listener from crashing others; `event` and `payload` are fully typed
- **`listenerCount`** — query active listener counts per-event or globally
- **`BusDisposedError`** — typed error class for `instanceof`-safe rejection handling
- **Zero dependencies** — <PackageInfo package="eventit" type="size" /> gzipped, <PackageInfo package="eventit" type="dependencies" /> dependencies

## Next Steps

|                           |                                                   |
| ------------------------- | ------------------------------------------------- |
| [Usage Guide](./usage.md) | Subscribing, async patterns, AbortSignal, testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world event bus patterns and recipes         |
