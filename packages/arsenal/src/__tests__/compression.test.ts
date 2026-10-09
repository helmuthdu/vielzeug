import { afterEach, describe, expect, it, vi } from 'vitest';
import { compressBytes, decompressBytes } from '../encoding/compression';
import { ArsenalSerializationError } from '../errors';

afterEach(() => vi.unstubAllGlobals());

describe('byte compression', () => {
  it.each(['deflate-raw', 'deflate', 'gzip'] as const)('round-trips UTF-8 bytes with %s', async (format) => {
    const bytes = new TextEncoder().encode('Hunters \u00e4 \u{1f409} '.repeat(100));
    const compressed = await compressBytes(bytes, { format });
    expect(compressed.length).toBeLessThan(bytes.length);
    expect([...(await decompressBytes(compressed, { format, maxOutputBytes: bytes.length }))]).toEqual([...bytes]);
  });

  it('round-trips empty input at a zero-byte output limit', async () => {
    expect(await decompressBytes(await compressBytes(new Uint8Array()), { maxOutputBytes: 0 })).toEqual(
      new Uint8Array(),
    );
  });

  it('rejects decompression beyond the byte limit', async () => {
    const compressed = await compressBytes(new TextEncoder().encode('x'.repeat(100_000)));
    await expect(decompressBytes(compressed, { maxOutputBytes: 100 })).rejects.toThrow(ArsenalSerializationError);
  });

  it.each([-1, 0.5, Infinity, NaN])('rejects invalid output limit %s', async (maxOutputBytes) => {
    await expect(decompressBytes(new Uint8Array(), { maxOutputBytes })).rejects.toThrow(ArsenalSerializationError);
  });

  it('rejects corrupt and truncated compressed input', async () => {
    await expect(decompressBytes(new Uint8Array([255, 255]), { maxOutputBytes: 100 })).rejects.toThrow(
      ArsenalSerializationError,
    );
    const compressed = await compressBytes(new TextEncoder().encode('Hunters '.repeat(100)));
    await expect(decompressBytes(compressed.slice(0, -1), { maxOutputBytes: 1000 })).rejects.toThrow(
      ArsenalSerializationError,
    );
  });

  it('reports missing compression and decompression capabilities', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    vi.stubGlobal('DecompressionStream', undefined);
    await expect(compressBytes(new Uint8Array())).rejects.toThrow(ArsenalSerializationError);
    await expect(decompressBytes(new Uint8Array(), { maxOutputBytes: 100 })).rejects.toThrow(ArsenalSerializationError);
  });
});
