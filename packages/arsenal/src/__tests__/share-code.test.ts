import { afterEach, describe, expect, it, vi } from 'vitest';
import { bytesToBase64Url, textToBase64Url } from '../encoding/base64url';
import { compressBytes } from '../encoding/compression';
import { pack, unpack } from '../encoding/share-code';
import { ShareCodeError } from '../errors';

const options = { maxBytes: 512, prefix: 'ab1' };

afterEach(() => vi.unstubAllGlobals());

describe('share code envelope', () => {
  it.each([undefined, () => {}, Symbol('unsupported'), 1n])(
    'rejects non-JSON payload %s with a typed error',
    async (payload) => {
      await expect(pack(payload, options)).rejects.toMatchObject({ name: 'ShareCodeError', reason: 'invalid' });
    },
  );

  it('rejects cyclic payloads and unsupported toJSON results', async () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    await expect(pack(cyclic, options)).rejects.toThrow(ShareCodeError);
    await expect(pack({ toJSON: () => undefined }, options)).rejects.toMatchObject({ reason: 'invalid' });
  });
  it('compresses repetitive payloads and round-trips Unicode', async () => {
    const payload = { name: 'Hunters \u00e4 \u{1f409}'.repeat(20) };
    const code = await pack(payload, options);
    expect(code.startsWith('ab1d.')).toBe(true);
    expect(code.length).toBeLessThan(textToBase64Url(JSON.stringify(payload)).length);
    expect(await unpack(code, options)).toEqual(payload);
  });

  it('keeps small payloads raw when compression would enlarge the code', async () => {
    expect(await pack({}, options)).toBe('ab1r.e30');
    expect(await unpack('ab1r.e30', options)).toEqual({});
  });

  it('emits raw codes without compression capabilities', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    vi.stubGlobal('DecompressionStream', undefined);
    const code = await pack({ name: 'Test' }, options);
    expect(code.startsWith('ab1r.')).toBe(true);
    expect(await unpack(code, options)).toEqual({ name: 'Test' });
  });

  it('reports a typed reason when decompression is unavailable', async () => {
    const code = await pack({ name: 'x'.repeat(200) }, options);
    vi.stubGlobal('DecompressionStream', undefined);
    const error = await unpack(code, options).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ShareCodeError);
    expect((error as ShareCodeError).reason).toBe('compression-unavailable');
  });

  it.each(['e30', 'ab2r.e30', 'cd1r.e30', 'ab1x.e30', 'ab1.a30', 'ab1r.a', 'ab1r.e31', 'ab1r.!'])(
    'rejects foreign, unknown, and malformed code %s',
    async (code) => {
      const error = await unpack(code, options).catch((cause: unknown) => cause);
      expect(error).toBeInstanceOf(ShareCodeError);
      expect((error as ShareCodeError).reason).toBe('invalid');
    },
  );

  it('rejects invalid UTF-8 and JSON as invalid payloads', async () => {
    const invalidUtf8 = await unpack(`ab1r.${bytesToBase64Url(new Uint8Array([255]))}`, options).catch(
      (cause: unknown) => cause,
    );
    expect(invalidUtf8).toBeInstanceOf(ShareCodeError);
    expect((invalidUtf8 as ShareCodeError).reason).toBe('invalid');
    await expect(unpack(`ab1r.${textToBase64Url('not json')}`, options)).rejects.toThrow(ShareCodeError);
  });

  it('bounds the encoded payload, the code length, and streamed decompression', async () => {
    const oversized = { name: 'x'.repeat(options.maxBytes) };
    await expect(pack(oversized, options)).rejects.toThrow(/limit/);
    await expect(unpack(`ab1r.${'x'.repeat(20_000)}`, options)).rejects.toThrow(/limit/);
    const compressed = await compressBytes(new TextEncoder().encode(JSON.stringify(oversized)));
    await expect(unpack(`ab1d.${bytesToBase64Url(compressed)}`, options)).rejects.toThrow(/limit/);
  });

  it('reports oversized payloads and codes with the too-large reason', async () => {
    const payload = await pack({ name: 'x'.repeat(options.maxBytes) }, options).catch((cause: unknown) => cause);
    expect((payload as ShareCodeError).reason).toBe('too-large');
    const code = await unpack(`ab1r.${'x'.repeat(20_000)}`, options).catch((cause: unknown) => cause);
    expect((code as ShareCodeError).reason).toBe('too-large');
  });

  it('rejects misconfigured envelopes', async () => {
    await expect(pack({}, { maxBytes: 0, prefix: 'ab1' })).rejects.toThrow(/maxBytes/);
    await expect(pack({}, { maxBytes: 512, prefix: 'share-code' })).rejects.toThrow(/prefix/);
    await expect(unpack('ab1r.e30', { maxBytes: 1.5, prefix: 'ab1' })).rejects.toThrow(/maxBytes/);
  });
});
