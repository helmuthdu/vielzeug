---
title: 'Arsenal Examples: compressBytes / decompressBytes'
description: 'compressBytes and decompressBytes examples for @vielzeug/arsenal.'
---

## compressBytes / decompressBytes

### Problem

You need to fit a JSON payload into a URL or QR code, but the Base64url-encoded text overflows the consumer's capacity. Decompressing input from another device is worse: compressed data expands to whatever size the sender chose.

### Solution

Compress the UTF-8 bytes before encoding, then decompress with a `maxOutputBytes` limit so untrusted input cannot expand without a bound.

```ts
import { base64UrlToBytes, bytesToBase64Url, compressBytes, decompressBytes } from '@vielzeug/arsenal';

const payload = JSON.stringify({ name: 'Hunters', notes: 'An expedition through Alborea. '.repeat(20) });
const code = bytesToBase64Url(await compressBytes(new TextEncoder().encode(payload)));

// Receiving side: expand only within an explicit byte budget.
const bytes = await decompressBytes(base64UrlToBytes(code), { maxOutputBytes: 8192 });
new TextDecoder('utf-8', { fatal: true }).decode(bytes) === payload; // true
```

#### With an explicit format

```ts
import { compressBytes, decompressBytes } from '@vielzeug/arsenal';

const bytes = new TextEncoder().encode(JSON.stringify({ seat: 4 }));
const zipped = await compressBytes(bytes, { format: 'gzip' });

// Both ends must agree on the format; there is no fallback or format sniffing.
const restored = await decompressBytes(zipped, { format: 'gzip', maxOutputBytes: 1024 });
```

### Pitfalls

- Compression can enlarge small payloads: compare the final encoded string lengths before choosing a representation.
- `maxOutputBytes` bounds the retained output, not native stream working memory: bound the encoded input before decoding.
- Both ends must use the same `format`; the helpers reject instead of falling back.
- Native `CompressionStream`/`DecompressionStream` support is required: unavailable runtimes reject with `ArsenalSerializationError`.

### Related

- [tryParseJson](../object/parseJSON.md)
- [Compress Share Payloads](../../usage.md#compress-share-payloads)
- [Encode Text for URLs and QR Codes](../../usage.md#encode-text-for-urls-and-qr-codes)
