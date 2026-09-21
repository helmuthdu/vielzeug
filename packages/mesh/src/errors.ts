/**
 * Base class for all mesh errors.
 * Use `instanceof MeshError` to catch any mesh-originated error in one branch.
 */
export class MeshError extends Error {
  constructor(message: string, opts?: ErrorOptions) {
    super(message, opts);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a pairing payload is malformed, expired, unknown, already
 * consumed, carries a mismatched proof, or is rejected by the host's
 * `approvePeer` hook.
 */
export class MeshPairingError extends MeshError {}

/**
 * Thrown when the peer connection fails (ICE/DTLS failure, channel closed
 * unexpectedly) or a send targets an unknown or unconnected peer.
 */
export class MeshConnectionError extends MeshError {
  readonly peerId: string | null;

  constructor(message: string, peerId: string | null = null, opts?: ErrorOptions) {
    super(message, opts);
    this.peerId = peerId;
  }
}

/**
 * Thrown when an outbound message exceeds `maxMessageBytes` or cannot be
 * serialized.
 */
export class MeshPayloadError extends MeshError {}

/**
 * Thrown when ICE gathering or the data-channel open handshake exceeds the
 * configured timeout.
 */
export class MeshTimeoutError extends MeshError {}

/**
 * Thrown when a method is called on a disposed mesh node.
 */
export class MeshDisposedError extends MeshError {
  constructor(target = 'Mesh node', opts?: ErrorOptions) {
    super(`${target} is disposed`, opts);
  }
}

/**
 * Thrown when WebRTC is unavailable in the current environment and no `rtc`
 * factory was injected. Raised at first use, never at import time.
 */
export class MeshUnsupportedError extends MeshError {}
