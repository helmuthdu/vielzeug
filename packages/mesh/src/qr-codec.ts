import { base45ToBytes, bytesToBase45 } from './_base45';
import { base64UrlToBytes } from './_base64';
import { compactSdp, restoreSdp } from './_sdp';
import { meshCodec, parsePairingPayload } from './codec';
import { MeshPairingError, MeshUnsupportedError } from './errors';
import type { MeshAnswer, MeshInvitation } from './types';

/**
 * QR-friendly async codec. `encode` emits `"mq2."` payloads: the SDP is
 * reduced to the fields the remote needs (see `_sdp.ts`), the JSON is
 * deflate-raw compressed (`CompressionStream`), and the bytes are base45 —
 * an alphabet inside the QR alphanumeric charset, so encoders use ~5.5
 * bits/char instead of 8. Roughly half the QR modules of `mq1.` on realistic
 * SDP payloads.
 *
 * `decode` accepts `"mq2."`, `"mq1."` (deflate + base64url), and plain
 * `meshCodec` output — a guest can paste or scan interchangeably.
 *
 * CompressionStream is required; feature-detected at call time so importing is
 * always safe.
 */

const PREFIX = 'mq1.';
const PREFIX_V2 = 'mq2.';

/** Async variant of {@link MeshCodec} — compression APIs are stream-based. */
export interface MeshAsyncCodec {
  decode(text: string): Promise<MeshInvitation | MeshAnswer>;
  encode(payload: MeshInvitation | MeshAnswer): Promise<string>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function compressionStream(kind: 'deflate-raw'): CompressionStream {
  if (typeof globalThis.CompressionStream !== 'function')
    throw new MeshUnsupportedError('CompressionStream is not available in this environment');
  return new globalThis.CompressionStream(kind);
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const meshQrCodec: MeshAsyncCodec = {
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
    if (!trimmed.startsWith(PREFIX)) {
      // Plain meshCodec output — paste and scan stay interchangeable.
      return meshCodec.decode(trimmed);
    }
    let parsed: unknown;
    try {
      const compressed = base64UrlToBytes(trimmed.slice(PREFIX.length));
      parsed = JSON.parse(decoder.decode(await pump(compressed, decompressionStream('deflate-raw'))));
    } catch (cause) {
      if (cause instanceof MeshUnsupportedError) throw cause;
      throw new MeshPairingError('Malformed pairing payload', { cause });
    }
    return parsePairingPayload(parsed);
  },
  async encode(payload) {
    const compact = compactSdp(payload.sdp);
    const json = encoder.encode(JSON.stringify(compact ? { ...payload, sdp: compact } : payload));
    const compressed = await pump(json, compressionStream('deflate-raw'));
    return PREFIX_V2 + bytesToBase45(compressed);
  },
};
