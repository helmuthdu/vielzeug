---
title: Pulse — Usage Guide
description: Explicit connection, schema-bound scopes, rooms, presence, transforms, reconnect, and heartbeat for @vielzeug/pulse.
---

[[toc]]

## Basic Usage

Define every event map at creation time. This lets named channels and presence rooms infer their types without per-call generic arguments.

```ts
import { createPulse } from '@vielzeug/pulse';

type ServerEvents = { 'chat:message': { text: string } };
type ClientEvents = { 'chat:send': { text: string } };
type Channels = {
  chat: {
    client: { send: { text: string } };
    server: { message: { text: string } };
  };
};
type Presence = { lobby: { name: string; status: 'online' | 'away' } };

const pulse = createPulse<ServerEvents, ClientEvents, Channels, Presence>('wss://api.example.com/ws', {
  reconnect: true,
  onError: (error) => console.error(error),
});

pulse.on('chat:message', ({ text }) => console.log(text));
const chat = pulse.channel('chat');
const lobby = pulse.presence('lobby');

try {
  await pulse.connect();
  chat.send('send', { text: 'Hello!' });
  lobby.update({ name: 'Ada', status: 'online' });
} catch (error) {
  console.error('Pulse connection failed:', error);
}
```

## Connection Management

`createPulse()` does not create a socket. `connect()` resolves only after the socket has opened and existing session state has been restored. Application sends and room operations throw `PulseConnectionError` until then.

```ts
await pulse.connect();
console.log(pulse.status.value); // 'open'

pulse.disconnect(1000, 'signed out');
console.log(pulse.status.value); // 'closed'
```

Observe `status` with Ripple when UI needs to reflect reconnecting state.

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  statusBadge.textContent = pulse.status.value;
});
```

## Scoped Channels

Each `channel(name)` call creates an independently disposable listener scope. Pulse sends one server `subscribe` frame for the name and unsubscribes only after the final scope is disposed.

```ts
const composer = pulse.channel('chat');
const transcript = pulse.channel('chat');

composer.send('send', { text: 'Hello!' });
transcript.on('message', ({ text }) => console.log(text));

composer.dispose(); // transcript remains subscribed
transcript.dispose(); // now Pulse sends unsubscribe
```

## Rooms and Presence

`join()` and `leave()` require an open connection and resolve after server confirmation. `presence(room)` acquires a reference-counted room scope; create it before or after `connect()`.

```ts
const lobby = pulse.presence('lobby');

await pulse.connect();
await pulse.join('announcements');
lobby.update({ name: 'Ada', status: 'online' });

lobby.onJoin((memberId, member) => console.log('joined', memberId, member.name));
lobby.onLeave((memberId) => console.log('left', memberId));

await pulse.leave('announcements');
lobby.dispose();
```

`rooms` contains only server-confirmed membership. It clears immediately on transport loss and repopulates as the restored session receives `joined` frames.

## Outgoing Transforms

Use one `transform` to enrich or filter application messages. Internal `subscribe`, `join`, presence, and heartbeat frames bypass it.

```ts
const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  transform: (message) => {
    if (message.event.startsWith('debug:')) return null;

    return { ...message, payload: { sentAt: Date.now(), value: message.payload } };
  },
});
```

## Reconnect and Heartbeat

Reconnect uses full-jitter exponential backoff by default. On a replacement socket, Pulse sends channel subscriptions, desired rooms, and local presence state in that order. Use `status` to render transport state; do not treat it as server confirmation of restored rooms.

```ts
const pulse = createPulse('wss://api.example.com/ws', {
  heartbeat: { interval: 30_000, timeout: 5_000 },
  reconnect: { delay: (attempt) => Math.min(1_000 * 2 ** attempt, 30_000), maxAttempts: 5 },
  onError: console.error,
});
```

When the reconnect budget is exhausted, `status` becomes `'closed'` and `onError` receives `PulseConnectionError`.

## Framework Integration

::: code-group

```ts [React]
useEffect(() => {
  const pulse = createPulse(url, { reconnect: true });
  void pulse.connect().catch(console.error);
  return () => pulse.dispose();
}, [url]);
```

```ts [Vue 3]
const pulse = createPulse(url, { reconnect: true });
void pulse.connect().catch(console.error);
onUnmounted(() => pulse.dispose());
```

```ts [Svelte]
const pulse = createPulse(url, { reconnect: true });
void pulse.connect().catch(console.error);
onDestroy(() => pulse.dispose());
```

:::

## Working with Other Vielzeug Libraries

Bridge typed server events into Herald when the rest of the application should not depend on transport details.

```ts
import { createBus } from '@vielzeug/herald';

const bus = createBus<ServerEvents>();
const stop = pulse.on('chat:message', (message) => bus.emit('chat:message', message));

pulse.disposalSignal.addEventListener('abort', stop, { once: true });
```

## Best Practices

- Define named channel and presence schemas when creating Pulse.
- Call and await `connect()` before every application send path becomes available.
- Treat `PulseConnectionError` as a user-visible retry or offline state.
- Create channel and presence scopes near their consumer, then dispose those scopes independently.
- Subscribe to `status` and `rooms` instead of inferring transport state.
- Use `transform` only for synchronous application-message policies.
- Handle `onError` in production.
- Dispose Pulse when its owning application session ends.
