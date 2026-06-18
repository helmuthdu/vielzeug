---
title: Pulse — API Reference
description: Complete API reference for @vielzeug/pulse.
---

[[toc]]

## API Overview

| Symbol               | Purpose                                       | Execution mode | Common gotcha                                                             |
| -------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| `createPulse()`      | Create a typed WebSocket client instance      | Sync           | Connection opens immediately; use `disconnect()` to defer until needed    |
| `pulse.on()`         | Subscribe to a typed server event             | Sync           | Returns an `Unsubscribe`; always call it on component teardown            |
| `pulse.once()`       | One-shot server event subscription            | Sync           | Listener auto-removes after first fire                                    |
| `pulse.send()`       | Send a typed client event                     | Sync           | No-op when not open; messages are not buffered                            |
| `pulse.wait()`       | Await the next server event                   | Async          | Rejects with `AbortError` on disposal; use `timeout` for a deadline       |
| `pulse.connect()`    | Open the connection explicitly                | Async          | Resolves immediately if already open                                      |
| `pulse.disconnect()` | Close without triggering reconnect            | Sync           | Pass code `1000` for a clean close                                        |
| `pulse.join()`       | Join a room; resolves on server confirmation  | Async          | Rejects with `AbortError` if pulse is disposed before server replies      |
| `pulse.leave()`      | Leave a room; resolves on server confirmation | Async          | Room is removed from `pulse.rooms` only after server confirms             |
| `pulse.channel()`    | Create an isolated channel namespace          | Sync           | Each call returns a new independent object; dispose channels individually |
| `pulse.presence()`   | Reactive presence channel for a room          | Sync           | Implicitly joins the room; `dispose()` to stop tracking                   |
| `pulse.dispose()`    | Permanently close and release all resources   | Sync           | Idempotent; also aborts `disposalSignal`                                  |

## Package Entry Point

| Import            | Purpose                      |
| ----------------- | ---------------------------- |
| `@vielzeug/pulse` | All public exports and types |

## `createPulse()`

```ts
createPulse<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap>(
  url: string,
  opts?: PulseOptions,
): Pulse<TServer, TClient>
```

Creates and returns a new `Pulse<TServer, TClient>` instance. The WebSocket connection opens immediately on creation.

**Parameters:**

| Parameter | Type           | Description                        |
| --------- | -------------- | ---------------------------------- |
| `url`     | `string`       | WebSocket server URL (`wss://…`)   |
| `opts`    | `PulseOptions` | Optional configuration (see below) |

**Parameters — `PulseOptions`:**

| Option        | Type                                     | Default | Description                                                                          |
| ------------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| `heartbeat`   | `boolean \| HeartbeatOptions`            | `false` | `true` uses defaults; `false` disables; object for custom interval/timeout           |
| `middleware`  | `readonly Middleware[]`                  | `[]`    | Functions run on every outgoing `send()` before the message is written to the socket |
| `onClose`     | `(code: number, reason: string) => void` | —       | Called when the connection is closed by either side                                  |
| `onError`     | `(error: Error) => void`                 | —       | Called on a WebSocket error event; errors almost always precede a close              |
| `onMessage`   | `(event: MessageEvent) => void`          | —       | Called with every raw `MessageEvent` before parsing; useful for low-level debugging  |
| `onOpen`      | `() => void`                             | —       | Called when the connection is established or re-established                          |
| `onReconnect` | `(attempt: number) => void`              | —       | Called at the start of each reconnect attempt; `attempt` is 1-based                  |
| `protocols`   | `string \| string[]`                     | —       | Sub-protocols passed to the `WebSocket` constructor                                  |
| `reconnect`   | `boolean \| ReconnectOptions`            | `false` | `true` uses defaults; `false` disables; object for custom delay/maxAttempts          |

**Returns:** `Pulse<TServer, TClient>`

**Example:**

```ts
import { createPulse } from '@vielzeug/pulse';

type ServerEvents = { 'chat:message': { user: string; text: string } };
type ClientEvents = { 'chat:send': { text: string } };

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws', {
  reconnect: { maxAttempts: 5 },
  heartbeat: true,
  onOpen: () => console.log('connected'),
  onClose: (code, reason) => console.log('closed', code, reason),
});
```

## Pulse Interface

### `pulse.status`

Type: `ReadonlySignal<PulseStatus>`

Reactive connection status. Subscribe with ripple `effect()` to react to status changes.

```ts
import { effect } from '@vielzeug/ripple';

effect(() => updateStatusBadge(pulse.status.value));

// Read without subscribing
console.log(pulse.status.value); // 'connecting' | 'open' | 'reconnecting' | 'closed'
```

---

### `pulse.rooms`

Type: `ReadonlySignal<ReadonlySet<string>>`

Reactive set of rooms the client is currently a confirmed member of.

```ts
import { computed } from '@vielzeug/ripple';

const roomCount = computed(() => pulse.rooms.value.size);
```

---

### `pulse.disposed`

Type: `readonly boolean`

`true` after `dispose()` has been called.

---

### `pulse.disposalSignal`

Type: `readonly AbortSignal`

An `AbortSignal` that aborts when `dispose()` is called. Use it to tie external lifetimes to the connection.

```ts
// Cancel a fetch when the pulse is disposed
fetch('/api/stream', { signal: pulse.disposalSignal });
```

---

### `pulse.on()`

```ts
on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe
```

Subscribe to a typed server event. Returns an `Unsubscribe` function; call it to remove the listener.

| Parameter | Type                            | Description                |
| --------- | ------------------------------- | -------------------------- |
| `event`   | `K` (EventKey of TServer)       | Server event name          |
| `handler` | `(payload: TServer[K]) => void` | Callback for each delivery |

**Returns:** `Unsubscribe`

```ts
const unsub = pulse.on('chat:message', ({ user, text }) => appendToLog(user, text));
unsub(); // remove when done
```

---

### `pulse.once()`

```ts
once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe
```

Registers a listener that fires exactly once, then removes itself. Returns an `Unsubscribe` for early cancellation.

```ts
pulse.once('user:joined', ({ userId }) => showWelcome(userId));
```

---

### `pulse.send()`

```ts
send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void
```

Send a typed event to the server. No-op if the connection is not open — messages are not buffered.

```ts
pulse.send('chat:send', { text: 'Hello!' });
```

---

### `pulse.wait()`

```ts
wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>
```

Returns a promise that resolves with the payload of the next server emission of `event`.

| Parameter      | Type          | Description                                       |
| -------------- | ------------- | ------------------------------------------------- |
| `event`        | `K`           | Server event name to await                        |
| `opts.signal`  | `AbortSignal` | Optional; rejects with `AbortError` when it fires |
| `opts.timeout` | `number`      | Optional; rejects with `TimeoutError` after ms    |

**Rejects when:**

- `opts.signal` fires — rejects with `AbortError`
- `opts.timeout` elapses — rejects with `TimeoutError`
- The pulse is disposed — rejects with `AbortError`

```ts
const msg = await pulse.wait('chat:message', { timeout: 5_000 });
```

---

### `pulse.connect()`

```ts
connect(): Promise<void>
```

Opens the WebSocket connection. Resolves when the connection is open. Returns immediately if already open.

> **Note:** The connection is opened automatically on construction. Call `connect()` explicitly only when reconnecting after `disconnect()`, or to await the initial open in code that runs before the first `onopen` fires.

**Rejects when:**

- Already disposed — `DisposedError`
- Socket closes before it opens — `ConnectionError`
- Socket error — `ConnectionError`

```ts
await pulse.connect();
```

---

### `pulse.disconnect()`

```ts
disconnect(code?: number, reason?: string): void
```

Closes the WebSocket without triggering auto-reconnect. Status transitions to `'closed'`.

| Parameter | Type     | Default | Description           |
| --------- | -------- | ------- | --------------------- |
| `code`    | `number` | `1000`  | WebSocket close code  |
| `reason`  | `string` | `''`    | Human-readable reason |

```ts
pulse.disconnect(1000, 'user signed out');
```

---

### `pulse.join()`

```ts
join(room: string, opts?: { signal?: AbortSignal }): Promise<void>
```

Requests to join a room. Resolves when the server confirms with a `joined` frame. The room is added to `pulse.rooms` on confirmation.

| Parameter     | Type          | Description                                 |
| ------------- | ------------- | ------------------------------------------- |
| `room`        | `string`      | Room name                                   |
| `opts.signal` | `AbortSignal` | Optional; rejects with `AbortError` on fire |

**Rejects when:**

- Already disposed — `DisposedError`
- The signal fires — `AbortError`
- The pulse is disposed before confirmation — `AbortError`

```ts
await pulse.join('lobby');
```

---

### `pulse.leave()`

```ts
leave(room: string, opts?: { signal?: AbortSignal }): Promise<void>
```

Requests to leave a room. Resolves when the server confirms with a `left` frame. The room is removed from `pulse.rooms` on confirmation.

If the socket is not open, `leave()` connects first (mirroring `join()` behaviour).

**Rejects when:**

- Already disposed — `DisposedError`
- The signal fires — `AbortError`
- Connection fails — `ConnectionError`

```ts
await pulse.leave('lobby');
```

---

### `pulse.channel()`

```ts
channel<TChServer extends MessageMap = TServer, TChClient extends MessageMap = TClient>(
  name: string,
): PulseChannel<TChServer, TChClient>
```

Returns a new `PulseChannel` scoped to `name`. Each call returns an independent object with its own listener set. Multiple calls with the same name create independent channels.

The channel is automatically re-subscribed on reconnect. Calling `channel.dispose()` sends an `unsubscribe` frame to the server only when the last channel with that name is disposed.

```ts
const chat = pulse.channel<ChatServer, ChatClient>('chat');
```

---

### `pulse.presence()`

```ts
presence<T>(room: string): PresenceChannel<T>
```

Returns a `PresenceChannel<T>` that tracks all members' state in `room`. Implicitly joins the room.

```ts
const lobby = pulse.presence<{ name: string }>('lobby');
```

---

### `pulse.dispose()`

```ts
dispose(): void
```

Permanently closes the connection and releases all resources:

- Closes the WebSocket with code `1000`
- Clears all listeners
- Rejects all pending `wait()`, `join()`, and `leave()` promises with `DisposedError`
- Rejects any in-flight `connect()` with `DisposedError`
- Aborts `disposalSignal`

Idempotent — safe to call multiple times.

---

### `pulse[Symbol.dispose]()`

```ts
[Symbol.dispose](): void
```

Alias for `dispose()`. Enables the `using` keyword:

```ts
{
  using pulse = createPulse('wss://api.example.com/ws');
  // ...
} // dispose() called automatically
```

## PulseChannel Interface

Obtain via `pulse.channel(name)`.

### `channel.on()`

```ts
on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe
```

Subscribe to a server event scoped to this channel. Listeners are auto-removed on `channel.dispose()`.

---

### `channel.once()`

```ts
once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe
```

One-shot subscription scoped to this channel.

---

### `channel.send()`

```ts
send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void
```

Send a typed message to the server scoped to this channel. No-op if the pulse connection is not open.

---

### `channel.wait()`

```ts
wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>
```

Resolves on the next emission of the given event within this channel. Rejects when:

- `opts.signal` fires — `AbortError`
- `opts.timeout` elapses — `TimeoutError`
- The channel is disposed — `AbortError`

---

### `channel.dispose()`

```ts
dispose(): void
```

Removes all channel listeners. The underlying connection is unaffected.

---

### `channel.disposed`

Type: `readonly boolean`

`true` after `dispose()` has been called.

---

### `channel.name`

Type: `readonly string`

The channel name passed to `pulse.channel()`.

---

### `channel[Symbol.dispose]()`

Alias for `dispose()`. Enables `using` declarations.

## PresenceChannel Interface

Obtain via `pulse.presence(room)`.

### `presence.state`

Type: `ReadonlySignal<ReadonlyMap<string, T>>`

Reactive map of `memberId → state`. Updates whenever any member joins, leaves, or changes state.

```ts
import { effect } from '@vielzeug/ripple';

effect(() => {
  for (const [id, state] of lobby.state.value) {
    renderAvatar(id, state);
  }
});
```

---

### `presence.onJoin()`

```ts
onJoin(handler: (memberId: string, state: T) => void): Unsubscribe
```

Registers a callback fired whenever a new member joins with their initial state. Returns an `Unsubscribe`.

---

### `presence.onLeave()`

```ts
onLeave(handler: (memberId: string) => void): Unsubscribe
```

Registers a callback fired whenever a member leaves. Returns an `Unsubscribe`.

---

### `presence.update()`

```ts
update(state: T): void
```

Broadcasts this client's presence state to all room members. Also serves as an implicit join if not already in the room.

---

### `presence.room`

Type: `readonly string`

The room name passed to `pulse.presence()`.

---

### `presence.disposed`

Type: `readonly boolean`

`true` after `dispose()` has been called.

---

### `presence.dispose()`

```ts
dispose(): void
```

Stops tracking the room and removes all join/leave callbacks.

---

### `presence[Symbol.dispose]()`

Alias for `dispose()`. Enables `using` declarations.

## Types

```ts
/** A map of event name → payload type. */
type MessageMap = Record<string, unknown>;

/** Extract valid event key strings from a MessageMap. */
type EventKey<T extends MessageMap> = keyof T & string;

/** A function that removes a listener subscription. */
type Unsubscribe = () => void;

/** Lifecycle state of a Pulse connection. */
type PulseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

/** A read-only view of a Map — callers cannot mutate the entries. */
type ReadonlyMap<K, V> = Omit<Map<K, V>, 'clear' | 'delete' | 'set'>;
```

```ts
type ReconnectOptions = {
  /**
   * Delay strategy between attempts (ms).
   * number = fixed delay; function = (attempt: number) => ms.
   * Defaults to full-jitter exponential backoff capped at 30 s.
   */
  delay?: number | ((attempt: number) => number);
  /** Maximum reconnect attempts. Default: 5. */
  maxAttempts?: number;
};
```

```ts
type HeartbeatOptions = {
  /** Interval between pings in ms. Default: 30_000. */
  interval?: number;
  /** How long to wait for a pong before treating the connection as dead. Default: 5_000. */
  timeout?: number;
};
```

```ts
/**
 * Intercepts outgoing messages. Call next() to allow; omit to suppress.
 */
type Middleware = (event: string, payload: unknown, next: () => void) => void;
```

```ts
type PulseOptions = {
  heartbeat?: boolean | HeartbeatOptions;
  middleware?: readonly Middleware[];
  onClose?: (code: number, reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (event: MessageEvent) => void;
  onOpen?: () => void;
  onReconnect?: (attempt: number) => void;
  protocols?: string | string[];
  reconnect?: boolean | ReconnectOptions;
};
```

## Errors

All errors extend `PulseError`. Use `instanceof PulseError` to catch any pulse-originated error in one branch.

| Class             | Extends      | Triggers when                                                               | Notable properties |
| ----------------- | ------------ | --------------------------------------------------------------------------- | ------------------ |
| `PulseError`      | `Error`      | Base class — never thrown directly                                          | —                  |
| `ConnectionError` | `PulseError` | Connection cannot be established or is lost with reconnect budget exhausted | `url: string`      |
| `TimeoutError`    | `PulseError` | `wait()` `timeout` elapses before the event arrives                         | `event: string`    |
| `AbortError`      | `PulseError` | `wait()`, `join()`, or `leave()` is aborted via signal or pulse disposal    | —                  |
| `DisposedError`   | `PulseError` | A method is called on a disposed instance or channel                        | —                  |
| `ProtocolError`   | `PulseError` | The server sends a frame that cannot be parsed or has no `type` field       | `raw: unknown`     |

```ts
import { AbortError, ConnectionError, ProtocolError, PulseError, TimeoutError } from '@vielzeug/pulse';

try {
  await pulse.wait('chat:message', { timeout: 5_000 });
} catch (err) {
  if (err instanceof TimeoutError) {
    console.warn('no message in 5 s, event:', err.event);
  } else if (err instanceof AbortError) {
    console.log('aborted or pulse disposed');
  } else if (err instanceof PulseError) {
    console.error('unexpected pulse error', err);
  }
}
```
