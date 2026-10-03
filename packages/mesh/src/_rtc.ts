import { MeshConnectionError, MeshDisposedError, MeshTimeoutError, MeshUnsupportedError } from './errors';
import type { MeshRtcFactory, RTCDataChannelLike, RTCPeerConnectionLike } from './types';

/**
 * Wraps `globalThis.RTCPeerConnection`. Evaluated lazily at first use so
 * importing the package never throws in non-WebRTC environments.
 */
export const nativeRtcFactory: MeshRtcFactory = {
  createPeerConnection(config) {
    const Ctor = (globalThis as { RTCPeerConnection?: typeof RTCPeerConnection }).RTCPeerConnection;
    if (!Ctor) {
      throw new MeshUnsupportedError('WebRTC is unavailable in this environment: inject an `rtc` factory');
    }
    return new Ctor(config);
  },
};

/**
 * Textareas, clipboards, and share sheets normalize CRLF→LF;
 * `setRemoteDescription` requires CRLF line endings.
 */
export function normalizeSdp(sdp: string): string {
  const normalized = sdp.replace(/\r?\n/g, '\r\n');
  return normalized.endsWith('\r\n') ? normalized : `${normalized}\r\n`;
}

/**
 * Resolves when ICE gathering finishes or after `timeoutMs`: the caller
 * proceeds with whatever candidates were gathered (non-trickle semantics).
 */
export function waitIceGathering(pc: RTCPeerConnectionLike, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, timeoutMs);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

/**
 * Resolves when the data channel opens. Rejects with `MeshTimeoutError` after
 * `timeoutMs`, or when the channel closes while that deadline is still
 * pending, since a peer tearing down a never-opened channel races the same
 * deadline: `MeshConnectionError` when the ICE transport dies first, and
 * `MeshDisposedError` when `disposalSignal` aborts.
 */
export function waitChannelOpen(
  dc: RTCDataChannelLike,
  pc: RTCPeerConnectionLike,
  timeoutMs: number,
  peerId: string,
  disposalSignal: AbortSignal,
): Promise<void> {
  if (dc.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = () => new MeshTimeoutError(`Timed out waiting ${timeoutMs}ms for the data channel to open`);
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      dc.removeEventListener('open', onOpen);
      dc.removeEventListener('close', onClose);
      pc.removeEventListener('iceconnectionstatechange', onIce);
      disposalSignal.removeEventListener('abort', onDispose);
    };
    const onOpen = () => {
      cleanup();
      resolve();
    };
    // A close while our open deadline is still armed is the timeout it
    // effectively is; mirror the guest's open-timer guard so both ends agree
    // on the cause instead of racing to report whichever event landed first.
    const onClose = () => fail(timeout());
    const onIce = () => {
      const state = pc.iceConnectionState;
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        fail(new MeshConnectionError(`ICE connection ${state} before channel open`, peerId));
      }
    };
    const onDispose = () => fail(new MeshDisposedError());
    timer = setTimeout(() => fail(timeout()), timeoutMs);
    dc.addEventListener('open', onOpen);
    dc.addEventListener('close', onClose);
    pc.addEventListener('iceconnectionstatechange', onIce);
    disposalSignal.addEventListener('abort', onDispose, { once: true });
  });
}
