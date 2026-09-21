import { hash } from '@vielzeug/arsenal';
import { bytesToBase64Url } from './_base64';
import { canonicalSdp } from './_sdp';

/**
 * Proof of invitation possession: HMAC-SHA-256 of the guest SDP keyed by the
 * invitation secret. The SDP is canonicalized first so the proof is stable
 * across pairing codecs that rebuild the description (see `mq2.`). The host
 * recomputes the proof without receiving the secret back. Falls back to a
 * deterministic non-cryptographic hash when `SubtleCrypto` is unavailable —
 * the caller reports a `'security-downgrade'` tap so consumers can refuse
 * degraded environments.
 */
export async function createProof(secret: string, sdp: string, onDowngrade: () => void): Promise<string> {
  const canonical = canonicalSdp(sdp);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const encoder = new TextEncoder();
    const key = await subtle.importKey('raw', encoder.encode(secret), { hash: 'SHA-256', name: 'HMAC' }, false, [
      'sign',
    ]);
    const signature = await subtle.sign('HMAC', key, encoder.encode(canonical));
    return bytesToBase64Url(new Uint8Array(signature));
  }

  onDowngrade();
  return hash({ sdp: canonical, secret });
}
