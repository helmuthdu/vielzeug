import type { Readable } from '@vielzeug/ripple';

// ─── Core map types ────────────────────────────────────────────────────────────

/** A map of event name → payload type. Use as the generic parameter for Pulse. */
export type MessageMap = Record<string, unknown>;

/** Extract valid event keys from a MessageMap. */
export type EventKey<T extends MessageMap> = keyof T & string;

/** A function that removes a listener subscription. */
export type Unsubscribe = () => void;

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

/** An outgoing application message before it is serialized. Return `null` to drop it. */
export type OutgoingMessage = { channel?: string; event: string; payload: unknown };

/** Transform or filter outgoing application messages. Internal protocol frames bypass this hook. */
export type OutgoingTransform = (message: Readonly<OutgoingMessage>) => OutgoingMessage | null;

/** Server and client event maps for one named channel. */
export type ChannelDefinition = { client: MessageMap; server: MessageMap };

/** Named channel schemas supplied when creating Pulse. */
export type ChannelDefinitions = Record<string, ChannelDefinition>;

/** Named presence-state schemas supplied when creating Pulse. */
export type PresenceDefinitions = Record<string, unknown>;

// ─── Options ───────────────────────────────────────────────────────────────────

export type PulseOptions = {
  /**
   * Heartbeat ping/pong keep-alive.
   * `true` uses defaults. `false` disables. Default: `false`.
   */
  heartbeat?: boolean | HeartbeatOptions;
  /** Receives typed transport and protocol failures. */
  onError?: (error: import('./errors').PulseError) => void;
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

// ─── Channel ───────────────────────────────────────────────────────────────────

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

// ─── Presence ──────────────────────────────────────────────────────────────────

/**
 * A reactive presence channel that tracks members' state in a room.
 * Obtain one via `pulse.presence(room)`.
 *
 * @example
 * const lobby = pulse.presence('lobby');
 * effect(() => console.log('Online:', [...lobby.state.value.keys()]));
 * lobby.update({ name: 'Alice', status: 'online' });
 */
export type PresenceChannel<T = unknown> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Releases this scope's listeners and room reference. */
  dispose(): void;
  /** Whether this presence channel has been disposed. */
  readonly disposed: boolean;
  /**
   * Register a handler called whenever a new member joins with their initial state.
   * Returns an unsubscribe function.
   */
  onJoin(handler: (memberId: string, state: T) => void): Unsubscribe;
  /**
   * Register a handler called whenever a member leaves.
   * Returns an unsubscribe function.
   */
  onLeave(handler: (memberId: string) => void): Unsubscribe;
  /** Room name passed to `pulse.presence()`. */
  readonly room: string;
  /** Reactive map of `memberId → state`. Updates whenever any member joins, leaves, or updates. */
  readonly state: Readable<ReadonlyMap<string, T>>;
  /**
   * Broadcast this client's presence state to all room members.
   * Throws `PulseConnectionError` unless the connection is open.
   */
  update(state: T): void;
};

// ─── Main Pulse interface ──────────────────────────────────────────────────────

export type Pulse<
  TServer extends MessageMap = MessageMap,
  TClient extends MessageMap = MessageMap,
  TChannels extends ChannelDefinitions = ChannelDefinitions,
  TPresence extends PresenceDefinitions = PresenceDefinitions,
> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;

  // ── Channels ───────────────────────────────────────────────────────────────

  /**
   * Create an isolated message namespace over the shared connection.
   * Each call returns an independently disposable scope. The server subscription
   * remains active until every scope for this name is disposed.
   */
  channel<K extends keyof TChannels & string>(name: K): PulseChannel<TChannels[K]['server'], TChannels[K]['client']>;

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

  // ── Rooms ──────────────────────────────────────────────────────────────────

  /**
   * Request to join a room. Resolves when the server confirms with a `joined` frame.
   * Rejects if the pulse is disposed, the signal aborts, or the timeout elapses.
   */
  join(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>;
  /**
   * Request to leave a room. Resolves when the server confirms with a `left` frame.
   * Rejects if the pulse is disposed, the signal aborts, or the timeout elapses.
   */
  leave(room: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<void>;

  // ── Messaging ──────────────────────────────────────────────────────────────

  /**
   * Subscribe to a typed server event. Returns an unsubscribe function.
   * The same handler can be registered multiple times independently.
   */
  on<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;
  /** Subscribe once — auto-removes after first invocation. */
  once<K extends EventKey<TServer>>(event: K, handler: (payload: TServer[K]) => void): Unsubscribe;

  // ── Presence ───────────────────────────────────────────────────────────────

  /**
   * Create a presence scope that tracks all members' state in a room.
   * Each call returns an independently disposable scope. The room remains joined
   * until every scope for this name is disposed.
   */
  presence<K extends keyof TPresence & string>(room: K): PresenceChannel<TPresence[K]>;
  /** Reactive set of rooms the client is currently a member of. */
  readonly rooms: Readable<ReadonlySet<string>>;
  /**
   * Send a typed event to the server.
   * Throws `PulseConnectionError` unless the connection is open.
   */
  send<K extends EventKey<TClient>>(event: K, payload: TClient[K]): void;
  /** Reactive connection status. */
  readonly status: Readable<PulseStatus>;
  /**
   * Resolve on the next emission of the given server event.
   * Rejects when `opts.signal` aborts or the instance is disposed.
   */
  wait<K extends EventKey<TServer>>(event: K, opts?: { signal?: AbortSignal; timeout?: number }): Promise<TServer[K]>;
};
