import type { Readable } from '@vielzeug/ripple';
import type { PulseError } from './errors';

// ─── Core map types ────────────────────────────────────────────────────────────

/** A map of event name → payload type. */
export type MessageMap = Record<string, unknown>;

/** Extract valid event keys from a MessageMap. */
export type EventKey<T extends MessageMap> = keyof T & string;

/** A function that removes a listener subscription. */
export type Unsubscribe = () => void;

// ─── Schema ────────────────────────────────────────────────────────────────────

/**
 * Declare server events, client events, channel schemas, and room schemas once
 * at construction. All named scopes infer their types from this schema.
 */
export type PulseSchema = {
  /** Root events the server sends to the client. */
  server?: MessageMap;
  /** Root events the client sends to the server. */
  client?: MessageMap;
  /** Named channel schemas. */
  channels?: ChannelDefinitions;
  /** Named room schemas with optional presence state. */
  rooms?: RoomDefinitions;
};

/** Extract server events from a schema, defaulting to an empty map. */
export type ServerEvents<S extends PulseSchema> = S extends { server: infer M extends MessageMap } ? M : MessageMap;

/** Extract client events from a schema, defaulting to an empty map. */
export type ClientEvents<S extends PulseSchema> = S extends { client: infer M extends MessageMap } ? M : MessageMap;

/** Extract channel definitions from a schema, defaulting to an empty map. */
export type ChannelMap<S extends PulseSchema> = S extends { channels: infer C extends ChannelDefinitions }
  ? C
  : ChannelDefinitions;

/** Extract room definitions from a schema, defaulting to an empty map. */
export type RoomMap<S extends PulseSchema> = S extends { rooms: infer R extends RoomDefinitions } ? R : RoomDefinitions;

// ─── Connection status ─────────────────────────────────────────────────────────

/** Lifecycle state of a Pulse connection. */
export type PulseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

// ─── Reconnection ──────────────────────────────────────────────────────────────

export type ReconnectOptions = {
  /**
   * Delay strategy between reconnect attempts (ms).
   * - number: fixed delay
   * - function: `attempt` is zero-based (0 = waiting before 2nd try).
   * Defaults to full-jitter exponential backoff capped at 30 s.
   */
  delay?: number | ((attempt: number) => number);
  /** Maximum number of reconnect attempts after initial failure. Default: 5. */
  maxAttempts?: number;
};

// ─── Heartbeat ─────────────────────────────────────────────────────────────────

export type HeartbeatOptions = {
  /** Interval between pings in ms. Default: 30_000. */
  interval?: number;
  /** How long to wait for a pong before treating the connection as dead. Default: 5_000. */
  timeout?: number;
};

// ─── Transform ─────────────────────────────────────────────────────────────────

/** An outgoing application message before it is serialized. Return `null` to drop it. */
export type OutgoingMessage = { channel?: string; event: string; payload: unknown };

/** Transform or filter outgoing application messages. Internal protocol frames bypass this hook. */
export type OutgoingTransform = (message: Readonly<OutgoingMessage>) => OutgoingMessage | null;

// ─── Channels ──────────────────────────────────────────────────────────────────

/** Server and client event maps for one named channel. */
export type ChannelDefinition = { client: MessageMap; server: MessageMap };

/** Named channel schemas supplied when creating Pulse. */
export type ChannelDefinitions = Record<string, ChannelDefinition>;

// ─── Rooms ─────────────────────────────────────────────────────────────────────

/** A room definition with optional presence state type. */
export type RoomDefinition = { presence?: unknown };

/** Named room schemas supplied when creating Pulse. */
export type RoomDefinitions = Record<string, RoomDefinition>;

/** Options for creating a room scope. */
export type RoomOptions = { signal?: AbortSignal; timeout?: number };

// ─── Options ───────────────────────────────────────────────────────────────────

export type PulseOptions = {
  /**
   * Heartbeat ping/pong keep-alive.
   * `true` uses defaults. `false` disables. Default: `false`.
   */
  heartbeat?: boolean | HeartbeatOptions;
  /** Receives typed transport and protocol failures. */
  onError?: (error: PulseError) => void;
  /** Sub-protocols to pass to the WebSocket constructor. */
  protocols?: string | string[];
  /**
   * Auto-reconnect on unexpected close.
   * `true` uses defaults. `false` disables. Default: `false`.
   */
  reconnect?: boolean | ReconnectOptions;
  /** Transform or filter application messages before serialization. */
  transform?: OutgoingTransform;
};

// ─── Channel scope ─────────────────────────────────────────────────────────────

/**
 * An isolated message namespace multiplexed over the shared WebSocket connection.
 * Obtain one via `pulse.channel(name)`. Each call returns an independent scope;
 * the server subscription remains active until every scope is disposed.
 *
 * @example
 * const notif = pulse.channel('notifications');
 * notif.on('alert', (msg) => console.log(msg));
 * notif.send('alert', 'Hello!');
 */
export type PulseChannel<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Releases this scope's listeners and subscription reference. */
  dispose(): void;
  /** Whether this channel has been disposed. */
  readonly disposed: boolean;
  /** Channel name passed to `pulse.channel()`. */
  readonly name: string;
  /**
   * Subscribe to a server event scoped to this channel.
   * Returns an unsubscribe function. The handler is auto-removed on `dispose()`.
   */
  on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  /** Subscribe once — auto-removes after first invocation. */
  once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  /**
   * Send a typed message to the server, scoped to this channel.
   * Throws `PulseConnectionError` unless the connection is open.
   */
  send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void;
  /**
   * Resolve on the next emission of the given server event.
   * Rejects when the signal aborts, the timeout elapses, or the channel is disposed.
   */
  wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>;
};

// ─── Room scope ────────────────────────────────────────────────────────────────

/** Base room scope: ref-counted server membership with explicit disposal. */
export type RoomScopeBase = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Releases this scope's room reference and listeners. */
  dispose(): void;
  /** Whether this room scope has been disposed. */
  readonly disposed: boolean;
  /** Room name passed to `pulse.room()`. */
  readonly name: string;
  /**
   * Resolves when the server confirms membership with a `joined` frame.
   * Rejects on transport close, timeout, abort, or disposal.
   * For post-reconnect membership, read `pulse.rooms` instead.
   */
  readonly joined: Promise<void>;
};

/** Room scope with reactive presence state tracking. */
export type PresenceRoomScope<T = unknown> = RoomScopeBase & {
  /** Reactive map of `memberId → state`. Updates whenever any member joins, leaves, or updates. */
  readonly presence: Readable<ReadonlyMap<string, T>>;
  /**
   * Broadcast this client's presence state to all room members.
   * Throws `PulseConnectionError` unless the connection is open.
   */
  updatePresence(state: T): void;
  /** Register a handler called whenever a new member joins with their initial state. */
  onJoin(handler: (memberId: string, state: T) => void): Unsubscribe;
  /** Register a handler called whenever a member leaves. */
  onLeave(handler: (memberId: string) => void): Unsubscribe;
};

/**
 * A room scope. When the room definition includes `presence`, the scope
 * exposes reactive presence state, join/leave handlers, and `updatePresence()`.
 * Otherwise it is a plain ref-counted room membership.
 */
export type RoomScope<R extends RoomDefinition = RoomDefinition> = R extends { presence: infer P }
  ? P extends undefined
    ? RoomScopeBase
    : PresenceRoomScope<P>
  : RoomScopeBase;

// ─── Main Pulse interface ──────────────────────────────────────────────────────

export type Pulse<S extends PulseSchema = PulseSchema> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;

  // ── Channels ───────────────────────────────────────────────────────────────

  /**
   * Create an isolated message namespace over the shared connection.
   * Each call returns an independently disposable scope. The server subscription
   * remains active until every scope for this name is disposed.
   */
  channel<K extends keyof ChannelMap<S> & string>(
    name: K,
  ): PulseChannel<ChannelMap<S>[K]['server'], ChannelMap<S>[K]['client']>;

  // ── Connection ─────────────────────────────────────────────────────────────

  /**
   * Explicitly open the connection. Resolves after session restoration completes.
   * Rejects if the connection closes before opening.
   */
  connect(): Promise<void>;
  /**
   * Close the connection without triggering reconnection.
   * @param code WebSocket close code (default: 1000).
   * @param reason Human-readable close reason string.
   */
  disconnect(code?: number, reason?: string): void;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Permanently closes the connection and releases all resources. Idempotent. */
  dispose(): void;
  /** Whether the instance has been permanently disposed. */
  readonly disposed: boolean;

  // ── Messaging ──────────────────────────────────────────────────────────────

  /**
   * Subscribe to a typed server event. Returns an unsubscribe function.
   * The same handler can be registered multiple times independently.
   */
  on<K extends EventKey<ServerEvents<S>>>(event: K, handler: (payload: ServerEvents<S>[K]) => void): Unsubscribe;
  /** Subscribe once — auto-removes after first invocation. */
  once<K extends EventKey<ServerEvents<S>>>(event: K, handler: (payload: ServerEvents<S>[K]) => void): Unsubscribe;

  // ── Rooms ──────────────────────────────────────────────────────────────────

  /**
   * Create a ref-counted room scope. The first scope for a room sends a `join`
   * frame; the last disposal sends a `leave` frame. When the room definition
   * includes `presence`, the scope exposes reactive presence state.
   */
  room<K extends keyof RoomMap<S> & string>(name: K, opts?: RoomOptions): RoomScope<RoomMap<S>[K]>;

  /** Reactive set of rooms the client is currently a confirmed member of. */
  readonly rooms: Readable<ReadonlySet<string>>;

  /**
   * Send a typed event to the server.
   * Throws `PulseConnectionError` unless the connection is open.
   */
  send<K extends EventKey<ClientEvents<S>>>(event: K, payload: ClientEvents<S>[K]): void;
  /** Reactive connection status. */
  readonly status: Readable<PulseStatus>;
  /**
   * Resolve on the next emission of the given server event.
   * Rejects when `opts.signal` aborts or the instance is disposed.
   */
  wait<K extends EventKey<ServerEvents<S>>>(
    event: K,
    opts?: { signal?: AbortSignal; timeout?: number },
  ): Promise<ServerEvents<S>[K]>;
};
