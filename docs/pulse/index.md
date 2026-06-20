---
title: Pulse — Typed WebSocket client with channels, rooms, and presence
description: Full-featured WebSocket client with typed messaging, channel multiplexing, room management, reactive presence, auto-reconnect, and heartbeat — built on ripple signals.
package: pulse
category: websockets
keywords: [websocket, realtime, channels, presence, reconnect, heartbeat, typed-messaging, ripple]
related: [herald, ripple, courier, clockwork]
exports:
  [
    createPulse,
    Pulse,
    PulseChannel,
    PresenceChannel,
    PulseOptions,
    PulseError,
    ConnectionError,
    TimeoutError,
    AbortError,
    DisposedError,
    ProtocolError,
  ]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="pulse" />

## Why Pulse?

Raw WebSocket gives you an untyped message stream — no event routing, no reconnection, no presence, no lifecycle management. Building those primitives for every project is repetitive and error-prone.

```ts
// Before — raw WebSocket
const ws = new WebSocket('wss://api.example.com/ws');
ws.addEventListener('message', (ev) => {
  const { type, payload } = JSON.parse(ev.data); // untyped
  if (type === 'chat:message') renderMessage(payload); // manual routing
});
ws.addEventListener('close', () => setTimeout(reconnect, 3_000)); // manual reconnect
// No channels, no presence, no heartbeat, no disposal

// After — Pulse
const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  reconnect: { maxAttempts: 5 },
  heartbeat: true,
});
pulse.on('chat:message', ({ user, text }) => renderMessage({ user, text })); // fully typed
pulse.send('chat:send', { text: 'Hello!' });
effect(() => console.log('status:', pulse.status.value)); // reactive via ripple
```

| Feature               | Pulse                                                      | Native WebSocket                                | socket.io-client                                           |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Bundle size           | <PackageInfo package="pulse" type="size" />                | 0 B (native)                                    | ~44 kB gzip                                                |
| TypeScript inference  | <sg-icon name="check" size="16"></sg-icon> Full            | <sg-icon name="x" size="16"></sg-icon> None     | <sg-icon name="triangle-alert" size="16"></sg-icon> Basic  |
| Auto-reconnect        | <sg-icon name="check" size="16"></sg-icon>                 | <sg-icon name="x" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>                 |
| Heartbeat (ping/pong) | <sg-icon name="check" size="16"></sg-icon>                 | <sg-icon name="x" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>                 |
| Channel multiplexing  | <sg-icon name="check" size="16"></sg-icon>                 | <sg-icon name="x" size="16"></sg-icon>          | <sg-icon name="check" size="16"></sg-icon>                 |
| Reactive presence     | <sg-icon name="check" size="16"></sg-icon>                 | <sg-icon name="x" size="16"></sg-icon>          | <sg-icon name="triangle-alert" size="16"></sg-icon> Manual |
| Reactive status       | <sg-icon name="check" size="16"></sg-icon>                 | <sg-icon name="x" size="16"></sg-icon>          | <sg-icon name="x" size="16"></sg-icon>                     |
| Server lock-in        | <sg-icon name="check" size="16"></sg-icon> None            | <sg-icon name="check" size="16"></sg-icon> None | <sg-icon name="x" size="16"></sg-icon> Required            |
| Zero dependencies     | <sg-icon name="triangle-alert" size="16"></sg-icon> ripple | <sg-icon name="check" size="16"></sg-icon>      | <sg-icon name="x" size="16"></sg-icon>                     |

<div class="decision-callout">

**Use Pulse when** you need typed, multiplexed real-time messaging with reactive state and a clean disposal lifecycle — without being locked to a specific server stack.

**Consider native WebSocket when** you need the absolute minimum footprint and are building a one-off, untyped connection with no reuse patterns.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/pulse @vielzeug/ripple
```

```sh [npm]
npm install @vielzeug/pulse @vielzeug/ripple
```

```sh [yarn]
yarn add @vielzeug/pulse @vielzeug/ripple
```

:::

## Quick Start

```ts
import { createPulse } from '@vielzeug/pulse';
import { effect } from '@vielzeug/ripple';

type ServerEvents = {
  'chat:message': { user: string; text: string };
  'user:joined': { userId: string };
};

type ClientEvents = {
  'chat:send': { text: string };
};

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  reconnect: { maxAttempts: 5, delay: (n) => Math.min(1000 * 2 ** n, 30_000) },
  heartbeat: true,
});

// Reactive status via ripple signal
effect(() => console.log('connection:', pulse.status.value));

// Typed server events
pulse.on('chat:message', ({ user, text }) => console.log(`${user}: ${text}`));

// Typed client messages
pulse.send('chat:send', { text: 'Hello!' });

// Isolated channel namespace
const notif = pulse.channel<{ alert: { level: string; msg: string } }>('notifications');
notif.on('alert', ({ level, msg }) => showNotification(level, msg));

// Reactive presence tracking
const lobby = pulse.presence<{ name: string; status: string }>('lobby');
effect(() => console.log('online:', [...lobby.state.value.keys()]));
lobby.update({ name: 'Alice', status: 'active' });

// Clean disposal
using _ = pulse;
```

## Features

<div class="features-grid">

- **Typed event maps** — `TServer` and `TClient` generics enforce payload types on both sides of the wire
- **`on()` / `once()` / `wait()`** — persistent, one-shot, and async-await event subscriptions
- **`channel()`** — isolated namespaces multiplexed over the shared connection; auto-resubscribed on reconnect; `dispose()` sends an `unsubscribe` frame
- **`join()` / `leave()`** — room membership with server-confirmation promises
- **`presence()`** — reactive `Signal<Map<memberId, T>>` state, with `onJoin`/`onLeave` callbacks and `update()` for broadcasting state
- **Middleware pipeline** — intercept every outgoing `send()` call; omit `next()` to suppress
- **Auto-reconnect** — exponential backoff (full-jitter by default), configurable `maxAttempts`, custom `delay` function, and `onReconnect` callback
- **Heartbeat** — configurable ping/pong keep-alive with dead-connection detection and automatic reconnect trigger
- **Reactive `status` signal** — `'connecting' | 'open' | 'reconnecting' | 'closed'` exposed as a ripple `Reactive`
- **Reactive `rooms` signal** — current room membership as a `Reactive<ReadonlySet<string>>`
- **`disposalSignal`** — `AbortSignal` that fires on `dispose()`; ties external cleanup to the connection lifetime
- **`dispose()` and `[Symbol.dispose]`** — deterministic teardown; closes the socket, clears all listeners, aborts pending `wait()` calls
- **Protocol-agnostic** — works with any WebSocket server that speaks the Pulse JSON frame format
- **Single dependency** — only requires `@vielzeug/ripple` for reactive state

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — the reactive signal library powering `pulse.status`, `pulse.rooms`, and `presence.state`
- [Herald](/herald/) — typed in-process event bus; complement Pulse by bridging incoming WebSocket events to application-wide bus dispatches
- [Courier](/courier/) — typed HTTP client for the request/response traffic that runs alongside your WebSocket connection
- [Clockwork](/clockwork/) — finite state machine; model complex reconnection or auth-handshake logic as a proper state machine

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
