import { ShareCodeError } from '../errors';
import { base64UrlToBytes, bytesToBase64Url } from './base64url';
import { compressBytes, decompressBytes } from './compression';

/**
 * Compact, versioned share codes for URLs and QR codes: a prefix, a mode marker, and
 * base64url bytes — compressed with raw DEFLATE when the compressed form is shorter and
 * the runtime supports the streams. Both sides of the envelope are bounded by `maxBytes`.
 */

/** The envelope's identity and its byte budget. */
export interface ShareCodeOptions {
  /** Maximum serialized payload size in bytes; decoding also refuses codes that could carry more. */
  readonly maxBytes: number;
  /** Versioned identifier at the start of every code, e.g. `'pb1'`: 1–8 alphanumeric characters. */
  readonly prefix: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function assertOptions({ maxBytes, prefix }: ShareCodeOptions): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new ShareCodeError('invalid', 'maxBytes must be a positive safe integer.');
  }
  if (!/^[A-Za-z0-9]{1,8}$/.test(prefix)) {
    throw new ShareCodeError('invalid', 'The prefix must be 1–8 alphanumeric characters.');
  }
}

/** Compression support is probed, not assumed: raw codes stay usable where the streams are missing. */
function streamsAvailable(): boolean {
  try {
    new CompressionStream('deflate-raw');
    new DecompressionStream('deflate-raw');
    return true;
  } catch {
    return false;
  }
}

function decompressionAvailable(): boolean {
  try {
    new DecompressionStream('deflate-raw');
    return true;
  } catch {
    return false;
  }
}

export async function pack(payload: unknown, options: ShareCodeOptions): Promise<string> {
  assertOptions(options);
  const { maxBytes, prefix } = options;
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(payload);
  } catch (error) {
    throw new ShareCodeError('invalid', 'The share payload is not JSON-serializable.', { cause: error });
  }
  if (serialized === undefined) {
    throw new ShareCodeError('invalid', 'The share payload is not JSON-serializable.');
  }
  const bytes = encoder.encode(serialized);
  if (bytes.length > maxBytes) {
    throw new ShareCodeError('too-large', 'The share payload exceeds the byte limit.');
  }
  const raw = `${prefix}r.${bytesToBase64Url(bytes)}`;
  if (!streamsAvailable()) return raw;
  // Compression can enlarge small payloads: ship whichever representation is shorter.
  const compressed = `${prefix}d.${bytesToBase64Url(await compressBytes(bytes))}`;
  return compressed.length < raw.length ? compressed : raw;
}

export async function unpack(code: string, options: ShareCodeOptions): Promise<unknown> {
  assertOptions(options);
  const { maxBytes, prefix } = options;
  const text = code.trim();
  // A code can only carry so many bytes when base64url-encoded: refuse longer input up front.
  const maxCodeLength = Math.ceil((maxBytes * 4) / 3) + prefix.length + 2;
  if (text.length > maxCodeLength) {
    throw new ShareCodeError('too-large', 'The share code exceeds the length limit.');
  }
  const mode = text.slice(prefix.length, prefix.length + 1);
  if (!text.startsWith(prefix) || (mode !== 'r' && mode !== 'd') || text[prefix.length + 1] !== '.') {
    throw new ShareCodeError('invalid', 'That share code format is not supported.');
  }
  const encoded = text.slice(prefix.length + 2);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new ShareCodeError('invalid', 'Malformed share code.');
  }
  const bytes = base64UrlToBytes(encoded);
  // Base64url is not injective: round-trip so crafted non-canonical encodings fail.
  if (bytesToBase64Url(bytes) !== encoded) {
    throw new ShareCodeError('invalid', 'Malformed share code.');
  }
  if (mode === 'd' && !decompressionAvailable()) {
    throw new ShareCodeError('compression-unavailable', 'Raw-DEFLATE decompression is unavailable in this browser.');
  }
  // Decompression enforces its own output budget; its typed error carries that failure.
  const decoded = mode === 'd' ? await decompressBytes(bytes, { maxOutputBytes: maxBytes }) : bytes;
  if (decoded.length > maxBytes) {
    throw new ShareCodeError('too-large', 'The share payload exceeds the byte limit.');
  }
  try {
    return JSON.parse(decoder.decode(decoded));
  } catch (error) {
    throw new ShareCodeError('invalid', 'The share code payload is not valid UTF-8 JSON.', { cause: error });
  }
}
