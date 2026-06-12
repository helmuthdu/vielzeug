---
title: 'Arsenal Examples — fromEntries'
description: 'fromEntries example for @vielzeug/arsenal.'
---

## fromEntries

### Problem

You have an array of `[key, value]` pairs and need to reconstruct a typed record from them — the typed counterpart to `Object.fromEntries`.

### Solution

Use `fromEntries(input)` to convert an iterable of key-value pairs back into an object.

```ts
import { entries, fromEntries, mapValues } from '@vielzeug/arsenal';

const config = { host: 'localhost', port: 3000 };

// Round-trip via entries/fromEntries
const doubled = fromEntries(entries(config).map(([k, v]) => [k, typeof v === 'number' ? v * 2 : v]));
// { host: 'localhost', port: 6000 }
```

### Pitfalls

- Duplicate keys: the last pair wins.

### Related

- [entries](./entries.md)
- [mapValues](./mapValues.md)
