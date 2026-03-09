---
title: Eventit — Typed event bus for TypeScript
description: Tiny, type-safe pub/sub event bus with per-event payload typing, one-time listeners, error handling, and first-class testing utilities.
---

<PackageBadges package="eventit" />

<img src="/logo-eventit.svg" alt="Eventit Logo" width="156" class="logo-highlight"/>

# Eventit

**Eventit** is a tiny, zero-dependency typed event bus. Declare your events once with full payload types, then publish and subscribe with complete type safety — no casting, no guessing.

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

## Features

- **Fully typed** — payload types flow from event map declaration to every listener
- **Void events** — emit signal events with no payload, no workarounds required
- **One-time listeners** — `once()` auto-unsubscribes after the first emit
- **Error isolation** — custom `onError` keeps one failing listener from crashing others
- **Emit hook** — optional `onEmit` intercepts every emission for logging or debugging
- **Dispose** — permanently tear down a bus; `emit` and `on` become no-ops
- **Testing utilities** — `testEventBus` records all payloads for easy assertions
- **Zero dependencies** — no supply chain risk, minimal bundle size

## Quick Start

```ts
import { eventBus } from '@vielzeug/eventit';

// 1. Declare your event map
type AppEvents = {
  userLogin: { id: string; name: string };
  userLogout: void;
  messageReceived: { text: string; from: string };
};

// 2. Create a bus
const bus = eventBus<AppEvents>();

// 3. Subscribe
const unsub = bus.on('userLogin', ({ id, name }) => {
  console.log(`${name} (${id}) logged in`);
});

// 4. Emit
bus.emit('userLogin', { id: '42', name: 'Alice' });
bus.emit('userLogout'); // void event — no payload

// 5. Clean up
unsub();
```

## Documentation

- [Usage Guide](./usage.md) — event maps, subscriptions, error handling, testing
- [API Reference](./api.md) — full type signatures
- [Examples](./examples.md) — real-world patterns

## License

MIT © [Vielzeug](https://github.com/helmuthdu/vielzeug)
