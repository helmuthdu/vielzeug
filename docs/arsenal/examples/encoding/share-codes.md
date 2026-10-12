---
title: 'Arsenal Examples: pack / unpack'
description: 'pack and unpack examples for @vielzeug/arsenal.'
---

## pack / unpack

### Problem

You need to exchange a structured payload in a URL, QR code, or chat message: raw base64 of the JSON is too long, both sides must refuse payloads over an agreed budget, and codes from another app version or a different product must never decode as valid.

### Solution

Wrap the payload in the versioned share-code envelope: a short prefix names the code family and version, a mode marker records whether the bytes are compressed, and both encode and decode enforce the same `maxBytes` budget.

```ts
import { unpack, pack } from '@vielzeug/arsenal';

const options = { maxBytes: 8192, prefix: 'ab1' }; // your product's code family and version

const code = await pack({ build: ['slash', 'guard'], hunter: 'daeron' }, options);
const payload = await unpack(code, options); // round-trips through compression
```

#### With typed rejection handling

```ts
import { unpack, ShareCodeError } from '@vielzeug/arsenal';

try {
  const payload = await unpack(code, options);
} catch (error) {
  if (error instanceof ShareCodeError) {
    // Branch on the typed reason: invalid format, oversized budget, or a runtime
    // without DecompressionStream support receiving a compressed code.
    showShareError(error.reason);
  }
}
```

### Pitfalls

- The prefix is part of the contract: bump it (`ab1` → `ab2`) when the payload shape changes so old codes refuse to decode instead of parsing into the wrong shape.
- Keep the same `maxBytes` on both sides; decoding bounds input length, streamed decompression, and raw bytes against it.
- Compressed codes require `DecompressionStream('deflate-raw')`: catch `ShareCodeError` with `reason: 'compression-unavailable'` and tell the player rather than showing a generic failure.
- The payload must be JSON-serializable. Unsupported top-level values (`undefined`,
  functions, symbols), cyclic objects and serialization failures reject with
  `ShareCodeError` and `reason: 'invalid'`. Class instances use their JSON representation.

### Related

- [compressBytes / decompressBytes](./compression.md): the byte-level helpers the envelope composes.
- [tryParseJson](../object/parseJSON.md)
- [Sync a Vault Store](../../tandem/examples/sync-a-vault-store.md)
