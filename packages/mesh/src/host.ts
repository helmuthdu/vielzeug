import { bytesToBase64Url } from './_base64';
import { createMessenger, createNodeCore, createPeerRecord, type PeerRecord } from './_node';
import { createProof } from './_proof';
import { randomBytes, randomId } from './_random';
import { nativeRtcFactory, normalizeSdp, waitChannelOpen, waitIceGathering } from './_rtc';
import { MeshConnectionError, MeshDisposedError, MeshPairingError } from './errors';
import type {
  MeshHost,
  MeshHostOptions,
  MeshInbound,
  MeshPeer,
  MeshPeerEvent,
  MeshProtocol,
  MeshStatus,
  RTCDataChannelLike,
  RTCPeerConnectionLike,
} from './types';

interface PendingInvitation {
  answered: boolean;
  readonly dc: RTCDataChannelLike;
  readonly expiresAt: number;
  readonly expiryTimer: ReturnType<typeof setTimeout>;
  readonly pc: RTCPeerConnectionLike;
  readonly secret: string;
  readonly sessionId: string;
}

const DEFAULT_MAX_MESSAGE_BYTES = 65_536;
const DEFAULT_INVITATION_TTL_MS = 300_000;
const DEFAULT_CHANNEL_OPEN_TIMEOUT_MS = 60_000;
const DEFAULT_ICE_GATHERING_TIMEOUT_MS = 5_000;

/**
 * Create a host-authoritative mesh node. The host holds one peer connection
 * per guest and pairs each one through a manual invitation/answer exchange.
 */
export function createMeshHost<P extends MeshProtocol>(options: MeshHostOptions = {}): MeshHost<P> {
  const rtc = options.rtc ?? nativeRtcFactory;
  const clock = options.clock ?? (() => Date.now());
  const serialize = options.serialize ?? JSON.stringify;
  const deserialize = options.deserialize ?? JSON.parse;
  const maxMessageBytes = options.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES;
  const invitationTtlMs = options.invitationTtlMs ?? DEFAULT_INVITATION_TTL_MS;
  const channelOpenTimeoutMs = options.channelOpenTimeoutMs ?? DEFAULT_CHANNEL_OPEN_TIMEOUT_MS;
  const iceGatheringTimeoutMs = options.iceGatheringTimeoutMs ?? DEFAULT_ICE_GATHERING_TIMEOUT_MS;
  const channelInit = { label: 'mesh', ordered: true, ...options.channel };

  const core = createNodeCore(randomId(options.random), options.signal);
  const messenger = createMessenger({
    clock,
    deserialize,
    emitTap: core.emitTap,
    maxMessageBytes,
    peerIdOf: (peer) => peer.id,
    random: options.random,
    serialize,
  });

  const peers = new Map<string, PeerRecord>();
  const pending = new Map<string, PendingInvitation>();
  const expired = new Set<string>();
  const peerListeners = new Set<(event: MeshPeerEvent) => void>();

  let sawPeer = false;
  let sawFailure = false;
  let downgradeNotified = false;

  function emitPeer(event: MeshPeerEvent): void {
    for (const listener of peerListeners) {
      try {
        listener(event);
      } catch (cause) {
        core.emitTap({ error: new MeshConnectionError('Peer listener threw', null, { cause }), type: 'error' });
      }
    }
  }

  function recomputeStatus(): void {
    let next: MeshStatus = pending.size > 0 ? 'pairing' : sawPeer ? 'disconnected' : sawFailure ? 'failed' : 'idle';
    for (const peer of peers.values()) {
      if (peer.status === 'connected') {
        next = 'connected';
        break;
      }
      if (peer.status === 'connecting') next = 'connecting';
    }
    core.setStatus(next);
  }

  function onSecurityDowngrade(): void {
    if (downgradeNotified) return;
    downgradeNotified = true;
    core.emitTap({
      reason: 'SubtleCrypto unavailable — proof uses a non-cryptographic hash',
      type: 'security-downgrade',
    });
  }

  function expireInvitation(sessionId: string): void {
    const invitation = pending.get(sessionId);
    if (!invitation) return;
    pending.delete(sessionId);
    expired.add(sessionId);
    clearTimeout(invitation.expiryTimer);
    invitation.pc.close();
    core.emitTap({ sessionId, type: 'invitation-expired' });
    recomputeStatus();
  }

  function setPeerStatus(peer: PeerRecord, status: PeerRecord['status']): void {
    if (peer.status === status) return;
    peer.status = status;
    core.emitTap({ peerId: peer.id, status, type: 'status-change' });
    emitPeer({ peer: peer.publicPeer, type: 'status-change' });
    recomputeStatus();
  }

  function leavePeer(peer: PeerRecord, reason: string | undefined, failed = false): void {
    if (!peers.has(peer.id)) return;
    peers.delete(peer.id);
    peer.status = failed ? 'failed' : 'disconnected';
    peer.pc?.close();
    peer.dc?.close();
    core.emitTap({ peerId: peer.id, status: peer.status, type: 'status-change' });
    core.emitTap({ peerId: peer.id, reason, type: 'peer-left' });
    emitPeer({ peer: peer.publicPeer, reason, type: 'left' });
    if (!failed) sawPeer = true;
    sawFailure = sawFailure || failed;
    recomputeStatus();
  }

  function wirePeerTransport(peer: PeerRecord, pc: RTCPeerConnectionLike, dc: RTCDataChannelLike): void {
    peer.pc = pc;
    peer.dc = dc;

    dc.addEventListener('message', (event) => {
      if (core.disposed) return;
      messenger.handleInbound(peer, event.data);
    });
    dc.addEventListener('close', () => {
      if (core.disposed) return;
      leavePeer(peer, 'channel closed');
    });
    dc.addEventListener('error', () => {
      if (core.disposed) return;
      leavePeer(peer, 'channel error', true);
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      if (core.disposed) return;
      const state = pc.iceConnectionState;
      core.emitTap({ peerId: peer.id, state, type: 'ice-state' });
      if (state === 'failed' || state === 'closed') {
        leavePeer(peer, `ice ${state}`, state === 'failed');
      } else if (state === 'disconnected' && peer.status === 'connected') {
        setPeerStatus(peer, 'disconnected');
      }
    });
  }

  function markPeerConnected(peer: PeerRecord): void {
    sawPeer = true;
    peers.set(peer.id, peer);
    setPeerStatus(peer, 'connected');
    core.emitTap({ peerId: peer.id, type: 'peer-joined' });
    emitPeer({ peer: peer.publicPeer, type: 'joined' });
  }

  const host: MeshHost<P> = {
    async acceptAnswer(answer) {
      core.ensureLive();

      if (answer?.v !== 1) throw new MeshPairingError('Unsupported answer version');
      const invitation = pending.get(answer.sessionId);
      if (!invitation) {
        throw new MeshPairingError(
          expired.has(answer.sessionId) ? 'Invitation expired' : `Unknown session "${answer.sessionId}"`,
        );
      }
      if (invitation.answered) throw new MeshPairingError('Invitation already answered');
      if (clock() >= invitation.expiresAt) {
        expireInvitation(answer.sessionId);
        throw new MeshPairingError('Invitation expired');
      }

      const expected = await createProof(invitation.secret, answer.sdp, onSecurityDowngrade);
      if (answer.proof !== expected) throw new MeshPairingError('Proof mismatch');

      const approved = (await options.approvePeer?.(answer.peer)) ?? true;
      if (!approved) {
        core.emitTap({ peerId: answer.peer.id, type: 'peer-rejected' });
        throw new MeshPairingError(`Peer "${answer.peer.id}" rejected by host`);
      }
      core.emitTap({ peerId: answer.peer.id, type: 'peer-approved' });

      invitation.answered = true;
      pending.delete(answer.sessionId);
      clearTimeout(invitation.expiryTimer);

      const peer = createPeerRecord(answer.peer.id, answer.peer.name, 'guest');
      const opened = waitChannelOpen(
        invitation.dc,
        invitation.pc,
        channelOpenTimeoutMs,
        peer.id,
        core.disposalCtrl.signal,
      );
      wirePeerTransport(peer, invitation.pc, invitation.dc);
      peers.set(peer.id, peer);
      recomputeStatus();

      try {
        await invitation.pc.setRemoteDescription({ sdp: normalizeSdp(answer.sdp), type: 'answer' });
      } catch (cause) {
        leavePeer(peer, 'invalid answer sdp', true);
        throw new MeshPairingError('Invalid answer SDP', { cause });
      }

      try {
        await opened;
      } catch (error) {
        const failed = !(error instanceof MeshDisposedError);
        leavePeer(peer, error instanceof Error ? error.message : 'open failed', failed);
        throw error;
      }

      markPeerConnected(peer);
      return peer.publicPeer;
    },

    broadcast(type, payload, broadcastOptions) {
      core.ensureLive();
      for (const peer of peers.values()) {
        if (peer.status !== 'connected' || broadcastOptions?.except?.includes(peer.id)) continue;
        messenger.sendTo(peer, type, payload);
      }
    },

    async createInvitation(meta) {
      core.ensureLive();

      const pc = rtc.createPeerConnection({ iceServers: [...(options.iceServers ?? [])] });
      const dc = pc.createDataChannel(channelInit.label, {
        maxRetransmits: channelInit.maxRetransmits,
        ordered: channelInit.ordered,
      });

      const sessionId = randomId(options.random);
      const secret = bytesToBase64Url(randomBytes(32, options.random));
      const expiresAt = clock() + invitationTtlMs;

      pc.addEventListener('iceconnectionstatechange', () => {
        if (core.disposed) return;
        core.emitTap({ peerId: sessionId, state: pc.iceConnectionState, type: 'ice-state' });
      });

      try {
        await pc.setLocalDescription(await pc.createOffer());
        await waitIceGathering(pc, iceGatheringTimeoutMs);
      } catch (cause) {
        pc.close();
        throw new MeshConnectionError('Failed to create offer', null, { cause });
      }
      if (core.disposed) {
        pc.close();
        throw new MeshDisposedError();
      }

      const sdp = pc.localDescription?.sdp;
      if (!sdp) {
        pc.close();
        throw new MeshConnectionError('Local description has no SDP');
      }

      const expiryTimer = setTimeout(() => expireInvitation(sessionId), invitationTtlMs);
      pending.set(sessionId, { answered: false, dc, expiresAt, expiryTimer, pc, secret, sessionId });
      core.emitTap({ sessionId, type: 'invitation-created' });
      recomputeStatus();
      void meta;
      return { expiresAt, sdp, secret, sessionId, v: 1 };
    },
    get disposalSignal() {
      return core.disposalCtrl.signal;
    },

    dispose() {
      if (core.disposed) return;
      core.markDisposed();
      for (const invitation of pending.values()) {
        clearTimeout(invitation.expiryTimer);
        invitation.pc.close();
      }
      pending.clear();
      for (const peer of peers.values()) {
        peer.dc?.close();
        peer.pc?.close();
        peer.status = 'disposed';
      }
      peers.clear();
      peerListeners.clear();
      messenger.clear();
    },
    get disposed() {
      return core.disposed;
    },
    get id() {
      return core.id;
    },

    kick(peerId, reason) {
      core.ensureLive();
      const peer = peers.get(peerId);
      if (!peer) throw new MeshConnectionError(`Unknown peer "${peerId}"`, peerId);
      leavePeer(peer, reason ?? 'kicked');
    },

    on(type, handler) {
      core.ensureLive();
      return messenger.on(type, handler as (message: MeshInbound<unknown>) => void);
    },

    onPeer(handler) {
      core.ensureLive();
      peerListeners.add(handler);
      return () => peerListeners.delete(handler);
    },
    get peers() {
      return peers as ReadonlyMap<string, MeshPeer>;
    },

    send(peerId, type, payload) {
      core.ensureLive();
      const peer = peers.get(peerId);
      if (!peer) throw new MeshConnectionError(`Unknown peer "${peerId}"`, peerId);
      messenger.sendTo(peer, type, payload);
    },
    get status() {
      return core.status;
    },

    tap(handler, tapOptions) {
      return core.tap(handler, tapOptions);
    },

    [Symbol.dispose]() {
      this.dispose();
    },
  };

  return host;
}
