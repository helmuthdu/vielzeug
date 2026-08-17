---
title: Pulse — Typed WebSocket sessions
description: Explicitly connected, typed WebSocket sessions with scoped channels, ref-counted rooms with reactive presence, reconnect restoration, and heartbeat.
package: pulse
category: websockets
keywords: [websocket, realtime, channels, presence, rooms, reconnect, heartbeat, typed-messaging, ripple]
related: [herald, ripple, courier, clockwork]
exports:
  [
    createPulse,
    Pulse,
    PulseChannel,
    RoomScope,
    RoomScopeBase,
    PresenceRoomScope,
    PulseOptions,
    PulseSchema,
    ChannelDefinition,
    ChannelDefinitions,
    RoomDefinition,
    RoomDefinitions,
    RoomOptions,
    OutgoingMessage,
    OutgoingTransform,
    PulseError,
    PulseConnectionError,
    PulseTimeoutError,
    PulseRoomTimeoutError,
    PulseAbortError,
    PulseDisposedError,
    PulseProtocolError,
  ]
environments: [browser, node]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="pulse" />

## Why Pulse?

Native WebSocket leaves connection ownership, event routing, reconnect restoration, and cleanup to each application. Pulse provides those boundaries while making readiness explicit: applications connect before sending, and disconnected messages never disappear silently.

```ts
// Before
const socket = new WebSocket('wss://api.example.com/ws');
socket.addEventListener('message', (event) => route(JSON.parse(event.data)));
socket.addEventListener('close', () => setTimeout(() => reconnect(), 1_000));

// After
const pulse = createPulse<{ server: { 'chat:message': { text: string } }; client: { 'chat:send': { text: string } } }>(
  'wss://api.example.com/ws',
  { reconnect: true },
);
try {
  await pulse.connect();
  pulse.on('chat:message', (message) => console.log(message.text));
  pulse.send('chat:send', { text: 'Hello!' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}
```

| Feature | Pulse | Native WebSocket | socket.io-client |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="pulse" type="size" /> | 0 B | ~44 kB gzip |
| Explicit readiness | <ore-icon name="check" size="16"></ore-icon> | Manual | <ore-icon name="check" size="16"></ore-icon> |
| Session restoration | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | Protocol-specific |
| Typed scoped channels | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | Basic |
| Typed rooms with presence | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| Zero runtime dependencies | <ore-icon name="triangle-alert" size="16"></ore-icon> ripple | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Pulse when** you need a typed WebSocket session whose reconnect and cleanup behavior must be deterministic.

**Consider native WebSocket when** a single untyped connection does not need retry, routing, or session restoration.

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

Define the protocol schema at construction time, create scopes, then connect before sending.

```ts
import { createPulse } from '@vielzeug/pulse';

type Schema = {
  server: { 'chat:message': { text: string } };
  client: { 'chat:send': { text: string } };
  channels: {
    chat: {
      client: { send: { text: string } };
      server: { message: { text: string } };
    };
  };
  rooms: {
    lobby: { presence: { name: string } };
  };
};

const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  reconnect: true,
  onError: (error) => console.error(error),
});
const chat = pulse.channel('chat');
const lobby = pulse.room('lobby');

try {
  await pulse.connect();
  chat.send('send', { text: 'Hello!' });
  await lobby.joined;
  lobby.updatePresence({ name: 'Ada' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}

pulse.dispose();
```

## Features

<div class="features-grid">

- **`connect()`** — explicit readiness; application messages throw while disconnected.
- **`channel()`** — named, schema-bound scopes with independent disposal and reference-counted server subscriptions.
- **`room()`** — named, schema-bound ref-counted room scopes with optional reactive presence. The first scope sends `join`; the last disposal sends `leave`.
- **`reconnect`** — ordered restoration of channel subscriptions, room memberships, and local presence state.
- **`transform`** — one synchronous transform or filter for application messages.
- **`onError`** — typed connection and protocol errors.
- **`heartbeat`** — ping/pong liveness detection that uses the same reconnect controller.
- **`status` and `rooms`** — ripple readables for transport and confirmed membership state.

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

- [Ripple](/ripple/) — provides the reactive values exposed by Pulse.
- [Herald](/herald/) — receives routed Pulse events in an in-process application bus.
- [Courier](/courier/) — handles request/response traffic alongside a Pulse session.
- [Clockwork](/clockwork/) — models application-level authentication or session workflows.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
