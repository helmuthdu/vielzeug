import { bytesToBase64Url } from '@vielzeug/arsenal';
import { canonicalSdp } from './_sdp';
import { MeshUnsupportedError } from './errors';

/**
 * Proof of invitation possession: HMAC-SHA-256 of the guest SDP keyed by the
 * invitation secret. The SDP is canonicalized first so the proof is stable
 * across pairing codecs that rebuild the description (see `mq2.`). The host
 * recomputes the proof without receiving the secret back.
 *
 * WebCrypto is required: a non-cryptographic fallback would make the proof
 * forgeable, which defeats its purpose. Environments without `SubtleCrypto`
 * (insecure contexts) must pair over `https://` or `localhost` instead.
 *
 * @throws {MeshUnsupportedError} When `SubtleCrypto` is unavailable.
 */
export async function createProof(secret: string, sdp: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new MeshUnsupportedError('WebCrypto is unavailable: pairing requires a secure context');
  }
  const encoder = new TextEncoder();
  const key = await subtle.importKey('raw', encoder.encode(secret), { hash: 'SHA-256', name: 'HMAC' }, false, ['sign']);
  const signature = await subtle.sign('HMAC', key, encoder.encode(canonicalSdp(sdp)));
  return bytesToBase64Url(new Uint8Array(signature));
}
