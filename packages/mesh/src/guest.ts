import { createMessenger, createNodeCore, createPeerRecord, type PeerRecord } from './_node';
import { createProof } from './_proof';
import { randomId } from './_random';
import { nativeRtcFactory, normalizeSdp, waitIceGathering } from './_rtc';
import { MeshConnectionError, MeshDisposedError, type MeshError, MeshPairingError, MeshTimeoutError } from './errors';
import type {
  MeshGuest,
  MeshGuestOptions,
  MeshInbound,
  MeshPeer,
  MeshProtocol,
  RTCDataChannelLike,
  RTCPeerConnectionLike,
} from './types';

const DEFAULT_CHANNEL_OPEN_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_MESSAGE_BYTES = 65_536;
const DEFAULT_ICE_GATHERING_TIMEOUT_MS = 5_000;

/**
 * Create a guest mesh node. The guest pairs with one host by consuming an
 * out-of-band invitation and returning an answer.
 */
export function createMeshGuest<P extends MeshProtocol>(options: MeshGuestOptions = {}): MeshGuest<P> {
  const rtc = options.rtc ?? nativeRtcFactory;
  const clock = options.clock ?? (() => Date.now());
  const serialize = options.serialize ?? JSON.stringify;
  const deserialize = options.deserialize ?? JSON.parse;
  const maxMessageBytes = options.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES;
  const channelOpenTimeoutMs = options.channelOpenTimeoutMs ?? DEFAULT_CHANNEL_OPEN_TIMEOUT_MS;
  const iceGatheringTimeoutMs = options.iceGatheringTimeoutMs ?? DEFAULT_ICE_GATHERING_TIMEOUT_MS;

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

  let hostPeer: PeerRecord | null = null;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let downgradeNotified = false;

  function onSecurityDowngrade(): void {
    if (downgradeNotified) return;
    downgradeNotified = true;
    core.emitTap({
      reason: 'SubtleCrypto unavailable — proof uses a non-cryptographic hash',
      type: 'security-downgrade',
    });
  }

  function failPeer(peer: PeerRecord, error: MeshError): void {
    if (core.disposed || peer.status === 'failed') return;
    peer.status = 'failed';
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    // Teardown is deferred a macrotask so a peer racing its own open
    // deadline reports its timeout rather than this hangup.
    setTimeout(() => {
      peer.dc?.close();
      peer.pc?.close();
    }, 0);
    core.emitTap({ peerId: peer.id, status: 'failed', type: 'status-change' });
    core.emitTap({ error, type: 'error' });
    core.emitTap({ peerId: peer.id, reason: error.message, type: 'peer-left' });
    core.setStatus('failed');
  }

  function disconnectPeer(peer: PeerRecord, reason: string): void {
    if (core.disposed || peer.status === 'disconnected' || peer.status === 'failed') return;
    peer.status = 'disconnected';
    peer.pc?.close();
    core.emitTap({ peerId: peer.id, status: 'disconnected', type: 'status-change' });
    core.emitTap({ peerId: peer.id, reason, type: 'peer-left' });
    core.setStatus('disconnected');
  }

  function wireChannel(peer: PeerRecord, pc: RTCPeerConnectionLike, dc: RTCDataChannelLike): void {
    peer.dc = dc;

    dc.addEventListener('open', () => {
      if (core.disposed) return;
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      peer.status = 'connected';
      core.emitTap({ peerId: peer.id, status: 'connected', type: 'status-change' });
      core.emitTap({ peerId: peer.id, type: 'peer-joined' });
      core.setStatus('connected');
    });
    dc.addEventListener('message', (event) => {
      if (core.disposed) return;
      messenger.handleInbound(peer, event.data);
    });
    dc.addEventListener('close', () => {
      if (core.disposed) return;
      if (peer.status === 'connecting')
        failPeer(peer, new MeshConnectionError('channel closed before opening', peer.id));
      else disconnectPeer(peer, 'channel closed');
    });
    dc.addEventListener('error', () => {
      if (core.disposed) return;
      failPeer(peer, new MeshConnectionError('channel error', peer.id));
    });

    pc.addEventListener('iceconnectionstatechange', () => {
      if (core.disposed) return;
      const state = pc.iceConnectionState;
      core.emitTap({ peerId: peer.id, state, type: 'ice-state' });
      if (state === 'failed' || state === 'closed') {
        failPeer(peer, new MeshConnectionError(`ice ${state}`, peer.id));
      } else if (state === 'disconnected' && peer.status === 'connected') {
        disconnectPeer(peer, 'ice disconnected');
      }
    });
  }

  const guest: MeshGuest<P> = {
    async acceptInvitation(invitation, meta) {
      core.ensureLive();
      if (hostPeer) throw new MeshPairingError('Guest is already paired');
      if (invitation?.v !== 1) throw new MeshPairingError('Unsupported invitation version');
      if (clock() >= invitation.expiresAt) throw new MeshPairingError('Invitation expired');

      core.setStatus('pairing');
      let pc: RTCPeerConnectionLike;
      try {
        pc = rtc.createPeerConnection({ iceServers: [...(options.iceServers ?? [])] });
      } catch (error) {
        core.setStatus('idle');
        throw error;
      }

      // The invitation carries no host identity — the session id doubles as
      // the host-side peer id for inbound metadata and tap events.
      const peer = createPeerRecord(invitation.sessionId, undefined, 'host');
      peer.pc = pc;
      hostPeer = peer;

      pc.addEventListener('datachannel', (event) => {
        wireChannel(peer, pc, event.channel);
      });
      pc.addEventListener('iceconnectionstatechange', () => {
        if (core.disposed) return;
        core.emitTap({ peerId: peer.id, state: pc.iceConnectionState, type: 'ice-state' });
      });

      try {
        await pc.setRemoteDescription({ sdp: normalizeSdp(invitation.sdp), type: 'offer' });
      } catch (cause) {
        hostPeer = null;
        core.setStatus('idle');
        throw new MeshPairingError('Invalid invitation SDP', { cause });
      }

      let answerSdp: string;
      try {
        await pc.setLocalDescription(await pc.createAnswer());
        await waitIceGathering(pc, iceGatheringTimeoutMs);
        answerSdp = pc.localDescription?.sdp ?? '';
      } catch (cause) {
        hostPeer = null;
        pc.close();
        core.setStatus('idle');
        throw new MeshConnectionError('Failed to create answer', null, { cause });
      }
      if (core.disposed) {
        pc.close();
        throw new MeshDisposedError();
      }
      if (!answerSdp) {
        hostPeer = null;
        pc.close();
        core.setStatus('idle');
        throw new MeshConnectionError('Local description has no SDP');
      }

      const peerId = randomId(options.random);
      const proof = await createProof(invitation.secret, answerSdp, onSecurityDowngrade);
      core.setStatus('connecting');

      // If the channel never opens (host never accepts the answer), fail loudly
      // instead of hanging in 'connecting' forever. The deadline must cover
      // the human carry-back of the answer, not just machine negotiation.
      openTimer = setTimeout(() => {
        if (hostPeer?.status === 'connecting') {
          failPeer(hostPeer, new MeshTimeoutError('Timed out waiting for the data channel to open'));
        }
      }, channelOpenTimeoutMs);

      return {
        peer: meta?.name === undefined ? { id: peerId } : { id: peerId, name: meta.name },
        proof,
        sdp: answerSdp,
        sessionId: invitation.sessionId,
        v: 1,
      };
    },
    get disposalSignal() {
      return core.disposalCtrl.signal;
    },

    dispose() {
      if (core.disposed) return;
      core.markDisposed();
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      if (hostPeer) {
        hostPeer.dc?.close();
        hostPeer.pc?.close();
        hostPeer.status = 'disposed';
      }
      messenger.clear();
    },
    get disposed() {
      return core.disposed;
    },
    get host(): MeshPeer | null {
      return hostPeer?.publicPeer ?? null;
    },
    get id() {
      return core.id;
    },

    on(type, handler) {
      core.ensureLive();
      return messenger.on(type, handler as (message: MeshInbound<unknown>) => void);
    },

    send(type, payload) {
      core.ensureLive();
      if (!hostPeer) throw new MeshConnectionError('Guest is not paired');
      messenger.sendTo(hostPeer, type, payload);
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

  return guest;
}
