---
title: Pulse — API Reference
description: Complete API reference for @vielzeug/pulse.
---

[[toc]]

## API Overview

| Symbol               | Purpose                                       | Execution mode | Common gotcha                                                             |
| -------------------- | --------------------------------------------- | -------------- | ------------------------------------------------------------------------- |
| `createPulse()`      | Create a typed WebSocket client instance      | Sync           | Connects immediately by default; pass `lazy: true` to defer              |
| `pulse.on()`         | Subscribe to a typed server event             | Sync           | Returns an `Unsubscribe`; always call it on component teardown            |
| `pulse.once()`       | One-shot server event subscription            | Sync           | Listener auto-removes after first fire                                    |
| `pulse.send()`       | Send a typed client event                     | Sync           | Buffered when `buffer: true`; dropped (dev warn) otherwise                |
| `pulse.wait()`       | Await the next server event                   | Async          | Rejects with `PulseAbortError` on disposal; use `timeout` for a deadline       |
| `pulse.connect()`    | Open the connection explicitly                | Async          | Required when `lazy: true`; otherwise called automatically on creation    |
| `pulse.disconnect()` | Close without triggering reconnect            | Sync           | Pass code `1000` for a clean close                                        |
| `pulse.join()`       | Join a room; resolves on server confirmation  | Async          | Rejects with `PulseAbortError` if pulse is disposed before server replies      |
| `pulse.leave()`      | Leave a room; resolves on server confirmation | Async          | Room is removed from `pulse.rooms` only after server confirms             |
| `pulse.channel()`    | Create an isolated channel namespace          | Sync           | Same name returns the **same** object; `dispose()` sends unsubscribe      |
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

| Option        | Type                                     | Default | Description                                                                                            |
| ------------- | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `buffer`      | `boolean \| BufferOptions`               | `false` | `true` uses defaults (`maxSize: 50`); buffers outgoing frames while disconnected, flushes on reconnect |
| `heartbeat`   | `boolean \| HeartbeatOptions`            | `false` | `true` uses defaults; `false` disables; object for custom interval/timeout                             |
| `lazy`        | `boolean`                                | `false` | `true` defers the initial connection until `connect()` is called explicitly                            |
| `middleware`  | `readonly Middleware[]`                  | `[]`    | Functions run on every outgoing `send()` before the message is written to the socket                   |
| `onClose`     | `(code: number, reason: string) => void` | —       | Called when the connection is closed by either side                                                    |
| `onError`     | `(error: Error) => void`                 | —       | Called on a WebSocket error event; errors almost always precede a close                                |
| `onMessage`   | `(event: MessageEvent) => void`          | —       | Called with every raw `MessageEvent` before parsing; useful for low-level debugging                    |
| `onOpen`      | `() => void`                             | —       | Called when the connection is established or re-established                                            |
| `onReconnect` | `(attempt: number) => void`              | —       | Called at the start of each reconnect attempt; `attempt` is 1-based                                   |
| `protocols`   | `string \| string[]`                     | —       | Sub-protocols passed to the `WebSocket` constructor                                                    |
| `reconnect`   | `boolean \| ReconnectOptions`            | `false` | `true` uses defaults; `false` disables; object for custom delay/maxAttempts                            |

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

Type: `Readable<PulseStatus>`

Reactive connection status. Subscribe with ripple `effect()` to react to status changes.

```ts
import { effect } from '@vielzeug/ripple';

effect(() => updateStatusBadge(pulse.status.value));

// Read without subscribing
console.log(pulse.status.value); // 'connecting' | 'open' | 'reconnecting' | 'closed'
```

---

### `pulse.rooms`

Type: `Readable<ReadonlySet<string>>`

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

Send a typed event to the server. When the connection is not open:

- If `buffer: true` is set, the message is queued and flushed on the next successful open.
- Otherwise the message is dropped and a dev warning is emitted.

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
| `opts.signal`  | `AbortSignal` | Optional; rejects with `PulseAbortError` when it fires |
| `opts.timeout` | `number`      | Optional; rejects with `PulseTimeoutError` after ms    |

**Rejects when:**

- `opts.signal` fires — rejects with `PulseAbortError`
- `opts.timeout` elapses — rejects with `PulseTimeoutError`
- The pulse is disposed — rejects with `PulseAbortError`

```ts
const msg = await pulse.wait('chat:message', { timeout: 5_000 });
```

---

### `pulse.connect()`

```ts
connect(): Promise<void>
```

Opens the WebSocket connection. Resolves when the connection is open. Returns immediately if already open.

> **Note:** When `lazy: false` (default) the connection opens automatically on construction. Use `lazy: true` to defer and call `connect()` explicitly.

**Rejects when:**

- Already disposed — `PulseDisposedError`
- Socket closes before it opens — `PulseConnectionError`
- Socket error — `PulseConnectionError`

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
join(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>
```

Requests to join a room. Resolves when the server confirms with a `joined` frame. The room is added to `pulse.rooms` on confirmation.

| Parameter      | Type          | Description                                       |
| -------------- | ------------- | ------------------------------------------------- |
| `room`         | `string`      | Room name                                         |
| `opts.signal`  | `AbortSignal` | Optional; rejects with `PulseAbortError` on fire       |
| `opts.timeout` | `number`      | Optional; rejects with `PulseTimeoutError` after ms    |

**Rejects when:**

- Already disposed — `PulseDisposedError`
- The signal fires — `PulseAbortError`
- `opts.timeout` elapses — `PulseTimeoutError`
- The pulse is disposed before confirmation — `PulseAbortError`

```ts
await pulse.join('lobby', { timeout: 5_000 });
```

---

### `pulse.leave()`

```ts
leave(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>
```

Requests to leave a room. Resolves when the server confirms with a `left` frame. The room is removed from `pulse.rooms` on confirmation.

If the socket is not open, `leave()` connects first (mirroring `join()` behaviour).

**Rejects when:**

- Already disposed — `PulseDisposedError`
- The signal fires — `PulseAbortError`
- `opts.timeout` elapses — `PulseTimeoutError`
- Connection fails — `PulseConnectionError`

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

Returns a `PulseChannel` scoped to `name`. Multiple calls with the **same name return the same object** — the channel is memoized. The subscription is automatically re-sent on reconnect. Disposing the channel sends an `unsubscribe` frame and evicts it from the cache.

```ts
const chat = pulse.channel<ChatServer, ChatClient>('chat');
const same = pulse.channel<ChatServer, ChatClient>('chat');
console.log(chat === same); // true
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
- Rejects all pending `wait()`, `join()`, and `leave()` promises with `PulseDisposedError`
- Rejects any in-flight `connect()` with `PulseDisposedError`
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

- `opts.signal` fires — `PulseAbortError`
- `opts.timeout` elapses — `PulseTimeoutError`
- The channel is disposed — `PulseAbortError`

---

### `channel.dispose()`

```ts
dispose(): void
```

Removes all channel listeners, sends an `unsubscribe` frame, and evicts the channel from the memoization cache. The underlying connection is unaffected.

---

### `channel.disposed`

Type: `readonly boolean`

`true` after `dispose()` has been called.

---

### `channel.disposalSignal`

Type: `readonly AbortSignal`

An `AbortSignal` that aborts when `dispose()` is called.

```ts
fetch('/api', { signal: channel.disposalSignal });
```

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

Type: `Readable<ReadonlyMap<string, T>>`

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

Stops tracking the room, removes all join/leave callbacks, and sends a `leave` frame to the server.

---

### `presence.disposalSignal`

Type: `readonly AbortSignal`

An `AbortSignal` that aborts when `dispose()` is called.

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
type BufferOptions = {
  /** Maximum number of frames to buffer. Oldest evicted when full. Default: 50. */
  maxSize?: number;
};
```

```ts
type PulseOptions = {
  buffer?: boolean | BufferOptions;
  heartbeat?: boolean | HeartbeatOptions;
  lazy?: boolean;
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

All error constructors accept a trailing `opts?: ErrorOptions`, so you can chain a `cause`: `new PulseTimeoutError('chat:message', { cause })`.

| Class                  | Extends      | Triggers when                                                               | Notable properties |
| ---------------------- | ------------ | --------------------------------------------------------------------------- | ------------------ |
| `PulseError`           | `Error`      | Base class — never thrown directly                                          | —                  |
| `PulseConnectionError` | `PulseError` | Connection cannot be established or is lost with reconnect budget exhausted | `url: string`      |
| `PulseTimeoutError`    | `PulseError` | `wait()` `timeout` elapses before the event arrives                         | `event: string`    |
| `PulseAbortError`      | `PulseError` | `wait()`, `join()`, or `leave()` is aborted via signal or pulse disposal    | —                  |
| `PulseDisposedError`   | `PulseError` | A method is called on a disposed instance or channel                        | —                  |
| `PulseProtocolError`   | `PulseError` | The server sends a frame that cannot be parsed or has no `type` field       | `raw: unknown`     |

```ts
import { PulseAbortError, PulseError, PulseTimeoutError } from '@vielzeug/pulse';

try {
  await pulse.wait('chat:message', { timeout: 5_000 });
} catch (err) {
  if (err instanceof PulseTimeoutError) {
    console.warn('no message in 5 s, event:', err.event);
  } else if (err instanceof PulseAbortError) {
    console.log('aborted or pulse disposed');
  } else if (err instanceof PulseError) {
    console.error('unexpected pulse error', err);
  }
}
```
