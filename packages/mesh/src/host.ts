import { bytesToBase64Url } from '@vielzeug/arsenal';
import {
  DEFAULT_CHANNEL_OPEN_TIMEOUT_MS,
  DEFAULT_ICE_GATHERING_TIMEOUT_MS,
  DEFAULT_INVITATION_TTL_MS,
  DEFAULT_MAX_MESSAGE_BYTES,
} from './_defaults';
import { createMessenger, createNodeCore, createPeerRecord, type PeerRecord, wireDisposalSignal } from './_node';
import { createProof } from './_proof';
import { randomBytes, randomId } from './_random';
import { nativeRtcFactory, normalizeSdp, waitChannelOpen, waitIceGathering } from './_rtc';
import { MeshConnectionError, MeshDisposedError, MeshPairingError } from './errors';
import type {
  MeshHost,
  MeshHostOptions,
  MeshInbound,
  MeshPeer,
  MeshProtocol,
  MeshStatus,
  RTCDataChannelLike,
  RTCPeerConnectionLike,
} from './types';

interface PendingInvitation {
  readonly dc: RTCDataChannelLike;
  readonly expiresAt: number;
  readonly expiryTimer: ReturnType<typeof setTimeout>;
  readonly pc: RTCPeerConnectionLike;
  readonly secret: string;
  readonly sessionId: string;
  /**
   * Single-use reservation, taken synchronously before any `await` in
   * `acceptAnswer` so concurrent answers cannot both pass validation.
   */
  state: 'open' | 'reserved';
}

/**
 * Create a host-authoritative mesh node. The host holds one peer connection
 * per guest and pairs each one through a manual invitation/answer exchange.
 */
export function createMeshHost<P extends MeshProtocol>(options: MeshHostOptions = {}): MeshHost<P> {
  const rtc = options.rtc ?? nativeRtcFactory;
  const clock = options.clock ?? (() => Date.now());
  const maxMessageBytes = options.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES;
  const invitationTtlMs = options.invitationTtlMs ?? DEFAULT_INVITATION_TTL_MS;
  const channelOpenTimeoutMs = options.channelOpenTimeoutMs ?? DEFAULT_CHANNEL_OPEN_TIMEOUT_MS;
  const iceGatheringTimeoutMs = options.iceGatheringTimeoutMs ?? DEFAULT_ICE_GATHERING_TIMEOUT_MS;
  const channelInit = { label: 'mesh', ordered: true, ...options.channel };

  const core = createNodeCore();
  const messenger = createMessenger({
    clock,
    emitTap: core.emitTap,
    maxMessageBytes,
  });

  const peers = new Map<string, PeerRecord>();
  const pending = new Map<string, PendingInvitation>();

  let sawPeer = false;
  let sawFailure = false;

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

  function expireInvitation(sessionId: string): void {
    const invitation = pending.get(sessionId);
    if (!invitation) return;
    pending.delete(sessionId);
    clearTimeout(invitation.expiryTimer);
    invitation.pc.close();
    core.emitTap({ sessionId, type: 'invitation-expired' });
    recomputeStatus();
  }

  /** Opens a reserved invitation for another answer, unless it already expired. */
  function releaseInvitation(sessionId: string, invitation: PendingInvitation): void {
    if (pending.get(sessionId) === invitation) invitation.state = 'open';
  }

  /**
   * Retires an invitation for good: no further answer will be accepted for
   * it. Callers recompute status once their own state is in place. Used when
   * the invitation's transport is handed to a peer; refusing a peer must
   * teardown the transport through `discardInvitation` instead.
   */
  function consumeInvitation(sessionId: string, invitation: PendingInvitation): void {
    if (pending.get(sessionId) !== invitation) return;
    pending.delete(sessionId);
    clearTimeout(invitation.expiryTimer);
  }

  /** Retires an invitation that will never become a peer and closes its transport. */
  function discardInvitation(sessionId: string, invitation: PendingInvitation): void {
    consumeInvitation(sessionId, invitation);
    invitation.pc.close();
  }

  function setPeerStatus(peer: PeerRecord, status: PeerRecord['status']): void {
    if (peer.status === status) return;
    peer.status = status;
    core.emitTap({ peerId: peer.id, status, type: 'peer-status-change' });
    recomputeStatus();
  }

  function leavePeer(peer: PeerRecord, reason: string | undefined, failed = false): void {
    if (!peers.has(peer.id)) return;
    peers.delete(peer.id);
    peer.status = failed ? 'failed' : 'disconnected';
    peer.pc?.close();
    peer.dc?.close();
    core.emitTap({ peerId: peer.id, status: peer.status, type: 'peer-status-change' });
    core.emitTap({ peer: peer.publicPeer, reason, type: 'peer-left' });
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
      }
      // `disconnected` is transient in WebRTC and often recovers: peer
      // liveness follows the data channel, so a blip only surfaces as the
      // `ice-state` tap event above.
    });
  }

  function markPeerConnected(peer: PeerRecord): void {
    sawPeer = true;
    peers.set(peer.id, peer);
    setPeerStatus(peer, 'connected');
    core.emitTap({ peer, type: 'peer-joined' });
  }

  const host: MeshHost<P> = {
    async acceptAnswer(answer) {
      core.ensureLive();

      if (answer?.v !== 1) throw new MeshPairingError('Unsupported answer version');
      if (!answer.peer?.id) throw new MeshPairingError('Answer is missing a peer id');
      const invitation = pending.get(answer.sessionId);
      if (!invitation) throw new MeshPairingError('Unknown or expired session');
      if (invitation.state !== 'open') throw new MeshPairingError('Invitation already answered');
      if (peers.has(answer.peer.id)) throw new MeshPairingError(`Peer "${answer.peer.id}" is already connected`);
      if (clock() >= invitation.expiresAt) {
        expireInvitation(answer.sessionId);
        throw new MeshPairingError('Invitation expired');
      }
      // Reserve synchronously before the first await: a concurrent answer for
      // this session can only lose here, never race through the awaits below.
      invitation.state = 'reserved';

      let approved: boolean;
      try {
        const expected = await createProof(invitation.secret, answer.sdp);
        if (answer.proof !== expected) throw new MeshPairingError('Proof mismatch');
        approved = (await options.approvePeer?.(answer.peer)) ?? true;
      } catch (error) {
        // Proof mismatch or an approval/proof failure: the invitation was not
        // decided, so the genuine guest can still answer it.
        releaseInvitation(answer.sessionId, invitation);
        throw error;
      }

      // Disposal while awaiting proof/approval must win over the approval
      // result: the node was torn down, it never decided anything.
      core.ensureLive();

      if (!approved) {
        core.emitTap({ peerId: answer.peer.id, type: 'peer-rejected' });
        // The host made a decision for this session: the invitation is spent
        // and its transport is torn down, or refused peers would leak one
        // connection per attempt.
        discardInvitation(answer.sessionId, invitation);
        recomputeStatus();
        throw new MeshPairingError(`Peer "${answer.peer.id}" rejected by host`);
      }
      core.emitTap({ peerId: answer.peer.id, type: 'peer-approved' });

      // The expiry timer may have retired the invitation mid-flight; its peer
      // connection is already closed.
      if (pending.get(answer.sessionId) !== invitation) throw new MeshPairingError('Invitation expired');
      // Concurrent answers for different sessions could both have passed the check above.
      if (peers.has(answer.peer.id)) {
        // The collision is about the peer id, not this session: leave it answerable.
        releaseInvitation(answer.sessionId, invitation);
        throw new MeshPairingError(`Peer "${answer.peer.id}" is already connected`);
      }
      consumeInvitation(answer.sessionId, invitation);

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
      pending.set(sessionId, { dc, expiresAt, expiryTimer, pc, secret, sessionId, state: 'open' });
      core.emitTap({ sessionId, type: 'invitation-created' });
      recomputeStatus();
      return { expiresAt, sdp, secret, sessionId, v: 1, ...(meta?.name === undefined ? {} : { hostName: meta.name }) };
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
      }
      peers.clear();
      messenger.clear();
    },
    get disposed() {
      return core.disposed;
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

  wireDisposalSignal(options.signal, () => host.dispose());
  return host;
}
