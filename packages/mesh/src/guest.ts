import {
  DEFAULT_CHANNEL_OPEN_TIMEOUT_MS,
  DEFAULT_ICE_GATHERING_TIMEOUT_MS,
  DEFAULT_MAX_MESSAGE_BYTES,
} from './_defaults';
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

/**
 * Create a guest mesh node. The guest pairs with one host by consuming an
 * out-of-band invitation and returning an answer.
 */
export function createMeshGuest<P extends MeshProtocol>(options: MeshGuestOptions = {}): MeshGuest<P> {
  const rtc = options.rtc ?? nativeRtcFactory;
  const clock = options.clock ?? (() => Date.now());
  const maxMessageBytes = options.maxMessageBytes ?? DEFAULT_MAX_MESSAGE_BYTES;
  const channelOpenTimeoutMs = options.channelOpenTimeoutMs ?? DEFAULT_CHANNEL_OPEN_TIMEOUT_MS;
  const iceGatheringTimeoutMs = options.iceGatheringTimeoutMs ?? DEFAULT_ICE_GATHERING_TIMEOUT_MS;

  const core = createNodeCore(options.signal);
  const messenger = createMessenger({
    clock,
    emitTap: core.emitTap,
    maxMessageBytes,
    random: options.random,
  });

  let hostPeer: PeerRecord | null = null;
  let openTimer: ReturnType<typeof setTimeout> | null = null;

  const openTimeoutError = (): MeshTimeoutError =>
    new MeshTimeoutError(`Timed out waiting ${channelOpenTimeoutMs}ms for the data channel to open`);

  function failPeer(peer: PeerRecord, error: MeshError): void {
    // Ignore events from a superseded peer after re-pairing replaced hostPeer.
    if (core.disposed || peer !== hostPeer || peer.status === 'failed') return;
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
    core.emitTap({ peerId: peer.id, status: 'failed', type: 'peer-status-change' });
    core.emitTap({ error, type: 'error' });
    core.emitTap({ peer: peer.publicPeer, reason: error.message, type: 'peer-left' });
    core.setStatus('failed');
  }

  function disconnectPeer(peer: PeerRecord, reason: string): void {
    if (core.disposed || peer !== hostPeer) return;
    if (peer.status === 'disconnected' || peer.status === 'failed') return;
    peer.status = 'disconnected';
    peer.pc?.close();
    core.emitTap({ peerId: peer.id, status: 'disconnected', type: 'peer-status-change' });
    core.emitTap({ peer: peer.publicPeer, reason, type: 'peer-left' });
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
      core.emitTap({ peerId: peer.id, status: 'connected', type: 'peer-status-change' });
      core.emitTap({ peer: peer.publicPeer, type: 'peer-joined' });
      core.setStatus('connected');
    });
    dc.addEventListener('message', (event) => {
      if (core.disposed) return;
      messenger.handleInbound(peer, event.data);
    });
    dc.addEventListener('close', () => {
      if (core.disposed) return;
      if (peer.status === 'connecting')
        failPeer(
          peer,
          openTimer ? openTimeoutError() : new MeshConnectionError('channel closed before opening', peer.id),
        );
      else disconnectPeer(peer, 'channel closed');
    });
    dc.addEventListener('error', () => {
      if (core.disposed) return;
      failPeer(peer, new MeshConnectionError('channel error', peer.id));
    });

    // The ice-state emission lives on the pairing-scoped listener above; this
    // one owns channel-lifecycle transitions only, so each ICE change emits
    // exactly one ice-state event.
    pc.addEventListener('iceconnectionstatechange', () => {
      if (core.disposed) return;
      const state = pc.iceConnectionState;
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
      // A terminal host peer (failed/disconnected) may be replaced by a fresh
      // pairing on the same node: listeners stay attached and keep working.
      if (hostPeer && hostPeer.status !== 'failed' && hostPeer.status !== 'disconnected') {
        throw new MeshPairingError('Guest is already paired');
      }
      if (invitation?.v !== 1) throw new MeshPairingError('Unsupported invitation version');
      if (clock() >= invitation.expiresAt) throw new MeshPairingError('Invitation expired');

      if (hostPeer) {
        if (openTimer) {
          clearTimeout(openTimer);
          openTimer = null;
        }
        hostPeer.pc?.close();
        hostPeer = null;
      }

      core.setStatus('pairing');
      let pc: RTCPeerConnectionLike;
      try {
        pc = rtc.createPeerConnection({ iceServers: [...(options.iceServers ?? [])] });
      } catch (error) {
        core.setStatus('idle');
        throw error;
      }

      // The invitation carries no host identity beyond an optional display
      // name: the session id doubles as the host-side peer id for inbound
      // metadata and tap events.
      const peer = createPeerRecord(invitation.sessionId, invitation.hostName, 'host');
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
      let proof: string;
      try {
        proof = await createProof(invitation.secret, answerSdp);
      } catch (cause) {
        hostPeer = null;
        pc.close();
        core.setStatus('idle');
        throw cause;
      }
      core.setStatus('connecting');

      // If the channel never opens (host never accepts the answer), fail loudly
      // instead of hanging in 'connecting' forever. The deadline must cover
      // the human carry-back of the answer, not just machine negotiation.
      openTimer = setTimeout(() => {
        if (hostPeer?.status === 'connecting') {
          failPeer(hostPeer, openTimeoutError());
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
      }
      messenger.clear();
    },
    get disposed() {
      return core.disposed;
    },
    get host(): MeshPeer | null {
      return hostPeer?.publicPeer ?? null;
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
