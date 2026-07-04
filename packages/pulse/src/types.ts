import type { Readable } from '@vielzeug/ripple';

// ─── Utility types ─────────────────────────────────────────────────────────────

/** A read-only view of a Map — callers cannot mutate the entries. */
export type ReadonlyMap<K, V> = Omit<Map<K, V>, 'clear' | 'delete' | 'set'>;

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

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Intercepts outgoing messages. Call `next()` to allow the message to be sent;
 * omit to suppress it.
 */
export type Middleware = (event: string, payload: unknown, next: () => void) => void;

// ─── Buffer ────────────────────────────────────────────────────────────────────

export type BufferOptions = {
  /**
   * Maximum number of outgoing frames to buffer while disconnected.
   * Oldest frames are evicted when the buffer is full. Default: 50.
   */
  maxSize?: number;
};

// ─── Options ───────────────────────────────────────────────────────────────────

export type PulseOptions = {
  /**
   * Buffer outgoing messages while the connection is not open, then flush on
   * reconnect. `true` uses defaults (`maxSize: 50`). `false` disables (default).
   * Dropped messages are discarded with a dev warning when buffering is off.
   */
  buffer?: boolean | BufferOptions;
  /**
   * Heartbeat ping/pong keep-alive.
   * `true` uses defaults. `false` disables. Default: `false`.
   */
  heartbeat?: boolean | HeartbeatOptions;
  /**
   * Defer the initial WebSocket connection until `connect()` is called explicitly.
   * Default: `false` (connects immediately on creation).
   */
  lazy?: boolean;
  /**
   * Middleware functions run on every outgoing `send()`, before the message is
   * written to the socket. Call `next()` to proceed or omit to suppress.
   */
  middleware?: readonly Middleware[];
  /** Called when the connection is closed by either side. */
  onClose?: (code: number, reason: string) => void;
  /**
   * Called on a WebSocket error event. Note: WebSocket errors almost always
   * precede a close event — use `onClose` for recovery logic.
   */
  onError?: (error: Error) => void;
  /**
   * Called with every raw `MessageEvent` before any parsing occurs.
   * Useful for low-level debugging.
   */
  onMessage?: (event: MessageEvent) => void;
  /** Called when the connection is established (or re-established). */
  onOpen?: () => void;
  /**
   * Called at the start of each reconnect attempt.
   * `attempt` is 1-based (1 = first retry).
   */
  onReconnect?: (attempt: number) => void;
  /** Sub-protocols to pass to the WebSocket constructor. */
  protocols?: string | string[];
  /**
   * Auto-reconnect on unexpected close.
   * `true` uses defaults. `false` disables. Default: `false`.
   */
  reconnect?: boolean | ReconnectOptions;
};

// ─── Channel ───────────────────────────────────────────────────────────────────

/**
 * An isolated message namespace multiplexed over the shared WebSocket connection.
 * Obtain one via `pulse.channel(name)`. Multiple calls with the same name return
 * the **same** channel object — dispose it once to fully remove the subscription.
 *
 * @example
 * const notif = pulse.channel<{ alert: string }>('notifications');
 * notif.on('alert', (msg) => console.log(msg));
 * notif.send('alert', 'Hello!');
 */
export type PulseChannel<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Permanently unsubscribes all listeners and prevents future sends. */
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
   * No-op if the pulse connection is not open and buffering is disabled.
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
 * const lobby = pulse.presence<{ name: string; status: string }>('lobby');
 * effect(() => console.log('Online:', [...lobby.state.value.keys()]));
 * lobby.update({ name: 'Alice', status: 'online' });
 */
export type PresenceChannel<T = unknown> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Permanently stops tracking. Sends a leave frame to the server. */
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
   * Calling this also implicitly joins the room if not already joined.
   */
  update(state: T): void;
};

// ─── Main Pulse interface ──────────────────────────────────────────────────────

export type Pulse<TServer extends MessageMap = MessageMap, TClient extends MessageMap = MessageMap> = {
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;

  // ── Channels ───────────────────────────────────────────────────────────────

  /**
   * Return an isolated message namespace over the shared connection.
   * Multiple calls with the same name return the **same** channel object —
   * dispose it once to remove the subscription.
   */
  channel<TChServer extends MessageMap = TServer, TChClient extends MessageMap = TClient>(
    name: string,
  ): PulseChannel<TChServer, TChClient>;

  // ── Connection ─────────────────────────────────────────────────────────────

  /**
   * Explicitly open the connection. Resolves when `'open'` fires.
   * Required when `lazy: true`; otherwise called automatically on creation.
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
   * Return a presence channel that tracks all members' state in a room.
   * Calling `presence()` implicitly joins the room.
   */
  presence<T>(room: string): PresenceChannel<T>;
  /** Reactive set of rooms the client is currently a member of. */
  readonly rooms: Readable<ReadonlySet<string>>;
  /**
   * Send a typed event to the server. If buffering is enabled, the message is
   * queued when the connection is not open and flushed on reconnect.
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
