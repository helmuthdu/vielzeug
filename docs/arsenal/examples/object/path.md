---
title: 'Arsenal Examples — getPath'
description: 'getPath example for @vielzeug/arsenal.'
---

## getPath

### Problem

You need safe nested property access with either a fallback or an explicit missing-value error.

### Solution

Use `getPath` for optional access, `getPathOr` for fallback, and `requirePath` for required values.

```ts
import { getPath, getPathOr, requirePath } from '@vielzeug/arsenal/object';

const config = { api: { host: 'localhost', port: 3000 }, items: [10, 20] };

getPath(config, 'api.port'); // 3000
getPathOr(config, 'api.timeout', 5_000); // 5000
getPath(config, 'items.1'); // 20
requirePath(config, 'api.port'); // 3000
```

### Pitfalls

- Numeric bracket notation such as `'items[1]'` is supported.
- Unsafe path segments never resolve.
- `requirePath` throws `TypeError` for a missing value.

### Related

- [flattenPaths](./flattenPaths.md)
- [tryParseJson](./parseJSON.md)
