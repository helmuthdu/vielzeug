---
title: Usage — Pulse
description: Practical guide for connecting, sending, subscribing, joining rooms, and managing lifecycle with Pulse.
package: pulse
category: websockets
---

<!-- markdownlint-disable MD025 -->

[[toc]]

## Basic Usage

Declare server events, client events, channel schemas, and room schemas once at construction. Named scopes infer their types from this schema.

```ts
import { createPulse } from '@vielzeug/pulse';

type Schema = {
  // Root events the server sends
  server: { 'chat:message': { text: string }; notice: string };
  // Root events the client sends
  client: { 'chat:send': { text: string } };
  // Named channel scopes
  channels: {
    chat: {
      client: { send: { text: string } };
      server: { message: { text: string } };
    };
    alerts: {
      client: { subscribe: { topic: string } };
      server: { alert: { topic: string; severity: 'info' | 'warn' | 'error' } };
    };
  };
  // Named room scopes with optional presence state
  rooms: {
    lobby: { presence: { name: string; color: string } };
    announcements: {};
  };
};
```

## Create and connect

```ts
const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  reconnect: { delay: 1_000, maxAttempts: 5 },
  heartbeat: { interval: 30_000, timeout: 5_000 },
  onError: (error) => console.error(error),
});

try {
  await pulse.connect();
} catch (error) {
  console.error('Connection failed:', error);
}
```

`connect()` opens the WebSocket and resolves after session restoration completes. `send()` throws `PulseConnectionError` while disconnected — Pulse never silently drops or buffers application messages.

## Send and receive root events

```ts
pulse.on('chat:message', (message) => console.log(message.text));
pulse.send('chat:send', { text: 'Hello!' });
```

## Channels

Each `channel()` call returns an independently disposable scope. The server subscription is reference-counted: the first scope sends `subscribe`, the last disposal sends `unsubscribe`.

```ts
const chat = pulse.channel('chat');

chat.on('message', (message) => console.log(message.text));
chat.send('send', { text: 'Hello!' });

// Later
chat.dispose();
```

Use `using` for automatic cleanup:

```ts
{
  using chat = pulse.channel('chat');
  chat.on('message', (message) => console.log(message.text));
} // chat.dispose() called automatically
```

## Rooms and presence

Each `room()` call returns a ref-counted room scope. The first scope sends `join`; the last disposal sends `leave`. When the room definition includes `presence`, the scope exposes reactive presence state.

```ts
const lobby = pulse.room('lobby');

// joined resolves when the server confirms membership
await lobby.joined;

// Reactive presence map: memberId → state
lobby.onJoin((memberId, state) => console.log(`${memberId} joined: ${state.name}`));
lobby.onLeave((memberId) => console.log(`${memberId} left`));

// Broadcast your presence
lobby.updatePresence({ name: 'Ada', color: 'blue' });

// Read current presence
for (const [memberId, state] of lobby.presence.value) {
  console.log(`${memberId}: ${state.name}`);
}

// Leave
lobby.dispose();
```

Plain rooms (without presence) work the same way but don't expose presence members:

```ts
const announcements = pulse.room('announcements');
await announcements.joined;
announcements.dispose();
```

### Room scope options

```ts
// Timeout if the server doesn't confirm in time
const lobby = pulse.room('lobby', { timeout: 5_000 });
try {
  await lobby.joined;
} catch (error) {
  console.error('Join failed:', error);
}

// Abort via AbortSignal
const ctrl = new AbortController();
const lobby = pulse.room('lobby', { signal: ctrl.signal });
ctrl.abort(); // joined rejects with PulseAbortError, scope auto-disposes
```

### Reactive rooms set

`pulse.rooms` is a ripple readable that tracks confirmed room memberships:

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  console.log('Joined rooms:', [...pulse.rooms.value]);
});
```

## Reconnect

When the connection drops unexpectedly, Pulse reconnects using the configured strategy. On reconnect, it restores:

1. Channel subscriptions (sends `subscribe` for each active channel).
2. Room memberships (sends `join` for each active room scope).
3. Local presence state (sends `presence` with the last successfully published state).

```ts
const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  reconnect: {
    delay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000),
    maxAttempts: 5,
  },
});
```

`joined` rejects on transport close. For post-reconnect membership, read `pulse.rooms` instead.

## Heartbeat

```ts
const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  heartbeat: { interval: 30_000, timeout: 5_000 },
});
```

Pulse sends periodic pings. If a pong doesn't arrive before the timeout, it forces a reconnect using the same reconnect controller.

## Transform outgoing messages

```ts
const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  transform: (message) => {
    // Add a timestamp to all messages
    return { ...message, payload: { ...message.payload, ts: Date.now() } };
  },
});
```

Return `null` to drop a message:

```ts
const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  transform: (message) => (message.event === 'debug' ? null : message),
});
```

## Wait for a specific event

```ts
const notice = await pulse.wait('notice', { timeout: 10_000 });
console.log(notice);
```

## Dispose

```ts
pulse.dispose();
```

Disposal is idempotent. It closes the connection, rejects pending room joins, clears all listeners, and aborts all scope disposal signals.

## Error handling

```ts
const pulse = createPulse<Schema>('wss://api.example.com/ws', {
  onError: (error) => {
    if (error instanceof PulseConnectionError) {
      console.error('Connection error:', error);
    } else if (error instanceof PulseProtocolError) {
      console.error('Protocol error:', error);
    }
  },
});
```

| Error | When |
| --- | --- |
| `PulseConnectionError` | Transport failure, send while disconnected, room join rejected on close. |
| `PulseProtocolError` | Malformed frame or server error frame. |
| `PulseTimeoutError` | `wait()` times out. |
| `PulseRoomTimeoutError` | Room scope `joined` times out. |
| `PulseAbortError` | `wait()` or room `joined` aborted via AbortSignal. |
| `PulseDisposedError` | Operation attempted after disposal. |

## Best Practices

- Await `connect()` before sending; never assume construction opens the transport.
- Define the full schema at `createPulse()` so named scopes are type-safe without per-call generics.
- Use `using` declarations for channel and room scopes so disposal is automatic at block exit.
- Always call `dispose()` when done — it closes the connection, rejects pending joins, and clears listeners.
- Provide an `onError` handler; Pulse reports transport and protocol errors there rather than throwing asynchronously.
- Read `pulse.rooms` for post-reconnect membership; `joined` rejects on transport close.
- Set a `timeout` on room scopes when the server may never confirm membership.
- Keep `transform` synchronous; resolve async policy decisions before calling `send()`.
