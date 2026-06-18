---
title: Pulse — Usage Guide
description: Connection management, typed messaging, channels, rooms, presence, middleware, reconnect, and heartbeat for @vielzeug/pulse.
---

[[toc]]

::: tip New to Pulse?
Start with the [Overview](./index.md) for installation and a quick start, then return here for in-depth usage patterns.
:::

## Basic Usage

A message map is a plain TypeScript type where each key is an event name and each value is the payload type. Define separate maps for server-to-client and client-to-server traffic.

```ts
import { createPulse } from '@vielzeug/pulse';

type ServerEvents = {
  'chat:message': { user: string; text: string };
  'user:joined': { userId: string };
};

type ClientEvents = {
  'chat:send': { text: string };
};

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws');

pulse.on('chat:message', ({ user, text }) => {
  console.log(`${user}: ${text}`); // payload is fully typed
});

pulse.send('chat:send', { text: 'Hello!' });
```

## Connection Management

### Reactive status

`pulse.status` is a ripple `ReadonlySignal<PulseStatus>`. Use `effect()` to react to connection state changes.

```ts
import { effect } from '@vielzeug/ripple';

// 'connecting' | 'open' | 'reconnecting' | 'closed'
effect(() => {
  document.title = pulse.status.value === 'open' ? 'Live' : 'Reconnecting…';
});
```

### Explicit connect and disconnect

The connection opens automatically when `createPulse` is called. To open it explicitly — for example, after a user action — call `connect()`.

```ts
const pulse = createPulse('wss://api.example.com/ws');

await pulse.connect(); // resolves when the socket is open

pulse.disconnect(1000, 'user logged out'); // clean close, no reconnect
```

`disconnect()` closes the socket and sets status to `'closed'` without triggering auto-reconnect.

## Subscribing to Server Events

### `on()` — Persistent listener

`on()` subscribes to every future emission of an event. It returns an `Unsubscribe` function.

```ts
const unsub = pulse.on('chat:message', ({ user, text }) => {
  appendToChat(user, text);
});

// Remove the listener when no longer needed
unsub();
```

### `once()` — One-shot listener

`once()` fires exactly once, then removes itself.

```ts
pulse.once('user:joined', ({ userId }) => {
  showWelcomeBanner(userId);
});
```

### `wait()` — Async one-shot

`wait()` returns a promise that resolves with the next emitted payload. Pass `signal` or `timeout` to add a deadline.

```ts
// Wait for the next server-push notification
const msg = await pulse.wait('chat:message');

// With a timeout (ms)
const msg = await pulse.wait('chat:message', { timeout: 5_000 });

// With an AbortSignal
const msg = await pulse.wait('chat:message', { signal: AbortSignal.timeout(5_000) });
```

`wait()` rejects with `TimeoutError` when `timeout` elapses, with `AbortError` when the signal fires, and with `AbortError` when the pulse is disposed before the event arrives.

## Channels

A channel is an isolated message namespace multiplexed over the same WebSocket connection. Use separate channels to scope events to logical subsystems.

```ts
// Separate type maps per channel
type NotifServer = { alert: { level: 'info' | 'warn' | 'error'; msg: string } };
type ChatServer = { message: { user: string; text: string } };
type ChatClient = { send: { text: string } };

const notif = pulse.channel<NotifServer>('notifications');
const chat = pulse.channel<ChatServer, ChatClient>('chat');

notif.on('alert', ({ level, msg }) => showToast(level, msg));

chat.on('message', ({ user, text }) => appendToLog(user, text));
chat.send('send', { text: 'hi' });
```

Each call to `pulse.channel()` returns a new, independent object with its own listener set and lifecycle.

### Channel disposal

Disposing a channel removes all its listeners and prevents future sends. The underlying connection is unaffected.

```ts
using chat = pulse.channel<ChatServer, ChatClient>('chat');

// — or manually:
chat.dispose();
chat.disposed; // true
```

## Rooms

`join()` requests membership in a named room. It resolves when the server confirms with a `joined` frame.

```ts
await pulse.join('lobby');
console.log(pulse.rooms.value.has('lobby')); // true — reactive signal

await pulse.leave('lobby');
console.log(pulse.rooms.value.has('lobby')); // false
```

Pass an `AbortSignal` to cancel the join request:

```ts
const ctrl = new AbortController();

const joinP = pulse.join('arena', { signal: ctrl.signal });
ctrl.abort(); // rejects joinP with AbortError
```

`pulse.rooms` is a `ReadonlySignal<ReadonlySet<string>>`. Derive computed views with ripple:

```ts
import { computed } from '@vielzeug/ripple';

const roomCount = computed(() => pulse.rooms.value.size);
```

## Presence

`presence()` returns a presence channel for a room. It implicitly joins the room and begins tracking members.

```ts
type MemberState = { name: string; status: 'online' | 'away' };

const lobby = pulse.presence<MemberState>('lobby');

// Reactive member map — updates on every join, leave, or state change
import { effect } from '@vielzeug/ripple';
effect(() => {
  for (const [id, state] of lobby.state.value) {
    console.log(id, state.name, state.status);
  }
});

// React to membership events
lobby.onJoin((memberId, state) => showJoinBanner(state.name));
lobby.onLeave((memberId) => removeAvatarFromList(memberId));

// Broadcast your own state (also serves as join confirmation)
lobby.update({ name: 'Alice', status: 'online' });
```

### Presence disposal

Disposing a presence channel stops tracking and removes all join/leave callbacks.

```ts
using _ = lobby;
// — or —
lobby.dispose();
```

## Middleware

Middleware intercepts every outgoing `send()` before the message hits the socket. Call `next()` to allow the send; omit it to suppress.

```ts
const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  middleware: [
    // Logging middleware
    (event, payload, next) => {
      console.debug('[ws out]', event, payload);
      next();
    },
    // Rate-limiting middleware
    (event, _payload, next) => {
      if (rateLimiter.allow(event)) next();
      // omit next() to drop the message
    },
  ],
});
```

Middleware only applies to application messages sent via `send()`. Internal frames (ping, join, subscribe) bypass the pipeline.

## Reconnect & Heartbeat

### Auto-reconnect

Enable reconnect with `true` (uses defaults) or a `ReconnectOptions` object.

```ts
const pulse = createPulse('wss://api.example.com/ws', {
  reconnect: {
    maxAttempts: 10, // default: 5
    delay: 1_000, // fixed 1 s delay — or a function:
    // delay: (n) => Math.min(500 * 2 ** n, 30_000)
  },
});
```

When reconnect is enabled, an unexpected close transitions `status` to `'reconnecting'`. After the budget is exhausted without success, `status` moves to `'closed'`.

The default `delay` is full-jitter exponential backoff: `Math.random() * Math.min(1000 * 2^n, 30_000)`.

### Heartbeat

Enable heartbeat with `true` (uses defaults) or a `HeartbeatOptions` object.

```ts
const pulse = createPulse('wss://api.example.com/ws', {
  heartbeat: {
    interval: 30_000, // ms between pings — default: 30_000
    timeout: 5_000, // ms to wait for pong before treating connection as dead — default: 5_000
  },
});
```

When a pong is not received within `timeout` ms, the socket is closed and — if reconnect is enabled — a reconnect attempt is triggered.

## Disposal

Disposing a pulse instance closes the WebSocket, clears all listeners, rejects pending `wait()` / `join()` / `leave()` promises, and aborts the `disposalSignal`.

```ts
// using declaration — dispose() called automatically at block exit
using pulse = createPulse('wss://api.example.com/ws');

// — or manually:
pulse.dispose();
pulse.disposed; // true
```

### `disposalSignal`

`pulse.disposalSignal` is an `AbortSignal` that fires when `dispose()` is called. Use it to tie external cleanup to the connection lifetime.

```ts
// Automatically cancel a fetch when the pulse is disposed
fetch('/api/init', { signal: pulse.disposalSignal });

// Unsubscribe from another system when pulse tears down
externalBus.on('theme', applyTheme, { signal: pulse.disposalSignal });
```

## Framework Integration

::: code-group

```ts [React]
import { createPulse } from '@vielzeug/pulse';
import { useEffect, useSyncExternalStore } from 'react';

function usePulseStatus(pulse: ReturnType<typeof createPulse>) {
  return useSyncExternalStore(
    (cb) => {
      const unsub = pulse.status.subscribe(cb);
      return unsub;
    },
    () => pulse.status.value,
  );
}

function Chat() {
  const status = usePulseStatus(pulse);

  useEffect(() => {
    const unsub = pulse.on('chat:message', ({ user, text }) => {
      appendToLog(user, text);
    });
    return unsub;
  }, []);

  return <div>Status: {status}</div>;
}
```

```ts [Vue 3]
import { createPulse } from '@vielzeug/pulse';
import { onUnmounted, ref, watchEffect } from 'vue';

export function usePulse(url: string) {
  const pulse = createPulse(url, { reconnect: true });
  const status = ref(pulse.status.value);

  const unsub = pulse.status.subscribe((s) => {
    status.value = s;
  });

  onUnmounted(() => pulse.dispose());

  return { pulse, status };
}
```

```ts [Svelte]
import { createPulse } from '@vielzeug/pulse';
import { onDestroy } from 'svelte';
import { readable } from 'svelte/store';

const pulse = createPulse('wss://api.example.com/ws', { reconnect: true });

// Wrap ripple signal in a Svelte readable store
const status = readable(pulse.status.value, (set) => {
  return pulse.status.subscribe(set);
});

onDestroy(() => pulse.dispose());
```

:::

## Working with Other Vielzeug Libraries

### Herald — bridge WebSocket events to an app bus

Route incoming server events through a Herald bus so the rest of your application doesn't need to know about the WebSocket.

```ts
import { createPulse } from '@vielzeug/pulse';
import { createBus } from '@vielzeug/herald';

type AppEvents = {
  'chat:message': { user: string; text: string };
};

const pulse = createPulse<AppEvents>('wss://api.example.com/ws');
const bus = createBus<AppEvents>();

// Forward all WebSocket events to the Herald bus
pulse.on('chat:message', (payload) => bus.emit('chat:message', payload));

// The rest of the app only knows about the bus
bus.on('chat:message', ({ user, text }) => appendToLog(user, text));

// Dispose both together
pulse.disposalSignal.addEventListener('abort', () => bus.dispose(), { once: true });
```

### Ripple — derive computed views from reactive signals

```ts
import { computed, effect } from '@vielzeug/ripple';

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws');
const lobby = pulse.presence<{ name: string }>('lobby');

const memberCount = computed(() => lobby.state.value.size);
const memberNames = computed(() => [...lobby.state.value.values()].map((s) => s.name));

effect(() => {
  document.querySelector('#count')!.textContent = String(memberCount.value);
});
```

## Best Practices

- **Define message maps upfront.** Separate `ServerEvents` and `ClientEvents` types make protocol changes a compile error, not a runtime surprise.
- **One `createPulse` instance per connection.** Multiple instances to the same URL open multiple sockets. Share a single instance across your application.
- **Always dispose.** Call `pulse.dispose()` or use `using` to prevent socket and listener leaks in component/module teardown.
- **Use `disposalSignal` to chain cleanups.** Pass `pulse.disposalSignal` to any external subscription or fetch so teardown is automatic.
- **Enable reconnect for production.** `reconnect: true` uses sensible defaults; override `maxAttempts` and `delay` only when you have measured the right values.
- **Scope messages with channels.** Use `channel()` when building features that own a domain namespace — it keeps listener cleanup isolated.
- **Do not buffer messages.** `send()` is a no-op when the connection is not open. Queue outgoing messages in application logic if delivery during reconnects matters.
