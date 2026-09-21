import type { RandomSource } from '@vielzeug/arsenal';
import { utf8Bytes } from './_base64';
import { randomId } from './_random';
import { MessageDedupe, toEnvelope } from './_wire';
import { MeshConnectionError, MeshDisposedError, MeshError, MeshPayloadError } from './errors';
import type {
  MeshEvent,
  MeshInbound,
  MeshPeer,
  MeshStatus,
  RTCDataChannelLike,
  RTCPeerConnectionLike,
  Unsubscribe,
} from './types';

type Tapper = (event: MeshEvent) => void;

/** Shared lifecycle core: status, tappers, disposal. */
export interface NodeCore {
  readonly disposalCtrl: AbortController;
  disposed: boolean;
  emitTap(event: MeshEvent): void;
  ensureLive(): void;
  readonly id: string;
  /** Emits the final status-change + dispose events, clears tappers, aborts. */
  markDisposed(): void;
  setStatus(next: MeshStatus): void;
  status: MeshStatus;
  tap(handler: Tapper, options?: { readonly signal?: AbortSignal }): Unsubscribe;
}

export function createNodeCore(id: string, signal?: AbortSignal): NodeCore {
  const tappers = new Set<Tapper>();
  const disposalCtrl = new AbortController();

  const core: NodeCore = {
    disposalCtrl,
    disposed: false,

    emitTap(event) {
      if (tappers.size === 0) return;
      for (const tapper of tappers) {
        try {
          tapper(event);
        } catch {
          // Observability must not affect mesh behavior.
        }
      }
    },

    ensureLive() {
      if (core.disposed) throw new MeshDisposedError();
    },
    id,

    markDisposed() {
      if (core.disposed) return;
      core.disposed = true;
      core.status = 'disposed';
      core.emitTap({ peerId: null, status: 'disposed', type: 'status-change' });
      core.emitTap({ type: 'dispose' });
      tappers.clear();
      disposalCtrl.abort();
    },

    setStatus(next) {
      if (core.disposed || core.status === next) return;
      core.status = next;
      core.emitTap({ peerId: null, status: next, type: 'status-change' });
    },
    status: 'idle',

    tap(handler, options) {
      if (core.disposed) return () => {};
      tappers.add(handler);

      const detach = () => tappers.delete(handler);
      if (options?.signal) {
        if (options.signal.aborted) {
          detach();
          return () => {};
        }
        const onAbort = () => detach();
        options.signal.addEventListener('abort', onAbort, { once: true });
        return () => {
          detach();
          options.signal?.removeEventListener('abort', onAbort);
        };
      }
      return detach;
    },
  };

  if (signal) {
    if (signal.aborted) {
      core.markDisposed();
    } else {
      signal.addEventListener('abort', () => core.markDisposed(), { once: true });
    }
  }

  return core;
}

// ─── Peers ───────────────────────────────────────────────────────────────────

/** Internal peer record; `publicPeer` exposes live status through getters. */
export interface PeerRecord {
  dc: RTCDataChannelLike | null;
  readonly dedupe: MessageDedupe;
  readonly id: string;
  readonly name: string | undefined;
  pc: RTCPeerConnectionLike | null;
  readonly publicPeer: MeshPeer;
  readonly role: 'host' | 'guest';
  status: MeshStatus;
}

export function createPeerRecord(id: string, name: string | undefined, role: 'host' | 'guest'): PeerRecord {
  const record: PeerRecord = {
    dc: null,
    dedupe: new MessageDedupe(),
    id,
    name,
    pc: null,
    publicPeer: {
      get id() {
        return record.id;
      },
      get name() {
        return record.name;
      },
      get role() {
        return record.role;
      },
      get status() {
        return record.status;
      },
    },
    role,
    status: 'connecting',
  };
  return record;
}

// ─── Messenger ───────────────────────────────────────────────────────────────

type InboundHandler = (message: MeshInbound<unknown>) => void;

export interface MessengerOptions {
  readonly clock: () => number;
  readonly deserialize: (text: string) => unknown;
  readonly emitTap: (event: MeshEvent) => void;
  readonly maxMessageBytes: number;
  readonly peerIdOf: (peer: PeerRecord) => string;
  readonly random?: RandomSource;
  readonly serialize: (value: unknown) => string;
}

export interface Messenger {
  clear(): void;
  /** Entry point for `dc` 'message' events. */
  handleInbound(peer: PeerRecord, data: unknown): void;
  hasListeners(type: string): boolean;
  on(type: string, handler: InboundHandler): Unsubscribe;
  /** Sends a typed envelope to a peer. Throws `MeshConnectionError`/`MeshPayloadError`. */
  sendTo(peer: PeerRecord, type: string, payload: unknown): void;
  /** Serialized-byte size of an outbound message — used by broadcast pre-checks. */
  wireBytes(type: string, payload: unknown): number;
}

export function createMessenger(options: MessengerOptions): Messenger {
  const handlers = new Map<string, Set<InboundHandler>>();

  function reject(peerId: string, reason: 'too-large' | 'duplicate' | 'malformed' | 'unknown-type'): void {
    options.emitTap({ peerId, reason, type: 'message-rejected' });
  }

  return {
    clear() {
      handlers.clear();
    },

    handleInbound(peer, data) {
      const peerId = options.peerIdOf(peer);

      if (typeof data !== 'string') {
        reject(peerId, 'malformed');
        return;
      }

      const bytes = utf8Bytes(data);
      if (bytes > options.maxMessageBytes) {
        reject(peerId, 'too-large');
        return;
      }

      let decoded: unknown;
      try {
        decoded = options.deserialize(data);
      } catch {
        reject(peerId, 'malformed');
        return;
      }

      const envelope = toEnvelope(decoded);
      if (!envelope) {
        reject(peerId, 'malformed');
        return;
      }

      if (!peer.dedupe.check(envelope.id)) {
        reject(peerId, 'duplicate');
        return;
      }

      const set = handlers.get(envelope.t);
      if (!set || set.size === 0) {
        reject(peerId, 'unknown-type');
        return;
      }

      options.emitTap({ bytes, messageType: envelope.t, peerId, type: 'message-received' });
      const message: MeshInbound<unknown> = {
        messageId: envelope.id,
        payload: envelope.p,
        peerId,
        sentAt: envelope.ts,
      };
      for (const handler of set) {
        try {
          handler(message);
        } catch (cause) {
          options.emitTap({ error: new MeshError('Message handler threw', { cause }), type: 'error' });
        }
      }
    },

    hasListeners(type) {
      return (handlers.get(type)?.size ?? 0) > 0;
    },
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler);
      return () => {
        set.delete(handler);
        if (set.size === 0) handlers.delete(type);
      };
    },

    sendTo(peer, type, payload) {
      const dc = peer.dc;
      if (!dc || dc.readyState !== 'open' || peer.status !== 'connected') {
        throw new MeshConnectionError(`Peer "${peer.id}" is not connected`, peer.id);
      }

      const envelope = { id: randomId(options.random), p: payload, t: type, ts: options.clock(), v: 1 as const };
      let text: string;
      try {
        text = options.serialize(envelope);
      } catch (cause) {
        throw new MeshPayloadError(`Failed to serialize message "${type}"`, { cause });
      }

      const bytes = utf8Bytes(text);
      if (bytes > options.maxMessageBytes) {
        throw new MeshPayloadError(`Message "${type}" is ${bytes} bytes (max ${options.maxMessageBytes})`);
      }

      try {
        dc.send(text);
      } catch (cause) {
        throw new MeshConnectionError(`Failed to send message "${type}"`, peer.id, { cause });
      }
      options.emitTap({ bytes, messageType: type, peerId: peer.id, type: 'message-sent' });
    },

    wireBytes(type, payload) {
      const envelope = { id: randomId(options.random), p: payload, t: type, ts: options.clock(), v: 1 as const };
      return utf8Bytes(options.serialize(envelope));
    },
  };
}
