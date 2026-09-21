import { describe, expect, it } from 'vitest';
import { bytesToBase64Url } from '../_base64';
import { createProof } from '../_proof';
import { compactSdp } from '../_sdp';
import { meshCodec } from '../codec';
import { MeshPairingError, MeshUnsupportedError } from '../errors';
import { meshQrCodec } from '../qr-codec';
import type { MeshAnswer, MeshInvitation } from '../types';

/** Realistic SDP offer shape — mirrors what Chrome produces (≈700 B). */
const sdp = [
  'v=0',
  'o=- 1234567890 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 0.0.0.0',
  'a=ice-ufrag:AbCdEfGh',
  'a=ice-pwd:IjKlMnOpQrStUvWxYz0123456789',
  'a=ice-options:trickle',
  'a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  'a=max-message-size:262144',
].join('\r\n');

const invitation: MeshInvitation = {
  expiresAt: 1700000000000,
  sdp,
  secret: 'super-secret-key-material',
  sessionId: 'session-abc-123',
  v: 1,
};

const answer: MeshAnswer = {
  peer: { id: 'guest-1', name: 'Phone' },
  proof: 'proof-value',
  sdp,
  sessionId: 'session-abc-123',
  v: 1,
};

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(bytes as BufferSource).then(() => writer.close());
  return new Response(stream.readable).bytes();
}

describe('meshQrCodec', () => {
  it('round-trips an invitation', async () => {
    const text = await meshQrCodec.encode(invitation);
    expect(text.startsWith('mq2.')).toBe(true);
    const decoded = await meshQrCodec.decode(text);
    expect(decoded).toMatchObject({
      expiresAt: invitation.expiresAt,
      secret: invitation.secret,
      sessionId: invitation.sessionId,
      v: 1,
    });
    // The SDP rebuilds as a minimal description — semantically equal, not identical.
    expect(compactSdp(decoded.sdp)).toEqual(compactSdp(invitation.sdp));
  });

  it('round-trips an answer', async () => {
    const text = await meshQrCodec.encode(answer);
    const decoded = await meshQrCodec.decode(text);
    expect(decoded).toMatchObject({ peer: answer.peer, proof: answer.proof, sessionId: answer.sessionId, v: 1 });
    expect(compactSdp(decoded.sdp)).toEqual(compactSdp(answer.sdp));
  });

  it('keeps SDP verbatim when it cannot be compacted', async () => {
    const opaque: MeshInvitation = { ...invitation, sdp: 'fake-offer:token123' };
    expect(await meshQrCodec.decode(await meshQrCodec.encode(opaque))).toEqual(opaque);
  });

  it('emits only QR-alphanumeric characters after the prefix', async () => {
    const text = await meshQrCodec.encode(invitation);
    expect(text.slice(4)).toMatch(/^[0-9A-Z $%*+\-./:]+$/);
  });

  it('keeps the pairing proof stable across the rebuilt SDP', async () => {
    const noop = () => {};
    const text = await meshQrCodec.encode(answer);
    const decoded = await meshQrCodec.decode(text);
    expect(await createProof(invitation.secret, decoded.sdp, noop)).toBe(
      await createProof(invitation.secret, answer.sdp, noop),
    );
  });

  it('produces shorter output than the plain codec on realistic SDP', async () => {
    const plain = meshCodec.encode(invitation);
    const qr = await meshQrCodec.encode(invitation);
    expect(qr.length).toBeLessThan(plain.length);
  });

  it('decodes plain meshCodec text interchangeably', async () => {
    expect(await meshQrCodec.decode(meshCodec.encode(invitation))).toEqual(invitation);
    expect(await meshQrCodec.decode(meshCodec.encode(answer))).toEqual(answer);
  });

  it('decodes mq1. payloads from older encoders', async () => {
    const compressed = await deflate(new TextEncoder().encode(JSON.stringify(invitation)));
    const legacy = `mq1.${bytesToBase64Url(compressed)}`;
    expect(await meshQrCodec.decode(legacy)).toEqual(invitation);
  });

  it('throws MeshPairingError on corrupt base45', async () => {
    await expect(meshQrCodec.decode('mq2.!!!not-base45!!!')).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('throws MeshPairingError on corrupt base64', async () => {
    await expect(meshQrCodec.decode('mq1.!!!not-base64!!!')).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('throws MeshPairingError on corrupt deflate data', async () => {
    // Valid base64url, but the bytes are not a deflate stream.
    const bogus = `mq1.${bytesToBase64Url(new TextEncoder().encode('garbage'))}`;
    await expect(meshQrCodec.decode(bogus)).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('throws MeshPairingError on well-formed compression of a bad payload', async () => {
    const compressed = await deflate(new TextEncoder().encode('{"v":99}'));
    await expect(meshQrCodec.decode(`mq1.${bytesToBase64Url(compressed)}`)).rejects.toBeInstanceOf(MeshPairingError);
  });

  it('throws MeshUnsupportedError when CompressionStream is missing', async () => {
    const original = globalThis.CompressionStream;
    // @ts-expect-error deliberate removal for the test
    delete globalThis.CompressionStream;
    try {
      await expect(meshQrCodec.encode(invitation)).rejects.toBeInstanceOf(MeshUnsupportedError);
    } finally {
      globalThis.CompressionStream = original;
    }
  });

  it('throws MeshUnsupportedError when DecompressionStream is missing', async () => {
    const text = await meshQrCodec.encode(invitation);
    const original = globalThis.DecompressionStream;
    // @ts-expect-error deliberate removal for the test
    delete globalThis.DecompressionStream;
    try {
      await expect(meshQrCodec.decode(text)).rejects.toBeInstanceOf(MeshUnsupportedError);
    } finally {
      globalThis.DecompressionStream = original;
    }
  });
});
