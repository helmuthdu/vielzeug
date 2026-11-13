import { tapper, utf8Bytes } from '@vielzeug/arsenal';
import { toEnvelope } from './_wire';
import { MeshConnectionError, MeshDisposedError, MeshError, MeshPayloadError } from './errors';
import type {
  MeshEvent,
  MeshInbound,
  MeshPeer,
  MeshPeerStatus,
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
  /** Emits the final status-change + dispose events, clears tappers, aborts. */
  markDisposed(): void;
  setStatus(next: MeshStatus): void;
  status: MeshStatus;
  tap(handler: Tapper, options?: { readonly signal?: AbortSignal }): Unsubscribe;
}

export function createNodeCore(): NodeCore {
  const tappers = tapper<MeshEvent>();
  const disposalCtrl = new AbortController();

  const core: NodeCore = {
    disposalCtrl,
    disposed: false,

    emitTap(event) {
      tappers.emit(event);
    },

    ensureLive() {
      if (core.disposed) throw new MeshDisposedError();
    },

    markDisposed() {
      if (core.disposed) return;
      core.disposed = true;
      core.status = 'disposed';
      core.emitTap({ status: 'disposed', type: 'status-change' });
      core.emitTap({ type: 'dispose' });
      tappers.clear();
      disposalCtrl.abort();
    },

    setStatus(next) {
      if (core.disposed || core.status === next) return;
      core.status = next;
      core.emitTap({ status: next, type: 'status-change' });
    },
    status: 'idle',

    tap(handler, options) {
      if (core.disposed) return () => {};
      return tappers.tap(handler, options);
    },
  };

  return core;
}

/**
 * Wires the `signal` option of a node: abort runs the node's full `dispose()`,
 * so pending invitations, live connections, and handlers are released, not
 * just the status flags. A signal that is already aborted disposes immediately.
 */
export function wireDisposalSignal(signal: AbortSignal | undefined, dispose: () => void): void {
  if (!signal) return;
  if (signal.aborted) dispose();
  else signal.addEventListener('abort', dispose, { once: true });
}

// ─── Peers ───────────────────────────────────────────────────────────────────

/** Internal peer record; `publicPeer` exposes live status through getters. */
export interface PeerRecord {
  dc: RTCDataChannelLike | null;
  readonly id: string;
  readonly name: string | undefined;
  pc: RTCPeerConnectionLike | null;
  readonly publicPeer: MeshPeer;
  readonly role: 'host' | 'guest';
  status: MeshPeerStatus;
}

export function createPeerRecord(id: string, name: string | undefined, role: 'host' | 'guest'): PeerRecord {
  const record: PeerRecord = {
    dc: null,
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
  readonly emitTap: (event: MeshEvent) => void;
  readonly maxMessageBytes: number;
}

export interface Messenger {
  clear(): void;
  /** Entry point for `dc` 'message' events. */
  handleInbound(peer: PeerRecord, data: unknown): void;
  on(type: string, handler: InboundHandler): Unsubscribe;
  /** Sends a typed envelope to a peer. Throws `MeshConnectionError`/`MeshPayloadError`. */
  sendTo(peer: PeerRecord, type: string, payload: unknown): void;
}

export function createMessenger(options: MessengerOptions): Messenger {
  const handlers = new Map<string, Set<InboundHandler>>();

  function reject(peerId: string, reason: 'too-large' | 'malformed' | 'unknown-type'): void {
    options.emitTap({ peerId, reason, type: 'message-rejected' });
  }

  return {
    clear() {
      handlers.clear();
    },

    handleInbound(peer, data) {
      const peerId = peer.id;

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
        decoded = JSON.parse(data);
      } catch {
        reject(peerId, 'malformed');
        return;
      }

      const envelope = toEnvelope(decoded);
      if (!envelope) {
        reject(peerId, 'malformed');
        return;
      }

      const set = handlers.get(envelope.t);
      if (!set || set.size === 0) {
        reject(peerId, 'unknown-type');
        return;
      }

      options.emitTap({ bytes, messageType: envelope.t, peerId, type: 'message-received' });
      const message: MeshInbound<unknown> = {
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

      const envelope = { p: payload, t: type, ts: options.clock(), v: 2 as const };
      let text: string;
      try {
        text = JSON.stringify(envelope);
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
  };
}
