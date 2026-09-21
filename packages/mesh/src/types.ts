import type { RandomSource } from '@vielzeug/arsenal';
import type { MeshError } from './errors';

// ─── Protocol ────────────────────────────────────────────────────────────────

/** Consumer-declared message map: message name → payload type. */
export type MeshMessageMap = Record<string, unknown>;

/** Declares the messages a host and its guests may exchange. */
export interface MeshProtocol {
  /** Messages the host may send to a guest (unicast or broadcast). */
  readonly toGuest: MeshMessageMap;
  /** Messages a guest may send to the host. */
  readonly toHost: MeshMessageMap;
}

// ─── Structural WebRTC subset ────────────────────────────────────────────────

/** Minimal session description shape used by mesh. */
export interface RTCSessionDescriptionLike {
  readonly sdp?: string;
  readonly type?: 'offer' | 'answer' | 'pranswer' | 'rollback';
}

/** Minimal event shape delivered through the generic `addEventListener` signature. */
export interface MeshRtcEvent {
  readonly channel?: RTCDataChannelLike;
  readonly data?: unknown;
}

/** Minimal data channel surface used by mesh. */
export interface RTCDataChannelLike {
  addEventListener(type: 'open' | 'close' | 'error', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: { readonly data: string }) => void): void;
  addEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
  close(): void;
  readonly readyState: string;
  removeEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
  send(data: string): void;
}

/** Minimal peer connection surface used by mesh. */
export interface RTCPeerConnectionLike {
  addEventListener(type: 'datachannel', listener: (event: { readonly channel: RTCDataChannelLike }) => void): void;
  addEventListener(
    type: 'icegatheringstatechange' | 'iceconnectionstatechange' | 'connectionstatechange',
    listener: () => void,
  ): void;
  addEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
  close(): void;
  readonly connectionState: string;
  createAnswer(): Promise<RTCSessionDescriptionLike>;
  createDataChannel(
    label: string,
    init?: { readonly ordered?: boolean; readonly maxRetransmits?: number },
  ): RTCDataChannelLike;
  createOffer(): Promise<RTCSessionDescriptionLike>;
  readonly iceConnectionState: string;
  readonly iceGatheringState: string;
  readonly localDescription: RTCSessionDescriptionLike | null;
  removeEventListener(type: string, listener: (event: MeshRtcEvent) => void): void;
  setLocalDescription(description: RTCSessionDescriptionLike): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionLike): Promise<void>;
}

/**
 * Injection point for WebRTC primitives. Defaults to `globalThis.RTCPeerConnection`;
 * tests and non-browser runtimes inject fakes through the `rtc` option.
 */
export interface MeshRtcFactory {
  createPeerConnection(config: RTCConfiguration): RTCPeerConnectionLike;
}

// ─── Pairing payloads ────────────────────────────────────────────────────────

/** Out-of-band invitation produced by the host and delivered to a guest. */
export interface MeshInvitation {
  /** Expiry instant in epoch milliseconds. */
  readonly expiresAt: number;
  /** Host offer SDP with ICE candidates inlined (non-trickle). */
  readonly sdp: string;
  /** Random 256-bit secret, base64url-encoded. Proves possession of the invitation. */
  readonly secret: string;
  /** Random 128-bit session identifier, base64url-encoded. */
  readonly sessionId: string;
  /** Schema version — currently always 1. */
  readonly v: 1;
}

/** Guest's answer returned to the host out-of-band. */
export interface MeshAnswer {
  readonly peer: { readonly id: string; readonly name?: string };
  /** Proof of invitation possession: HMAC-SHA-256 of the guest SDP keyed by the secret. */
  readonly proof: string;
  /** Guest answer SDP with ICE candidates inlined (non-trickle). */
  readonly sdp: string;
  readonly sessionId: string;
  readonly v: 1;
}

/**
 * Encodes/decodes pairing payloads for out-of-band transport (copy/paste,
 * `navigator.share`, QR). Kept separate from the transport so new encodings
 * can be added without touching connection logic.
 */
export interface MeshCodec {
  decode(text: string): MeshInvitation | MeshAnswer;
  encode(payload: MeshInvitation | MeshAnswer): string;
}

// ─── Options ─────────────────────────────────────────────────────────────────

/** Data-channel configuration, mapped to `RTCDataChannelInit`. */
export interface MeshChannelOptions {
  readonly label?: string;
  readonly maxRetransmits?: number;
  readonly ordered?: boolean;
}

/** Shared options for {@link createMeshHost} and {@link createMeshGuest}. */
export interface MeshOptions {
  /** Data-channel options. Default: `{ ordered: true, label: 'mesh' }`. */
  readonly channel?: MeshChannelOptions;
  /**
   * How long to wait for the data channel to open once pairing is underway.
   * On the guest this includes the time a human needs to carry the answer back
   * to the host, so it is deliberately generous. Default: `60_000`.
   */
  readonly channelOpenTimeoutMs?: number;
  /** Clock for TTLs and message timestamps. Default: `Date.now`. */
  readonly clock?: () => number;
  /** Message deserializer. Default: `JSON.parse`. */
  readonly deserialize?: (text: string) => unknown;
  /**
   * How long to wait for ICE gathering to complete before proceeding with
   * whatever candidates were gathered. Default: `5_000`.
   */
  readonly iceGatheringTimeoutMs?: number;
  /** ICE servers passed through to the peer connection. Default: `[]` (none shipped). */
  readonly iceServers?: readonly RTCIceServer[];
  /**
   * How long an invitation stays valid in milliseconds. The host refuses answers
   * to expired invitations and cleans them up at expiry. Default: `300_000`.
   */
  readonly invitationTtlMs?: number;
  /**
   * Maximum serialized message size in bytes. Outbound messages over the cap
   * throw `MeshPayloadError`; inbound ones are dropped and tapped as
   * `'message-rejected'`. Default: `65_536`.
   */
  readonly maxMessageBytes?: number;
  /** Randomness source for ids and secrets. Default: `crypto.getRandomValues`. */
  readonly random?: RandomSource;
  /** WebRTC factory — the injection point for tests and non-browser runtimes. */
  readonly rtc?: MeshRtcFactory;
  /** Message serializer. Default: `JSON.stringify`. */
  readonly serialize?: (value: unknown) => string;
  /** Disposes the node when aborted. */
  readonly signal?: AbortSignal;
}

/** Public peer information supplied during pairing and approval. */
export interface MeshPeerInfo {
  readonly id: string;
  readonly name?: string;
}

/** Options for {@link createMeshHost}. */
export interface MeshHostOptions extends MeshOptions {
  /**
   * Called after proof verification, before the connection is established.
   * Return `false` to reject the guest with `MeshPairingError`.
   * Default: approve every peer.
   */
  readonly approvePeer?: (peer: MeshPeerInfo) => boolean | Promise<boolean>;
}

/** Options for {@link createMeshGuest}. */
export type MeshGuestOptions = MeshOptions;

// ─── Peers and status ────────────────────────────────────────────────────────

/** Lifecycle state of a mesh node or peer. */
export type MeshStatus = 'idle' | 'pairing' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'disposed';

/** A remote peer as observed by this node. */
export interface MeshPeer extends MeshPeerInfo {
  readonly role: 'host' | 'guest';
  readonly status: MeshStatus;
}

/** Peer lifecycle event delivered to `MeshHost.onPeer` handlers. */
export type MeshPeerEvent =
  | { readonly type: 'joined'; readonly peer: MeshPeer }
  | { readonly type: 'left'; readonly peer: MeshPeer; readonly reason?: string }
  | { readonly type: 'status-change'; readonly peer: MeshPeer };

// ─── Messaging ───────────────────────────────────────────────────────────────

/** A deserialized inbound message with transport metadata. */
export interface MeshInbound<T> {
  readonly messageId: string;
  readonly payload: T;
  readonly peerId: string;
  readonly sentAt: number;
}

/** A function that removes a listener subscription. */
export type Unsubscribe = () => void;

// ─── Events ──────────────────────────────────────────────────────────────────

/**
 * Runtime events emitted by {@link MeshNode.tap}.
 * Subscribe via `node.tap(handler)` — handler errors are swallowed.
 */
export type MeshEvent =
  | { readonly type: 'status-change'; readonly peerId: string | null; readonly status: MeshStatus }
  | { readonly type: 'invitation-created' | 'invitation-expired'; readonly sessionId: string }
  | {
      readonly type: 'peer-approved' | 'peer-rejected' | 'peer-joined' | 'peer-left';
      readonly peerId: string;
      readonly reason?: string;
    }
  | {
      readonly type: 'message-sent' | 'message-received';
      readonly peerId: string;
      readonly messageType: string;
      readonly bytes: number;
    }
  | {
      readonly type: 'message-rejected';
      readonly peerId: string;
      readonly reason: 'too-large' | 'duplicate' | 'malformed' | 'unknown-type';
    }
  | { readonly type: 'ice-state'; readonly peerId: string; readonly state: string }
  | { readonly type: 'security-downgrade'; readonly reason: string }
  | { readonly type: 'error'; readonly error: MeshError }
  | { readonly type: 'dispose' };

// ─── Node surfaces ───────────────────────────────────────────────────────────

/** Shared lifecycle and observability surface of host and guest nodes. */
export interface MeshNode {
  /** `AbortSignal` aborted when `dispose()` is called. */
  readonly disposalSignal: AbortSignal;
  /** Permanently closes every peer connection and releases all resources. Idempotent. */
  dispose(): void;
  /** Whether the node has been permanently disposed. */
  readonly disposed: boolean;
  /** This node's peer id. */
  readonly id: string;
  /** Current node status. */
  readonly status: MeshStatus;
  /**
   * Observe runtime events without affecting mesh behavior.
   * Handler errors are swallowed. Returns an unsubscribe function.
   */
  tap(handler: (event: MeshEvent) => void, options?: { readonly signal?: AbortSignal }): Unsubscribe;
  /** Delegates to `dispose()`. Enables `using` declarations. */
  [Symbol.dispose](): void;
}

/**
 * Host-authoritative session node. One peer connection per guest; the host
 * pairs each guest through a manual invitation/answer exchange.
 */
export interface MeshHost<P extends MeshProtocol> extends MeshNode {
  /**
   * Consume a guest's answer. Resolves with the peer once the data channel is
   * open; rejects with `MeshPairingError` on unknown/expired/duplicate sessions,
   * proof mismatch, or `approvePeer` refusal, and `MeshTimeoutError` when the
   * channel does not open in time.
   */
  acceptAnswer(answer: MeshAnswer): Promise<MeshPeer>;
  /** Send a typed message to every connected peer except `options.except`. */
  broadcast<K extends keyof P['toGuest'] & string>(
    type: K,
    payload: P['toGuest'][K],
    options?: { readonly except?: readonly string[] },
  ): void;
  /**
   * Create a single-use invitation for one prospective guest. Deliver the
   * encoded invitation out-of-band (copy/paste, `navigator.share`, QR).
   * May be called repeatedly — one invitation per guest.
   */
  createInvitation(meta?: { readonly name?: string }): Promise<MeshInvitation>;
  /** Disconnect a peer. The guest observes `disconnected`. */
  kick(peerId: string, reason?: string): void;
  /** Subscribe to a typed inbound message from any guest. */
  on<K extends keyof P['toHost'] & string>(
    type: K,
    handler: (message: MeshInbound<P['toHost'][K]>) => void,
  ): Unsubscribe;
  /** Subscribe to peer lifecycle events. */
  onPeer(handler: (event: MeshPeerEvent) => void): Unsubscribe;
  /** Live peers keyed by peer id. */
  readonly peers: ReadonlyMap<string, MeshPeer>;
  /** Send a typed message to one peer. Throws `MeshConnectionError` if unconnected. */
  send<K extends keyof P['toGuest'] & string>(peerId: string, type: K, payload: P['toGuest'][K]): void;
}

/** Guest session node connected to a single host. */
export interface MeshGuest<P extends MeshProtocol> extends MeshNode {
  /**
   * Consume a host invitation and produce the answer to return out-of-band.
   * The data channel opens after the host accepts the answer; watch
   * `status`/`tap` for the transition to `'connected'`.
   */
  acceptInvitation(invitation: MeshInvitation, meta?: { readonly name?: string }): Promise<MeshAnswer>;
  /** The host peer, once pairing has started. `null` before `acceptInvitation`. */
  readonly host: MeshPeer | null;
  /** Subscribe to a typed inbound message from the host. */
  on<K extends keyof P['toGuest'] & string>(
    type: K,
    handler: (message: MeshInbound<P['toGuest'][K]>) => void,
  ): Unsubscribe;
  /** Send a typed message to the host. Throws `MeshConnectionError` if unconnected. */
  send<K extends keyof P['toHost'] & string>(type: K, payload: P['toHost'][K]): void;
}
