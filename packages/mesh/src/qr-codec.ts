import { base45ToBytes, bytesToBase45 } from './_base45';
import { compactSdp, restoreSdp } from './_sdp';
import { isRecord, meshCodec, parsePairingPayload } from './codec';
import { MeshPairingError, MeshUnsupportedError } from './errors';
import type { MeshAnswer, MeshInvitation } from './types';

interface QrCodec {
  decode(text: string): Promise<MeshInvitation | MeshAnswer>;
  encode(payload: MeshInvitation | MeshAnswer): Promise<string>;
}

/**
 * QR-friendly async codec. `encode` emits `"mq2."` payloads: the SDP is
 * reduced to the fields the remote needs (see `_sdp.ts`), the JSON is
 * deflate-raw compressed (`CompressionStream`), and the bytes are base45 —
 * an alphabet inside the QR alphanumeric charset, so encoders use ~5.5
 * bits/char instead of 8. Where `CompressionStream` is unavailable it
 * falls back to plain `meshCodec` output, which `decode` also accepts —
 * encoding never fails on a missing capability.
 *
 * `decode` accepts `"mq2."` and plain `meshCodec` output — a guest can paste
 * or scan interchangeably.
 */

const PREFIX_V2 = 'mq2.';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function decompressionStream(kind: 'deflate-raw'): DecompressionStream {
  if (typeof globalThis.DecompressionStream !== 'function')
    throw new MeshUnsupportedError('DecompressionStream is not available in this environment');
  return new globalThis.DecompressionStream(kind);
}

async function pump(
  data: Uint8Array,
  stream: {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<BufferSource>;
  },
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  // When the read side fails first (corrupt input), the write side rejects too;
  // swallow it so the real read error is the one that surfaces.
  const write = writer
    .write(data as BufferSource)
    .then(() => writer.close())
    .catch(() => {});
  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  await write;
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export const meshQrCodec: QrCodec = {
  async decode(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith(PREFIX_V2)) {
      let parsed: unknown;
      try {
        const compressed = base45ToBytes(trimmed.slice(PREFIX_V2.length));
        parsed = JSON.parse(decoder.decode(await pump(compressed, decompressionStream('deflate-raw'))));
      } catch (cause) {
        if (cause instanceof MeshUnsupportedError) throw cause;
        if (cause instanceof MeshPairingError) throw cause;
        throw new MeshPairingError('Malformed pairing payload', { cause });
      }
      if (isRecord(parsed)) parsed = { ...parsed, sdp: restoreSdp(parsed.sdp) };
      return parsePairingPayload(parsed);
    }
    // Plain meshCodec output — paste and scan stay interchangeable.
    return meshCodec.decode(trimmed);
  },
  async encode(payload) {
    // Missing capability, not a failure: plain output still pairs everywhere.
    if (typeof globalThis.CompressionStream !== 'function') return meshCodec.encode(payload);
    const compact = compactSdp(payload.sdp);
    const json = encoder.encode(JSON.stringify(compact ? { ...payload, sdp: compact } : payload));
    const compressed = await pump(json, new globalThis.CompressionStream('deflate-raw'));
    return PREFIX_V2 + bytesToBase45(compressed);
  },
};
