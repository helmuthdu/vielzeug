---
title: API — Pulse
description: Complete API reference for Pulse, including schema types, options, scopes, and error classes.
package: pulse
category: websockets
---

<!-- markdownlint-disable MD025 -->

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createPulse()` | Create a typed WebSocket session instance. | Sync (returns `Pulse`) | Does not open the connection — call `connect()`. |
| `Pulse` | Main instance: channels, rooms, messaging, lifecycle. | Sync methods, async `connect()`/`wait()` | `send()` throws while disconnected. |
| `PulseChannel` | Scoped channel namespace with independent disposal. | Sync methods, async `wait()` | Each call returns a new scope; ref-counted subscription. |
| `RoomScope` | Ref-counted room membership with optional presence. | Sync methods, async `joined` | `joined` rejects on transport close or timeout. |
| `PulseSchema` | Declares server/client events, channels, and rooms. | Type-only | Infer all named scope types from this schema. |
| `PulseOptions` | Configuration: heartbeat, reconnect, transform, onError. | Type-only | `reconnect` and `heartbeat` default to `false`. |
| `PulseError` | Base class for all Pulse errors. | Runtime | Check `instanceof` against subclasses. |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/pulse` | All public exports: `createPulse`, types, and error classes. |

## `createPulse()`

```ts
function createPulse<S extends PulseSchema = PulseSchema>(url: string, options?: PulseOptions): Pulse<S>
```

Creates a Pulse instance. The WebSocket is not opened until `connect()` is called.

### Type parameters

| Parameter | Constraint | Description |
| --- | --- | --- |
| `S` | `PulseSchema` | Schema declaring server events, client events, channels, and rooms. |

### Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | `string` | WebSocket URL. |
| `options` | `PulseOptions` | Optional configuration. |

### Returns

`Pulse<S>` — the Pulse instance.

---

## `PulseSchema`

```ts
type PulseSchema = {
  server?: MessageMap;
  client?: MessageMap;
  channels?: ChannelDefinitions;
  rooms?: RoomDefinitions;
};
```

Declare all protocol surfaces once at construction. Named scopes infer their types from this schema.

| Field | Type | Description |
| --- | --- | --- |
| `server` | `MessageMap` | Root events the server sends. |
| `client` | `MessageMap` | Root events the client sends. |
| `channels` | `ChannelDefinitions` | Named channel schemas. |
| `rooms` | `RoomDefinitions` | Named room schemas with optional presence. |

---

## `PulseOptions`

```ts
type PulseOptions = {
  heartbeat?: boolean | HeartbeatOptions;
  onError?: (error: PulseError) => void;
  protocols?: string | string[];
  reconnect?: boolean | ReconnectOptions;
  transform?: OutgoingTransform;
};
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `heartbeat` | `boolean \| HeartbeatOptions` | `false` | Ping/pong keep-alive. |
| `onError` | `(error: PulseError) => void` | — | Receives typed transport and protocol errors. |
| `protocols` | `string \| string[]` | — | Sub-protocols passed to the WebSocket constructor. |
| `reconnect` | `boolean \| ReconnectOptions` | `false` | Auto-reconnect on unexpected close. |
| `transform` | `OutgoingTransform` | — | Transform or filter outgoing application messages. |

---

## `HeartbeatOptions`

```ts
type HeartbeatOptions = {
  interval?: number;
  timeout?: number;
};
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `interval` | `number` | `30_000` | Interval between pings in ms. |
| `timeout` | `number` | `5_000` | How long to wait for a pong before treating the connection as dead. |

---

## `ReconnectOptions`

```ts
type ReconnectOptions = {
  delay?: number | ((attempt: number) => number);
  maxAttempts?: number;
};
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `delay` | `number \| ((attempt: number) => number)` | Full-jitter exponential backoff capped at 30 s | Delay between reconnect attempts in ms. `attempt` is zero-based. |
| `maxAttempts` | `number` | `5` | Maximum number of reconnect attempts after initial failure. |

---

## `OutgoingMessage`

```ts
type OutgoingMessage = { channel?: string; event: string; payload: unknown };
```

An outgoing application message before it is serialized.

---

## `OutgoingTransform`

```ts
type OutgoingTransform = (message: Readonly<OutgoingMessage>) => OutgoingMessage | null;
```

Transform or filter outgoing application messages. Internal protocol frames (subscribe, join, leave, presence, ping) bypass this hook. Return `null` to drop the message.

---

## `Pulse`

```ts
type Pulse<S extends PulseSchema = PulseSchema> = {
  // Channels
  channel<K extends keyof ChannelMap<S> & string>(
    name: K,
  ): PulseChannel<ChannelMap<S>[K]['server'], ChannelMap<S>[K]['client']>;

  // Connection
  connect(): Promise<void>;
  disconnect(code?: number, reason?: string): void;

  // Lifecycle
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;

  // Messaging
  on<K extends EventKey<ServerEvents<S>>>(event: K, handler: (payload: ServerEvents<S>[K]) => void): Unsubscribe;
  once<K extends EventKey<ServerEvents<S>>>(event: K, handler: (payload: ServerEvents<S>[K]) => void): Unsubscribe;
  send<K extends EventKey<ClientEvents<S>>>(event: K, payload: ClientEvents<S>[K]): void;
  wait<K extends EventKey<ServerEvents<S>>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<ServerEvents<S>[K]>;

  // Rooms
  room<K extends keyof RoomMap<S> & string>(name: K, opts?: RoomOptions): RoomScope<RoomMap<S>[K]>;
  readonly rooms: Readable<ReadonlySet<string>>;

  // Status
  readonly status: Readable<PulseStatus>;

  [Symbol.dispose](): void;
};
```

### `channel(name)`

Creates an isolated message namespace over the shared connection. Each call returns an independently disposable scope. The server subscription is reference-counted.

### `connect()`

Explicitly opens the connection. Resolves after session restoration completes. Rejects if the connection closes before opening.

### `disconnect(code?, reason?)`

Closes the connection without triggering reconnection. Default code is `1000`.

### `dispose()`

Permanently closes the connection and releases all resources. Idempotent.

### `on(event, handler)`

Subscribes to a typed server event. Returns an unsubscribe function.

### `once(event, handler)`

Subscribes once — auto-removes after first invocation.

### `send(event, payload)`

Sends a typed event to the server. Throws `PulseConnectionError` unless the connection is open.

### `wait(event, opts?)`

Resolves on the next emission of the given server event. Rejects when `opts.signal` aborts, the timeout elapses, or the instance is disposed.

### `room(name, opts?)`

Creates a ref-counted room scope. The first scope sends `join`; the last disposal sends `leave`. When the room definition includes `presence`, the scope exposes reactive presence state.

### `rooms`

Reactive set of rooms the client is currently a confirmed member of.

### `status`

Reactive connection status: `'connecting' | 'open' | 'reconnecting' | 'closed'`.

---

## `PulseChannel`

```ts
type PulseChannel<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap> = {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly name: string;
  dispose(): void;
  on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void;
  wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>;
  [Symbol.dispose](): void;
};
```

---

## `RoomScope`

```ts
type RoomScope<R extends RoomDefinition = RoomDefinition> = R extends { presence: infer P }
  ? P extends undefined
    ? RoomScopeBase
    : PresenceRoomScope<P>
  : RoomScopeBase;
```

A room scope. When the room definition includes `presence`, the scope is a `PresenceRoomScope`; otherwise it is a `RoomScopeBase`.

### `RoomScopeBase`

```ts
type RoomScopeBase = {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly name: string;
  readonly joined: Promise<void>;
  dispose(): void;
  [Symbol.dispose](): void;
};
```

### `PresenceRoomScope`

```ts
type PresenceRoomScope<T = unknown> = RoomScopeBase & {
  readonly presence: Readable<ReadonlyMap<string, T>>;
  updatePresence(state: T): void;
  onJoin(handler: (memberId: string, state: T) => void): Unsubscribe;
  onLeave(handler: (memberId: string) => void): Unsubscribe;
};
```

| Member | Type | Description |
| --- | --- | --- |
| `presence` | `Readable<ReadonlyMap<string, T>>` | Reactive map of `memberId → state`. |
| `updatePresence(state)` | `(state: T) => void` | Broadcast this client's presence state. Throws `PulseConnectionError` unless open. |
| `onJoin(handler)` | `(handler) => Unsubscribe` | Called whenever a new member joins with their initial state. |
| `onLeave(handler)` | `(handler) => Unsubscribe` | Called whenever a member leaves. |

### `RoomOptions`

```ts
type RoomOptions = {
  signal?: AbortSignal;
  timeout?: number;
};
```

| Option | Type | Description |
| --- | --- | --- |
| `signal` | `AbortSignal` | Aborts the join, rejecting `joined` with `PulseAbortError`. |
| `timeout` | `number` | Join timeout in ms. Rejects `joined` with `PulseRoomTimeoutError`. |

---

## Errors

All errors extend `PulseError`.

### `PulseError`

Base class for all Pulse errors.

### `PulseConnectionError`

Transport failure, send while disconnected, or room join rejected on close.

### `PulseProtocolError`

Malformed frame or server error frame.

### `PulseTimeoutError`

`wait()` timed out before the server event arrived.

### `PulseRoomTimeoutError`

Room scope `joined` timed out before the server confirmed membership.

### `PulseAbortError`

`wait()` or room `joined` aborted via AbortSignal.

### `PulseDisposedError`

Operation attempted after disposal.

---

## Channel and room definitions

### `ChannelDefinition`

```ts
type ChannelDefinition = { client: MessageMap; server: MessageMap };
```

### `ChannelDefinitions`

```ts
type ChannelDefinitions = Record<string, ChannelDefinition>;
```

### `RoomDefinition`

```ts
type RoomDefinition = { presence?: unknown };
```

### `RoomDefinitions`

```ts
type RoomDefinitions = Record<string, RoomDefinition>;
```

---

## Utility types

### `MessageMap`

```ts
type MessageMap = Record<string, unknown>;
```

### `EventKey`

```ts
type EventKey<T extends MessageMap> = keyof T & string;
```

### `ServerEvents`

```ts
type ServerEvents<S extends PulseSchema> = S extends { server: infer M extends MessageMap } ? M : MessageMap;
```

Extract server events from a schema, defaulting to an empty map.

### `ClientEvents`

```ts
type ClientEvents<S extends PulseSchema> = S extends { client: infer M extends MessageMap } ? M : MessageMap;
```

Extract client events from a schema, defaulting to an empty map.

### `RoomMap`

```ts
type RoomMap<S extends PulseSchema> = S extends { rooms: infer R extends RoomDefinitions } ? R : RoomDefinitions;
```

Extract room definitions from a schema, defaulting to an empty map.

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

### `PulseStatus`

```ts
type PulseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';
```
