---
title: Pulse Migration
description: Migrate to explicit Pulse connections, schema-bound scopes, and transforms.
---

# Pulse 2.0 Migration

Pulse 2.0 makes connection readiness and scope ownership explicit. It removes automatic connection, message buffering, memoized channel/presence objects, continuation middleware, and lifecycle callback clusters.

## Connect before sending

Pulse no longer opens a socket during `createPulse()`. `send()`, channel sends, room operations, and presence updates throw `PulseConnectionError` until `connect()` resolves.

```ts
// Before
const pulse = createPulse<ServerEvents, ClientEvents>(url);
pulse.send('chat:send', { text: 'Hello!' });

// After
const pulse = createPulse<ServerEvents, ClientEvents>(url);
await pulse.connect();
pulse.send('chat:send', { text: 'Hello!' });
```

Remove `lazy`; construction is always lazy. Remove `buffer`; Pulse never queues application messages implicitly.

## Define named scope schemas at construction

Channel and presence generics now belong to the session schema, not each `channel()` or `presence()` call.

```ts
// Before
const chat = pulse.channel<ChatServer, ChatClient>('chat');
const lobby = pulse.presence<MemberState>('lobby');

// After
type Channels = {
  chat: { client: ChatClient; server: ChatServer };
};
type Presence = { lobby: MemberState };

const pulse = createPulse<ServerEvents, ClientEvents, Channels, Presence>(url);
const chat = pulse.channel('chat');
const lobby = pulse.presence('lobby');
```

Each call now returns an independent disposable scope. The server subscription or room remains active until every scope for that name is disposed.

## Replace middleware and lifecycle callbacks

Replace `middleware` with one `transform` function. Return `null` to filter an application message.

```ts
// Before
createPulse(url, { middleware: [(_event, _payload, next) => next()] });

// After
createPulse(url, {
  transform: (message) => (message.event.startsWith('debug:') ? null : message),
});
```

Replace `onOpen`, `onClose`, `onMessage`, and `onReconnect` with the `status` readable and typed `onError`.

```ts
const pulse = createPulse(url, {
  onError: console.error,
  reconnect: true,
});
```

## Recheck reconnect semantics

Reconnect restores active channel subscriptions, desired rooms, and the latest local presence state in that order. `rooms` is cleared when transport closes and repopulates only after the replacement server session confirms membership.
