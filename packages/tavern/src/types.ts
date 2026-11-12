import type { MeshPeer, MeshRtcFactory } from '@vielzeug/mesh';

/** A single guest-forwardable command; throwing rejects the guest with the error's message. */
export type TavernCommand = (args: readonly unknown[]) => void;

/**
 * The host's command table, keyed by name. A guest command is applied only if the table
 * holds it; the same table the host's own UI calls, so remote actions follow exactly the
 * same code path as local ones. Omit the table for a read-only session: guests mirror the
 * subject but every command rejects.
 */
export type TavernCommands = Record<string, TavernCommand>;

/** How the host reads and watches the single subject it is sharing. */
export interface TavernSubject {
  /** Subscribes to local changes of the hosted subject: the re-broadcast trigger. */
  onChanged(listener: () => void): () => void;
  /** Subscribes to the hosted subject's removal: hosting ends when it fires. */
  onRemoved(listener: () => void): () => void;
  /** Reads the snapshot to broadcast; null while the subject is missing. */
  snapshot(): unknown;
}

/** Notable host moments reported through {@link TavernHost.tap}. */
export type TavernHostEvent =
  | { readonly type: 'dispose' }
  | { readonly peer: MeshPeer; readonly type: 'peer-joined' }
  | { readonly peer: MeshPeer; readonly reason?: string; readonly type: 'peer-left' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' };

/** Notable guest moments reported through {@link TavernGuest.tap}. */
export type TavernGuestEvent =
  | { readonly type: 'dispose' }
  | { readonly commandId: string; readonly message: string; readonly type: 'rejected' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' };

export interface TavernHostOptions {
  /** The command table guest actions run through; omit for a read-only session. */
  commands?: TavernCommands;
  /**
   * Hosting ended: the subject was removed or the host was disposed. Fires exactly
   * once. This is a lifecycle transition, not observability: presence, transport
   * warnings, and the peer list all belong to {@link TavernHost.tap} and
   * {@link TavernHost.peers}.
   */
  onEnded?(): void;
  rtc?: MeshRtcFactory;
  /**
   * Serializes a local notice for the wire via {@link TavernHost.relayNotice}; null skips
   * this one. Notices are ephemeral out-of-band UI signals (a toast fired elsewhere, a
   * comment added); the wire shape is yours.
   *
   * **Echo guard**: a tab that both hosts and guests must guard against re-broadcasting a
   * wire-originated notice back to its own guests: {@link TavernGuestOptions.onNotice}
   * emits locally, the host's local subscription picks it up, and without a guard it would
   * loop. The consumer owns this guard because only they know their local event system; one
   * boolean set during `onNotice` and checked in `serializeNotice` is sufficient.
   */
  serializeNotice?(notice: unknown): unknown | null;
  /** The subject being shared: read, watched, and rebroadcast by tavern. */
  subject: TavernSubject;
}

export interface TavernHost {
  /** Consumes a guest's answer code; resolves with the peer once the channel is open. */
  acceptAnswerCode(code: string): Promise<MeshPeer>;
  /** Produces a single-use invitation code, QR-compact when the environment allows. */
  createInvitationCode(): Promise<string>;
  /** `AbortSignal` aborted when hosting ends. */
  readonly disposalSignal: AbortSignal;
  /** Stops hosting: closes every channel and detaches all subscriptions. */
  dispose(): void;
  /** Whether hosting has ended: the subject was removed or `dispose()` ran. */
  readonly disposed: boolean;
  kick(peerId: string): void;
  /** The guests currently connected: read it from a `peer-joined`/`peer-left` tap event. */
  readonly peers: readonly MeshPeer[];
  /** Relays one local notice to every guest; `serializeNotice` decides what crosses.
   *  A notice relayed after hosting ended is dropped, not thrown: it is ephemeral
   *  UI state with no audience left, unlike the control-plane methods, which fail
   *  with `TavernDisposedError` so a leaked handle surfaces. */
  relayNotice(notice: unknown): void;
  /** Subscribes to {@link TavernHostEvent}s. Handler errors are swallowed; the
   *  subscription detaches when `signal` aborts or hosting ends. */
  tap(handler: (event: TavernHostEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
}

export interface TavernGuestOptions<Mounted> {
  /** The invitation code the host produced. */
  invitationCode: string;
  /**
   * Mounts a received snapshot; the mounted value, or null to ignore. Called for every
   * snapshot the host broadcasts. The snapshot arrives as parsed JSON: validate before
   * trusting it.
   */
  mount(snapshot: unknown): Mounted | null;
  /** The guest's display name on the channel. */
  name: string;
  /**
   * The channel ended after joining; the mounted value is passed for unmounting.
   * Lifecycle, not observability: rejections and transport warnings belong to
   * {@link TavernGuest.tap}, and the opening transition is {@link TavernJoinResult.ready}.
   */
  onEnded?(subject: Mounted): void;
  /** Receives a notice the host relayed: re-emit it in the local UI. */
  onNotice?(wire: unknown): void;
  rtc?: MeshRtcFactory;
}

export interface TavernGuest {
  /** `AbortSignal` aborted when the session ends. */
  readonly disposalSignal: AbortSignal;
  /** Leaves the session and drops the channel. */
  dispose(): void;
  /** Whether the session has ended: the channel dropped or `dispose()` ran. */
  readonly disposed: boolean;
  /**
   * Forwards a command to the host's command table. The host rejects a name its table
   * does not hold, and a handler that throws rejects with its message; a successful
   * command needs no separate answer because its effect arrives with the next snapshot.
   * Throws `TavernDisposedError` after the session has ended.
   */
  sendCommand(name: string, args?: readonly unknown[]): void;
  /** Subscribes to {@link TavernGuestEvent}s. Handler errors are swallowed; the
   *  subscription detaches when `signal` aborts or the session ends. */
  tap(handler: (event: TavernGuestEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
}

export interface TavernJoinResult<Mounted> {
  /** The answer code to show back to the host, QR-compact when the environment allows. */
  readonly answerCode: string;
  readonly guest: TavernGuest;
  /**
   * Resolves with the mounted subject once the host's first snapshot arrives and mounts.
   * Rejects with a `TavernError` if the channel fails or drops before that, or with a
   * `TavernDisposedError` if the guest leaves first. The rejection is pre-handled: a
   * consumer who never awaits `ready` never sees an unhandled rejection.
   */
  readonly ready: Promise<Mounted>;
}
