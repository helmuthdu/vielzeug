---
title: Pulse — API Reference
description: Complete API reference for @vielzeug/pulse.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createPulse()` | Creates an explicitly connected WebSocket session | Sync | Call `connect()` before sends |
| `Pulse` | Root session API | Sync / Async | Named schemas are fixed at construction |
| `PulseChannel` | Disposable channel listener scope | Sync / Async | Each call is a distinct scope |
| `PresenceChannel` | Disposable reactive presence scope | Sync | `update()` requires an open connection |
| `OutgoingTransform` | Transforms or filters application messages | Sync | Return `null` to filter |
| `PulseError` types | Typed transport and protocol failures | Sync | Handle rejected promises as well as `onError` |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/pulse` | All public values, errors, and types |

## Core Functions

### `createPulse()`

```ts
createPulse<
  TServer extends MessageMap = MessageMap,
  TClient extends MessageMap = MessageMap,
  TChannels extends ChannelDefinitions = ChannelDefinitions,
  TPresence extends PresenceDefinitions = PresenceDefinitions,
>(url: string, options?: PulseOptions): Pulse<TServer, TClient, TChannels, TPresence>
```

Creates a closed session. `connect()` opens the socket and restores active session state.

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | `string` | WebSocket URL |
| `options` | `PulseOptions` | Transport, error, reconnect, heartbeat, and transform configuration |

**Returns:** `Pulse<TServer, TClient, TChannels, TPresence>`

```ts
import { createPulse } from '@vielzeug/pulse';

type ServerEvents = { notice: string };
type ClientEvents = { acknowledge: { id: string } };

const pulse = createPulse<ServerEvents, ClientEvents>('wss://api.example.com/ws');
await pulse.connect();
```

## Session API

| Member | Returns | Contract |
| --- | --- | --- |
| `connect()` | `Promise<void>` | Opens transport and restores session state |
| `disconnect(code?, reason?)` | `void` | Cancels retry and closes transport |
| `send(event, payload)` | `void` | Throws `PulseConnectionError` unless open |
| `on()` / `once()` / `wait()` | `Unsubscribe` / `Promise` | Root server-event subscriptions |
| `channel(name)` | `PulseChannel` | Creates a schema-bound disposable scope |
| `join()` / `leave()` | `Promise<void>` | Require an open connection and server confirmation |
| `presence(room)` | `PresenceChannel` | Creates a schema-bound reference-counted room scope |
| `status` / `rooms` | `Readable` | Transport state and server-confirmed room membership |
| `dispose()` | `void` | Releases the whole session |

### `pulse.channel()`

```ts
channel<K extends keyof TChannels & string>(name: K): PulseChannel<TChannels[K]['server'], TChannels[K]['client']>
```

Each call creates a separate scope. Pulse sends `subscribe` for the first active scope and `unsubscribe` after the last is disposed.

### `pulse.presence()`

```ts
presence<K extends keyof TPresence & string>(room: K): PresenceChannel<TPresence[K]>
```

Each call creates a separate presence scope. Pulse keeps the room joined while at least one scope remains.

### `pulse.send()`

```ts
send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void
```

Sends a root application message. Throws `PulseConnectionError` unless the socket is open.

### `pulse.wait()`

```ts
wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>
```

Resolves with the next matching event. Rejects with `PulseAbortError` or `PulseTimeoutError`.

### `pulse.join()` and `pulse.leave()`

```ts
join(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>
leave(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>
```

Both methods require an open transport and resolve only after the matching server confirmation. Opposing in-flight requests are serialized, so the final confirmed state follows the last request.

| Parameter | Type | Description |
| --- | --- | --- |
| `room` | `string` | Server room identifier |
| `opts.signal` | `AbortSignal` | Cancels the caller's wait; Pulse reconciles any request already sent |
| `opts.timeout` | `number` | Maximum confirmation wait in milliseconds |

**Returns:** A promise that rejects with `PulseConnectionError`, `PulseAbortError`, `PulseTimeoutError`, or `PulseDisposedError` when applicable.

### `pulse.disconnect()`

```ts
disconnect(code?: number, reason?: string): void
```

Closes the current session, cancels scheduled reconnects, and clears confirmed remote room and presence state immediately. Calling `connect()` afterward starts a new session from the retained desired scopes.

## Scoped Handles

`PulseChannel` and `PresenceChannel` are independently disposable. Disposing one scope removes only that scope's listeners and ownership reference.

## Types

```ts
import type { Readable } from '@vielzeug/ripple';

type MessageMap = Record<string, unknown>;
type EventKey<T extends MessageMap> = keyof T & string;
type Unsubscribe = () => void;
type PulseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

type ChannelDefinition = { client: MessageMap; server: MessageMap };
type ChannelDefinitions = Record<string, ChannelDefinition>;
type PresenceDefinitions = Record<string, unknown>;

type OutgoingMessage = { channel?: string; event: string; payload: unknown };
type OutgoingTransform = (message: Readonly<OutgoingMessage>) => OutgoingMessage | null;

type ReconnectOptions = {
  delay?: number | ((attempt: number) => number);
  maxAttempts?: number;
};

type HeartbeatOptions = { interval?: number; timeout?: number };

type PulseOptions = {
  heartbeat?: boolean | HeartbeatOptions;
  onError?: (error: PulseError) => void;
  protocols?: string | string[];
  reconnect?: boolean | ReconnectOptions;
  transform?: OutgoingTransform;
};
```

```ts
type PulseChannel<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly name: string;
  on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void;
  wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>;
};

type PresenceChannel<T = unknown> = {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  onJoin(handler: (memberId: string, state: T) => void): Unsubscribe;
  onLeave(handler: (memberId: string) => void): Unsubscribe;
  readonly room: string;
  readonly state: Readable<ReadonlyMap<string, T>>;
  update(state: T): void;
};
```

```ts
type Pulse<
  TServer extends MessageMap = MessageMap,
  TClient extends MessageMap = MessageMap,
  TChannels extends ChannelDefinitions = ChannelDefinitions,
  TPresence extends PresenceDefinitions = PresenceDefinitions,
> = {
  [Symbol.dispose](): void;
  channel<K extends keyof TChannels & string>(name: K): PulseChannel<TChannels[K]['server'], TChannels[K]['client']>;
  connect(): Promise<void>;
  disconnect(code?: number, reason?: string): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  join(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>;
  leave(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>;
  on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  presence<K extends keyof TPresence & string>(room: K): PresenceChannel<TPresence[K]>;
  readonly rooms: Readable<ReadonlySet<string>>;
  send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void;
  readonly status: Readable<PulseStatus>;
  wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>;
};
```

## Errors

| Class | Triggers | Notable properties |
| --- | --- | --- |
| `PulseError` | Base class for every Pulse error | `PulseError.is(error)` |
| `PulseConnectionError` | Send before open, transport error, or exhausted reconnect | `url` |
| `PulseTimeoutError` | A `wait()`, `join()`, or `leave()` timeout | `event` |
| `PulseAbortError` | An abort signal cancels `wait()`, `join()`, or `leave()` | — |
| `PulseDisposedError` | An operation targets a disposed scope or session | — |
| `PulseProtocolError` | A malformed, unknown, server-error, or failed handler frame | `raw` |
